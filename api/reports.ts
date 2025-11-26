// api/reports.ts
// ВАЖНО: никаких import сверху!

export default async function handler(req: any, res: any) {
  try {
    const { ad_id, ym } = (req as any).query || {};

    if (!ad_id || typeof ad_id !== "string") {
      return res.status(400).json({ error: "ad_id is required" });
    }
    if (!ym || typeof ym !== "string") {
      return res
        .status(400)
        .json({ error: "ym is required, format YYYY-MM, e.g. 2025-11" });
    }

    // 👇 Динамический импорт Supabase внутри handler’a
    const supabaseModule: any = await import("@supabase/supabase-js");
    const createClient = supabaseModule.createClient;

    if (!createClient) {
      return res
        .status(500)
        .json({ error: "Failed to load @supabase/supabase-js" });
    }

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

    const { data, error } = await supabase.rpc("get_reports_for_month", {
      input_ad_id: ad_id,
      ym,
    });

    if (error) {
      console.error("get_reports_for_month error", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data: data || [] });
  } catch (e: any) {
    console.error("reports handler exception", e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
