import type { PublisherLocalAddress } from "./schema.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface NameLookup {
  id?: string;
  name: string;
}

export function resolveName(
  value: string | undefined,
  lookup: NameLookup[],
): { id: string; name: string } | undefined {
  if (!value) return undefined;
  if (UUID_RE.test(value)) {
    const found = lookup.find((s) => s.id === value);
    return found ? { id: found.id!, name: found.name } : { id: value, name: value };
  }
  return { id: value, name: value };
}

export function formatAddressDisplay(
  entry: PublisherLocalAddress,
  suburbs: NameLookup[],
  streets: NameLookup[],
): string {
  const street = resolveName(entry.street, streets);
  const suburb = resolveName(entry.suburb, suburbs);
  const numberPart =
    entry.unit_number && entry.house_number
      ? `${entry.unit_number}/${entry.house_number}`
      : entry.unit_number || entry.house_number;
  const parts = [numberPart, street?.name, suburb?.name].filter(Boolean);
  return parts.join(" ") || "-";
}
