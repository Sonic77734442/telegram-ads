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

    // No markup applied to client-facing values in this endpoint.
    const markupMultiplier = 1;

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

      spendNet =
        row.spend_net !== undefined && row.spend_net !== null
          ? Number(row.spend_net)
          : row.spend_raw !== undefined && row.spend_raw !== null
          ? Number(row.spend_raw)
          : views > 0
          ? (views * cpmNet) / 1000
          : 0;

      // For client mode we now show net as-is (no markup).
      spendClient = Number(spendNet.toFixed(2));

      // If month filter is provided, override spend with monthly reports totals to
      // keep Dashboard in sync with AdStats (which shows monthly spend).
      if (ym) {
        const fetchMonth = async (month: string) => {
          const { data: rows, error } = await supabase.rpc("get_reports_for_month", {
            input_ad_id: row.id,
            ym: month,
          });
          return { rows, error };
        };

        const attemptMonths = [ym];

        // If the requested month has no rows, try the previous month as a fallback.
        const ymDate = new Date(`${ym}-01T00:00:00Z`);
        if (!Number.isNaN(ymDate.getTime())) {
          ymDate.setUTCMonth(ymDate.getUTCMonth() - 1);
          const prevYm = `${ymDate.getUTCFullYear()}-${String(ymDate.getUTCMonth() + 1).padStart(
            2,
            "0"
          )}`;
          if (prevYm !== ym) attemptMonths.push(prevYm);
        }

        for (const month of attemptMonths) {
          const { rows, error } = await fetchMonth(month);
          if (error) {
            console.error("get_reports_for_month error (campaigns)", { month, error });
            continue;
          }
          if (Array.isArray(rows) && rows.length > 0) {
            const amountNet = rows.reduce(
              (sum: number, r: any) => sum + Number(r.amount ?? 0),
              0
            );
            spendNet = Number(amountNet.toFixed(2));
            spendClient = Number(spendNet.toFixed(2));
            break;
          }
        }
      }

      const cpmClient =
        cpmClientRaw !== null
          ? cpmClientRaw
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
