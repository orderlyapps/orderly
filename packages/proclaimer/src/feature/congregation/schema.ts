export const CONGREGATION_TABLE = "congregation";

export const CONGREGATION_NAME_MAX_LENGTH = 128;

// Mirrors the Supabase "congregation" table:
// - Real congregations (those actually using the app) have NO congregation_id (null/undefined)
// - Congregations WITH a congregation_id are "placeholder" congregations created by a real
//   congregation to reference a congregation that is NOT using the app
export type Congregation = {
  id?: string;
  name: string;
  congregation_id?: string | null;
  password?: string | null;
};

export function isCongregationRowId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isCongregationName(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= CONGREGATION_NAME_MAX_LENGTH
  );
}

export function isCongregation(value: unknown): value is Congregation {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<Congregation>;
  if (candidate.id !== undefined && !isCongregationRowId(candidate.id)) {
    return false;
  }
  if (!isCongregationName(candidate.name)) {
    return false;
  }
  if (
    candidate.congregation_id !== undefined &&
    candidate.congregation_id !== null &&
    !isCongregationRowId(candidate.congregation_id)
  ) {
    return false;
  }
  if (
    candidate.password !== undefined &&
    candidate.password !== null &&
    typeof candidate.password !== "string"
  ) {
    return false;
  }
  return true;
}
