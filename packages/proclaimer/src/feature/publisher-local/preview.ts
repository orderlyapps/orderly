import type { Publisher } from "../publisher/schema.ts";
import { formatAddressDisplay, type NameLookup } from "./address.ts";
import type { PublisherLocal } from "./schema.ts";
import { diffPublisherLocalRecords, type PublisherLocalUpdatedFields } from "./transfer.ts";

export interface PreviewField {
  key: string;
  label: string;
  value: string;
}

export interface PublisherImportPreviewItem {
  publisher_id: string;
  publisher_name: string;
  last_name: string;
  first_name: string;
  fields: PreviewField[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  // "YYYY-MM-DD" parses as UTC midnight — format in UTC so the calendar day
  // doesn't shift in timezones behind UTC.
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatPublisherName(publisher: Publisher | undefined, fallbackId: string): string {
  if (!publisher) return fallbackId;
  const first = publisher.display_name || publisher.first_name;
  const middle = publisher.middle_name ?? "";
  return middle ? `${publisher.last_name}, ${first} ${middle}` : `${publisher.last_name}, ${first}`;
}

function formatUpdatedFields(
  diff: PublisherLocalUpdatedFields,
  suburbs: NameLookup[],
  streets: NameLookup[],
): PreviewField[] {
  const fields: PreviewField[] = [];

  if (diff.birth_date) {
    fields.push({ key: "birth_date", label: "Date of Birth", value: formatDate(diff.birth_date) });
  }

  if (diff.baptism_date) {
    fields.push({
      key: "baptism_date",
      label: "Baptism Date",
      value: formatDate(diff.baptism_date),
    });
  }

  for (const addr of diff.address) {
    const formatted = formatAddressDisplay(addr, suburbs, streets);
    const coordsText =
      formatted === "-" && (addr.coordinates?.length ?? 0) >= 2
        ? `${addr.coordinates?.[1]}, ${addr.coordinates?.[0]}`
        : formatted;
    fields.push({
      key: `address-${addr.id}`,
      label: addr.label ? `${addr.label} Address` : "Address",
      value: coordsText,
    });
  }

  for (const p of diff.phone) {
    fields.push({
      key: `phone-${p.id}`,
      label: p.label ? `${p.label} Phone` : "Phone",
      value: p.number,
    });
  }

  for (const e of diff.email) {
    fields.push({
      key: `email-${e.id}`,
      label: e.label ? `${e.label} Email` : "Email",
      value: e.address,
    });
  }

  for (const contact of diff.emergency_contact) {
    const phones = (contact.phone ?? []).map((p) => p.number);
    const emails = (contact.email ?? []).map((e) => e.address);
    const addresses = (contact.address ?? [])
      .map((a) => formatAddressDisplay(a, suburbs, streets))
      .filter((v) => v !== "-");
    const details = [...phones, ...emails, ...addresses].join(" • ");
    fields.push({
      key: `emergency-${contact.id}`,
      label: `Emergency Contact (${contact.first_name} ${contact.last_name} - ${contact.relationship})`,
      value: details || `${contact.first_name} ${contact.last_name}`,
    });
  }

  for (const photo of diff.photo) {
    fields.push({
      key: `photo-${photo.id}`,
      label: "Photo",
      value: photo.label || "Updated photo",
    });
  }

  return fields;
}

export interface BuildImportPreviewInput {
  records: PublisherLocal[] | null;
  existing: PublisherLocal[];
  publishers: Publisher[];
  suburbs?: NameLookup[];
  streets?: NameLookup[];
}

export function buildImportPreviewItems({
  records,
  existing,
  publishers,
  suburbs = [],
  streets = [],
}: BuildImportPreviewInput): PublisherImportPreviewItem[] {
  if (!records) {
    return [];
  }

  const publisherMap = new Map<string, Publisher>();
  for (const p of publishers) {
    if (p.id) publisherMap.set(p.id, p);
  }

  return diffPublisherLocalRecords(existing, records)
    .map((diff) => {
      const pub = publisherMap.get(diff.publisher_id);
      return {
        publisher_id: diff.publisher_id,
        publisher_name: formatPublisherName(pub, diff.publisher_id),
        last_name: pub?.last_name ?? diff.publisher_id,
        first_name: pub?.first_name ?? "",
        fields: formatUpdatedFields(diff, suburbs, streets),
      };
    })
    .sort(
      (a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name),
    );
}
