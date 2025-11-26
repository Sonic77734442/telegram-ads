// api/campaigns.ts
// ВАЖНО: никаких import сверху, только динамический import внутри handler

export default async function handler(req: any, res: any) {
  try {
    const { mode, client_id, agency_id } = (req as any).query || {};

    // режим: client | agency | admin
    const resolvedMode: "client" | "agency" | "admin" =
      mode === "client" || mode === "agency" || mode === "admin"
        ? mode
        : "client";

    // 👇 Динамический импорт Supabase
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

    // ⚠️ тут важно: я исхожу из того, что у тебя уже есть вьюха
    // v_adcampaigns_client_compat с полями:
    // id, client_id, agency_id, title, text, url, media_url, media_type,
    // status, target, created_at, updated_at, cpm, budget,
    // daily_views, daily_budget, views, clicks, actions, spend_raw, markup_percent

    // --------- МАРКАП КЛИЕНТА ИЗ client_balances ---------
    let clientMarkup = 0;

    if (resolvedMode === "client" && client_id) {
      const { data: balanceRow, error: balanceError } = await supabase
        .from("client_balances")
        .select("markup_percent")
        .eq("client_id", client_id)
        .single();

      if (balanceError) {
        console.error("Error loading client markup:", balanceError);
      }

      clientMarkup = Number(balanceRow?.markup_percent ?? 0);
    }

    const markupMultiplier = 1 + clientMarkup / 100;
    // ------------------------------------------------------

    // основной запрос к вьюхе
    let query = supabase.from("v_adcampaigns_client_compat").select("*");

    if (resolvedMode === "client" && client_id) {
      query = query.eq("client_id", client_id);
    } else if (resolvedMode === "agency" && agency_id) {
      query = query.eq("agency_id", agency_id);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error loading campaigns:", error);
      return res
        .status(500)
        .json({ error: "Failed to load campaigns" } as any);
    }

    // здесь уже есть resolvedMode и markupMultiplier
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

      const cpmNet = Number(row.cpm ?? 0); // NET-CPM из вьюхи
      const budgetNet = Number(row.budget ?? 0); // NET общий бюджет
      const dailyBudgetNet = Number(row.daily_budget ?? 0); // NET дневной бюджет

      // NET SPEND: берем из вьюхи, либо считаем заново
      const spendNet =
        row.spend_raw !== undefined && row.spend_raw !== null
          ? Number(row.spend_raw)
          : views > 0
          ? (views * cpmNet) / 1000
          : 0;

      // Маркап для клиента: CPM_client = CPM_net * factor
      const cpmClient = isClientMode
        ? Number((cpmNet * markupMultiplier).toFixed(4))
        : cpmNet;

      // Бюджеты НЕ множим на маркап — лимит один и тот же
      const budgetClient = budgetNet;
      const dailyBudgetClient = dailyBudgetNet;

      // SPEND для клиента считаем из CPM клиента
      const spendClient = isClientMode
        ? Number(((views * cpmClient) / 1000).toFixed(2))
        : Number(spendNet.toFixed(2));

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
        actions: Number(row.actions ?? clicks),

        // CPM
        cpm_net: cpmNet,
        cpm_client: cpmClient,

        // TOTAL budget
        budget_net: budgetNet,
        budget_client: budgetClient,

        // DAILY budget
        daily_budget_net: dailyBudgetNet,
        daily_budget_client: dailyBudgetClient,

        // SPEND
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
