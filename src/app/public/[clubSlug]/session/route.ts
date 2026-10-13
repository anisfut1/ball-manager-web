import { NextResponse, type NextRequest } from "next/server";
import { publicTokenValid } from "@/lib/public-session/validate";
import { KNOWN_COOKIE } from "@/features/public/known-cookie";
import {
  isPlausibleToken,
  isSameOriginRequest,
  isSessionLive,
  isValidSlug,
  MAX_SESSION_TOKENS,
  mergeTokens,
  needsRenewal,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  sessionEpoch,
  sessionPath,
  sessionSecret,
} from "@/lib/public-session/policy";
import { openSession, sealSession, type SessionPayload } from "@/lib/public-session/seal";

/**
 * Session persistante de l'espace public (`/public/{slug}/session`).
 *
 * Le lien personnel (`?token=`) reste l'unique identifiant : ce endpoint le
 * valide auprès de ball-manager-back puis le range dans un cookie `HttpOnly`,
 * `Secure`, `SameSite=Lax`, chiffré, limité au chemin du club. Il remplace le
 * `localStorage` (effacé par Safari après 7 jours sans visite, et non copié
 * dans la PWA iOS) comme mémoire longue durée.
 *
 * - GET    : jetons de la session de CE club (navigateur ou PWA qui a le cookie).
 * - POST   : `{ tokens, active? }` — chaque NOUVEAU jeton est revalidé côté serveur.
 * - DELETE : `{ tokens? }` — retire ces jetons, ou toute la session (déconnexion).
 *
 * Sans `SESSION_SECRET` (≥ 32 caractères) tout répond 503 `SESSION_UNAVAILABLE`
 * et le front retombe sur son comportement d'avant. Réponses jamais mises en cache.
 */

const NO_STORE = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

type Context = { params: Promise<{ clubSlug: string }> };

async function prepare(request: NextRequest, context: Context) {
  const { clubSlug } = await context.params;
  if (!isValidSlug(clubSlug)) return { ok: false, response: json({ error: "NOT_FOUND" }, 404) } as const;
  const secret = sessionSecret();
  if (!secret) return { ok: false, response: json({ error: "SESSION_UNAVAILABLE" }, 503) } as const;
  if (!isSameOriginRequest(request.headers, request.url)) return { ok: false, response: json({ error: "FORBIDDEN" }, 403) } as const;
  const now = Date.now();
  const epoch = sessionEpoch();
  const opened = openSession(request.cookies.get(SESSION_COOKIE)?.value, secret);
  const current = opened && isSessionLive(opened, clubSlug, epoch, now) ? opened : null;
  return { ok: true, clubSlug, secret, now, epoch, current } as const;
}

function writeSession(response: NextResponse, clubSlug: string, secret: string, session: SessionPayload) {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE, sealSession(session, secret), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: sessionPath(clubSlug),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  // Marqueur « déjà reconnu » lu par /public/{slug} : posé par le SERVEUR pour échapper au plafond de 7 jours des cookies écrits en JavaScript (ITP de Safari).
  response.cookies.set(KNOWN_COOKIE, "1", { secure, sameSite: "lax", path: sessionPath(clubSlug), maxAge: SESSION_MAX_AGE_SECONDS });
}

function clearSession(response: NextResponse, clubSlug: string) {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: sessionPath(clubSlug), maxAge: 0 });
  response.cookies.set(KNOWN_COOKIE, "", { path: sessionPath(clubSlug), maxAge: 0 });
}

export async function GET(request: NextRequest, context: Context): Promise<NextResponse> {
  const ctx = await prepare(request, context);
  if (!ctx.ok) return ctx.response;
  const { clubSlug, secret, now, current } = ctx;
  if (!current || current.tokens.length === 0) {
    const response = json({ tokens: [] });
    if (request.cookies.has(SESSION_COOKIE)) clearSession(response, clubSlug);
    return response;
  }
  const response = json({ tokens: current.tokens });
  if (needsRenewal(current, now)) writeSession(response, clubSlug, secret, { ...current, issuedAt: now });
  return response;
}

export async function POST(request: NextRequest, context: Context): Promise<NextResponse> {
  const ctx = await prepare(request, context);
  if (!ctx.ok) return ctx.response;
  const { clubSlug, secret, now, epoch, current } = ctx;

  const body: unknown = await request.json().catch(() => null);
  const input = body as { tokens?: unknown; active?: unknown } | null;
  const incoming = Array.isArray(input?.tokens) ? input.tokens.filter(isPlausibleToken).slice(0, MAX_SESSION_TOKENS) : [];
  const active = isPlausibleToken(input?.active) ? input.active : undefined;
  if (active && !incoming.includes(active)) incoming.push(active);
  if (incoming.length === 0) return json({ error: "TOKENS_REQUIRED" }, 400);

  // Un jeton déjà dans la session a été validé à son entrée ; les autres sont revérifiés auprès de l'API (jamais de confiance au client).
  const known = new Set(current?.tokens ?? []);
  const accepted: string[] = [];
  for (const token of incoming) {
    if (known.has(token) || (await publicTokenValid(clubSlug, token))) accepted.push(token);
  }
  if (accepted.length === 0) return json({ error: "INVALID_TOKEN" }, 401);

  const session: SessionPayload = {
    v: 1,
    slug: clubSlug,
    epoch,
    firstIssuedAt: current?.firstIssuedAt ?? now,
    issuedAt: now,
    tokens: mergeTokens(current?.tokens ?? [], accepted, active && accepted.includes(active) ? active : undefined),
  };
  const response = json({ ok: true, tokens: session.tokens });
  writeSession(response, clubSlug, secret, session);
  return response;
}

export async function DELETE(request: NextRequest, context: Context): Promise<NextResponse> {
  const ctx = await prepare(request, context);
  if (!ctx.ok) return ctx.response;
  const { clubSlug, secret, now, current } = ctx;

  const body: unknown = await request.json().catch(() => null);
  const drop = (body as { tokens?: unknown } | null)?.tokens;
  const response = json({ ok: true });
  if (!current || !Array.isArray(drop)) {
    clearSession(response, clubSlug);
    return response;
  }
  const remaining = current.tokens.filter((t) => !drop.includes(t));
  if (remaining.length === 0) clearSession(response, clubSlug);
  else writeSession(response, clubSlug, secret, { ...current, issuedAt: now, tokens: remaining });
  return response;
}
