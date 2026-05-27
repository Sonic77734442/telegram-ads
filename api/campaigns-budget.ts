import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { readSessionFromRequest } from "./auth-utils.js";

function canMutateCampaign(session: any, campaign: any) {
  if (session.role === "admin") return true;
  if (session.role === "client") return campaign.client_id === session.user_id;
  if (session.role === "agency") return campaign.agency_id === session.agency_id;
  return false;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const session = readSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { ad_id, mode, amount } = req.body as {
      ad_id?: string;
      mode?: "increase" | "edit";
      amount?: number;
    };

    if (
      !ad_id ||
      typeof ad_id !== "string" ||
      (mode !== "increase" && mode !== "edit") ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const supabase = getSupabaseAdmin();
    const { data: ad, error: fetchError } = await supabase
      .from("ad_campaigns")
      .select("id, client_id, agency_id, budget, daily_budget")
      .eq("id", ad_id)
      .single();

    if (fetchError || !ad) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (!canMutateCampaign(session, ad)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const update: Record<string, any> = {};

    if (mode === "increase") {
      update.budget = Number(ad.budget ?? 0) + amount;
    }

    if (mode === "edit") {
      update.daily_budget = amount;
    }

    const { error: updateError } = await supabase
      .from("ad_campaigns")
      .update(update)
      .eq("id", ad_id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("campaigns-budget handler exception:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
