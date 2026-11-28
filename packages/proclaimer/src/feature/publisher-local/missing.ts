import {
  getPublisherDisplayName,
  isArchived,
  isRemoved,
  type Publisher,
  type PublisherType,
} from "../publisher/index.ts";
import type { PublisherLocal } from "./schema.ts";

// Contact details a secretary is expected to hold for each publisher.
export const MISSING_CONTACT_FIELDS = [
  { key: "address", label: "Address" },
  { key: "phone", label: "Phone number" },
  { key: "email", label: "Email" },
  { key: "emergency_contact", label: "Emergency contact" },
] as const;

export type MissingContactField = (typeof MISSING_CONTACT_FIELDS)[number];

// The family head lives on the publisher row rather than the on-device
// record, but a publisher without one is listed as missing it too.
export const FAMILY_HEAD_FIELD = { key: "family_head", label: "Family head" } as const;

export type MissingField = MissingContactField | typeof FAMILY_HEAD_FIELD;

export interface MissingContactItem {
  publisher_id: string;
  publisher_name: string;
  last_name: string;
  first_name: string;
  missing: MissingField[];
}

export interface BuildMissingContactItemsInput {
  publishers: Publisher[];
  records: PublisherLocal[];
  visibleTypes?: readonly PublisherType[];
  showArchived?: boolean;
  includeComplete?: boolean;
}

/**
 * Lists publishers that are missing details — contact details absent
 * from the on-device record, or no family head assigned. Active publishers
 * are shown by default, archived publishers are shown instead when
 * showArchived is true, and removed publishers are always excluded. A
 * publisher with no record at all is reported as missing every field.
 */
export function buildMissingContactItems({
  publishers,
  records,
  visibleTypes,
  showArchived = false,
  includeComplete = false,
}: BuildMissingContactItemsInput): MissingContactItem[] {
  const visibleTypeSet = visibleTypes ? new Set(visibleTypes) : null;
  const recordMap = new Map(records.map((r) => [r.publisher_id, r]));
  const items: MissingContactItem[] = [];
  for (const publisher of publishers) {
    if (
      !publisher.id ||
      showArchived !== isArchived(publisher) ||
      isRemoved(publisher) ||
      (visibleTypeSet && (!publisher.type || !visibleTypeSet.has(publisher.type)))
    ) {
      continue;
    }
    const record = recordMap.get(publisher.id);
    const missing: MissingField[] = MISSING_CONTACT_FIELDS.filter(
      (field) => !record?.[field.key]?.length,
    );
    if (!publisher.family_id) {
      missing.push(FAMILY_HEAD_FIELD);
    }
    if (!includeComplete && missing.length === 0) {
      continue;
    }
    items.push({
      publisher_id: publisher.id,
      publisher_name: getPublisherDisplayName(publisher),
      last_name: publisher.last_name,
      first_name: publisher.first_name,
      missing,
    });
  }
  return items.sort(
    (a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name),
  );
}
