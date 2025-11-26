// pages/api/campaigns.ts (или src/pages/api/campaigns.ts)
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// 🔧 если у тебя свой supabaseAdmin – замени это на свой импорт
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type DbRow = {
  id: string;
  client_id: string | null;
  agency_id: string | null;

  title: string | null;
  text: string | null;
  url: string | null;
  media_url: string | null;
  media_type: string | null;
  status: string | null;
  target: string | null;

  created_at: string;
  updated_at: string;

  cpm: number | null;            // net
  budget: number | null;         // net

  daily_views: number | null;
  daily_budget: number | null;   // net

  views: number | null;
  clicks: number | null;
  actions: number | null;
  ctr: number | null;

  spend_raw: number | null;      // net spend
  markup_percent: number | null; // %
};

type ApiRow = {
  id: string;
  title: string | null;
  text: string | null;
  url: string | null;
  media_url: string | null;
  media_type: string | null;
  status: string | null;
  target: string | null;
  created_at: string;
  updated_at: string;
  client_id: string | null;
  agency_id: string | null;

  views: number;
  clicks: number;
  actions: number;

  // CPM
  cpm_net: number;
  cpm_client: number;

  // TOTAL budget
  budget_net: number;
  budget_client: number;

  // DAILY budget
  daily_budget_net: number;
  daily_budget_client: number;

  // SPEND
  spend_net: number;
  spend_client: number;

  ctr: number;
};

type ApiResponse = {
  data: ApiRow[];
  total: {
    views: number;
    clicks: number;
    spend_net: number;
    spend_client: number;
    ctr: number;
    cpm_net: number;
    cpm_client: number;
  };
  mode: "client" | "agency" | "admin";
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse | { error: string }>
) {
  try {
    const { mode, client_id, agency_id } = (req.query || {}) as {
      mode?: string;
      client_id?: string;
      agency_id?: string;
    };

    const resolvedMode: "client" | "agency" | "admin" =
      mode === "agency" || mode === "admin" ? (mode as any) : "client";

    // 🔧 базовый запрос к вьюхе
    let query = supabase
      .from<DbRow>("v_adcampaigns_client_compat")
      .select("*");

    // фильтрация по роли
    if (resolvedMode === "client" && client_id) {
      query = query.eq("client_id", client_id);
    } else if (resolvedMode === "agency" && agency_id) {
      query = query.eq("agency_id", agency_id);
    }

    // можно фильтровать по статусу, если нужно:
    // query = query.neq("status", "archived");

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error loading campaigns:", error);
      return res
        .status(500)
        .json({ error: "Failed to load campaigns" } as any);
    }

    const rows: DbRow[] = data || [];

    const items: ApiRow[] = [];
    let totalViews = 0;
    let totalClicks = 0;
    let totalSpendNet = 0;
    let totalSpendClient = 0;

    for (const row of rows) {
      const views = Number(row.views || 0);
      const clicks = Number(row.clicks || row.actions || 0);

      const cpmNet = Number(row.cpm || 0);
      const budgetNet = Number(row.budget || 0);
      const dailyBudgetNet = Number(row.daily_budget || 0);

      const spendNet = Number(row.spend_raw || 0);

      const markup = Number(row.markup_percent || 0);
      const factor = 1 + markup / 100;

      // CPM / SPEND / BUDGET под роли
      const isClient = resolvedMode === "client";

      const cpmClient = isClient
        ? Number((cpmNet * factor).toFixed(4))
        : cpmNet;

      // ❗ бюджет не умножаем на маркап: client видит тот же лимит
      const budgetClient = budgetNet;
      const dailyBudgetClient = dailyBudgetNet;

      // ❗ SPEND: либо net, либо net * factor (ОДИН РАЗ)
      const spendClient = isClient
        ? Number((spendNet * factor).toFixed(2))
        : spendNet;

      const ctr =
        views > 0 ? Number(((clicks / views) * 100).toFixed(2)) : 0;

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
        actions: Number(row.actions || clicks),

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

    // агрегированные CPM / CTR
    const totalCtr =
      totalViews > 0
        ? Number(((totalClicks / totalViews) * 100).toFixed(2))
        : 0;

    const totalCpmNet =
      totalViews > 0
        ? Number(((totalSpendNet * 1000) / totalViews).toFixed(4))
        : 0;

    const totalCpmClient =
      totalViews > 0
        ? Number(((totalSpendClient * 1000) / totalViews).toFixed(4))
        : 0;

    const response: ApiResponse = {
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
    };

    return res.status(200).json(response);
  } catch (e: any) {
    console.error("Unexpected error in /api/campaigns:", e);
    return res.status(500).json({ error: "Internal server error" } as any);
  }
}
