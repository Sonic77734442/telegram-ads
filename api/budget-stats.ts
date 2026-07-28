import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { readSessionFromRequest } from "./auth-utils.js";

type Range = "days" | "5min";

export default async function handler(req: any, res: any) {
  try {
    const session = readSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { ad_id, range = "days" } = req.query || {};
    if (!ad_id || typeof ad_id !== "string") {
      return res.status(400).json({ error: "ad_id is required" });
    }

    const selectedRange: Range = range === "5min" ? "5min" : "days";
    const supabase = getSupabaseAdmin();
    const { data: campaign, error: campaignError } = await supabase
      .from("ad_campaigns")
      .select("client_id, agency_id")
      .eq("id", ad_id)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    if (session.role === "client" && campaign.client_id !== session.user_id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (session.role === "agency" && campaign.agency_id !== session.agency_id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    let multiplier = 1;
    if (session.role === "client") {
      const { data: balance } = await supabase
        .from("client_balances")
        .select("markup_percent")
        .eq("client_id", campaign.client_id)
        .maybeSingle();
      multiplier = 1 + Number(balance?.markup_percent || 0) / 100;
    }

    const { data: rows, error } = await supabase
      .from("ad_stats")
      .select("timestamp, amount")
      .eq("ad_id", ad_id)
      .order("timestamp", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (selectedRange === "5min") {
      return res.status(200).json({
        data: (rows || []).map((row: any) => ({
          ts: row.timestamp,
          amount: Number((Number(row.amount || 0) * multiplier).toFixed(4)),
        })),
      });
    }

    const byDay = new Map<string, number>();
    for (const row of rows || []) {
      const day = String(row.timestamp || "").slice(0, 10);
      if (!day) continue;
      byDay.set(day, (byDay.get(day) || 0) + Number(row.amount || 0));
    }

    return res.status(200).json({
      data: Array.from(byDay.entries()).map(([date, amount]) => ({
        date,
        amount: Number((amount * multiplier).toFixed(4)),
      })),
    });
  } catch (error: any) {
    console.error("budget-stats handler exception", error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
