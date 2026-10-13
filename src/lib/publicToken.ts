/**
 * Persistance du jeton personnel sans compte (retour du club, 2026-09-29)
 * côté navigateur — jamais un cookie/session Supabase, ce lien n'authentifie
 * QUE "je suis ce licencié précis de ce club" (voir
 * ball-manager-back/docs/PUBLIC_TABLE_ACCESS.md). `localStorage` peut être
 * indisponible (navigation privée, storage bloqué) : chaque accès est
 * protégé par try/catch, le lien complet (`?token=`) reste alors la seule
 * façon de revenir, ce qui est acceptable (c'est déjà le cas pour tout le
 * monde à la toute première visite).
 */

function storageKey(clubSlug: string): string {
  return `scsb:public-token:${clubSlug}`;
}

export function getStoredPublicToken(clubSlug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey(clubSlug));
  } catch {
    return null;
  }
}

export function setStoredPublicToken(clubSlug: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(clubSlug), token);
  } catch {
    // Rien à faire : le lien complet reste utilisable à chaque visite.
  }
}

export function clearStoredPublicToken(clubSlug: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(clubSlug));
  } catch {
    // Rien à faire.
  }
}

/**
 * Lecture du jeton dans l'URL du lien d'e-mail. Fonctions pures sur une chaîne
 * (testables sans DOM). R-014 : le jeton passe en FRAGMENT (`#token=`, jamais
 * envoyé au serveur ni journalisé par la plateforme) ; `?token=` reste accepté
 * (liens déjà envoyés). Le fragment est prioritaire s'il y a les deux.
 */
export function tokenFromHref(href: string): string | null {
  const url = new URL(href);
  const fromFragment = new URLSearchParams(url.hash.slice(1)).get("token");
  return fromFragment || url.searchParams.get("token") || null;
}

/** Chemin + query + hash sans le jeton (query ET fragment), ou `null` s'il n'y en a aucun. */
export function hrefWithoutToken(href: string): string | null {
  const url = new URL(href);
  const hadQuery = url.searchParams.has("token");
  const fragment = new URLSearchParams(url.hash.slice(1));
  const hadFragment = fragment.has("token");
  if (!hadQuery && !hadFragment) return null;

  url.searchParams.delete("token");
  let hash = url.hash;
  if (hadFragment) {
    fragment.delete("token");
    const rest = fragment.toString();
    hash = rest ? `#${rest}` : "";
  }
  return `${url.pathname}${url.search}${hash}`;
}

// Jeton déjà lu dans l'URL pendant ce chargement de page : l'URL est nettoyée dès
// la première lecture, donc une seconde exécution de l'effet (StrictMode en dev)
// ne le retrouverait plus.
let consumedUrlToken: string | null = null;

/**
 * Lit le jeton du lien (fragment, puis query) et RETIRE AUSSITÔT l'URL
 * (`history.replaceState`) : ni historique, ni `Referer`, ni capture d'écran,
 * ni rapport CSP ne le gardent, même si la validation échoue ensuite.
 */
export function consumePublicTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const href = window.location.href;
  const token = tokenFromHref(href);
  const clean = hrefWithoutToken(href);
  if (clean !== null) {
    try {
      window.history.replaceState(window.history.state, "", clean);
    } catch {
      // Rien à faire : l'URL reste telle quelle.
    }
  }
  if (token) consumedUrlToken = token;
  return token ?? consumedUrlToken;
}

/** Oublie le jeton mémorisé pour cette page (appelé avec `forget`). */
export function resetConsumedPublicToken(): void {
  consumedUrlToken = null;
}

/**
 * Plusieurs liens sur le même appareil (Vie d'équipe, 2026-10-09) : un
 * parent avec deux enfants reçoit un lien par enfant ; la Home « À faire »
 * les fusionne. Le lien « actif » (ci-dessus) reste celui de l'identité
 * courante (Tables, Dérogations…) ; cette liste mémorise TOUS les liens
 * reconnus sur cet appareil, actif compris. Jamais envoyée dans une URL.
 */
const MAX_DEVICE_TOKENS = 8;

function deviceKey(clubSlug: string): string {
  return `scsb:public-tokens:${clubSlug}`;
}

function readDeviceList(clubSlug: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(deviceKey(clubSlug)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string" && t.length > 0) : [];
  } catch {
    return [];
  }
}

function writeDeviceList(clubSlug: string, tokens: string[]): void {
  if (typeof window === "undefined") return;
  try {
    if (tokens.length) window.localStorage.setItem(deviceKey(clubSlug), JSON.stringify(tokens));
    else window.localStorage.removeItem(deviceKey(clubSlug));
  } catch {
    // Rien à faire : seul le lien actif reste connu.
  }
}

/**
 * Liens de la session serveur (cookie HttpOnly, voir `public-session/`), gardés
 * EN MÉMOIRE seulement pour les écrans qui fusionnent plusieurs liens
 * (planning, « À faire ») : rien n'est écrit dans un stockage JavaScript.
 */
const memoryTokens = new Map<string, string[]>();

export function setSessionDeviceTokens(clubSlug: string, tokens: readonly string[]): void {
  if (tokens.length) memoryTokens.set(clubSlug, [...tokens].slice(0, MAX_DEVICE_TOKENS));
  else memoryTokens.delete(clubSlug);
}

/** Liens de l'appareil, le lien actif en premier (sans doublon). */
export function getDeviceTokens(clubSlug: string): string[] {
  const active = getStoredPublicToken(clubSlug);
  const stored = [...(memoryTokens.get(clubSlug) ?? []), ...readDeviceList(clubSlug)];
  const all = active ? [active, ...stored] : stored;
  return [...new Set(all)].slice(0, MAX_DEVICE_TOKENS);
}

/** Ajoute un lien validé (le plus récent d'abord). */
export function addDeviceToken(clubSlug: string, token: string): void {
  writeDeviceList(clubSlug, [token, ...readDeviceList(clubSlug).filter((t) => t !== token)].slice(0, MAX_DEVICE_TOKENS));
}

/** Oublie certains liens (révoqués, ou retirés par la personne). */
export function removeDeviceTokens(clubSlug: string, tokens: readonly string[]): void {
  const drop = new Set(tokens);
  const inMemory = memoryTokens.get(clubSlug);
  if (inMemory) setSessionDeviceTokens(clubSlug, inMemory.filter((t) => !drop.has(t)));
  writeDeviceList(clubSlug, readDeviceList(clubSlug).filter((t) => !drop.has(t)));
}

export function clearDeviceTokens(clubSlug: string): void {
  memoryTokens.delete(clubSlug);
  writeDeviceList(clubSlug, []);
}
