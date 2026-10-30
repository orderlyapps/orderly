import type { Collection } from "@tanstack/react-db";

import {
  isBankAccountDocument,
  normalizeBankAccountDocument,
  type BankAccountDocument,
} from "../banking/accounts/schema.ts";
import {
  isBankCategoryDocument,
  normalizeBankCategoryDocument,
  type BankCategoryDocument,
} from "../banking/categories/schema.ts";
import { getBankingStore, type BankingStore } from "../banking/db.ts";
import {
  isBankStatementLineDocument,
  normalizeBankStatementLineDocument,
  type BankStatementLineDocument,
} from "../banking/lines/schema.ts";
import {
  isBankStatementDocument,
  normalizeBankStatementDocument,
  type BankStatementDocument,
} from "../banking/statements/schema.ts";
import { getCustomersStore, type CustomersStore } from "../customers/db.ts";
import {
  isCustomerDocument,
  normalizeCustomerDocument,
  type CustomerDocument,
} from "../customers/schema.ts";
import { getItemsStore, type ItemsStore } from "../items/db.ts";
import { isItemDocument, normalizeItemDocument, type ItemDocument } from "../items/schema.ts";
import { getSettingsStore, type SettingsStore } from "./db.ts";
import {
  isSettingValue,
  SETTINGS_KEYS,
  toSettingsPatch,
  type SettingsDocument,
  type SettingsPatch,
} from "./schema.ts";

const BACKUP_MAGIC_PREFIX = new Uint8Array([0x53, 0x55, 0x42, 0x42, 0x49, 0x45]);
const BACKUP_VERSION_PLAIN = 0x02;
const BACKUP_VERSION_ENCRYPTED = 0x03;
const BACKUP_MAGIC_PLAIN = new Uint8Array([...BACKUP_MAGIC_PREFIX, BACKUP_VERSION_PLAIN]);
const BACKUP_MAGIC_ENCRYPTED = new Uint8Array([...BACKUP_MAGIC_PREFIX, BACKUP_VERSION_ENCRYPTED]);

export const BACKUP_PBKDF2_ITERATIONS = 210_000;
const BACKUP_SALT_LENGTH = 16;
const BACKUP_IV_LENGTH = 12;
const ENCRYPTED_HEADER_LENGTH =
  BACKUP_MAGIC_ENCRYPTED.length + 4 + BACKUP_SALT_LENGTH + BACKUP_IV_LENGTH;

const BACKUP_BASENAME = "backup";
export const DATA_BACKUP_EXTENSION = ".sub";
export const DATA_BACKUP_FILENAME = `${BACKUP_BASENAME}${DATA_BACKUP_EXTENSION}`;

export interface DataBackupContent {
  bankAccounts: BankAccountDocument[];
  bankCategories: BankCategoryDocument[];
  bankStatements: BankStatementDocument[];
  bankStatementLines: BankStatementLineDocument[];
  customers: CustomerDocument[];
  items: ItemDocument[];
  settings?: SettingsPatch;
}

export interface DataBackupPayload extends DataBackupContent {
  version: 1;
  exportedAt: string;
}

export interface DataBackupSummary {
  bankAccounts: number;
  bankCategories: number;
  bankStatements: number;
  bankStatementLines: number;
  customers: number;
  items: number;
  settings: boolean;
}

export interface DataBackupStores {
  banking?: BankingStore;
  customers?: CustomersStore;
  items?: ItemsStore;
  settings?: SettingsStore;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function createDataBackupFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `${BACKUP_BASENAME}-${year}-${month}-${day}_${hours}-${minutes}-${seconds}${DATA_BACKUP_EXTENSION}`;
}

function summarizeBackupContent(content: DataBackupContent): DataBackupSummary {
  return {
    bankAccounts: content.bankAccounts.length,
    bankCategories: content.bankCategories.length,
    bankStatements: content.bankStatements.length,
    bankStatementLines: content.bankStatementLines.length,
    customers: content.customers.length,
    items: content.items.length,
    settings: content.settings !== undefined,
  };
}

export function encodeDataBackup(payload: DataBackupPayload): Uint8Array<ArrayBuffer> {
  const body = new TextEncoder().encode(JSON.stringify(payload));
  const output = new Uint8Array(BACKUP_MAGIC_PLAIN.length + body.length);
  output.set(BACKUP_MAGIC_PLAIN, 0);
  output.set(body, BACKUP_MAGIC_PLAIN.length);
  return output;
}

function readBackupVersionByte(bytes: Uint8Array): number {
  if (bytes.byteLength <= BACKUP_MAGIC_PREFIX.length) {
    throw new Error("Invalid backup: file is too short");
  }
  for (let i = 0; i < BACKUP_MAGIC_PREFIX.length; i++) {
    if (bytes[i] !== BACKUP_MAGIC_PREFIX[i]) {
      throw new Error("Invalid backup: unrecognized header");
    }
  }
  return bytes[BACKUP_MAGIC_PREFIX.length];
}

export function isDataBackupEncrypted(input: Uint8Array | ArrayBuffer): boolean {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return (
    bytes.byteLength > BACKUP_MAGIC_PREFIX.length &&
    BACKUP_MAGIC_PREFIX.every((byte, i) => bytes[i] === byte) &&
    bytes[BACKUP_MAGIC_PREFIX.length] === BACKUP_VERSION_ENCRYPTED
  );
}

function readBackupArray(record: Record<string, unknown>, key: keyof DataBackupContent): unknown[] {
  const value = record[key];
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`Invalid backup: "${key}" must be an array`);
  }
  return value;
}

function parseBackupEntries<T>(
  record: Record<string, unknown>,
  key: keyof DataBackupContent,
  isDocument: (value: unknown) => value is T,
  normalize: (value: T) => T,
): T[] {
  return readBackupArray(record, key).map((entry, index) => {
    if (!isDocument(entry)) {
      throw new Error(`Invalid backup: invalid ${key} entry at index ${index}`);
    }
    return normalize(entry);
  });
}

function parseBackupSettings(record: Record<string, unknown>): SettingsPatch | undefined {
  const value = record.settings;
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error('Invalid backup: "settings" must be an object');
  }
  const candidate = value as Record<string, unknown>;
  for (const key of SETTINGS_KEYS) {
    if (candidate[key] !== undefined && !isSettingValue(key, candidate[key])) {
      throw new Error(`Invalid backup: invalid settings "${key}" value`);
    }
  }
  const patch = toSettingsPatch(candidate as Partial<SettingsDocument>);
  return Object.keys(patch).length > 0 ? patch : undefined;
}

function parseDataBackupRecord(parsed: unknown): DataBackupPayload {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Invalid backup: expected an object");
  }

  const record = parsed as Record<string, unknown>;
  if (record.version !== undefined && record.version !== 1) {
    throw new Error("Invalid backup: unsupported version");
  }

  const content: DataBackupContent = {
    bankAccounts: parseBackupEntries(
      record,
      "bankAccounts",
      isBankAccountDocument,
      normalizeBankAccountDocument,
    ),
    bankCategories: parseBackupEntries(
      record,
      "bankCategories",
      isBankCategoryDocument,
      normalizeBankCategoryDocument,
    ),
    bankStatements: parseBackupEntries(
      record,
      "bankStatements",
      isBankStatementDocument,
      normalizeBankStatementDocument,
    ),
    bankStatementLines: parseBackupEntries(
      record,
      "bankStatementLines",
      isBankStatementLineDocument,
      normalizeBankStatementLineDocument,
    ),
    customers: parseBackupEntries(
      record,
      "customers",
      isCustomerDocument,
      normalizeCustomerDocument,
    ),
    items: parseBackupEntries(record, "items", isItemDocument, normalizeItemDocument),
  };

  const settings = parseBackupSettings(record);
  if (settings) {
    content.settings = settings;
  }

  return {
    version: 1,
    exportedAt: typeof record.exportedAt === "string" ? record.exportedAt : "",
    ...content,
  };
}

function parseBackupPayloadBytes(payloadBytes: Uint8Array): DataBackupPayload {
  let parsed: unknown;
  try {
    const json = new TextDecoder("utf-8", { fatal: true }).decode(payloadBytes);
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid backup: corrupted payload");
  }
  return parseDataBackupRecord(parsed);
}

export function decodeDataBackup(input: Uint8Array | ArrayBuffer): DataBackupPayload {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const versionByte = readBackupVersionByte(bytes);
  if (versionByte === BACKUP_VERSION_ENCRYPTED) {
    throw new Error("Invalid backup: file is encrypted — a password is required");
  }
  if (versionByte !== BACKUP_VERSION_PLAIN) {
    throw new Error("Invalid backup: unrecognized header");
  }
  return parseBackupPayloadBytes(bytes.subarray(BACKUP_MAGIC_PLAIN.length));
}

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Web Crypto API is not available in this environment");
  }
  return subtle;
}

async function deriveBackupKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const keyMaterial = await subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptDataBackup(
  payload: DataBackupPayload,
  password: string,
): Promise<Uint8Array<ArrayBuffer>> {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("A password is required to encrypt the backup");
  }
  const subtle = getSubtleCrypto();
  const cryptoApi = globalThis.crypto;
  const salt = cryptoApi.getRandomValues(new Uint8Array(BACKUP_SALT_LENGTH));
  const iv = cryptoApi.getRandomValues(new Uint8Array(BACKUP_IV_LENGTH));
  const key = await deriveBackupKey(password, salt, BACKUP_PBKDF2_ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = new Uint8Array(
    await subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plaintext),
  );

  const output = new Uint8Array(ENCRYPTED_HEADER_LENGTH + ciphertext.length);
  const view = new DataView(output.buffer);
  output.set(BACKUP_MAGIC_ENCRYPTED, 0);
  view.setUint32(BACKUP_MAGIC_ENCRYPTED.length, BACKUP_PBKDF2_ITERATIONS, false);
  output.set(salt, BACKUP_MAGIC_ENCRYPTED.length + 4);
  output.set(iv, BACKUP_MAGIC_ENCRYPTED.length + 4 + BACKUP_SALT_LENGTH);
  output.set(ciphertext, ENCRYPTED_HEADER_LENGTH);
  return output;
}

export async function decryptDataBackup(
  input: Uint8Array | ArrayBuffer,
  password: string,
): Promise<DataBackupPayload> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const versionByte = readBackupVersionByte(bytes);
  if (versionByte !== BACKUP_VERSION_ENCRYPTED) {
    throw new Error("Invalid backup: file is not encrypted");
  }
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("A password is required to decrypt the backup");
  }
  if (bytes.byteLength <= ENCRYPTED_HEADER_LENGTH + 16) {
    throw new Error("Invalid backup: file is too short");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const iterations = view.getUint32(BACKUP_MAGIC_ENCRYPTED.length, false);
  if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 10_000_000) {
    throw new Error("Invalid backup: unsupported key derivation parameters");
  }
  const saltStart = BACKUP_MAGIC_ENCRYPTED.length + 4;
  const salt = bytes.slice(saltStart, saltStart + BACKUP_SALT_LENGTH);
  const ivStart = saltStart + BACKUP_SALT_LENGTH;
  const iv = bytes.slice(ivStart, ivStart + BACKUP_IV_LENGTH);
  const ciphertext = bytes.subarray(ENCRYPTED_HEADER_LENGTH);

  const key = await deriveBackupKey(password, salt, iterations);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await getSubtleCrypto().decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      ciphertext as BufferSource,
    );
  } catch {
    throw new Error("Invalid backup: incorrect password or corrupted file");
  }
  return parseBackupPayloadBytes(new Uint8Array(plaintext));
}

async function resolveBackupStores(stores?: DataBackupStores): Promise<{
  banking: BankingStore;
  customers: CustomersStore;
  items: ItemsStore;
  settings: SettingsStore;
}> {
  const [banking, customers, items, settings] = await Promise.all([
    stores?.banking ? Promise.resolve(stores.banking) : getBankingStore(),
    stores?.customers ? Promise.resolve(stores.customers) : getCustomersStore(),
    stores?.items ? Promise.resolve(stores.items) : getItemsStore(),
    stores?.settings ? Promise.resolve(stores.settings) : getSettingsStore(),
  ]);
  return { banking, customers, items, settings };
}

export async function exportDataBackup(
  password: string,
  stores?: DataBackupStores,
): Promise<Uint8Array<ArrayBuffer>> {
  const resolved = await resolveBackupStores(stores);
  const payload: DataBackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    bankAccounts: resolved.banking.listAccounts(),
    bankCategories: resolved.banking.listCategories(),
    bankStatements: resolved.banking.listStatements(),
    bankStatementLines: resolved.banking.listStatementLines(),
    customers: resolved.customers.listCustomers(),
    items: resolved.items.listItems(),
    settings: await resolved.settings.getSettings(),
  };
  return encryptDataBackup(payload, password);
}

async function upsertDocuments<T extends { id: string }>(
  collection: Collection<T, string>,
  docs: readonly T[],
): Promise<void> {
  const txs = [];
  for (const doc of docs) {
    if (collection.has(doc.id)) {
      txs.push(
        collection.update(doc.id, (draft) => {
          Object.assign(draft, doc);
        }),
      );
    } else {
      txs.push(collection.insert(doc));
    }
  }
  await Promise.all(txs.map((tx) => tx.isPersisted.promise));
}

async function upsertStatementLines(
  collection: Collection<BankStatementLineDocument, string>,
  docs: readonly BankStatementLineDocument[],
): Promise<void> {
  const txs = [];
  for (const doc of docs) {
    if (collection.has(doc.id)) {
      txs.push(
        collection.update(doc.id, (draft) => {
          Object.assign(draft, doc);
          if (doc.balanceCents === undefined) {
            delete draft.balanceCents;
          }
        }),
      );
    } else {
      txs.push(collection.insert(doc));
    }
  }
  await Promise.all(txs.map((tx) => tx.isPersisted.promise));
}

export async function importDataBackup(
  input: Uint8Array | ArrayBuffer,
  password?: string,
  stores?: DataBackupStores,
): Promise<DataBackupSummary> {
  const payload = isDataBackupEncrypted(input)
    ? await decryptDataBackup(input, password ?? "")
    : decodeDataBackup(input);
  const resolved = await resolveBackupStores(stores);

  await Promise.all([
    upsertDocuments(resolved.banking.accountsCollection, payload.bankAccounts),
    upsertDocuments(resolved.banking.categoriesCollection, payload.bankCategories),
    upsertDocuments(resolved.banking.statementsCollection, payload.bankStatements),
    upsertStatementLines(resolved.banking.linesCollection, payload.bankStatementLines),
    upsertDocuments(resolved.customers.customersCollection, payload.customers),
    upsertDocuments(resolved.items.itemsCollection, payload.items),
    payload.settings ? resolved.settings.updateSettings(payload.settings) : Promise.resolve(),
  ]);

  return summarizeBackupContent(payload);
}

export async function downloadDataBackup(
  password: string,
  stores?: DataBackupStores,
  filename = createDataBackupFilename(),
): Promise<Uint8Array<ArrayBuffer>> {
  const bytes = await exportDataBackup(password, stores);
  const baseFilename = filename.trim() || DATA_BACKUP_FILENAME;
  const resolvedFilename = baseFilename.toLowerCase().endsWith(DATA_BACKUP_EXTENSION)
    ? baseFilename
    : `${baseFilename}${DATA_BACKUP_EXTENSION}`;
  if (typeof document !== "undefined" && typeof URL !== "undefined") {
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = resolvedFilename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }
  return bytes;
}

export async function importDataBackupFile(
  file: Blob,
  password?: string,
  stores?: DataBackupStores,
): Promise<DataBackupSummary> {
  const buffer = await file.arrayBuffer();
  return importDataBackup(new Uint8Array(buffer), password, stores);
}
