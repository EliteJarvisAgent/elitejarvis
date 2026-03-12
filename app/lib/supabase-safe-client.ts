import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL = "https://blpkggmfpxrjvcoclssq.supabase.co";
const FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscGtnZ21mcHhyanZjb2Nsc3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzA3NzAsImV4cCI6MjA4ODUwNjc3MH0.ikJG8Irz8EmKdcVea8a1If6c8dZX-RIsOjOsILTH0MM";

function isValidHttpUrl(value: string | undefined | null): value is string {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function decodeJwtPayload(token: string) {
  try {
    const [, payload = ""] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function deriveUrlFromKey(key: string) {
  const payload = decodeJwtPayload(key);
  const ref = payload?.ref;
  return typeof ref === "string" && ref ? `https://${ref}.supabase.co` : FALLBACK_URL;
}

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SUPABASE_PUBLISHABLE_KEY = typeof envKey === "string" && envKey ? envKey : FALLBACK_KEY;
const derivedUrl = deriveUrlFromKey(SUPABASE_PUBLISHABLE_KEY);
const SUPABASE_URL = isValidHttpUrl(envUrl) ? envUrl : derivedUrl;

const createMemoryStorage = () => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

const safeStorage = (() => {
  if (typeof window === "undefined") return createMemoryStorage();

  try {
    const testKey = "__jarvis_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return createMemoryStorage();
  }
})();

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: safeStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
