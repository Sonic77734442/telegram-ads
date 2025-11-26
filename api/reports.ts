// api/reports.ts

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { ad_id, ym } = req.query;

    return res.status(200).json({
      ok: true,
      message: "reports API is alive",
      query: { ad_id, ym }
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: e?.message || String(e) || "unknown error" });
  }
}
