// api/campaigns-budget.ts
// ОБРАТИ ВНИМАНИЕ: никаких import сверху, только внутри handler

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { ad_id, mode, amount } = req.body || {};

    if (!ad_id || typeof ad_id !== "string") {
      return res.status(400).json({ error: "ad_id is required" });
    }

    if (mode !== "increase" && mode !== "edit") {
      return res
        .status(400)
        .json({ error: "mode must be 'increase' or 'edit'" });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return res
        .status(400)
        .json({ error: "amount must be a non-negative number" });
    }

    // динамически подгружаем supabase-js
    let supabaseModule: any;
    try {
      supabaseModule = await import("@supabase/supabase-js");
    } catch (e) {
      console.error("Failed to load @supabase/supabase-js", e);
      return res
        .status(500)
        .json({ error: "Failed to load @supabase/supabase-js" });
    }

    const { createClient } = supabaseModule;

    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        error:
          "SUPABASE_URL / VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set",
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // 1) достаём текущий бюджет кампании
    const { data: current, error: fetchError } = await supabase
      .from("ad_campaigns")
      .select("id, budget")
      .eq("id", ad_id)
      .maybeSingle();

    if (fetchError) {
      console.error("budget fetch error", fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!current) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const oldBudget = Number(current.budget || 0);
    const newBudget =
      mode === "increase" ? oldBudget + numericAmount : numericAmount;

    // 2) можно пробовать логировать изменения (если таблица есть)
    const { error: logError } = await supabase
      .from("budget_changes")
      .insert({
        ad_id,
        old_budget: oldBudget,
        new_budget: newBudget,
        diff: newBudget - oldBudget,
      });

    if (logError) {
      // если таблицы нет или ещё что-то — просто логируем, но не падаем
      console.warn("budget_changes insert error (ignored)", logError.message);
    }

    // 3) обновляем кампанию
    const { data: updated, error: updateError } = await supabase
      .from("ad_campaigns")
      .update({ budget: newBudget })
      .eq("id", ad_id)
      .select("id, budget")
      .maybeSingle();

    if (updateError) {
      console.error("budget update error", updateError);
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      ok: true,
      data: {
        id: updated?.id,
        budget: updated?.budget,
        old_budget: oldBudget,
        new_budget: newBudget,
      },
    });
  } catch (e: any) {
    console.error("campaigns-budget handler exception", e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
