import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { readSessionFromRequest } from "./auth-utils.js";
import { campaignInput } from "../shared/campaign-input.js";
import { randomUUID } from "node:crypto";
import { moderationError } from "../shared/campaign-status.js";

function canAccessCampaign(session: any, campaign: any) {
  if (session.role === "admin") return true;
  if (session.role === "client") return Boolean(session.user_id) && campaign.client_id === session.user_id;
  if (session.role === "agency") return Boolean(session.agency_id) && campaign.agency_id === session.agency_id;
  return false;
}

function normalizeStatusForForm(status: unknown) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "moderate") return "moderate";
  if (normalized === "on hold" || normalized === "hold" || normalized === "paused") {
    return "hold";
  }
  return status || "hold";
}

export default async function handler(req: any, res: any) {
  try {
    res.setHeader("Cache-Control", "private, no-store");
    if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method)) {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const session = readSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!session.user_id || !["client", "agency", "admin"].includes(session.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const supabase = getSupabaseAdmin();
    if (req.method === "POST" && req.query?.action === "media-upload") {
      const extensions: Record<string, string> = {
        "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
        "image/gif": "gif", "image/avif": "avif", "video/mp4": "mp4",
        "video/webm": "webm", "video/quicktime": "mov",
      };
      const extension = extensions[req.body?.contentType];
      if (!extension) return res.status(400).json({ error: "Выберите изображение или видео поддерживаемого формата." });
      const path = `ads/${session.user_id}/${randomUUID()}.${extension}`;
      const { data, error } = await supabase.storage.from("media").createSignedUploadUrl(path);
      if (error || !data) return res.status(503).json({ error: "Загрузка файлов временно недоступна. Попробуйте ещё раз." });
      return res.status(200).json({ path, token: data.token });
    }
    if (req.method === "POST") {
      let values;
      try { values = campaignInput(req.body); }
      catch (error) { return res.status(400).json({ error: (error as Error).message }); }
      const { data, error } = await supabase.from("ad_campaigns").insert({
        ...values,
        status: "Moderate",
        client_id: session.user_id,
        agency_id: session.agency_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).select("id").single();
      if (error) {
        console.error("campaign create error:", error.code);
        return res.status(503).json({ error: "Не удалось сохранить объявление. Попробуйте ещё раз." });
      }
      return res.status(201).json({ data });
    }

    const id = req.query?.id;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Campaign id is required" });
    }

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

    if (req.method === "PATCH" || req.method === "DELETE") {
      let values;
      if (req.method === "PATCH") {
        try { values = campaignInput(req.body); }
        catch (error) { return res.status(400).json({ error: (error as Error).message }); }
        const existingType = String(data.type || "").toLowerCase().replace(/s$/, "");
        if (existingType && values.type !== existingType) return res.status(400).json({ error: "Campaign type cannot be changed" });
        // Forms may omit status while editing an ad awaiting review.
        if (req.body?.status === undefined) values.status = data.status;
        const denied = moderationError(session.role, data.status, values.status);
        if (denied) return res.status(403).json({ error: denied });
      }
      let mutation = req.method === "DELETE"
        ? supabase.from("ad_campaigns").delete()
        : supabase.from("ad_campaigns").update({ ...values, updated_at: new Date().toISOString() });
      mutation = mutation.eq("id", id);
      if (session.role === "client") mutation = mutation.eq("client_id", session.user_id);
      if (session.role === "agency") mutation = mutation.eq("agency_id", session.agency_id);
      // Do not overwrite a moderation decision made after this request loaded the ad.
      if (req.method === "PATCH") mutation = data.status == null
        ? mutation.is("status", null) : mutation.eq("status", data.status);
      const { data: saved, error: saveError } = await mutation.select("id").maybeSingle();
      if (saveError) {
        console.error("campaign mutation error:", saveError.code);
        return res.status(503).json({ error: "Не удалось сохранить изменения. Попробуйте ещё раз." });
      }
      if (!saved) return res.status(409).json({ error: "Объявление изменилось. Обновите страницу и повторите действие." });
      return res.status(200).json({ data: saved });
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
