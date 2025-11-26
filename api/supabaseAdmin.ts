// api/supabaseAdmin.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Ленивая и безопасная инициализация admin-клиента Supabase.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL (или VITE_SUPABASE_URL) is not set");
  }
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}
