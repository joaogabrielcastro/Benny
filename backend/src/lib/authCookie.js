/** Nome do cookie httpOnly com o JWT. */
export const AUTH_COOKIE_NAME = "auth_token";

/**
 * Opções do cookie de sessão.
 * Cross-subdomain (frontend vs API): defina COOKIE_DOMAIN=.jwsoftware.com.br
 * e SameSite=None (Secure obrigatório).
 */
export function authCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  const domain = (process.env.COOKIE_DOMAIN || "").trim() || undefined;
  const sameSiteEnv = (process.env.COOKIE_SAME_SITE || "").toLowerCase();
  const sameSite =
    sameSiteEnv === "none" || sameSiteEnv === "lax" || sameSiteEnv === "strict"
      ? sameSiteEnv
      : domain
        ? "none"
        : "lax";

  return {
    httpOnly: true,
    secure: isProd || sameSite === "none",
    sameSite,
    domain,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function clearAuthCookieOptions() {
  const opts = authCookieOptions();
  return {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    domain: opts.domain,
    path: opts.path,
  };
}

/** Parse manual de Cookie header (sem cookie-parser). */
export function parseCookies(req) {
  const header = req.headers?.cookie;
  if (!header || typeof header !== "string") return {};
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      out[key] = part.slice(idx + 1).trim();
    }
  }
  return out;
}

export function extractTokenFromRequest(req) {
  const header = req.headers?.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  const cookies = parseCookies(req);
  return cookies[AUTH_COOKIE_NAME] || null;
}
