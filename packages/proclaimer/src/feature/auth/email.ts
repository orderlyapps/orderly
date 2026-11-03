export const PUBLISHER_AUTH_EMAIL_DOMAIN = "proclaimer.app";

// Publisher auth accounts use a synthetic email derived from the publisher id,
// matching the accounts created by the congregation admin tools.
export function publisherAuthEmail(publisherId: string): string {
  return `${publisherId.trim()}@${PUBLISHER_AUTH_EMAIL_DOMAIN}`;
}
