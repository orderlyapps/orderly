import { expect, test } from "vite-plus/test";

import type { StorageApi } from "../src/feature/settings/index.ts";
import {
  addContactDetail,
  buildContactDetailItem,
  buildImportPreviewItems,
  buildMissingContactItems,
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

test("normalizePublisherLocal formats valid numbers as Australian phones", () => {
  const doc = {
    publisher_id: "pub-1",
    phone: [
      { id: "p1", number: "0412345678", label: "Mobile" },
      { id: "p2", number: "0412 345 678", label: "Mobile" },
      { id: "p3", number: "+61412345678", label: "Mobile" },
      { id: "p4", number: "(02) 9876 5432", label: "Home" },
      { id: "p5", number: "123", label: "Other" },
      { id: "p7", number: "1800123456", label: "Freecall" },
      { id: "p8", number: "+18005551234", label: "US Freecall" },
      { id: "p9", number: "not a phone", label: "Junk" },
    ],
    emergency_contact: [
      {
        id: "e1",
        first_name: "Jane",
        last_name: "Doe",
        relationship: "Wife",
        phone: [{ id: "p6", number: "61412345678", label: "Mobile" }],
      },
    ],
  } as unknown as PublisherLocal;

  const normalized = normalizePublisherLocal(doc);

  expect(normalized.phone?.map((p) => [p.id, p.number])).toEqual([
    ["p1", "+61 412 345 678"],
    ["p2", "+61 412 345 678"],
    ["p3", "+61 412 345 678"],
    ["p4", "+61 2 9876 5432"],
    // Unparseable values are kept as entered
    ["p5", "123"],
    // National-only service numbers keep their national form
    ["p7", "1800 123 456"],
    // Foreign numbers keep the international form, service type or not
    ["p8", "+1 800 555 1234"],
    ["p9", "not a phone"],
  ]);
  expect(normalized.emergency_contact?.[0]?.phone[0]?.number).toBe("+61 412 345 678");
});

test("diffPublisherLocalRecords ignores formatting-only phone differences", () => {
  const existing = [
    record({
      phone: [{ id: "p1", number: "0412345678", label: "Mobile", version: version() }],
    }),
  ];
  const incoming = [
    record({
      phone: [{ id: "p1", number: "0412 345 678", label: "Mobile", version: version() }],
    }),
  ];
  expect(diffPublisherLocalRecords(existing, incoming)).toEqual([]);
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

test("buildImportPreviewItems includes previous values for changed fields only", () => {
  const items = buildImportPreviewItems({
    records: [
      record({
        phone: [
          { id: "p1", number: "222", label: "Mobile", version: version({ updated_at: 2 }) },
          { id: "p2", number: "333", label: "Work", version: version({ updated_at: 2 }) },
        ],
        birth_date: { value: "1981-06-06", version: version({ updated_at: 2 }) },
      }),
    ],
    existing: [
      record({
        phone: [{ id: "p1", number: "111", label: "Mobile", version: version() }],
        birth_date: { value: "1980-05-05", version: version() },
      }),
    ],
    publishers: [],
  });

  const changedPhone = items[0]?.fields.find((f) => f.key === "phone-p1");
  expect(changedPhone?.value).toBe("222");
  expect(changedPhone?.previousValue).toBe("111");

  const newPhone = items[0]?.fields.find((f) => f.key === "phone-p2");
  expect(newPhone?.previousValue).toBeUndefined();

  const dob = items[0]?.fields.find((f) => f.key === "birth_date");
  expect(dob?.value).toBe("June 6, 1981");
  expect(dob?.previousValue).toBe("May 5, 1980");
});

test("buildMissingContactItems reports only the fields missing from the record", () => {
  const items = buildMissingContactItems({
    publishers: [{ id: "pub-1", first_name: "Amy", last_name: "Adams", congregation_id: "c1" }],
    records: [
      record({
        phone: [{ id: "p1", number: "111", label: "Mobile", version: version() }],
        email: [{ id: "e1", address: "a@b.c", label: "Home", version: version() }],
      }),
    ],
  });

  expect(items).toHaveLength(1);
  expect(items[0]?.publisher_name).toBe("Adams, Amy");
  expect(items[0]?.missing.map((f) => f.key)).toEqual(["address", "emergency_contact"]);
});

test("buildMissingContactItems treats a publisher with no record as missing every field", () => {
  const items = buildMissingContactItems({
    publishers: [{ id: "pub-1", first_name: "Amy", last_name: "Adams", congregation_id: "c1" }],
    records: [],
  });

  expect(items).toHaveLength(1);
  expect(items[0]?.missing.map((f) => f.key)).toEqual([
    "address",
    "phone",
    "email",
    "emergency_contact",
  ]);
});

test("buildMissingContactItems omits complete, archived, and removed publishers", () => {
  const items = buildMissingContactItems({
    publishers: [
      { id: "pub-1", first_name: "Amy", last_name: "Adams", congregation_id: "c1" },
      {
        id: "pub-2",
        first_name: "Bob",
        last_name: "Brown",
        congregation_id: "c1",
        archived_at: "2024-01-01",
      },
      {
        id: "pub-3",
        first_name: "Cora",
        last_name: "Clark",
        congregation_id: "c1",
        type: "removed",
      },
    ],
    records: [
      record({
        address: [{ id: "a1", label: "Home", street: "Main St", version: version() }],
        phone: [{ id: "p1", number: "111", label: "Mobile", version: version() }],
        email: [{ id: "e1", address: "a@b.c", label: "Home", version: version() }],
        emergency_contact: [
          {
            id: "ec1",
            first_name: "Jane",
            last_name: "Doe",
            relationship: "Wife",
            phone: [],
            version: version(),
          },
        ],
      }),
    ],
  });

  expect(items).toEqual([]);
});

test("buildMissingContactItems sorts publishers by last then first name", () => {
  const items = buildMissingContactItems({
    publishers: [
      { id: "pub-2", first_name: "Zoe", last_name: "Zimmerman", congregation_id: "c1" },
      { id: "pub-1", first_name: "Amy", last_name: "Adams", congregation_id: "c1" },
      { id: "pub-3", first_name: "Bea", last_name: "Adams", congregation_id: "c1" },
    ],
    records: [],
  });

  expect(items.map((i) => i.publisher_name)).toEqual([
    "Adams, Amy",
    "Adams, Bea",
    "Zimmerman, Zoe",
  ]);
});

test("buildContactDetailItem normalizes the phone number and trims fields", () => {
  const item = buildContactDetailItem("phone", { number: "0412 345 678", label: " Mobile " });
  expect(item).toMatchObject({ number: "+61 412 345 678", label: "Mobile" });
});

test("buildContactDetailItem drops empty optional address fields", () => {
  const item = buildContactDetailItem("address", {
    label: "",
    unit_number: " ",
    house_number: "12",
    street: "Main St",
    suburb: "",
  }) as NonNullable<PublisherLocal["address"]>[number];
  expect(item).toMatchObject({ house_number: "12", street: "Main St" });
  expect(item.unit_number).toBeUndefined();
  expect(item.suburb).toBeUndefined();
});

test("buildContactDetailItem builds an emergency contact with nested details", () => {
  const withBoth = buildContactDetailItem("emergency_contact", {
    first_name: "Jane",
    last_name: "Doe",
    relationship: "Wife",
    phone: "0412345678",
    email: "jane@example.com",
  }) as NonNullable<PublisherLocal["emergency_contact"]>[number];
  expect(withBoth.phone[0]?.number).toBe("+61 412 345 678");
  expect(withBoth.email?.[0]?.address).toBe("jane@example.com");

  const emailOnly = buildContactDetailItem("emergency_contact", {
    first_name: "Jane",
    last_name: "Doe",
    relationship: "",
    phone: " ",
    email: "jane@example.com",
  }) as NonNullable<PublisherLocal["emergency_contact"]>[number];
  expect(emailOnly.phone).toEqual([]);
  expect(emailOnly.email).toHaveLength(1);
});

test("addContactDetail inserts a new record when the publisher has none", async () => {
  const { collection } = createTestCollection();
  try {
    await addContactDetail(collection, "pub-1", "phone", {
      number: "0412345678",
      label: "Mobile",
    });

    const saved = collection.get("pub-1");
    expect(saved?.publisher_id).toBe("pub-1");
    expect(saved?.phone).toHaveLength(1);
    expect(saved?.phone?.[0]?.number).toBe("+61 412 345 678");

    const items = buildMissingContactItems({
      publishers: [{ id: "pub-1", first_name: "Amy", last_name: "Adams", congregation_id: "c1" }],
      records: [saved as PublisherLocal],
    });
    expect(items[0]?.missing.map((f) => f.key)).toEqual(["address", "email", "emergency_contact"]);
  } finally {
    await collection.cleanup().catch(() => {});
  }
});

test("addContactDetail appends to an existing record without dropping other fields", async () => {
  const { collection } = createTestCollection();
  try {
    const seeded = record({
      version: version({ updated_at: 5 }),
      phone: [{ id: "p1", number: "111", label: "Mobile", version: version({ updated_at: 5 }) }],
    });
    const seedTx = collection.insert(seeded);
    await seedTx.isPersisted.promise;

    await addContactDetail(collection, "pub-1", "email", {
      address: "amy@example.com",
      label: "Personal",
    });

    const saved = collection.get("pub-1");
    expect(saved?.phone).toHaveLength(1);
    expect(saved?.email).toHaveLength(1);
    expect(saved?.email?.[0]?.address).toBe("amy@example.com");
    // Doc version is touched so a later merge can tell this record was edited.
    expect(saved?.version.updated_at).toBeGreaterThan(5);
  } finally {
    await collection.cleanup().catch(() => {});
  }
});

test("addContactDetail for an emergency contact clears that field from the missing list", async () => {
  const { collection } = createTestCollection();
  try {
    const seedTx = collection.insert(
      record({
        address: [{ id: "a1", label: "Home", street: "Main St", version: version() }],
        phone: [{ id: "p1", number: "111", label: "Mobile", version: version() }],
        email: [{ id: "e1", address: "a@b.c", label: "Home", version: version() }],
      }),
    );
    await seedTx.isPersisted.promise;

    await addContactDetail(collection, "pub-1", "emergency_contact", {
      first_name: "Jane",
      last_name: "Doe",
      relationship: "Wife",
      phone: "0412345678",
      email: "",
    });

    const saved = collection.get("pub-1") as PublisherLocal;
    expect(saved.emergency_contact).toHaveLength(1);
    expect(saved.emergency_contact?.[0]?.first_name).toBe("Jane");
    const items = buildMissingContactItems({
      publishers: [{ id: "pub-1", first_name: "Amy", last_name: "Adams", congregation_id: "c1" }],
      records: [saved],
    });
    expect(items).toEqual([]);
  } finally {
    await collection.cleanup().catch(() => {});
  }
});

test("addContactDetail appends to an already populated field array", async () => {
  const { collection } = createTestCollection();
  try {
    const seedTx = collection.insert(
      record({
        phone: [{ id: "p1", number: "111", label: "Mobile", version: version() }],
      }),
    );
    await seedTx.isPersisted.promise;

    await addContactDetail(collection, "pub-1", "phone", {
      number: "0422987654",
      label: "Work",
    });

    const saved = collection.get("pub-1");
    expect(saved?.phone).toHaveLength(2);
    expect(saved?.phone?.[0]?.id).toBe("p1");
    expect(saved?.phone?.[0]?.number).toBe("111");
    expect(saved?.phone?.[1]?.number).toBe("+61 422 987 654");
  } finally {
    await collection.cleanup().catch(() => {});
  }
});
