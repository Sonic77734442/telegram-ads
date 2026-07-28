import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { readSessionFromRequest } from "./auth-utils.js";

const VIDEO_OPEN_RATE = 31_789 / 5_625_000;

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCSV(rows: Record<string, unknown>[], headers: string[]) {
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export default async function handler(req: any, res: any) {
  try {
    const session = readSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      ad_id,
      type = "stats",
      range = "days",
      ym,
    } = req.query || {};
    if (!ad_id || typeof ad_id !== "string") {
      return res.status(400).json({ error: "ad_id is required" });
    }
    if (!["stats", "budget", "reports"].includes(type)) {
      return res.status(400).json({ error: "type must be stats, budget, or reports" });
    }

    const supabase = getSupabaseAdmin();
    const { data: campaign, error: campaignError } = await supabase
      .from("ad_campaigns")
      .select("client_id, agency_id, media_type")
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

    let rows: Record<string, unknown>[] = [];
    let headers: string[] = [];
    let suffix = String(range === "5min" ? "5min" : "days");

    if (type === "stats" || type === "budget") {
      const { data: statsRows, error: statsError } = await supabase
        .from("ad_stats")
        .select("timestamp, views, clicks, amount")
        .eq("ad_id", ad_id)
        .order("timestamp", { ascending: true });

      if (statsError) {
        return res.status(500).json({ error: statsError.message });
      }

      if (range === "5min") {
        if (type === "stats") {
          const isVideo = String(campaign.media_type || "").toLowerCase() === "video";
          headers = ["Timestamp (UTC)", "Views", "Opened video", "Clicks"];
          rows = (statsRows || []).map((row: any) => ({
            "Timestamp (UTC)": row.timestamp,
            Views: Number(row.views || 0),
            "Opened video": isVideo
              ? Math.round(Number(row.views || 0) * VIDEO_OPEN_RATE)
              : 0,
            Clicks: Number(row.clicks || 0),
          }));
        } else {
          headers = ["Timestamp (UTC)", "Spent budget"];
          rows = (statsRows || []).map((row: any) => ({
            "Timestamp (UTC)": row.timestamp,
            "Spent budget": (Number(row.amount || 0) * multiplier).toFixed(4),
          }));
        }
      } else {
        const byDay = new Map<
          string,
          { views: number; clicks: number; amount: number }
        >();
        for (const row of statsRows || []) {
          const day = String(row.timestamp || "").slice(0, 10);
          if (!day) continue;
          const current = byDay.get(day) || { views: 0, clicks: 0, amount: 0 };
          current.views += Number(row.views || 0);
          current.clicks += Number(row.clicks || 0);
          current.amount += Number(row.amount || 0);
          byDay.set(day, current);
        }

        const sorted = Array.from(byDay.entries()).sort(([a], [b]) =>
          a.localeCompare(b)
        );
        if (type === "stats") {
          const isVideo = String(campaign.media_type || "").toLowerCase() === "video";
          headers = ["Date (UTC)", "Views", "Opened video", "Clicks"];
          rows = sorted.map(([date, value]) => ({
            "Date (UTC)": date,
            Views: value.views,
            "Opened video": isVideo
              ? Math.round(value.views * VIDEO_OPEN_RATE)
              : 0,
            Clicks: value.clicks,
          }));
        } else {
          headers = ["Date (UTC)", "Spent budget"];
          rows = sorted.map(([date, value]) => ({
            "Date (UTC)": date,
            "Spent budget": (value.amount * multiplier).toFixed(4),
          }));
        }
      }
    } else {
      if (!ym || typeof ym !== "string" || !/^\d{4}-\d{2}$/.test(ym)) {
        return res.status(400).json({ error: "ym is required in YYYY-MM format" });
      }
      suffix = ym;
      const { data: reportRows, error: reportError } = await supabase.rpc(
        "get_reports_for_month",
        { input_ad_id: ad_id, ym }
      );
      if (reportError) {
        return res.status(500).json({ error: reportError.message });
      }

      let sourceRows = (reportRows || []) as Array<{
        day: string;
        views: number;
        amount: number;
      }>;

      if (sourceRows.length === 0) {
        const { data: fallbackRows, error: fallbackError } = await supabase
          .from("ad_stats")
          .select("timestamp, views, amount")
          .eq("ad_id", ad_id);
        if (fallbackError) {
          return res.status(500).json({ error: fallbackError.message });
        }
        const byDay = new Map<string, { views: number; amount: number }>();
        for (const row of fallbackRows || []) {
          const timestamp = String(row.timestamp || "");
          if (!timestamp.startsWith(`${ym}-`)) continue;
          const day = timestamp.slice(0, 10);
          const current = byDay.get(day) || { views: 0, amount: 0 };
          current.views += Number(row.views || 0);
          current.amount += Number(row.amount || 0);
          byDay.set(day, current);
        }
        sourceRows = Array.from(byDay.entries()).map(([day, value]) => ({
          day,
          ...value,
        }));
      }

      headers = ["Day", "Views", "Amount"];
      rows = sourceRows
        .sort((a, b) => a.day.localeCompare(b.day))
        .map((row) => ({
          Day: row.day,
          Views: Number(row.views || 0),
          Amount: (Number(row.amount || 0) * multiplier).toFixed(2),
        }));
    }

    const safeAdId = ad_id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `ad_${safeAdId}_${type}_${suffix}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).send(toCSV(rows, headers));
  } catch (error: any) {
    console.error("export-csv handler exception", error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
