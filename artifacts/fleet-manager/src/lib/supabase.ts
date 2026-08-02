import { createClient } from "@supabase/supabase-js";

declare const __SUPABASE_URL__: string;
declare const __SUPABASE_PUBLISHABLE_KEY__: string;

const env = import.meta.env as Record<string, string | undefined>;
const injectedUrl =
  typeof __SUPABASE_URL__ === "string" ? __SUPABASE_URL__ : "";
const injectedKey =
  typeof __SUPABASE_PUBLISHABLE_KEY__ === "string"
    ? __SUPABASE_PUBLISHABLE_KEY__
    : "";
const supabaseUrl =
  env.VITE_SUPABASE_URL ||
  env.SUPABASE_URL ||
  injectedUrl ||
  "https://placeholder.supabase.co";
const supabasePublishableKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.SUPABASE_PUBLISHABLE_KEY ||
  injectedKey ||
  "placeholder-publishable-key";

export const supabaseAuthStorageKey = "fleet-manager-auth";

export const supabaseConfigured =
  supabaseUrl !== "https://placeholder.supabase.co" &&
  supabasePublishableKey !== "placeholder-publishable-key";

// Use PKCE explicitly instead of relying on the SDK's implicit-flow default.
// The verifier is kept by Supabase Auth in browser storage and is consumed once
// when the OAuth callback returns. No application data is stored here.
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // The callback is exchanged explicitly in AuthProvider. Keeping URL
    // detection off avoids a race between Supabase's auto-initializer and the
    // React auth gate when returning from Google.
    detectSessionInUrl: false,
    flowType: "pkce",
    // Use an app-specific namespace so stale auth state from an older flow
    // cannot be mistaken for the current Google login attempt.
    storageKey: supabaseAuthStorageKey,
  },
});