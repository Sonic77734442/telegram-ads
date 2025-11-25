// src/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase ENV variables missing", {
    supabaseUrl,
    supabaseAnonKey,
  });
  throw new Error("Supabase URL or anon key missing.");
}

// Клиент ТОЛЬКО с anon key — его можно использовать на фронте
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

