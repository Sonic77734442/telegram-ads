import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { readSessionFromRequest } from "./auth-utils.js";

type Range = "days" | "5min";

export default async function handler(req: any, res: any) {
  try {
    const session = readSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { ad_id, range = "days" } = (req as any).query || {};
    if (!ad_id || typeof ad_id !== "string") {
      return res.status(400).json({ error: "ad_id is required" });
    }

    const selectedRange: Range = range === "5min" ? "5min" : "days";
    const supabase = getSupabaseAdmin();

    const { data: campaignRow, error: campaignError } = await supabase
      .from("ad_campaigns")
      .select("client_id, agency_id")
      .eq("id", ad_id)
      .single();

    if (campaignError || !campaignRow) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (session.role === "client" && campaignRow.client_id !== session.user_id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (session.role === "agency" && campaignRow.agency_id !== session.agency_id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { data: statsRows, error: statsError } = await supabase
      .from("ad_stats")
      .select("timestamp, views, clicks")
      .eq("ad_id", ad_id)
      .order("timestamp", { ascending: true });

    if (statsError) {
      console.error("ad_stats load error", statsError);
      return res.status(500).json({ error: statsError.message });
    }

    if (selectedRange === "5min") {
      return res.status(200).json({
        data: (statsRows || []).map((row: any) => ({
          ts: row.timestamp,
          views: Number(row.views || 0),
          clicks: Number(row.clicks || 0),
          video_opens: 0,
        })),
      });
    }

    const byDay = new Map<string, { views: number; clicks: number; video_opens: number }>();
    for (const row of statsRows || []) {
      const day = String(row.timestamp || "").slice(0, 10);
      if (!day) continue;

      const current = byDay.get(day) || { views: 0, clicks: 0, video_opens: 0 };
      current.views += Number(row.views || 0);
      current.clicks += Number(row.clicks || 0);
      byDay.set(day, current);
    }

    return res.status(200).json({
      data: Array.from(byDay.entries()).map(([date, value]) => ({
        date,
        ...value,
      })),
    });
  } catch (e: any) {
    console.error("stats handler exception", e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
