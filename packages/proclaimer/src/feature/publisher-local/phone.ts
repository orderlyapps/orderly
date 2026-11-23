import { parsePhoneNumber } from "libphonenumber-js/min";

/**
 * Canonical form for a stored phone number. Import files carry whatever was
 * typed at the source — raw digits, national, or international — so numbers
 * are normalized through libphonenumber (the engine behind subbie's maskito
 * phone mask, which produces the same "+61 …" format). National-only service
 * numbers (toll-free, shared-cost, premium) keep their national form since
 * they cannot be dialed internationally. Anything unparseable is returned
 * untouched.
 */
export function formatPhoneNumber(raw: string): string {
  try {
    const phone = parsePhoneNumber(raw, "AU");
    if (!phone.isValid()) {
      return raw;
    }
    const type = phone.getType();
    return phone.country === "AU" &&
      (type === "TOLL_FREE" || type === "SHARED_COST" || type === "PREMIUM_RATE")
      ? phone.formatNational()
      : phone.formatInternational();
  } catch {
    return raw;
  }
}
