import {
  getPublisherDisplayName,
  isPublisherRowId,
  type Publisher,
  type PublisherStanding,
  type PublisherType,
} from "./schema.ts";

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

export function isActiveElderOrMinisterialServant(publisher: Publisher): boolean {
  return (
    !isArchived(publisher) &&
    !isRemoved(publisher) &&
    (isElder(publisher) || isMinisterialServant(publisher))
  );
}

const PIONEER_BADGE_LABELS: Record<string, string> = {
  continuous_auxiliary: "Auxiliary",
  special_pioneer: "Special",
};

export function pioneerBadgeLabel(publisher: Publisher): string | null {
  return publisher.type ? (PIONEER_BADGE_LABELS[publisher.type] ?? null) : null;
}

const STANDING_LABELS: Record<PublisherStanding, string> = {
  elder: "Elder",
  ministerial_servant: "Ministerial Servant",
  publisher: "Publisher",
  unbaptised_publisher: "Unbaptised Publisher",
  associate: "Associate",
  congregation: "Congregation",
  other: "Other",
};

export function publisherStandingLabel(publisher: Publisher): string | null {
  return publisher.standing ? STANDING_LABELS[publisher.standing] : null;
}

const TYPE_LABELS: Record<PublisherType, string> = {
  publisher: "Publisher",
  unbaptised_publisher: "Unbaptised Publisher",
  regular_pioneer: "Regular Pioneer",
  special_pioneer: "Special Pioneer",
  continuous_auxiliary: "Continuous Auxiliary",
  inactive: "Inactive",
  speaker: "Speaker",
  associate: "Associate",
  removed: "Removed",
  circuit_overseer: "Circuit Overseer",
  congregation: "Congregation",
  child: "Child",
  spouse: "Spouse",
};

export function publisherTypeLabel(publisher: Publisher): string | null {
  return publisher.type ? TYPE_LABELS[publisher.type] : null;
}

/**
 * Display name for the publisher's family head. A family head's `family_id`
 * points at their own row, so they resolve to themselves.
 */
export function familyHeadLabel(publisher: Publisher, publishers: Publisher[]): string {
  if (!publisher.family_id) {
    return "None";
  }
  const head = publishers.find((p) => p.id === publisher.family_id);
  return head ? getPublisherDisplayName(head) : "Unknown";
}

/**
 * Publishers that may be picked as `publisher`'s family head: existing heads
 * (a head's `family_id` points at their own row, `removed` rows excluded), the
 * publisher themselves so they can become their family's head, and the
 * currently assigned head so the selection stays visible.
 */
export function familyHeadOptions(publisher: Publisher, publishers: Publisher[]): Publisher[] {
  return publishers.filter(
    (p) =>
      p.id === publisher.id ||
      p.id === publisher.family_id ||
      (isPublisherRowId(p.id) && p.id === p.family_id && !isRemoved(p)),
  );
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
