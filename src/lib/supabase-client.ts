/**
 * Reliable Supabase client that constructs the URL from the project ID,
 * avoiding any stale cached VITE_SUPABASE_URL issues.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || "blpkggmfpxrjvcoclssq";
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscGtnZ21mcHhyanZjb2Nsc3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzA3NzAsImV4cCI6MjA4ODUwNjc3MH0.ikJG8Irz8EmKdcVea8a1If6c8dZX-RIsOjOsILTH0MM";

export const db = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export { SUPABASE_URL, SUPABASE_KEY };
