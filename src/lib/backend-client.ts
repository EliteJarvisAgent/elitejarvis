import { createClient } from "@supabase/supabase-js";
import { supabase as generatedSupabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

function getProjectRefFromKey(key?: string): string | null {
  if (!key) return null;

  try {
    const [, payload] = key.split(".");
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));

    return typeof decoded?.ref === "string" ? decoded.ref : null;
  } catch {
    return null;
  }
}

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const keyProjectRef = getProjectRefFromKey(publishableKey);
const keyDerivedUrl = keyProjectRef ? `https://${keyProjectRef}.supabase.co` : undefined;
const shouldUseKeyDerivedClient = Boolean(keyDerivedUrl && envUrl && keyDerivedUrl !== envUrl && publishableKey);

export const backendClient = shouldUseKeyDerivedClient
  ? createClient<Database>(keyDerivedUrl!, publishableKey!, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : generatedSupabase;
