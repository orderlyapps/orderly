import type { Publisher } from "./schema.ts";

export const ELDER_STANDING = "elder";
export const MINISTERIAL_SERVANT_STANDING = "ministerial_servant";

export const PIONEER_TYPES: ReadonlySet<string> = new Set([
  "continuous_auxiliary",
  "regular_pioneer",
  "special_pioneer",
]);

export interface PublisherGroups {
  elders: Publisher[];
  ministerialServants: Publisher[];
  pioneers: Publisher[];
}

export function isArchived(publisher: Publisher): boolean {
  return publisher.archived_at != null;
}

export function isRemoved(publisher: Publisher): boolean {
  return publisher.type === "removed";
}

export function isElder(publisher: Publisher): boolean {
  return publisher.standing === ELDER_STANDING;
}

export function isMinisterialServant(publisher: Publisher): boolean {
  return publisher.standing === MINISTERIAL_SERVANT_STANDING;
}

export function isPioneer(publisher: Publisher): boolean {
  return PIONEER_TYPES.has(publisher.type ?? "");
}

const PIONEER_BADGE_LABELS: Record<string, string> = {
  continuous_auxiliary: "Auxiliary",
  special_pioneer: "Special",
};

export function pioneerBadgeLabel(publisher: Publisher): string | null {
  return publisher.type ? (PIONEER_BADGE_LABELS[publisher.type] ?? null) : null;
}

export function groupPublishers(publishers: Publisher[]): PublisherGroups {
  const groups: PublisherGroups = { elders: [], ministerialServants: [], pioneers: [] };
  for (const publisher of publishers) {
    if (isArchived(publisher) || isRemoved(publisher)) {
      continue;
    }
    if (isElder(publisher)) {
      groups.elders.push(publisher);
    }
    if (isMinisterialServant(publisher)) {
      groups.ministerialServants.push(publisher);
    }
    if (isPioneer(publisher)) {
      groups.pioneers.push(publisher);
    }
  }
  return groups;
}
