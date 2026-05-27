import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { readSessionFromRequest } from "./auth-utils.js";

function canAccessCampaign(session: any, campaign: any) {
  if (session.role === "admin") return true;
  if (session.role === "client") return campaign.client_id === session.user_id;
  if (session.role === "agency") return campaign.agency_id === session.agency_id;
  return false;
}

function normalizeStatusForForm(status: unknown) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "on hold" || normalized === "hold" || normalized === "paused") {
    return "hold";
  }
  return status || "hold";
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const session = readSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const id = req.query?.id;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Campaign id is required" });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("ad_campaigns")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("campaign fetch error:", error);
      return res.status(500).json({ error: "Failed to load campaign" });
    }
    if (!data) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    if (!canAccessCampaign(session, data)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.status(200).json({
      data: {
        ...data,
        status: normalizeStatusForForm(data.status),
      },
    });
  } catch (e: any) {
    console.error("campaign handler exception:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
