import {
  getPublisherDisplayName,
  isArchived,
  isRemoved,
  type Publisher,
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

export interface MissingContactItem {
  publisher_id: string;
  publisher_name: string;
  last_name: string;
  first_name: string;
  missing: MissingContactField[];
}

export interface BuildMissingContactItemsInput {
  publishers: Publisher[];
  records: PublisherLocal[];
}

/**
 * Lists active publishers whose on-device record is missing contact details.
 * Archived and removed publishers are excluded; a publisher with no record at
 * all is reported as missing every field.
 */
export function buildMissingContactItems({
  publishers,
  records,
}: BuildMissingContactItemsInput): MissingContactItem[] {
  const recordMap = new Map(records.map((r) => [r.publisher_id, r]));
  const items: MissingContactItem[] = [];
  for (const publisher of publishers) {
    if (!publisher.id || isArchived(publisher) || isRemoved(publisher)) {
      continue;
    }
    const record = recordMap.get(publisher.id);
    const missing = MISSING_CONTACT_FIELDS.filter((field) => !record?.[field.key]?.length);
    if (missing.length === 0) {
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
