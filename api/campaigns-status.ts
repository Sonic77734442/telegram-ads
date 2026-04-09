import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { readSessionFromRequest } from "./auth-utils.js";

function normalizeStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "active") return "Active";
  if (normalized === "hold" || normalized === "on hold" || normalized === "paused") {
    return "On Hold";
  }
  return null;
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

    const {
      ad_id,
      status,
      run_on_schedule,
      schedule_enabled,
      end_date,
    } = req.body || {};
    const nextStatus = typeof status === "string" ? normalizeStatus(status) : null;

    if (!ad_id || typeof ad_id !== "string" || !nextStatus) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const supabase = getSupabaseAdmin();
    const { data: ad, error: fetchError } = await supabase
      .from("ad_campaigns")
      .select("id, client_id, agency_id")
      .eq("id", ad_id)
      .single();

    if (fetchError || !ad) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (session.role === "client" && ad.client_id !== session.user_id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (session.role === "agency" && ad.agency_id !== session.agency_id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const nextSchedule =
      typeof schedule_enabled === "boolean"
        ? schedule_enabled
        : typeof run_on_schedule === "boolean"
        ? run_on_schedule
        : undefined;

    const update: Record<string, any> = {
      status: nextStatus,
      end_date: end_date || null,
    };

    if (typeof nextSchedule === "boolean") {
      update.schedule_enabled = nextSchedule;
    }

    const { error: updateError } = await supabase
      .from("ad_campaigns")
      .update(update)
      .eq("id", ad_id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({ ok: true, update });
  } catch (e: any) {
    console.error("campaigns-status handler exception", e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
