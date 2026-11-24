import type { Publisher } from "../publisher/schema.ts";
import { formatAddressDisplay, type NameLookup } from "./address.ts";
import type {
  PublisherLocal,
  PublisherLocalAddress,
  PublisherLocalEmergencyContact,
} from "./schema.ts";
import {
  diffPublisherLocalRecords,
  normalizedPublisherLocalMap,
  type PublisherLocalUpdatedFields,
} from "./transfer.ts";

export interface PreviewField {
  key: string;
  label: string;
  value: string;
  previousValue?: string;
}

export interface PublisherImportPreviewItem {
  publisher_id: string;
  publisher_name: string;
  last_name: string;
  first_name: string;
  fields: PreviewField[];
}

export function formatDate(dateStr: string): string {
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

function formatAddressValue(
  addr: PublisherLocalAddress,
  suburbs: NameLookup[],
  streets: NameLookup[],
): string {
  const formatted = formatAddressDisplay(addr, suburbs, streets);
  return formatted === "-" && (addr.coordinates?.length ?? 0) >= 2
    ? `${addr.coordinates?.[1]}, ${addr.coordinates?.[0]}`
    : formatted;
}

function formatContactDetails(
  contact: PublisherLocalEmergencyContact,
  suburbs: NameLookup[],
  streets: NameLookup[],
): string {
  const phones = (contact.phone ?? []).map((p) => p.number);
  const emails = (contact.email ?? []).map((e) => e.address);
  const addresses = (contact.address ?? [])
    .map((a) => formatAddressDisplay(a, suburbs, streets))
    .filter((v) => v !== "-");
  const details = [...phones, ...emails, ...addresses].join(" • ");
  return details || `${contact.first_name} ${contact.last_name}`;
}

function formatUpdatedFields(
  diff: PublisherLocalUpdatedFields,
  before: PublisherLocal | undefined,
  suburbs: NameLookup[],
  streets: NameLookup[],
): PreviewField[] {
  const fields: PreviewField[] = [];

  if (diff.birth_date) {
    fields.push({
      key: "birth_date",
      label: "Date of Birth",
      value: formatDate(diff.birth_date),
      previousValue: before?.birth_date?.value ? formatDate(before.birth_date.value) : undefined,
    });
  }

  if (diff.baptism_date) {
    fields.push({
      key: "baptism_date",
      label: "Baptism Date",
      value: formatDate(diff.baptism_date),
      previousValue: before?.baptism_date?.value
        ? formatDate(before.baptism_date.value)
        : undefined,
    });
  }

  const beforeAddresses = new Map((before?.address ?? []).map((a) => [a.id, a]));
  for (const addr of diff.address) {
    const prev = beforeAddresses.get(addr.id);
    fields.push({
      key: `address-${addr.id}`,
      label: addr.label ? `${addr.label} Address` : "Address",
      value: formatAddressValue(addr, suburbs, streets),
      previousValue: prev ? formatAddressValue(prev, suburbs, streets) : undefined,
    });
  }

  const beforePhones = new Map((before?.phone ?? []).map((p) => [p.id, p]));
  for (const p of diff.phone) {
    fields.push({
      key: `phone-${p.id}`,
      label: p.label ? `${p.label} Phone` : "Phone",
      value: p.number,
      previousValue: beforePhones.get(p.id)?.number,
    });
  }

  const beforeEmails = new Map((before?.email ?? []).map((e) => [e.id, e]));
  for (const e of diff.email) {
    fields.push({
      key: `email-${e.id}`,
      label: e.label ? `${e.label} Email` : "Email",
      value: e.address,
      previousValue: beforeEmails.get(e.id)?.address,
    });
  }

  const beforeContacts = new Map((before?.emergency_contact ?? []).map((c) => [c.id, c]));
  for (const contact of diff.emergency_contact) {
    const prev = beforeContacts.get(contact.id);
    fields.push({
      key: `emergency-${contact.id}`,
      label: `Emergency Contact (${contact.first_name} ${contact.last_name} - ${contact.relationship})`,
      value: formatContactDetails(contact, suburbs, streets),
      previousValue: prev ? formatContactDetails(prev, suburbs, streets) : undefined,
    });
  }

  const beforePhotos = new Map((before?.photo ?? []).map((p) => [p.id, p]));
  for (const photo of diff.photo) {
    const prev = beforePhotos.get(photo.id);
    fields.push({
      key: `photo-${photo.id}`,
      label: "Photo",
      value: photo.label || "Updated photo",
      previousValue: prev ? prev.label || "Photo" : undefined,
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

  const beforeMap = normalizedPublisherLocalMap(existing);

  return diffPublisherLocalRecords(existing, records, beforeMap)
    .map((diff) => {
      const pub = publisherMap.get(diff.publisher_id);
      return {
        publisher_id: diff.publisher_id,
        publisher_name: formatPublisherName(pub, diff.publisher_id),
        last_name: pub?.last_name ?? diff.publisher_id,
        first_name: pub?.first_name ?? "",
        fields: formatUpdatedFields(diff, beforeMap.get(diff.publisher_id), suburbs, streets),
      };
    })
    .sort(
      (a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name),
    );
}
