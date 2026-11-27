import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Cookie du COMPTE de l'espace licencié (`bm_account`, HttpOnly) : jetons
 * Supabase (accès + rafraîchissement) chiffrés et authentifiés (AES-256-GCM),
 * clé dérivée de `SESSION_SECRET`. Module PUR, Node uniquement.
 * Voir ball-manager-back/docs/ACCOUNTS.md.
 */
export const ACCOUNT_COOKIE = "bm_account";
/** Le compte reste connecté un an sur ce navigateur (le jeton de rafraîchissement tourne à chaque usage). */
export const ACCOUNT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export interface AccountCookiePayload {
  v: 1;
  accessToken: string;
  refreshToken: string;
  /** ISO : fin de validité du jeton d'accès. */
  expiresAt: string;
}

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(`ball-manager-account:${secret}`).digest();
}

export function sealAccount(payload: AccountCookiePayload, secret: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, deriveKey(secret), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function openAccount(sealed: string | undefined, secret: string): AccountCookiePayload | null {
  if (!sealed) return null;
  try {
    const raw = Buffer.from(sealed, "base64url");
    if (raw.length <= IV_BYTES + TAG_BYTES) return null;
    const decipher = createDecipheriv(ALGORITHM, deriveKey(secret), raw.subarray(0, IV_BYTES));
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    const json = Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(json) as Partial<AccountCookiePayload>;
    if (parsed.v !== 1 || typeof parsed.accessToken !== "string" || typeof parsed.refreshToken !== "string" || typeof parsed.expiresAt !== "string") return null;
    return parsed as AccountCookiePayload;
  } catch {
    return null;
  }
}

export function isPlausibleJwt(value: unknown): value is string {
  return typeof value === "string" && value.length >= 20 && value.length <= 4096 && /^[\x21-\x7e]+$/.test(value);
}
