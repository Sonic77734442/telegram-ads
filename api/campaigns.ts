import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { readSessionFromRequest } from "./auth-utils.js";

export default async function handler(req: any, res: any) {
  try {
    const roundMoney = (value: number) =>
      Number.isFinite(value)
        ? Math.round((value + Number.EPSILON) * 100) / 100
        : 0;

    const {
      mode: queryMode,
      client_id: queryClientId,
      agency_id: queryAgencyId,
      ym: queryYm,
    } = (req as any).query || {};
    const requestedMode: "client" | "agency" | "admin" =
      queryMode === "agency" || queryMode === "admin" ? queryMode : "client";

    const session = readSessionFromRequest(req);
    const allowClientQueryFallback = !session && requestedMode === "client" && Boolean(queryClientId);
    if (!session && !allowClientQueryFallback) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const supabase = getSupabaseAdmin();

    const role: "client" | "agency" | "admin" = session
      ? session.role === "agency" || session.role === "admin"
        ? session.role
        : "client"
      : "client";

    const clientId = session ? session.user_id : String(queryClientId);
    const agencyId = session ? session.agency_id || null : null;

    let resolvedMode: "client" | "agency" | "admin" = role;

    // Month filter (YYYY-MM). If not provided or set to "all", use lifetime (no override).
    const ym =
      typeof queryYm === "string" && /^\d{4}-\d{2}$/.test(queryYm)
        ? queryYm
        : queryYm === "all"
        ? null
        : null;

    // Load client markup for client mode to match AdStats (which applies it in reports).
    let markupMultiplier = 1;
    if (resolvedMode === "client") {
      const { data: balanceRow, error: balanceError } = await supabase
        .from("client_balances")
        .select("markup_percent")
        .eq("client_id", clientId)
        .maybeSingle();

      if (balanceError) {
        console.error("Error loading client markup:", balanceError);
      }
      const clientMarkup = Number(balanceRow?.markup_percent ?? 0);
      markupMultiplier = 1 + clientMarkup / 100;
    }

    const applyScope = (query: any) => {
      if (resolvedMode === "client") {
        return query.eq("client_id", clientId);
      }
      if (resolvedMode === "agency") {
        if (!agencyId) {
          return null;
        }
        return query.eq("agency_id", agencyId);
      }
      if (resolvedMode === "admin") {
        let scoped = query;
        if (queryClientId) scoped = scoped.eq("client_id", queryClientId);
        if (queryAgencyId) scoped = scoped.eq("agency_id", queryAgencyId);
        return scoped;
      }
      return query;
    };

    let query = applyScope(supabase.from("v_adcampaigns_client_compat").select("*"));
    if (!query && resolvedMode === "agency") {
      return res.status(403).json({ error: "Agency is not linked to this account" });
    }

    let { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      const errorText = String((error as any)?.message || "").toLowerCase();
      const canFallbackToBaseTable =
        errorText.includes("v_adcampaigns_client_compat") ||
        errorText.includes("relation") ||
        errorText.includes("does not exist");

      if (canFallbackToBaseTable) {
        console.warn("Fallback to ad_campaigns due to view error:", error);
        const fallbackQuery = applyScope(supabase.from("ad_campaigns").select("*"));
        if (!fallbackQuery && resolvedMode === "agency") {
          return res.status(403).json({ error: "Agency is not linked to this account" });
        }
        const fallbackResult = await fallbackQuery.order("created_at", { ascending: false });
        data = fallbackResult.data;
        error = fallbackResult.error as any;
      }
    }

    if (error) {
      console.error("Error loading campaigns:", error);
      return res.status(500).json({ error: "Failed to load campaigns" } as any);
    }

    const rows = (data || []) as any[];

    const sumStatsAmount = async (adId: string, month?: string | null) => {
      const { data: statsRows, error: statsError } = await supabase
        .from("ad_stats")
        .select("views, amount, timestamp")
        .eq("ad_id", adId);

      if (statsError || !statsRows) {
        if (statsError) console.error("ad_stats sum error:", statsError);
        return { views: 0, amount: 0 };
      }

      return statsRows.reduce(
        (sum: { views: number; amount: number }, r: any) => {
          const ts = String(r.timestamp ?? "");
          if (month && !ts.startsWith(`${month}-`)) return sum;
          sum.views += Number(r.views ?? 0);
          sum.amount += Number(r.amount ?? 0);
          return sum;
        },
        { views: 0, amount: 0 }
      );
    };

    const items: any[] = [];
    let totalViews = 0;
    let totalClicks = 0;
    let totalSpendNet = 0;
    let totalSpendClient = 0;

    const isClientMode = resolvedMode === "client";

    for (const row of rows) {
      let views = Number(row.views ?? 0);
      const clicks = Number(row.clicks ?? row.actions ?? 0);

      // поддержка вьюхи с полями *_net / *_client и наследие
      const cpmClientRaw =
        row.cpm_client !== undefined && row.cpm_client !== null
          ? Number(row.cpm_client)
          : null;
      let cpmNet =
        row.cpm_net !== undefined && row.cpm_net !== null
          ? Number(row.cpm_net)
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
      let spendNetRaw: number;
      let spendClientRaw: number;

      spendNetRaw =
        row.spend_net !== undefined && row.spend_net !== null
          ? Number(row.spend_net)
          : row.spend_raw !== undefined && row.spend_raw !== null
          ? Number(row.spend_raw)
          : views > 0
          ? (views * cpmNet) / 1000
          : 0;

      // If we have manual stats (ad_stats), prefer them for lifetime CPM/spend.
      if (!ym) {
        const statsTotals = await sumStatsAmount(row.id, null);
        if (statsTotals.views > 0) {
          views = statsTotals.views;
        }
        if (statsTotals.amount > 0) {
          spendNetRaw = statsTotals.amount;
        } else if (spendNetRaw === 0 && statsTotals.views > 0) {
          spendNetRaw = (statsTotals.views * cpmNet) / 1000;
        }
      }

      // If view provides spend_client, respect it for clients (lifetime case).
      if (isClientMode && row.spend_client !== undefined && row.spend_client !== null) {
        spendClientRaw = Number(row.spend_client);
      } else {
        spendClientRaw = isClientMode
          ? spendNetRaw * markupMultiplier
          : spendNetRaw;
      }

      // If month filter is provided, override spend with monthly reports totals (no fallback).
      if (ym) {
        const { data: rows, error } = await supabase.rpc("get_reports_for_month", {
          input_ad_id: row.id,
          ym,
        });

        if (error) {
          console.error("get_reports_for_month error (campaigns)", { ym, error });
        } else if (Array.isArray(rows) && rows.length > 0) {
          const amountNetRaw = rows.reduce(
            (sum: number, r: any) => sum + Number(r.amount ?? 0),
            0
          );
          const amountClientRaw = rows.reduce(
            (sum: number, r: any) =>
              sum +
              Number(
                r.amount_client !== undefined && r.amount_client !== null
                  ? r.amount_client
                  : (r.amount ?? 0) * markupMultiplier
              ),
            0
          );
          const viewsForMonth = rows.reduce(
            (sum: number, r: any) => sum + Number(r.views ?? 0),
            0
          );
          if (viewsForMonth > 0) {
            views = viewsForMonth;
          }
          spendNetRaw = amountNetRaw;
          spendClientRaw = isClientMode ? amountClientRaw : amountNetRaw;
        } else if (Array.isArray(rows) && rows.length === 0) {
          const statsTotals = await sumStatsAmount(row.id, ym);
          if (statsTotals.amount > 0) {
            spendNetRaw = statsTotals.amount;
            spendClientRaw = isClientMode ? spendNetRaw * markupMultiplier : spendNetRaw;
          } else if (statsTotals.views > 0) {
            spendNetRaw = (statsTotals.views * cpmNet) / 1000;
            spendClientRaw = isClientMode ? spendNetRaw * markupMultiplier : spendNetRaw;
          }
          if (statsTotals.views > 0) {
            views = statsTotals.views;
          }
        }
      }

      // Recompute CPM when we have real spend/views (dynamic CPM).
      if (views > 0 && spendNetRaw > 0) {
        cpmNet = Number(((spendNetRaw * 1000) / views).toFixed(4));
      }

      const cpmClient =
        views > 0 && spendClientRaw > 0
          ? Number(((spendClientRaw * 1000) / views).toFixed(4))
          : cpmClientRaw !== null
          ? cpmClientRaw
          : isClientMode
          ? Number((cpmNet * markupMultiplier).toFixed(4))
          : cpmNet;

      const budgetClient =
        budgetClientRaw !== null
          ? budgetClientRaw
          : isClientMode
          ? Number((budgetNet * markupMultiplier).toFixed(2))
          : budgetNet;
      const dailyBudgetClient =
        dailyBudgetClientRaw !== null
          ? dailyBudgetClientRaw
          : isClientMode
          ? Number((dailyBudgetNet * markupMultiplier).toFixed(2))
          : dailyBudgetNet;

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

        spend_net: roundMoney(spendNetRaw),
        spend_client: roundMoney(spendClientRaw),

        ctr,
      });

      totalViews += views;
      totalClicks += clicks;
      totalSpendNet += spendNetRaw;
      totalSpendClient += spendClientRaw;
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
        spend_net: roundMoney(totalSpendNet),
        spend_client: roundMoney(totalSpendClient),
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
