import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin } from "./supabaseAdmin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { ad_id, ym } = req.query;

    if (!ad_id || typeof ad_id !== "string") {
      return res.status(400).json({ error: "ad_id is required" });
    }
    if (!ym || typeof ym !== "string") {
      return res
        .status(400)
        .json({ error: "ym is required, format YYYY-MM, e.g. 2025-11" });
    }

    // 👇 Инициализируем admin-клиент внутри try/catch
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin.rpc("get_reports_for_month", {
      input_ad_id: ad_id,
      ym,
    });

    if (error) {
      console.error("get_reports_for_month error", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  } catch (e: any) {
    console.error("reports handler exception", e);
    return res.status(500).json({ error: e.message || String(e) });
  }
}
