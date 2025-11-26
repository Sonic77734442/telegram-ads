// api/campaigns.ts
// ВАЖНО: никаких import сверху, только динамический import внутри handler

export default async function handler(req: any, res: any) {
  try {
    const { mode, client_id, agency_id } = (req as any).query || {};

    // режим: client | agency | admin
    const resolvedMode =
      mode === "client" || mode === "agency" || mode === "admin"
        ? mode
        : "client";

    // Маркап как в /api/reports (можно переиспользовать тот же env)
    const markupPercent = Number(process.env.CLIENT_MARKUP_PERCENT ?? "10");
    const markupMultiplier = 1 + markupPercent / 100;

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
    // status, target, created_at, updated_at, actions, cpm, budget, views, clicks

    let query = supabase.from("v_adcampaigns_client_compat").select("*");

    if (resolvedMode === "client" && client_id) {
      query = query.eq("client_id", client_id);
    } else if (resolvedMode === "agency" && agency_id) {
      query = query.eq("agency_id", agency_id);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("campaigns query error", error);
      return res.status(500).json({ error: error.message });
    }

    const rows =
      (data || []) as {
        id: string;
        title: string;
        text: string | null;
        url: string | null;
        media_url: string | null;
        media_type: string | null;
        status: string;
        target: string | null;
        created_at: string;
        updated_at: string;
        client_id: string | null;
        agency_id: string | null;
        cpm: number | null;
        budget: number | null;
        views: number | null;
        clicks: number | null;
      }[];

    // считаем метрики по каждой кампании
    const items = rows.map((row) => {
      const views = Number(row.views || 0);
      const clicks = Number(row.clicks || 0);
      const cpmNet = Number(row.cpm || 0);
      const budgetNet = Number(row.budget || 0);

      const spendNet = views > 0 ? (views * cpmNet) / 1000 : 0; // если нужно считать от фактических показов
      const spendClient = Number((spendNet * markupMultiplier).toFixed(2));
      const ctr = views > 0 ? Number(((clicks / views) * 100).toFixed(2)) : 0;

      return {
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
        cpm_net: cpmNet,
        cpm_client: Number((cpmNet * markupMultiplier).toFixed(2)),
        budget_net: budgetNet,
        budget_client: Number((budgetNet * markupMultiplier).toFixed(2)),
        views,
        clicks,
        spend_net: Number(spendNet.toFixed(2)),
        spend_client: spendClient,
        ctr,
      };
    });

    // итоги по всем кампаниям
    const totalViews = items.reduce((s, r) => s + r.views, 0);
    const totalClicks = items.reduce((s, r) => s + r.clicks, 0);
    const totalSpendNet = Number(
      items.reduce((s, r) => s + r.spend_net, 0).toFixed(2)
    );
    const totalSpendClient = Number(
      items.reduce((s, r) => s + r.spend_client, 0).toFixed(2)
    );
    const totalCtr =
      totalViews > 0
        ? Number(((totalClicks / totalViews) * 100).toFixed(2))
        : 0;
    const totalCpmNet =
      totalViews > 0
        ? Number(((totalSpendNet * 1000) / totalViews).toFixed(2))
        : 0;
    const totalCpmClient =
      totalViews > 0
        ? Number(((totalSpendClient * 1000) / totalViews).toFixed(2))
        : 0;

    return res.status(200).json({
      data: items,
      total: {
        views: totalViews,
        clicks: totalClicks,
        spend_net: totalSpendNet,
        spend_client: totalSpendClient,
        ctr: totalCtr,
        cpm_net: totalCpmNet,
        cpm_client: totalCpmClient,
      },
      markup_percent: markupPercent,
      mode: resolvedMode,
    });
  } catch (e: any) {
    console.error("campaigns handler exception", e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
