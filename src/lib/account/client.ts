import { refreshAccount, type AccountSessionDto } from "@/lib/api/accounts";

/**
 * Session du COMPTE dans le navigateur. Les jetons sont gardés par le
 * serveur web dans un cookie HttpOnly (`/public/{slug}/compte/session`) ; le
 * jeton d'accès n'est qu'en mémoire de la page, jamais dans un stockage JS.
 */
const headers = { "Content-Type": "application/json", "x-bm-csrf": "1" };
const url = (clubSlug: string) => `/public/${encodeURIComponent(clubSlug)}/compte/session`;

let cached: { slug: string; accessToken: string; expiresAt: number } | null = null;
let inflight: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

/** Préfixe des « jetons » de compte dans la liste des personnes de l'appareil : `as:<licencieId>`. */
export const ACCOUNT_TOKEN_PREFIX = "as:";

export function isAccountToken(token: string): boolean {
  return token.startsWith(ACCOUNT_TOKEN_PREFIX);
}

export function accountToken(licencieId: string): string {
  return `${ACCOUNT_TOKEN_PREFIX}${licencieId}`;
}

export function licencieIdOfAccountToken(token: string): string {
  return token.slice(ACCOUNT_TOKEN_PREFIX.length);
}

/** Changement de compte (connexion, déconnexion) : pour que l'identité se recharge. */
export function onAccountChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Slug du club courant, retenu par le fournisseur d'identité pour les appels sans slug. */
let currentSlug: string | null = null;
export function setAccountClubSlug(slug: string): void {
  currentSlug = slug;
}

async function load(slug: string): Promise<string | null> {
  try {
    const res = await fetch(url(slug), { headers: { "x-bm-csrf": "1" }, credentials: "same-origin", cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken?: string; expiresAt?: string; refreshToken?: string };
    if (data.accessToken && data.expiresAt) {
      cached = { slug, accessToken: data.accessToken, expiresAt: new Date(data.expiresAt).getTime() };
      return data.accessToken;
    }
    if (data.refreshToken) {
      const session = await refreshAccount(data.refreshToken).catch(() => null);
      if (!session) {
        await fetch(url(slug), { method: "DELETE", headers, credentials: "same-origin" }).catch(() => undefined);
        return null;
      }
      await storeAccountSession(slug, session, { notify: false });
      return session.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

/** Jeton d'accès du compte connecté sur ce navigateur, ou `null`. */
export async function getAccountAccessToken(slug: string | null = currentSlug): Promise<string | null> {
  if (!slug) return null;
  if (cached && cached.slug === slug && cached.expiresAt - Date.now() > 60_000) return cached.accessToken;
  inflight ??= load(slug).finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Après connexion ou création de compte : garde la session sur ce navigateur. */
export async function storeAccountSession(slug: string, session: AccountSessionDto, options: { notify?: boolean } = {}): Promise<void> {
  cached = { slug, accessToken: session.accessToken, expiresAt: new Date(session.expiresAt).getTime() };
  await fetch(url(slug), { method: "POST", headers, credentials: "same-origin", body: JSON.stringify({ accessToken: session.accessToken, refreshToken: session.refreshToken, expiresAt: session.expiresAt }) }).catch(() => undefined);
  if (options.notify !== false) listeners.forEach((l) => l());
}

/** Déconnexion du compte sur ce navigateur. */
export async function signOutAccount(slug: string): Promise<void> {
  cached = null;
  await fetch(url(slug), { method: "DELETE", headers, credentials: "same-origin" }).catch(() => undefined);
  listeners.forEach((l) => l());
}
