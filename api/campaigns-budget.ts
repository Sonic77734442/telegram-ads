// pages/api/campaigns-budget.ts

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // на бэке можно service role
);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ad_id, mode, amount } = req.body as {
    ad_id: string;
    mode: "increase" | "edit";
    amount: number;
  };

  if (!ad_id || !mode || typeof amount !== "number" || amount < 0) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  // тянем текущие значения
  const { data: ad, error: fetchError } = await supabase
    .from("ad_campaigns")
    .select("id, budget, daily_budget")
    .eq("id", ad_id)
    .single();

  if (fetchError || !ad) {
    return res.status(404).json({ error: "Campaign not found" });
  }

  let update: Record<string, any> = {};

  if (mode === "increase") {
    // УВЕЛИЧИТЬ общий бюджет (верхняя строка)
    const currentBudget = Number(ad.budget ?? 0);
    update.budget = currentBudget + amount;
  }

  if (mode === "edit") {
    // УСТАНОВИТЬ дневной бюджет (нижняя строка)
    update.daily_budget = amount;
  }

  const { error: updateError } = await supabase
    .from("ad_campaigns")
    .update(update)
    .eq("id", ad_id);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  return res.status(200).json({ ok: true });
}
