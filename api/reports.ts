import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { readSessionFromRequest } from "./auth-utils.js";

// api/reports.ts
export default async function handler(req: any, res: any) {
  try {
    const roundMoney = (value: number) =>
      Number.isFinite(value)
        ? Math.round((value + Number.EPSILON) * 100) / 100
        : 0;

    const session = readSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { ad_id, ym } = (req as any).query || {};

    if (!ad_id || typeof ad_id !== "string") {
      return res.status(400).json({ error: "ad_id is required" });
    }
    if (!ym || typeof ym !== "string") {
      return res.status(400).json({ error: "ym is required, format YYYY-MM, e.g. 2025-11" });
    }

    const supabase = getSupabaseAdmin();

    const { data: campaignRow, error: campaignError } = await supabase
      .from("ad_campaigns")
      .select("client_id, agency_id, cpm")
      .eq("id", ad_id)
      .single();

    if (campaignError || !campaignRow) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Authorization: client can access only own ads; agency only its ads; admin full access.
    if (session.role === "client" && campaignRow.client_id !== session.user_id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (session.role === "agency" && campaignRow.agency_id !== session.agency_id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Markup applied for client-facing amounts (same as before, used by AdStats)
    let markupPercent = 0;

    // Try to resolve client markup from client_balances by ad's client_id
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

    const markupMultiplier = 1 + markupPercent / 100;

    const { data, error } = await supabase.rpc("get_reports_for_month", {
      input_ad_id: ad_id,
      ym,
    });

    if (error) {
      console.error("get_reports_for_month error", error);
      return res.status(500).json({ error: error.message });
    }

    let rows = (data || []) as {
      day: string;
      views: number;
      amount: number;
    }[];

    // Fallback for search/bot campaigns without reports: estimate from daily stats * CPM.
    if (rows.length === 0) {
      const { data: statsData, error: statsError } = await supabase.rpc(
        "get_daily_ad_stats",
        { input_ad_id: ad_id }
      );

      if (!statsError && Array.isArray(statsData)) {
        const cpmNet = Number(campaignRow?.cpm ?? 0);
        const fallback = statsData
          .filter((r: any) => String(r.date || "").startsWith(`${ym}-`))
          .map((r: any) => {
            const views = Number(r.views ?? 0);
            const amount = (views / 1000) * cpmNet;
            return {
              day: r.date,
              views,
              amount,
            };
          });

        rows = fallback;
      }
    }

    const items = rows.map((r) => {
      const amount_client_raw = (r.amount ?? 0) * markupMultiplier;
      const amount_client = roundMoney(amount_client_raw);
      return { ...r, amount_client };
    });

    const total_views = items.reduce((sum, r) => sum + (r.views || 0), 0);

    // Sum using raw values (no per-day rounding) then round once at the end
    const total_amount_net_raw = rows.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0
    );
    const total_amount_client_raw = rows.reduce(
      (sum, r) => sum + Number((r.amount || 0) * markupMultiplier),
      0
    );

    const total_amount_net = roundMoney(total_amount_net_raw);
    const total_amount_client = roundMoney(total_amount_client_raw);

    const cpm_net =
      total_views > 0 ? Number(((total_amount_net * 1000) / total_views).toFixed(2)) : 0;
    const cpm_client =
      total_views > 0 ? Number(((total_amount_client * 1000) / total_views).toFixed(2)) : 0;

    return res.status(200).json({
      data: items,
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
