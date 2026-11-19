import { expect, test } from "vite-plus/test";

import type { StorageApi } from "../src/feature/settings/index.ts";
import {
  buildImportPreviewItems,
  buildPublisherLocalExport,
  createPublisherLocalCollection,
  diffPublisherLocalRecords,
  generateExportFilename,
  importPublisherLocalRecords,
  mergePublisherLocal,
  normalizePublisherLocal,
  parsePublisherLocalRecords,
  type PublisherLocal,
  type PublisherLocalCollection,
  type Version,
} from "../src/feature/publisher-local/index.ts";

function version(overrides: Partial<Version> = {}): Version {
  return { created_by: "u1", updated_by: "u1", created_at: 1, updated_at: 1, ...overrides };
}

function record(overrides: Partial<PublisherLocal> = {}): PublisherLocal {
  return {
    publisher_id: "pub-1",
    confidential_id: "conf-1",
    version: version(),
    ...overrides,
  };
}

let storageCounter = 0;
function createTestCollection(): {
  collection: PublisherLocalCollection;
  storage: Map<string, string>;
} {
  storageCounter += 1;
  const storage = new Map<string, string>();
  const storageApi: StorageApi = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => {
      storage.set(key, value);
    },
    removeItem: (key) => {
      storage.delete(key);
    },
  };
  const collection = createPublisherLocalCollection({
    id: `publisher_local_test_${Date.now()}_${storageCounter}`,
    storageKey: `publisher_local_test_${storageCounter}`,
    storage: storageApi,
  });
  return { collection, storage };
}

test("parsePublisherLocalRecords accepts a plain array and the publisher-local envelope", () => {
  const doc = record();
  expect(parsePublisherLocalRecords(JSON.stringify([doc]))).toEqual([doc]);
  expect(
    parsePublisherLocalRecords(JSON.stringify({ type: "publisher-local", data: [doc] })),
  ).toEqual([doc]);
});

test("parsePublisherLocalRecords rejects other shapes and records without publisher_id", () => {
  expect(() => parsePublisherLocalRecords(JSON.stringify({ type: "other", data: [] }))).toThrow(
    "Invalid file format",
  );
  expect(() => parsePublisherLocalRecords(JSON.stringify({ foo: 1 }))).toThrow(
    "Invalid file format",
  );
  expect(() => parsePublisherLocalRecords("not json")).toThrow();
  expect(() => parsePublisherLocalRecords(JSON.stringify([{ confidential_id: "x" }]))).toThrow(
    "publisher_id",
  );
});

test("normalizePublisherLocal fills missing version metadata and legacy string dates", () => {
  const legacy = {
    publisher_id: "pub-1",
    confidential_id: "conf-1",
    phone: [{ id: "p1", number: "123", label: "Mobile" }],
    birth_date: "1990-05-01",
    emergency_contact: [
      { id: "e1", first_name: "Jane", last_name: "Doe", relationship: "Wife", phone: [] },
    ],
  } as unknown as PublisherLocal;

  const normalized = normalizePublisherLocal(legacy);

  expect(normalized.version).toEqual({
    created_by: "",
    updated_by: "",
    created_at: 0,
    updated_at: 0,
  });
  expect(normalized.phone?.[0]?.version.updated_at).toBe(0);
  expect(normalized.birth_date).toEqual({
    value: "1990-05-01",
    version: { created_by: "", updated_by: "", created_at: 0, updated_at: 0 },
  });
  expect(normalized.emergency_contact?.[0]?.phone).toEqual([]);
});

test("normalizePublisherLocal tolerates malformed fields instead of throwing", () => {
  const malformed = {
    publisher_id: "pub-1",
    confidential_id: "conf-1",
    phone: "not-an-array",
    email: [{ id: "e1", address: "a@b.c", label: "Home" }, "oops", { address: "no-id@b.c" }],
    photo: "base64string",
    emergency_contact: [{ first_name: "No Id" }, "junk", { id: "e1", first_name: "Jane" }],
  } as unknown as PublisherLocal;

  const normalized = normalizePublisherLocal(malformed);

  expect(normalized.phone).toBeUndefined();
  expect(normalized.photo).toBeUndefined();
  // Entries without a usable id are dropped
  expect(normalized.email?.map((e) => e.id)).toEqual(["e1"]);
  expect(normalized.emergency_contact?.map((c) => c.id)).toEqual(["e1"]);
  expect(normalized.emergency_contact?.[0]?.phone).toEqual([]);
});

test("normalizePublisherLocal drops duplicate item ids, keeping the last", () => {
  const dup = {
    publisher_id: "pub-1",
    phone: [
      { id: "p1", number: "111", label: "Mobile" },
      { id: "p1", number: "999", label: "Mobile" },
      { id: "p2", number: "222", label: "Home" },
    ],
  } as unknown as PublisherLocal;

  const normalized = normalizePublisherLocal(dup);

  expect(normalized.phone?.map((p) => [p.id, p.number])).toEqual([
    ["p1", "999"],
    ["p2", "222"],
  ]);
});

test("createPublisherLocalCollection drops corrupted stored data", async () => {
  const storage = new Map<string, string>([["corrupt", "not json"]]);
  const storageApi: StorageApi = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => {
      storage.set(key, value);
    },
    removeItem: (key) => {
      storage.delete(key);
    },
  };
  const recovered = createPublisherLocalCollection({
    id: `publisher_local_test_corrupt_${Date.now()}`,
    storageKey: "corrupt",
    storage: storageApi,
  });
  try {
    await recovered.preload();
    expect(recovered.size).toBe(0);
    expect(storage.has("corrupt")).toBe(false);
  } finally {
    await recovered.cleanup().catch(() => {});
  }
});

test("createPublisherLocalCollection drops rows whose key does not match publisher_id", async () => {
  const storage = new Map<string, string>([
    [
      "mismatch",
      JSON.stringify({
        "s:pub-a": {
          versionKey: "v1",
          data: record({ publisher_id: "pub-b", confidential_id: "conf-b" }),
        },
      }),
    ],
  ]);
  const recovered = createPublisherLocalCollection({
    id: `publisher_local_test_mismatch_${Date.now()}`,
    storageKey: "mismatch",
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value);
      },
      removeItem: (key) => {
        storage.delete(key);
      },
    },
  });
  try {
    await recovered.preload();
    expect(recovered.size).toBe(0);
    expect(storage.has("mismatch")).toBe(false);
  } finally {
    await recovered.cleanup().catch(() => {});
  }
});

test("importPublisherLocalRecords reports storage quota failures clearly", async () => {
  const storage = new Map<string, string>();
  const collection = createPublisherLocalCollection({
    id: `publisher_local_test_quota_${Date.now()}`,
    storageKey: "quota",
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
      removeItem: (key) => {
        storage.delete(key);
      },
    },
  });
  try {
    await expect(importPublisherLocalRecords(collection, [record()])).rejects.toThrow(
      "Not enough storage space",
    );
  } finally {
    await collection.cleanup().catch(() => {});
  }
});

test("mergePublisherLocal keeps the most recently updated item per id", () => {
  const existing = record({
    phone: [
      { id: "p1", number: "111", label: "Mobile", version: version({ updated_at: 5 }) },
      { id: "p2", number: "222", label: "Home", version: version({ updated_at: 5 }) },
    ],
    birth_date: { value: "1990-01-01", version: version({ updated_at: 5 }) },
    version: version({ created_at: 1, updated_at: 5 }),
  });
  const incoming = record({
    phone: [
      { id: "p1", number: "999", label: "Mobile", version: version({ updated_at: 10 }) },
      { id: "p3", number: "333", label: "Work", version: version({ updated_at: 2 }) },
    ],
    birth_date: { value: "1990-02-02", version: version({ updated_at: 3 }) },
    version: version({ created_by: "u2", created_at: 2, updated_by: "u2", updated_at: 10 }),
  });

  const merged = mergePublisherLocal(existing, incoming);

  expect(merged.phone?.map((p) => [p.id, p.number])).toEqual([
    ["p1", "999"],
    ["p2", "222"],
    ["p3", "333"],
  ]);
  // Existing birth date is newer (5 > 3) so it wins
  expect(merged.birth_date?.value).toBe("1990-01-01");
  // Doc audit: earliest creator, latest updater
  expect(merged.version.created_at).toBe(1);
  expect(merged.version.updated_at).toBe(10);
  expect(merged.version.updated_by).toBe("u2");
});

test("mergePublisherLocal deep-merges emergency contact nested lists", () => {
  const existing = record({
    emergency_contact: [
      {
        id: "e1",
        first_name: "Jane",
        last_name: "Doe",
        relationship: "Wife",
        phone: [{ id: "p1", number: "111", label: "Mobile", version: version({ updated_at: 1 }) }],
        version: version({ updated_at: 5 }),
      },
    ],
  });
  const incoming = record({
    emergency_contact: [
      {
        id: "e1",
        first_name: "Janet",
        last_name: "Doe",
        relationship: "Wife",
        phone: [{ id: "p2", number: "222", label: "Work", version: version({ updated_at: 1 }) }],
        version: version({ updated_at: 3 }),
      },
    ],
  });

  const merged = mergePublisherLocal(existing, incoming);

  const contact = merged.emergency_contact?.[0];
  // Existing contact is newer (5 > 3) so scalar fields stay "Jane"
  expect(contact?.first_name).toBe("Jane");
  // But nested phone lists merge so both sides' additions are kept
  expect(contact?.phone.map((p) => p.id)).toEqual(["p1", "p2"]);
});

test("diffPublisherLocalRecords reports only added or changed fields", () => {
  const existing = [
    record({
      phone: [{ id: "p1", number: "111", label: "Mobile", version: version() }],
    }),
  ];
  const incoming = [
    record({
      phone: [
        { id: "p1", number: "111", label: "Mobile", version: version() },
        { id: "p2", number: "222", label: "Home", version: version() },
      ],
      birth_date: { value: "1990-01-01", version: version() },
    }),
    record({
      publisher_id: "pub-2",
      confidential_id: "conf-2",
      email: [{ id: "e1", address: "x@y.z", label: "Home", version: version() }],
    }),
  ];

  const diffs = diffPublisherLocalRecords(existing, incoming);

  expect(diffs).toHaveLength(2);
  const first = diffs.find((d) => d.publisher_id === "pub-1");
  expect(first?.phone.map((p) => p.id)).toEqual(["p2"]);
  expect(first?.birth_date).toBe("1990-01-01");
  const second = diffs.find((d) => d.publisher_id === "pub-2");
  expect(second).toBeDefined();
  expect(second?.phone).toEqual([]);
});

test("diffPublisherLocalRecords returns nothing when the file matches existing data", () => {
  const existing = [record()];
  expect(diffPublisherLocalRecords(existing, [record()])).toEqual([]);
});

test("diffPublisherLocalRecords treats legacy unversioned values as equal", () => {
  // A stored doc with a legacy plain-string birth_date must not be reported
  // as changed when the incoming record carries the same value.
  const existing = [{ ...record(), birth_date: "1990-01-01" } as unknown as PublisherLocal];
  const incoming = [record({ birth_date: { value: "1990-01-01", version: version() } })];
  expect(diffPublisherLocalRecords(existing, incoming)).toEqual([]);
});

test("importPublisherLocalRecords inserts new records and merges existing ones", async () => {
  const { collection } = createTestCollection();
  try {
    const seedTx = collection.insert(
      record({
        phone: [{ id: "p1", number: "111", label: "Mobile", version: version({ updated_at: 5 }) }],
      }),
    );
    await seedTx.isPersisted.promise;

    const updated = await importPublisherLocalRecords(collection, [
      record({
        phone: [{ id: "p1", number: "999", label: "Mobile", version: version({ updated_at: 10 }) }],
      }),
      record({
        publisher_id: "pub-2",
        confidential_id: "conf-2",
        email: [{ id: "e1", address: "x@y.z", label: "Home", version: version() }],
      }),
    ]);

    expect(updated.map((d) => d.publisher_id).sort()).toEqual(["pub-1", "pub-2"]);
    expect(collection.get("pub-1")?.phone?.[0]?.number).toBe("999");
    expect(collection.get("pub-2")?.publisher_id).toBe("pub-2");
    expect(collection.size).toBe(2);
  } finally {
    await collection.cleanup().catch(() => {});
  }
});

test("importPublisherLocalRecords keeps local data when the incoming record is older", async () => {
  const { collection } = createTestCollection();
  try {
    const seedTx = collection.insert(
      record({
        phone: [{ id: "p1", number: "111", label: "Mobile", version: version({ updated_at: 10 }) }],
      }),
    );
    await seedTx.isPersisted.promise;

    const updated = await importPublisherLocalRecords(collection, [
      record({
        phone: [{ id: "p1", number: "999", label: "Mobile", version: version({ updated_at: 1 }) }],
      }),
    ]);

    // The older incoming phone value loses the merge, so the stored record is
    // unchanged and the diff reports nothing.
    expect(collection.get("pub-1")?.phone?.[0]?.number).toBe("111");
    expect(updated).toEqual([]);
  } finally {
    await collection.cleanup().catch(() => {});
  }
});

test("importPublisherLocalRecords persists records to storage", async () => {
  const { collection, storage } = createTestCollection();
  try {
    await importPublisherLocalRecords(collection, [record()]);
    const keys = [...storage.keys()];
    expect(keys.length).toBeGreaterThan(0);
    expect(storage.get(keys[0]!)).toContain("pub-1");
  } finally {
    await collection.cleanup().catch(() => {});
  }
});

test("buildPublisherLocalExport always keeps identity fields and honors the field selection", () => {
  const doc = record({
    phone: [{ id: "p1", number: "111", label: "Mobile", version: version() }],
    email: [{ id: "e1", address: "a@b.c", label: "Home", version: version() }],
  });

  const exported = JSON.parse(buildPublisherLocalExport([doc], ["phone"])) as Record<
    string,
    unknown
  >[];

  expect(exported[0]).toEqual({
    publisher_id: "pub-1",
    confidential_id: "conf-1",
    version: version(),
    phone: doc.phone,
  });
  expect(generateExportFilename()).toMatch(/^publisher-local-\d{4}-\d{2}-\d{2}\.json$/);
});

test("buildImportPreviewItems resolves publisher names and sorts by last name", () => {
  const items = buildImportPreviewItems({
    records: [
      record({ publisher_id: "pub-2", birth_date: { value: "1990-01-01", version: version() } }),
      record({ publisher_id: "pub-1", birth_date: { value: "1990-01-01", version: version() } }),
    ],
    existing: [],
    publishers: [
      {
        id: "pub-1",
        first_name: "Zoe",
        last_name: "Zimmerman",
        congregation_id: "c1",
      },
      {
        id: "pub-2",
        first_name: "Amy",
        last_name: "Adams",
        congregation_id: "c1",
      },
    ],
  });

  expect(items.map((i) => i.publisher_name)).toEqual(["Adams, Amy", "Zimmerman, Zoe"]);
  expect(items[0]?.fields[0]?.label).toBe("Date of Birth");
  // "1990-01-01" must render as the same calendar day regardless of timezone
  expect(items[0]?.fields[0]?.value).toBe("January 1, 1990");
});

test("buildImportPreviewItems falls back to the publisher id when unknown", () => {
  const items = buildImportPreviewItems({
    records: [record({ birth_date: { value: "1990-01-01", version: version() } })],
    existing: [],
    publishers: [],
  });
  expect(items[0]?.publisher_name).toBe("pub-1");
});
