import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { readSessionFromRequest } from "./auth-utils.js";

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
    const {
      client_id: queryClientId,
      agency_id: queryAgencyId,
      ym: queryYm,
    } = (req as any).query || {};

    // Optional month filter (YYYY-MM) to align spend with reports period.
    const ym =
      typeof queryYm === "string" && /^\d{4}-\d{2}$/.test(queryYm) ? queryYm : null;

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

      // поддержка вьюхи с полями *_net / *_client и наследие
      const cpmClientRaw =
        row.cpm_client !== undefined && row.cpm_client !== null
          ? Number(row.cpm_client)
          : null;
      const cpmNet =
        row.cpm_net !== undefined && row.cpm_net !== null
          ? Number(row.cpm_net)
          : cpmClientRaw !== null
          ? Number((cpmClientRaw / markupMultiplier).toFixed(4))
          : Number(row.cpm ?? 0);

      const budgetClientRaw =
        row.budget_client !== undefined && row.budget_client !== null
          ? Number(row.budget_client)
          : null;
      const budgetNet =
        row.budget_net !== undefined && row.budget_net !== null
          ? Number(row.budget_net)
          : Number(row.budget ?? 0);

      const dailyBudgetClientRaw =
        row.daily_budget_client !== undefined && row.daily_budget_client !== null
          ? Number(row.daily_budget_client)
          : null;
      const dailyBudgetNet =
        row.daily_budget_net !== undefined && row.daily_budget_net !== null
          ? Number(row.daily_budget_net)
          : Number(row.daily_budget ?? 0);

      // если вьюха отдает spend_client — используем его как источник истины, чтобы не делать двойной markup
      let spendNet: number;
      let spendClient: number;

      if (isClientMode && row.spend_client !== undefined && row.spend_client !== null) {
        spendClient = Number(row.spend_client);
        if (row.spend_net !== undefined && row.spend_net !== null) {
          spendNet = Number(row.spend_net);
        } else {
          spendNet = markupMultiplier ? Number((spendClient / markupMultiplier).toFixed(4)) : spendClient;
        }
      } else {
        spendNet =
          row.spend_net !== undefined && row.spend_net !== null
            ? Number(row.spend_net)
            : row.spend_raw !== undefined && row.spend_raw !== null
            ? Number(row.spend_raw)
            : views > 0
            ? (views * cpmNet) / 1000
            : 0;

        spendClient = isClientMode
          ? Number((spendNet * markupMultiplier).toFixed(2))
          : Number(spendNet.toFixed(2));
      }

      // If month filter is provided, override spend with monthly reports totals to
      // keep Dashboard in sync with AdStats (which shows monthly spend).
      if (ym) {
        const { data: reportsRows, error: reportsError } = await supabase.rpc(
          "get_reports_for_month",
          { input_ad_id: row.id, ym }
        );
        if (!reportsError && Array.isArray(reportsRows)) {
          const amountNet = reportsRows.reduce(
            (sum: number, r: any) => sum + Number(r.amount ?? 0),
            0
          );
          spendNet = Number(amountNet.toFixed(2));
          spendClient = isClientMode
            ? Number((amountNet * markupMultiplier).toFixed(2))
            : spendNet;
        } else if (reportsError) {
          console.error("get_reports_for_month error (campaigns)", reportsError);
        }
      }

      const cpmClient =
        cpmClientRaw !== null
          ? cpmClientRaw
          : isClientMode
          ? Number((cpmNet * markupMultiplier).toFixed(4))
          : cpmNet;

      const budgetClient = budgetClientRaw !== null ? budgetClientRaw : budgetNet;
      const dailyBudgetClient =
        dailyBudgetClientRaw !== null ? dailyBudgetClientRaw : dailyBudgetNet;

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
      totalSpendClient += spendClient;
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
