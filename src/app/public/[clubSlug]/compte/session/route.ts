import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginRequest, isValidSlug, sessionSecret } from "@/lib/public-session/policy";
import { ACCOUNT_COOKIE, ACCOUNT_MAX_AGE_SECONDS, isPlausibleJwt, openAccount, sealAccount } from "@/lib/account/seal";

/**
 * Mémoire du COMPTE sur ce navigateur (`/public/{slug}/compte/session`) :
 * cookie `bm_account` HttpOnly, chiffré, valable pour tous les clubs
 * (`Path=/public`). La connexion et le rafraîchissement se font depuis le
 * navigateur vers ball-manager-back (limites de débit par adresse IP du
 * vrai visiteur) ; cette route ne fait que garder les jetons.
 *
 * - GET    : `{ accessToken, expiresAt }`, ou `{ refreshToken }` si le jeton d'accès a expiré, ou 401.
 * - POST   : `{ accessToken, refreshToken, expiresAt }` — enregistre la session.
 * - DELETE : déconnexion de ce navigateur.
 */
const NO_STORE = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });
/** Marge : un jeton qui expire dans moins d'une minute est déjà considéré comme expiré. */
const EXPIRY_MARGIN_MS = 60_000;

type Context = { params: Promise<{ clubSlug: string }> };

async function prepare(request: NextRequest, context: Context) {
  const { clubSlug } = await context.params;
  if (!isValidSlug(clubSlug)) return { ok: false, response: json({ error: "NOT_FOUND" }, 404) } as const;
  const secret = sessionSecret();
  if (!secret) return { ok: false, response: json({ error: "SESSION_UNAVAILABLE" }, 503) } as const;
  if (!isSameOriginRequest(request.headers, request.url)) return { ok: false, response: json({ error: "FORBIDDEN" }, 403) } as const;
  return { ok: true, secret } as const;
}

function clear(response: NextResponse) {
  response.cookies.set(ACCOUNT_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/public", maxAge: 0 });
}

export async function GET(request: NextRequest, context: Context): Promise<NextResponse> {
  const ctx = await prepare(request, context);
  if (!ctx.ok) return ctx.response;
  const session = openAccount(request.cookies.get(ACCOUNT_COOKIE)?.value, ctx.secret);
  if (!session) {
    const response = json({ error: "NO_ACCOUNT" }, 401);
    if (request.cookies.has(ACCOUNT_COOKIE)) clear(response);
    return response;
  }
  if (new Date(session.expiresAt).getTime() - Date.now() > EXPIRY_MARGIN_MS) return json({ accessToken: session.accessToken, expiresAt: session.expiresAt });
  return json({ refreshToken: session.refreshToken });
}

export async function POST(request: NextRequest, context: Context): Promise<NextResponse> {
  const ctx = await prepare(request, context);
  if (!ctx.ok) return ctx.response;
  const body = (await request.json().catch(() => null)) as { accessToken?: unknown; refreshToken?: unknown; expiresAt?: unknown } | null;
  const expiresAt = typeof body?.expiresAt === "string" ? new Date(body.expiresAt) : null;
  if (!isPlausibleJwt(body?.accessToken) || !isPlausibleJwt(body?.refreshToken) || !expiresAt || Number.isNaN(expiresAt.getTime())) return json({ error: "INVALID_SESSION" }, 400);
  const response = json({ ok: true });
  response.cookies.set(ACCOUNT_COOKIE, sealAccount({ v: 1, accessToken: body.accessToken, refreshToken: body.refreshToken, expiresAt: expiresAt.toISOString() }, ctx.secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/public",
    maxAge: ACCOUNT_MAX_AGE_SECONDS,
  });
  return response;
}

export async function DELETE(request: NextRequest, context: Context): Promise<NextResponse> {
  const ctx = await prepare(request, context);
  if (!ctx.ok) return ctx.response;
  const response = json({ ok: true });
  clear(response);
  return response;
}
