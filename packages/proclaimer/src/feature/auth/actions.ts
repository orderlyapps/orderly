import type { Session } from "@supabase/supabase-js";

import type { BackendSupabaseClient } from "../backend/supabase.ts";

export interface PublisherAuthResult {
  session: Session | null;
  error: string | null;
}

function toAuthErrorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message) {
    return value.message;
  }
  const message = (value as { message?: unknown } | null)?.message;
  return typeof message === "string" && message.length > 0 ? message : fallback;
}

export async function sendPublisherOtp(
  client: BackendSupabaseClient,
  email: string,
): Promise<PublisherAuthResult> {
  try {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    return { session: null, error: error ? error.message : null };
  } catch (err) {
    return { session: null, error: toAuthErrorMessage(err, "Failed to send the sign-in code") };
  }
}

export async function verifyPublisherOtp(
  client: BackendSupabaseClient,
  email: string,
  token: string,
): Promise<PublisherAuthResult> {
  try {
    const { data, error } = await client.auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      return { session: null, error: error.message };
    }
    return { session: data.session, error: null };
  } catch (err) {
    return { session: null, error: toAuthErrorMessage(err, "Failed to verify the sign-in code") };
  }
}

export async function signInPublisherWithPassword(
  client: BackendSupabaseClient,
  email: string,
  password: string,
): Promise<PublisherAuthResult> {
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      return { session: null, error: error.message };
    }
    return { session: data.session, error: null };
  } catch (err) {
    return { session: null, error: toAuthErrorMessage(err, "Failed to sign in with password") };
  }
}
