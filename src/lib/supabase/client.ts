import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseConfig } from "./has-supabase-config";

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = hasSupabaseConfig(projectUrl, publishableKey);

// A missing .env file must not make the whole interface crash during local setup.
// This client is intentionally created only with a publishable key; never put a
// Supabase secret/service_role key into a VITE_* variable or browser bundle.
export const supabase: SupabaseClient | null =
  isSupabaseConfigured && projectUrl && publishableKey
    ? createClient(projectUrl, publishableKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      })
    : null;
