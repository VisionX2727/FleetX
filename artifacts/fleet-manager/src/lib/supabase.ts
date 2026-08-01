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

export const supabaseConfigured =
  supabaseUrl !== "https://placeholder.supabase.co" &&
  supabasePublishableKey !== "placeholder-publishable-key";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);