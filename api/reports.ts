// api/reports.ts

// без import'ов сверху, как мы уже сделали
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

    let markupPercent = 0;

    // Try to resolve client markup from client_balances by ad's client_id
    const { data: campaignRow, error: campaignError } = await supabase
      .from("ad_campaigns")
      .select("client_id, agency_id")
      .eq("id", ad_id)
      .single();

    if (campaignError) {
      console.error("failed to load campaign for markup", campaignError);
    } else if (campaignRow?.client_id) {
      const { data: balanceRow, error: balanceError } = await supabase
        .from("client_balances")
        .select("markup_percent")
        .eq("client_id", campaignRow.client_id)
        .maybeSingle();

      if (balanceError) {
        console.error("failed to load client markup", balanceError);
      } else {
        markupPercent = Number(balanceRow?.markup_percent ?? 0);
      }
    }

    const markupMultiplier = 1 + markupPercent / 100;

    const { data, error } = await supabase.rpc("get_reports_for_month", {
      input_ad_id: ad_id,
      ym,
    });

    if (error) {
      console.error("get_reports_for_month error", error);
      return res.status(500).json({ error: error.message });
    }

    const rows = (data || []) as {
      day: string;
      views: number;
      amount: number;
    }[];

    const items = rows.map((r) => {
      const amount_client = Number((r.amount * markupMultiplier).toFixed(2));
      return { ...r, amount_client };
    });

    const total_views = items.reduce((sum, r) => sum + (r.views || 0), 0);
    const total_amount_net = Number(
      items.reduce((sum, r) => sum + (r.amount || 0), 0).toFixed(2)
    );
    const total_amount_client = Number(
      items.reduce((sum, r) => sum + (r.amount_client || 0), 0).toFixed(2)
    );

    const cpm_net =
      total_views > 0
        ? Number(((total_amount_net * 1000) / total_views).toFixed(2))
        : 0;
    const cpm_client =
      total_views > 0
        ? Number(((total_amount_client * 1000) / total_views).toFixed(2))
        : 0;

    return res.status(200).json({
      data: items, // для текущего фронта
      total: {
        views: total_views,
        amount_net: total_amount_net,
        amount_client: total_amount_client,
        cpm_net,
        cpm_client,
      },
      markup_percent: markupPercent,
    });
  } catch (e: any) {
    console.error("reports handler exception", e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
