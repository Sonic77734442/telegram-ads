// src/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// Универсально: сначала берёт переменные из .env, если нет — fallback к "вшитым"
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://eoybnbhpqsqxeygsikkz.supabase.co";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveWJuYmhwcXNxeGV5Z3Npa2t6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODg5MzUsImV4cCI6MjA2ODM2NDkzNX0.U0-JFjiLYXVERCcvqsMoYpc1lWQ9OnYlb_AbEUcOvtU";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase ENV variables missing", { supabaseUrl, supabaseKey });
  throw new Error("Supabase URL or Key missing.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
