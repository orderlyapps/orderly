import { getPublisherDisplayName, isArchived, type Publisher } from "../publisher/index.ts";

/** Entries only visible to users with secretary permission. */
export function isRestrictedDirectoryEntry(publisher: Publisher): boolean {
  return isArchived(publisher) || publisher.type === "speaker" || publisher.type === "congregation";
}

function nameHaystack(publisher: Publisher): string {
  return [
    getPublisherDisplayName(publisher),
    `${publisher.first_name} ${publisher.last_name}`,
    publisher.middle_name ?? "",
    publisher.display_name ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export interface FilterDirectoryPublishersOptions {
  /** Case-insensitive name filter; every whitespace-separated term must match. */
  query?: string;
  /** Include archived publishers, speakers, and congregation entries. */
  includeRestricted?: boolean;
}

export function filterDirectoryPublishers(
  publishers: Publisher[],
  options: FilterDirectoryPublishersOptions = {},
): Publisher[] {
  const terms = options.query?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  return publishers.filter((publisher) => {
    if (!options.includeRestricted && isRestrictedDirectoryEntry(publisher)) {
      return false;
    }
    if (terms.length === 0) {
      return true;
    }
    const haystack = nameHaystack(publisher);
    return terms.every((term) => haystack.includes(term));
  });
}
