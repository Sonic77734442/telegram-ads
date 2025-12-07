import { getSupabaseAdmin } from "./supabaseAdmin";
import { readSessionFromRequest } from "./auth-utils";

export default async function handler(req: any, res: any) {
  try {
    const session = readSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const supabase = getSupabaseAdmin();

    const role: "client" | "agency" | "admin" =
      session.role === "agency" || session.role === "admin" ? session.role : "client";

    const clientId = session.user_id;
    const agencyId = session.agency_id || null;

    let resolvedMode: "client" | "agency" | "admin" = role;

    // Only admins can optionally filter; others are locked to their own scope.
    const { client_id: queryClientId, agency_id: queryAgencyId } = (req as any).query || {};

    // Load markup for clients (used to derive client CPM).
    let clientMarkup = 0;
    if (resolvedMode === "client") {
      const { data: balanceRow, error: balanceError } = await supabase
        .from("client_balances")
        .select("markup_percent")
        .eq("client_id", clientId)
        .maybeSingle();

      if (balanceError) {
        console.error("Error loading client markup:", balanceError);
      }
      clientMarkup = Number(balanceRow?.markup_percent ?? 0);
    }

    const markupMultiplier = 1 + clientMarkup / 100;

    let query = supabase.from("v_adcampaigns_client_compat").select("*");

    if (resolvedMode === "client") {
      query = query.eq("client_id", clientId);
    } else if (resolvedMode === "agency") {
      if (!agencyId) {
        return res.status(403).json({ error: "Agency is not linked to this account" });
      }
      query = query.eq("agency_id", agencyId);
    } else if (resolvedMode === "admin") {
      if (queryClientId) query = query.eq("client_id", queryClientId);
      if (queryAgencyId) query = query.eq("agency_id", queryAgencyId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error loading campaigns:", error);
      return res.status(500).json({ error: "Failed to load campaigns" } as any);
    }

    const rows = (data || []) as any[];

    const items: any[] = [];
    let totalViews = 0;
    let totalClicks = 0;
    let totalSpendNet = 0;
    let totalSpendClient = 0;

    const isClientMode = resolvedMode === "client";

    for (const row of rows) {
      const views = Number(row.views ?? 0);
      const clicks = Number(row.clicks ?? row.actions ?? 0);

      // поддержка вьюхи с полями *_client/_net и наследие
      const cpmNet = Number(row.cpm_net ?? row.cpm ?? 0);
      const cpmFromViewClient = row.cpm_client !== undefined ? Number(row.cpm_client) : null;

      const budgetNet = Number(row.budget_net ?? row.budget ?? 0);
      const budgetFromViewClient =
        row.budget_client !== undefined ? Number(row.budget_client) : null;

      const dailyBudgetNet = Number(row.daily_budget_net ?? row.daily_budget ?? 0);
      const dailyBudgetFromViewClient =
        row.daily_budget_client !== undefined ? Number(row.daily_budget_client) : null;

      const spendNet =
        row.spend_net !== undefined
          ? Number(row.spend_net)
          : row.spend_raw !== undefined && row.spend_raw !== null
          ? Number(row.spend_raw)
          : views > 0
          ? (views * cpmNet) / 1000
          : 0;

      // если вьюха уже отдаёт клиентские значения — используем их, иначе считаем по markup
      const cpmClient =
        cpmFromViewClient !== null
          ? cpmFromViewClient
          : isClientMode
          ? Number((cpmNet * markupMultiplier).toFixed(4))
          : cpmNet;

      const budgetClient =
        budgetFromViewClient !== null ? budgetFromViewClient : budgetNet;
      const dailyBudgetClient =
        dailyBudgetFromViewClient !== null ? dailyBudgetFromViewClient : dailyBudgetNet;

      const spendClient =
        row.spend_client !== undefined
          ? Number(row.spend_client)
          : isClientMode
          ? Number((spendNet * markupMultiplier).toFixed(2))
          : Number(spendNet.toFixed(2));

      const ctr = views > 0 ? Number(((clicks / views) * 100).toFixed(2)) : 0;

      items.push({
        id: row.id,
        title: row.title,
        text: row.text,
        url: row.url,
        media_url: row.media_url,
        media_type: row.media_type,
        status: row.status,
        target: row.target,
        created_at: row.created_at,
        updated_at: row.updated_at,
        client_id: row.client_id,
        agency_id: row.agency_id,

        views,
        clicks,
        actions: Number(row.actions ?? clicks),

        cpm_net: cpmNet,
        cpm_client: cpmClient,

        budget_net: budgetNet,
        budget_client: budgetClient,

        daily_budget_net: dailyBudgetNet,
        daily_budget_client: dailyBudgetClient,

        spend_net: Number(spendNet.toFixed(2)),
        spend_client: spendClient,

        ctr,
      });

      totalViews += views;
      totalClicks += clicks;
      totalSpendNet += spendNet;
      totalSpendClient +=
        row.spend_client !== undefined
          ? Number(row.spend_client)
          : isClientMode
          ? spendNet * markupMultiplier
          : spendNet;
    }

    const totalCtr =
      totalViews > 0 ? Number(((totalClicks / totalViews) * 100).toFixed(2)) : 0;

    const totalCpmNet =
      totalViews > 0 ? Number(((totalSpendNet * 1000) / totalViews).toFixed(4)) : 0;

    const totalCpmClient =
      totalViews > 0 ? Number(((totalSpendClient * 1000) / totalViews).toFixed(4)) : 0;

    return res.status(200).json({
      data: items,
      total: {
        views: totalViews,
        clicks: totalClicks,
        spend_net: Number(totalSpendNet.toFixed(2)),
        spend_client: Number(totalSpendClient.toFixed(2)),
        ctr: totalCtr,
        cpm_net: totalCpmNet,
        cpm_client: totalCpmClient,
      },
      mode: resolvedMode,
    });
  } catch (e: any) {
    console.error("Unexpected error in /api/campaigns:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
