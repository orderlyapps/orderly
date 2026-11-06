import type { Publisher } from "../publisher/schema.ts";

export function getWelcomeName(publisher: Publisher | null | undefined): string | null {
  if (!publisher) {
    return null;
  }
  const displayName = publisher.display_name?.trim();
  if (displayName) {
    return displayName;
  }
  const firstName = publisher.first_name.trim();
  return firstName.length > 0 ? firstName : null;
}
