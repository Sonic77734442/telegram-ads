import { readSessionFromRequest } from "./auth-utils.js";

const TELEGRAM_URL_RE =
  /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\/([A-Za-z0-9_]{5,32})(?:\/|$)/i;

const decodeHtml = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const readMeta = (html: string, property: string) => {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      "i"
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1].trim());
  }
  return "";
};

export default async function handler(req: any, res: any) {
  const session = readSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const rawUrl = String(req.query?.url || "").trim();
  const match = rawUrl.match(TELEGRAM_URL_RE);
  if (!match) {
    return res.status(400).json({ error: "A valid Telegram URL is required" });
  }

  const username = match[1];

  try {
    const response = await fetch(`https://t.me/${encodeURIComponent(username)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 TelegramAdsPreview/1.0",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Telegram preview is unavailable" });
    }

    const html = await response.text();
    const title = readMeta(html, "og:title") || `@${username}`;
    const avatar = readMeta(html, "og:image") || null;
    const description =
      readMeta(html, "og:description") || readMeta(html, "twitter:description");
    const kind =
      username.toLowerCase().endsWith("bot") || /\bbot\b/i.test(description)
        ? "bot"
        : "channel";

    res.setHeader("Cache-Control", "private, max-age=300");
    return res.status(200).json({
      data: {
        title,
        avatar,
        kind,
        username,
      },
    });
  } catch (error) {
    console.error("Telegram preview metadata error:", error);
    return res.status(502).json({ error: "Telegram preview is unavailable" });
  }
}
