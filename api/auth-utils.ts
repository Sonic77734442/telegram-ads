import crypto from "crypto";

type Role = "client" | "agency" | "admin";

export type SessionPayload = {
  user_id: string;
  role: Role;
  agency_id?: string | null;
  email?: string | null;
  agency_markup?: number | null;
  exp?: number;
};

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET env variable is not set");
  }
  return secret;
}

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function signSession(payload: SessionPayload): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const body = base64url(JSON.stringify({ ...payload, exp }));
  const data = `${header}.${body}`;
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(data)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${data}.${signature}`;
}

export function verifySession(token: string): SessionPayload | null {
  if (!token || typeof token !== "string" || token.split(".").length !== 3) {
    return null;
  }

  const [headerB64, bodyB64, signature] = token.split(".");
  const data = `${headerB64}.${bodyB64}`;
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(data)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  if (expected !== signature) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(bodyB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    ) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function readSessionFromRequest(req: any): SessionPayload | null {
  const cookieHeader = req.headers?.cookie || req.headers?.Cookie || "";
  const cookies = cookieHeader.split(";").reduce((acc: Record<string, string>, pair: string) => {
    const [k, v] = pair.split("=").map((s) => s?.trim());
    if (k && v) acc[k] = decodeURIComponent(v);
    return acc;
  }, {});

  const token = cookies["session"];
  if (!token) return null;
  return verifySession(token);
}

export function setSessionCookie(res: any, token: string) {
  const maxAge = TOKEN_TTL_SECONDS;
  const secure = process.env.NODE_ENV === "production";
  const cookie = [
    `session=${token}`,
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  res.setHeader("Set-Cookie", cookie);
}
