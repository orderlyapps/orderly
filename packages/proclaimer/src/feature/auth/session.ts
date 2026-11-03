import { useEffect, useState } from "react";

import type { Session } from "@supabase/supabase-js";

import { getSupabaseClient, type BackendSupabaseClient } from "../backend/supabase.ts";

export function useAuthSession(client?: BackendSupabaseClient): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let supabase = client;
    if (!supabase) {
      try {
        supabase = getSupabaseClient();
      } catch {
        setSession(null);
        return;
      }
    }

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .catch(() => {
        // onAuthStateChange listener will handle initial session
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [client]);

  return session;
}
