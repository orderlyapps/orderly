import type { PublisherLocalCollection } from "./collection.ts";
import { isPublisherLocalRecord, type PublisherLocal, type Version } from "./schema.ts";

/**
 * Fields that are always included in an export. These are required by the
 * schema (primary key, identity, version metadata) and must be present for the
 * exported data to remain valid for re-import.
 */
export const ALWAYS_EXPORTED_PUBLISHER_FIELDS = [
  "publisher_id",
  "confidential_id",
  "version",
] as const satisfies readonly (keyof PublisherLocal)[];

/**
 * Optional fields the user may opt-in to include in an export.
 */
export const OPTIONAL_PUBLISHER_EXPORT_FIELDS = [
  "phone",
  "address",
  "email",
  "emergency_contact",
  "photo",
  "birth_date",
  "baptism_date",
] as const satisfies readonly (keyof PublisherLocal)[];

export type OptionalPublisherExportField = (typeof OPTIONAL_PUBLISHER_EXPORT_FIELDS)[number];

/** File extensions accepted by the import picker (.ord is the legacy proclaimer export). */
export const PUBLISHER_LOCAL_FILE_ACCEPT = ".ord,.json";

export function buildPublisherLocalExport(
  records: PublisherLocal[],
  selectedOptionalFields: readonly OptionalPublisherExportField[],
): string {
  const allowedKeys = new Set<keyof PublisherLocal>([
    ...ALWAYS_EXPORTED_PUBLISHER_FIELDS,
    ...selectedOptionalFields,
  ]);
  const data = records.map((record) => {
    const filtered: Partial<PublisherLocal> = {};
    for (const key of Object.keys(record) as (keyof PublisherLocal)[]) {
      if (allowedKeys.has(key)) {
        (filtered as Record<string, unknown>)[key] = record[key];
      }
    }
    return filtered;
  });
  return JSON.stringify(data, null, 2);
}

export function generateExportFilename(): string {
  const date = new Date().toISOString().split("T")[0];
  return `publisher-local-${date}.json`;
}

function emptyVersion(): Version {
  return { created_by: "", updated_by: "", created_at: 0, updated_at: 0 };
}

function updatedAt(item: { version?: Version; updated_at?: number }): number {
  return item.version?.updated_at ?? item.updated_at ?? 0;
}

/**
 * Normalizes a record from an external source (file import / data share).
 * Older exports store dates as plain strings and items may lack version
 * metadata — those get an epoch version so they only win when no versioned
 * value exists locally.
 */
export function normalizePublisherLocal(doc: PublisherLocal): PublisherLocal {
  const dated = (value: unknown): PublisherLocal["birth_date"] => {
    if (typeof value === "string") {
      return value ? { value, version: emptyVersion() } : undefined;
    }
    if (value && typeof value === "object" && "value" in value) {
      const v = value as { value?: string; version?: Version };
      return v.value ? { value: v.value, version: v.version ?? emptyVersion() } : undefined;
    }
    return undefined;
  };
  // Import files are user-supplied — fields may be missing or malformed, so
  // non-array lists, entries without a usable id, and duplicate ids (last one
  // wins, matching the per-id merge) are dropped rather than crashing or
  // persisting inconsistent data.
  const dedupById = <T extends { id: string }>(list: T[]): T[] => [
    ...new Map(list.map((item) => [item.id, item])).values(),
  ];
  const items = <T extends { id: string; version?: Version }>(list: T[] | undefined) =>
    Array.isArray(list)
      ? dedupById(
          list
            .filter(
              (item) => typeof item === "object" && item !== null && typeof item.id === "string",
            )
            .map((item) => ({ ...item, version: item.version ?? emptyVersion() }) as T),
        )
      : undefined;
  const photos = (list: PublisherLocal["photo"] | undefined) =>
    Array.isArray(list)
      ? dedupById(
          list
            .filter(
              (item) => typeof item === "object" && item !== null && typeof item.id === "string",
            )
            .map((item) => ({
              ...item,
              created_by: item.created_by ?? "",
              updated_by: item.updated_by ?? "",
              created_at: item.created_at ?? 0,
              updated_at: item.updated_at ?? 0,
            })),
        )
      : undefined;

  return {
    publisher_id: doc.publisher_id,
    confidential_id: doc.confidential_id ?? "",
    phone: items(doc.phone),
    address: items(doc.address),
    email: items(doc.email),
    emergency_contact: Array.isArray(doc.emergency_contact)
      ? dedupById(
          doc.emergency_contact
            .filter(
              (contact) =>
                typeof contact === "object" && contact !== null && typeof contact.id === "string",
            )
            .map(
              (contact) =>
                ({
                  id: contact.id,
                  first_name: contact.first_name ?? "",
                  last_name: contact.last_name ?? "",
                  relationship: contact.relationship ?? "",
                  email: items(contact.email),
                  phone: items(contact.phone) ?? [],
                  address: items(contact.address),
                  version: contact.version ?? emptyVersion(),
                }) as NonNullable<PublisherLocal["emergency_contact"]>[number],
            ),
        )
      : undefined,
    photo: photos(doc.photo),
    birth_date: dated(doc.birth_date),
    baptism_date: dated(doc.baptism_date),
    version: doc.version ?? emptyVersion(),
  };
}

/**
 * Merges array items by id — the item with the newer `updated_at` wins.
 * Items only present on one side are kept.
 */
function mergeItems<T extends { id: string; version?: Version; updated_at?: number }>(
  existing: T[] | undefined,
  incoming: T[] | undefined,
): T[] {
  if (!incoming) return existing ?? [];
  const merged = new Map((existing ?? []).map((item) => [item.id, item]));
  for (const item of incoming) {
    const current = merged.get(item.id);
    if (!current || updatedAt(item) >= updatedAt(current)) merged.set(item.id, item);
  }
  return [...merged.values()];
}

/**
 * Emergency contacts merge deeper than other arrays: when the same contact id
 * exists on both sides, scalar fields go to the newer contact while nested
 * phone/email/address lists merge per-item so additions from both sides are
 * kept.
 */
function mergeContacts(
  existing: PublisherLocal["emergency_contact"],
  incoming: PublisherLocal["emergency_contact"],
): PublisherLocal["emergency_contact"] {
  if (!incoming) return existing;
  const merged = new Map((existing ?? []).map((contact) => [contact.id, contact]));
  for (const contact of incoming) {
    const current = merged.get(contact.id);
    if (!current) {
      merged.set(contact.id, contact);
      continue;
    }
    const newer = updatedAt(contact) >= updatedAt(current) ? contact : current;
    merged.set(contact.id, {
      ...newer,
      email: mergeItems(current.email, contact.email),
      phone: mergeItems(current.phone, contact.phone),
      address: mergeItems(current.address, contact.address),
    });
  }
  return [...merged.values()];
}

function mergeDatedValue(
  existing: PublisherLocal["birth_date"],
  incoming: PublisherLocal["birth_date"],
): PublisherLocal["birth_date"] {
  if (!existing?.value) return incoming?.value ? incoming : undefined;
  if (!incoming?.value) return existing;
  return updatedAt(incoming) >= updatedAt(existing) ? incoming : existing;
}

/**
 * Document audit: `created_*` comes from whichever doc was created first,
 * `updated_*` from whichever was modified most recently.
 */
function mergeDocVersion(existing: Version, incoming: Version): Version {
  const creator = existing.created_at <= incoming.created_at ? existing : incoming;
  const updater = existing.updated_at >= incoming.updated_at ? existing : incoming;
  return {
    created_by: creator.created_by,
    created_at: creator.created_at,
    updated_by: updater.updated_by,
    updated_at: updater.updated_at,
  };
}

export function mergePublisherLocal(
  existing: PublisherLocal,
  incoming: PublisherLocal,
): PublisherLocal {
  return {
    publisher_id: existing.publisher_id,
    confidential_id: (existing.confidential_id || incoming.confidential_id) ?? "",
    phone: mergeItems(existing.phone, incoming.phone),
    address: mergeItems(existing.address, incoming.address),
    email: mergeItems(existing.email, incoming.email),
    emergency_contact: mergeContacts(existing.emergency_contact, incoming.emergency_contact),
    photo: mergeItems(existing.photo, incoming.photo),
    birth_date: mergeDatedValue(existing.birth_date, incoming.birth_date),
    baptism_date: mergeDatedValue(existing.baptism_date, incoming.baptism_date),
    version: mergeDocVersion(existing.version, incoming.version),
  };
}

export interface PublisherLocalUpdatedFields {
  publisher_id: string;
  birth_date?: string;
  baptism_date?: string;
  phone: NonNullable<PublisherLocal["phone"]>;
  address: NonNullable<PublisherLocal["address"]>;
  email: NonNullable<PublisherLocal["email"]>;
  emergency_contact: NonNullable<PublisherLocal["emergency_contact"]>;
  photo: NonNullable<PublisherLocal["photo"]>;
}

function isPhoneEqual(
  a: NonNullable<PublisherLocal["phone"]>[number],
  b: NonNullable<PublisherLocal["phone"]>[number],
): boolean {
  return a.number === b.number && a.label === b.label;
}

function isCoordinatesEqual(a: number[] | undefined, b: number[] | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function isAddressEqual(
  a: NonNullable<PublisherLocal["address"]>[number],
  b: NonNullable<PublisherLocal["address"]>[number],
): boolean {
  return (
    a.label === b.label &&
    (a.unit_number ?? "") === (b.unit_number ?? "") &&
    (a.house_number ?? "") === (b.house_number ?? "") &&
    (a.street ?? "") === (b.street ?? "") &&
    (a.suburb ?? "") === (b.suburb ?? "") &&
    isCoordinatesEqual(a.coordinates, b.coordinates)
  );
}

function isEmailEqual(
  a: NonNullable<PublisherLocal["email"]>[number],
  b: NonNullable<PublisherLocal["email"]>[number],
): boolean {
  return a.address === b.address && a.label === b.label;
}

function isEmergencyContactEqual(
  a: NonNullable<PublisherLocal["emergency_contact"]>[number],
  b: NonNullable<PublisherLocal["emergency_contact"]>[number],
): boolean {
  if (
    a.first_name !== b.first_name ||
    a.last_name !== b.last_name ||
    a.relationship !== b.relationship
  ) {
    return false;
  }
  const aPhones = a.phone ?? [];
  const bPhones = b.phone ?? [];
  if (
    aPhones.length !== bPhones.length ||
    aPhones.some((p) => {
      const match = bPhones.find((bp) => bp.id === p.id);
      return !match || !isPhoneEqual(p, match);
    })
  ) {
    return false;
  }
  const aEmails = a.email ?? [];
  const bEmails = b.email ?? [];
  if (
    aEmails.length !== bEmails.length ||
    aEmails.some((e) => {
      const match = bEmails.find((be) => be.id === e.id);
      return !match || !isEmailEqual(e, match);
    })
  ) {
    return false;
  }
  const aAddresses = a.address ?? [];
  const bAddresses = b.address ?? [];
  if (
    aAddresses.length !== bAddresses.length ||
    aAddresses.some((addr) => {
      const match = bAddresses.find((ba) => ba.id === addr.id);
      return !match || !isAddressEqual(addr, match);
    })
  ) {
    return false;
  }
  return true;
}

function isPhotoEqual(
  a: NonNullable<PublisherLocal["photo"]>[number],
  b: NonNullable<PublisherLocal["photo"]>[number],
): boolean {
  return a.data === b.data && a.label === b.label && a.mime_type === b.mime_type;
}

function diffSinglePublisherLocal(
  before: PublisherLocal | undefined,
  after: PublisherLocal,
): PublisherLocalUpdatedFields | null {
  const beforePhones = new Map((before?.phone ?? []).map((p) => [p.id, p]));
  const phone = (after.phone ?? []).filter((item) => {
    const prev = beforePhones.get(item.id);
    return !prev || !isPhoneEqual(prev, item);
  });

  const beforeAddresses = new Map((before?.address ?? []).map((a) => [a.id, a]));
  const address = (after.address ?? []).filter((item) => {
    const prev = beforeAddresses.get(item.id);
    return !prev || !isAddressEqual(prev, item);
  });

  const beforeEmails = new Map((before?.email ?? []).map((e) => [e.id, e]));
  const email = (after.email ?? []).filter((item) => {
    const prev = beforeEmails.get(item.id);
    return !prev || !isEmailEqual(prev, item);
  });

  const beforeContacts = new Map((before?.emergency_contact ?? []).map((c) => [c.id, c]));
  const emergency_contact = (after.emergency_contact ?? []).filter((item) => {
    const prev = beforeContacts.get(item.id);
    return !prev || !isEmergencyContactEqual(prev, item);
  });

  const beforePhotos = new Map((before?.photo ?? []).map((p) => [p.id, p]));
  const photo = (after.photo ?? []).filter((item) => {
    const prev = beforePhotos.get(item.id);
    return !prev || !isPhotoEqual(prev, item);
  });

  const birth_date =
    after.birth_date?.value && after.birth_date.value !== (before?.birth_date?.value ?? "")
      ? after.birth_date.value
      : undefined;

  const baptism_date =
    after.baptism_date?.value && after.baptism_date.value !== (before?.baptism_date?.value ?? "")
      ? after.baptism_date.value
      : undefined;

  if (
    !birth_date &&
    !baptism_date &&
    phone.length === 0 &&
    address.length === 0 &&
    email.length === 0 &&
    emergency_contact.length === 0 &&
    photo.length === 0
  ) {
    return null;
  }

  return {
    publisher_id: after.publisher_id,
    birth_date,
    baptism_date,
    phone,
    address,
    email,
    emergency_contact,
    photo,
  };
}

/**
 * Normalizes records into a publisher_id → record map so lookups and diffs
 * can share a single normalization pass.
 */
export function normalizedPublisherLocalMap(docs: PublisherLocal[]): Map<string, PublisherLocal> {
  return new Map(docs.map((doc) => [doc.publisher_id, normalizePublisherLocal(doc)]));
}

/**
 * Computes which fields would be added or updated for each publisher if
 * `records` were merged into `existing`.
 */
export function diffPublisherLocalRecords(
  existing: PublisherLocal[],
  records: PublisherLocal[],
  // Normalize the existing docs too — stored records may carry legacy
  // unversioned fields, and the diff must reflect what a merge would produce.
  // Callers that already normalized `existing` may pass the map themselves.
  beforeMap: Map<string, PublisherLocal> = normalizedPublisherLocalMap(existing),
): PublisherLocalUpdatedFields[] {
  const afterMap = new Map<string, PublisherLocal>();

  for (const raw of records) {
    const incoming = normalizePublisherLocal(raw);
    const current = afterMap.get(incoming.publisher_id) ?? beforeMap.get(incoming.publisher_id);
    afterMap.set(
      incoming.publisher_id,
      current ? mergePublisherLocal(current, incoming) : incoming,
    );
  }

  const updated: PublisherLocalUpdatedFields[] = [];
  for (const [publisher_id, after] of afterMap) {
    const diff = diffSinglePublisherLocal(beforeMap.get(publisher_id), after);
    if (diff) {
      updated.push(diff);
    }
  }
  return updated;
}

export function parsePublisherLocalRecords(text: string): PublisherLocal[] {
  const parsed: unknown = JSON.parse(text);
  const list = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === "object" &&
        "type" in parsed &&
        parsed.type === "publisher-local" &&
        "data" in parsed &&
        Array.isArray(parsed.data)
      ? (parsed.data as unknown[])
      : null;
  if (!list) {
    throw new Error("Invalid file format: expected publisher-local data");
  }
  if (!list.every(isPublisherLocalRecord)) {
    throw new Error("Invalid file format: record is missing a publisher_id");
  }
  return list;
}

function isQuotaExceededError(error: unknown): boolean {
  return (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

// Photo fields carry base64 payloads, so a large import can exceed the
// localStorage quota — surface that as an actionable message.
async function awaitPersisted(tx: { isPersisted: { promise: Promise<unknown> } }): Promise<void> {
  try {
    await tx.isPersisted.promise;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      throw new Error(
        "Not enough storage space on this device to import these records. Remove photos or split the import into smaller files.",
      );
    }
    throw error;
  }
}

/**
 * Merges records into the local collection. Incoming records are matched by
 * `publisher_id`; conflicting values resolve to the most recently updated
 * (`updated_at`) value, and locally-only records are left untouched.
 */
export async function importPublisherLocalRecords(
  collection: PublisherLocalCollection,
  records: PublisherLocal[],
): Promise<PublisherLocalUpdatedFields[]> {
  await collection.preload();
  const existingList = collection.toArray.map((doc) =>
    normalizePublisherLocal(doc as PublisherLocal),
  );
  const existingMap = new Map(existingList.map((doc) => [doc.publisher_id, doc]));
  const updated = diffPublisherLocalRecords(existingList, records, existingMap);

  const inserts = new Map<string, PublisherLocal>();
  for (const raw of records) {
    const incoming = normalizePublisherLocal(raw);
    const current = existingMap.get(incoming.publisher_id) ?? inserts.get(incoming.publisher_id);
    if (!current) {
      inserts.set(incoming.publisher_id, incoming);
    } else if (existingMap.has(incoming.publisher_id)) {
      const merged = mergePublisherLocal(current, incoming);
      const tx = collection.update(incoming.publisher_id, (draft) => {
        Object.assign(draft, merged);
      });
      await awaitPersisted(tx);
      existingMap.set(incoming.publisher_id, merged);
    } else {
      inserts.set(incoming.publisher_id, mergePublisherLocal(current, incoming));
    }
  }
  if (inserts.size > 0) {
    const tx = collection.insert([...inserts.values()]);
    await awaitPersisted(tx);
  }
  return updated;
}
