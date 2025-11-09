import { supabase } from "../supabaseClient";

// 🔹 Получить все кампании (в порядке создания, новые первыми)
export async function getAllAds() {
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// 🔹 Создать новую кампанию
export async function createAd(ad: any) {
  const { data, error } = await supabase
    .from("ad_campaigns")
    .insert([ad])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 🔹 Получить кампанию по ID
export async function getAdById(id: string) {
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}
