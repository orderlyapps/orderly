import { expect, test } from "vite-plus/test";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";

import { createBankingStore } from "../src/feature/banking/index.ts";
import { createCustomersStore } from "../src/feature/customers/index.ts";
import { createItemsStore } from "../src/feature/items/index.ts";
import {
  BACKUP_PBKDF2_ITERATIONS,
  createDataBackupFilename,
  DATA_BACKUP_EXTENSION,
  DATA_BACKUP_FILENAME,
  decodeDataBackup,
  decryptDataBackup,
  downloadDataBackup,
  encodeDataBackup,
  encryptDataBackup,
  exportDataBackup,
  importDataBackup,
  importDataBackupFile,
  isDataBackupEncrypted,
  type DataBackupPayload,
  type DataBackupStores,
} from "../src/feature/settings/index.ts";

let storeCounter = 0;
function nextStoreName(prefix: string) {
  storeCounter += 1;
  return `${prefix}_${Date.now()}_${storeCounter}`;
}

async function createTestStores(prefix: string): Promise<{
  stores: Required<DataBackupStores>;
  close: () => Promise<void>;
}> {
  const banking = await createBankingStore({
    name: nextStoreName(`${prefix}_banking`),
    storage: getRxStorageMemory(),
  });
  const customers = await createCustomersStore({
    name: nextStoreName(`${prefix}_customers`),
    storage: getRxStorageMemory(),
  });
  const items = await createItemsStore({
    name: nextStoreName(`${prefix}_items`),
    storage: getRxStorageMemory(),
  });
  return {
    stores: { banking, customers, items },
    close: async () => {
      await banking.close();
      await customers.close();
      await items.close();
    },
  };
}

const EMPTY_PAYLOAD: DataBackupPayload = {
  version: 1,
  exportedAt: "2026-10-30T00:00:00.000Z",
  bankAccounts: [],
  bankCategories: [],
  bankStatements: [],
  bankStatementLines: [],
  customers: [],
  items: [],
};

test("uses the .sub extension and timestamped backup filename", () => {
  expect(DATA_BACKUP_EXTENSION).toBe(".sub");
  expect(DATA_BACKUP_FILENAME).toBe("backup.sub");
  expect(createDataBackupFilename(new Date(2026, 9, 30, 9, 5, 3))).toBe(
    "backup-2026-10-30_09-05-03.sub",
  );
});

test("encrypts bank statements, customers, and items and restores them into another store", async () => {
  const source = await createTestStores("subbie_backup_src");
  const target = await createTestStores("subbie_backup_dst");

  try {
    const account = await source.stores.banking.createAccount({
      name: "Business Checking",
      institution: "ANZ",
      accountNumber: "012-345 11112222",
    });
    const csv = [
      "Date,Description,Amount,Balance",
      "2026-10-20,Acme Corp INV-2026-001,3500.00,13500.00",
      "2026-10-21,Bunnings Trade Tools,-450.00,13050.00",
    ].join("\n");
    const imported = await source.stores.banking.importStatementCsv({
      accountId: account.id,
      csvText: csv,
      filename: "checking-oct.csv",
    });
    expect(imported.lines).toHaveLength(2);

    const customer = await source.stores.customers.createCustomer({
      name: "Acme Corp",
      email: "billing@acme.com",
    });
    const item = await source.stores.items.createItem({
      name: "Consulting",
      unitPriceCents: 15_000,
      unit: "hour",
    });

    const bytes = await exportDataBackup("s3cret password", source.stores);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBeGreaterThan(39);
    expect(isDataBackupEncrypted(bytes)).toBe(true);

    // The encrypted file must not leak record contents
    const marker = new TextEncoder().encode("Acme Corp");
    const haystack = Array.from(bytes);
    const found = haystack.some((_, i) => marker.every((byte, j) => haystack[i + j] === byte));
    expect(found).toBe(false);

    expect(() => decodeDataBackup(bytes)).toThrow(
      "Invalid backup: file is encrypted — a password is required",
    );

    const decrypted = await decryptDataBackup(bytes, "s3cret password");
    expect(decrypted.version).toBe(1);
    expect(decrypted.bankAccounts.map((doc) => doc.id)).toEqual([account.id]);
    expect(decrypted.bankStatements).toHaveLength(1);
    expect(decrypted.bankStatementLines).toHaveLength(2);
    expect(decrypted.customers.map((doc) => doc.id)).toEqual([customer.id]);
    expect(decrypted.items.map((doc) => doc.id)).toEqual([item.id]);

    const summary = await importDataBackup(bytes, "s3cret password", target.stores);
    expect(summary).toEqual({
      bankAccounts: 1,
      bankCategories: decrypted.bankCategories.length,
      bankStatements: 1,
      bankStatementLines: 2,
      customers: 1,
      items: 1,
    });

    expect(target.stores.banking.listAccounts().map((doc) => doc.id)).toEqual([account.id]);
    expect(target.stores.banking.listStatements()).toHaveLength(1);
    expect(
      target.stores.banking
        .listStatementLines({ accountId: account.id })
        .map((line) => line.description),
    ).toEqual(["Bunnings Trade Tools", "Acme Corp INV-2026-001"]);
    expect(target.stores.customers.getCustomer(customer.id)?.email).toBe("billing@acme.com");
    expect(target.stores.items.getItem(item.id)?.unitPriceCents).toBe(15_000);
  } finally {
    await source.close();
    await target.close();
  }
});

test("rejects decryption with the wrong password, a missing password, or tampered data", async () => {
  const payload: DataBackupPayload = {
    ...EMPTY_PAYLOAD,
    customers: [
      {
        id: "cust_1",
        name: "Acme Corp",
        email: "",
        phone: "",
        notes: "",
        createdAt: "2026-10-30T00:00:00.000Z",
        updatedAt: "2026-10-30T00:00:00.000Z",
      },
    ],
  };
  const bytes = await encryptDataBackup(payload, "correct horse");

  await expect(decryptDataBackup(bytes, "wrong password")).rejects.toThrow(
    "Invalid backup: incorrect password or corrupted file",
  );
  await expect(decryptDataBackup(bytes, "")).rejects.toThrow(
    "A password is required to decrypt the backup",
  );
  await expect(importDataBackup(bytes)).rejects.toThrow(
    "A password is required to decrypt the backup",
  );

  const tampered = new Uint8Array(bytes);
  tampered[tampered.length - 1] = tampered[tampered.length - 1] ^ 0xff;
  await expect(decryptDataBackup(tampered, "correct horse")).rejects.toThrow(
    "Invalid backup: incorrect password or corrupted file",
  );

  await expect(encryptDataBackup(payload, "")).rejects.toThrow(
    "A password is required to encrypt the backup",
  );
  await expect(decryptDataBackup(bytes, "correct horse")).resolves.toEqual(payload);
});

test("stores the PBKDF2 iteration count in the encrypted header", async () => {
  const bytes = await encryptDataBackup(EMPTY_PAYLOAD, "pw");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.getUint32(7, false)).toBe(BACKUP_PBKDF2_ITERATIONS);
});

test("restores legacy unencrypted backups without a password", async () => {
  const target = await createTestStores("subbie_backup_legacy");

  try {
    const payload: DataBackupPayload = {
      ...EMPTY_PAYLOAD,
      items: [
        {
          id: "item_1",
          name: "Callout",
          description: "",
          unitPriceCents: 8_000,
          unit: "",
          createdAt: "2026-10-30T00:00:00.000Z",
          updatedAt: "2026-10-30T00:00:00.000Z",
        },
      ],
    };
    const bytes = encodeDataBackup(payload);
    expect(isDataBackupEncrypted(bytes)).toBe(false);
    expect(decodeDataBackup(bytes).items).toHaveLength(1);
    await expect(decryptDataBackup(bytes, "pw")).rejects.toThrow(
      "Invalid backup: file is not encrypted",
    );

    const summary = await importDataBackup(bytes, undefined, target.stores);
    expect(summary.items).toBe(1);
    expect(target.stores.items.getItem("item_1")?.unitPriceCents).toBe(8_000);
  } finally {
    await target.close();
  }
});

test("reimporting a backup merges with existing documents instead of duplicating them", async () => {
  const source = await createTestStores("subbie_backup_merge_src");
  const target = await createTestStores("subbie_backup_merge_dst");

  try {
    const customer = await source.stores.customers.createCustomer({ name: "Acme Corp" });
    const bytes = await exportDataBackup("pw", source.stores);
    await importDataBackup(bytes, "pw", target.stores);

    await source.stores.customers.updateCustomer(customer.id, { name: "Acme Pty Ltd" });
    const updatedBytes = await exportDataBackup("pw", source.stores);
    const summary = await importDataBackup(updatedBytes, "pw", target.stores);

    expect(summary.customers).toBe(1);
    expect(target.stores.customers.listCustomers()).toHaveLength(1);
    expect(target.stores.customers.getCustomer(customer.id)?.name).toBe("Acme Pty Ltd");
  } finally {
    await source.close();
    await target.close();
  }
});

test("imports an encrypted backup from a Blob file", async () => {
  const source = await createTestStores("subbie_backup_file_src");
  const target = await createTestStores("subbie_backup_file_dst");

  try {
    await source.stores.items.createItem({ name: "Callout", unitPriceCents: 8_000 });
    const bytes = await downloadDataBackup("pw", source.stores, "");
    expect(isDataBackupEncrypted(bytes)).toBe(true);
    expect((await decryptDataBackup(bytes, "pw")).items).toHaveLength(1);

    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const summary = await importDataBackupFile(blob, "pw", target.stores);
    expect(summary.items).toBe(1);
    expect(target.stores.items.listItems()).toHaveLength(1);
  } finally {
    await source.close();
    await target.close();
  }
});

test("rejects invalid backup payloads", async () => {
  expect(() => decodeDataBackup(new Uint8Array([1, 2, 3]))).toThrow(
    "Invalid backup: file is too short",
  );
  expect(() => decodeDataBackup(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 123, 125]))).toThrow(
    "Invalid backup: unrecognized header",
  );

  const valid = encodeDataBackup(EMPTY_PAYLOAD);
  const corrupted = new Uint8Array(valid);
  corrupted[corrupted.length - 1] = 0x00;
  expect(() => decodeDataBackup(corrupted)).toThrow("Invalid backup: corrupted payload");

  const magic = valid.subarray(0, 7);
  const makeBackupPayload = (payload: unknown) => {
    const body = new TextEncoder().encode(JSON.stringify(payload));
    const out = new Uint8Array(magic.length + body.length);
    out.set(magic, 0);
    out.set(body, magic.length);
    return out;
  };

  expect(() => decodeDataBackup(makeBackupPayload([1, 2, 3]))).toThrow(
    "Invalid backup: expected an object",
  );
  expect(() => decodeDataBackup(makeBackupPayload({ version: 2 }))).toThrow(
    "Invalid backup: unsupported version",
  );
  expect(() => decodeDataBackup(makeBackupPayload({ customers: "nope" }))).toThrow(
    'Invalid backup: "customers" must be an array',
  );
  expect(() => decodeDataBackup(makeBackupPayload({ customers: [{ id: 42 }] }))).toThrow(
    "Invalid backup: invalid customers entry at index 0",
  );

  const target = await createTestStores("subbie_backup_invalid");
  try {
    await expect(
      importDataBackup(
        makeBackupPayload({ items: [{ name: "missing id" }] }),
        undefined,
        target.stores,
      ),
    ).rejects.toThrow("Invalid backup: invalid items entry at index 0");
    expect(target.stores.items.listItems()).toEqual([]);
  } finally {
    await target.close();
  }
});
