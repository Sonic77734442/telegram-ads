import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { signSession, setSessionCookie } from "./auth-utils.js";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: any) {
  const forwardedFor = String(req.headers?.["x-forwarded-for"] || "");
  return forwardedFor.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_ATTEMPTS;
}

function clearRateLimit(key: string) {
  attempts.delete(key);
}

/**
 * Login endpoint: validates credentials server-side and issues an HttpOnly session cookie.
 * Body: { email: string, password: string }
 */
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email/username and password are required" });
    }

    const rateLimitKey = `${getClientIp(req)}:${String(email).toLowerCase()}`;
    if (!checkRateLimit(rateLimitKey)) {
      return res.status(429).json({ error: "Too many login attempts. Try again later." });
    }

    const supabase = getSupabaseAdmin();

    // Find user by username or email
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .or("username.eq." + email + ",email.eq." + email)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash || "");
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    clearRateLimit(rateLimitKey);

    const role: "client" | "agency" | "admin" =
      user.role === "agency" || user.role === "admin" ? user.role : "client";

    const sessionToken = signSession({
      user_id: user.user_id,
      role,
      agency_id: user.role === "agency" ? user.user_id : user.agency_id,
      email: user.email,
      agency_markup: user.agency_markup ? Number(user.agency_markup) : null,
    });

    setSessionCookie(res, sessionToken);

    const agencyId = user.role === "agency" ? user.user_id : user.agency_id;
    const safeUser = {
      user_id: user.user_id,
      role,
      agency_id: agencyId,
      email: user.email,
      username: user.username,
      agency_markup: user.agency_markup ? Number(user.agency_markup) : null,
    };

    return res.status(200).json({ user: safeUser });
  } catch (e: any) {
    console.error("auth-login error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
