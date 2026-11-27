"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api/errors";
import { getPublicMe } from "@/lib/api/publicTables";
import { clearDeviceTokens, clearStoredPublicToken, consumePublicTokenFromUrl, getDeviceTokens, removeDeviceTokens, resetConsumedPublicToken, setSessionDeviceTokens } from "@/lib/publicToken";
import { dropSessionTokens, fetchSessionTokens, saveSessionTokens } from "@/lib/public-session/client";
import { KNOWN_COOKIE } from "./known-cookie";
import { accountToken, getAccountAccessToken, isAccountToken, licencieIdOfAccountToken, onAccountChange, setAccountClubSlug, signOutAccount } from "@/lib/account/client";
import { getAccount, type AccountDto } from "@/lib/api/accounts";

/** Personne active d'un compte (pas un secret) : retenue par club sur ce navigateur. */
const activeKey = (clubSlug: string) => `bm_account_active:${clubSlug}`;
function readActive(clubSlug: string): string | null {
  try {
    return window.localStorage.getItem(activeKey(clubSlug));
  } catch {
    return null;
  }
}
function writeActive(clubSlug: string, licencieId: string): void {
  try {
    window.localStorage.setItem(activeKey(clubSlug), licencieId);
  } catch {
    // Stockage bloqué : la première personne du compte reste active.
  }
}

export interface PublicIdentity {
  token: string;
  licencie: { id: string; firstName: string; lastName: string };
  isClubAdmin: boolean;
  /** Demandes de dérogation internes : coach / coordinateur (rôles posés depuis /joueurs). */
  derogationRequests: { canCreate: boolean; canManage: boolean };
  /** Tables de marque : coach ou admin du club → désigne / retire n'importe qui (retour du club, 2026-10-02). */
  tables: { canManage: boolean };
}

/** `undefined` = résolution en cours, `null` = aucun lien reconnu, sinon identité résolue. */
export type PublicIdentityState = PublicIdentity | null | undefined;

/**
 * Marqueur « déjà reconnu sur ce navigateur » (jamais le jeton) lu côté
 * serveur par `/public/{slug}` : accueil pour un licencié reconnu, pages
 * publiques pour tous les autres — robots d'indexation compris.
 */

function setKnownCookie(clubSlug: string, known: boolean): void {
  try {
    document.cookie = `${KNOWN_COOKIE}=${known ? "1" : ""}; Path=/public/${clubSlug}; Max-Age=${known ? 60 * 60 * 24 * 365 : 0}; SameSite=Lax`;
  } catch {
    // Cookies bloqués : l'entrée retombe simplement sur les pages publiques.
  }
}

export interface PublicClubInfo {
  name: string;
  logoUrl: string | null;
}

interface PublicIdentityContextValue {
  clubSlug: string;
  club: PublicClubInfo;
  identity: PublicIdentityState;
  /** `true` quand aucun lien n'est reconnu et que l'un d'eux a expiré (7 jours) : proposer d'en redemander un. */
  linkExpired: boolean;
  /** Oublie TOUS les liens mémorisés dans CE navigateur (le lien de l'email reste valable ailleurs). */
  forget: () => void;
  /**
   * Plusieurs liens sur l'appareil (un par enfant, Vie d'équipe 2026-10-09) :
   * `switchTo` fait d'un lien déjà connu l'identité courante (Tables,
   * Dérogations…), `forgetToken` en retire un seul.
   */
  switchTo: (token: string) => void;
  forgetToken: (token: string) => void;
  /** Compte connecté sur ce navigateur (`undefined` = en cours, `null` = aucun). */
  account: AccountDto | null | undefined;
  /** Recharge le compte et l'identité (après un rattachement, une invitation…). */
  refresh: () => void;
}

const PublicIdentityContext = createContext<PublicIdentityContextValue | null>(null);

/**
 * Identité de l'espace public sans compte, partagée par tous les onglets
 * (Matchs, Tables, Dérogations) et résolue UNE fois par le layout public :
 * lien de l'email (`#token=`, ou `?token=` des liens déjà envoyés ; retiré de l'URL dès sa lecture) ou lien déjà mémorisé dans ce navigateur,
 * toujours revalidé par `GET /v1/public/clubs/:slug/me` — jamais une
 * identité supposée côté client.
 */
export function PublicIdentityProvider({ clubSlug, club, children }: { clubSlug: string; club: PublicClubInfo; children: ReactNode }) {
  const [identity, setIdentity] = useState<PublicIdentityState>(undefined);
  const [linkExpired, setLinkExpired] = useState(false);
  const [resolveCount, setResolveCount] = useState(0);
  const [account, setAccount] = useState<AccountDto | null | undefined>(undefined);

  useEffect(() => {
    setAccountClubSlug(clubSlug);
    return onAccountChange(() => {
      setIdentity(undefined);
      setResolveCount((n) => n + 1);
    });
  }, [clubSlug]);
  // `true` quand la session serveur (cookie HttpOnly, /public/{slug}/session) est disponible :
  // elle remplace alors le localStorage comme mémoire longue durée.
  const serverSession = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const fromUrl = consumePublicTokenFromUrl();
    let sawExpired = false;

    void (async () => {
      // Compte d'abord (docs/ACCOUNTS.md du back) : ses licenciés ACTIFS remplacent les liens personnels.
      const accessToken = await getAccountAccessToken(clubSlug);
      if (cancelled) return;
      const currentAccount = accessToken ? await getAccount(clubSlug, accessToken).catch(() => null) : null;
      if (cancelled) return;
      setAccount(currentAccount);
      const activePeople = currentAccount?.people.filter((p) => p.status === "active") ?? [];
      if (activePeople.length > 0) {
        const preferred = readActive(clubSlug);
        const ordered = [...activePeople].sort((a, b) => Number(b.licencieId === preferred) - Number(a.licencieId === preferred));
        const tokens = ordered.map((p) => accountToken(p.licencieId));
        try {
          const result = await getPublicMe(clubSlug, tokens[0]!);
          if (cancelled) return;
          setSessionDeviceTokens(clubSlug, tokens);
          setKnownCookie(clubSlug, true);
          setLinkExpired(false);
          setIdentity({ token: tokens[0]!, licencie: result.licencie, isClubAdmin: result.isClubAdmin, derogationRequests: result.derogationRequests, tables: result.tables });
          return;
        } catch {
          if (cancelled) return;
          // Compte momentanément injoignable : on retombe sur les liens personnels de l'appareil.
        }
      }

      // Session serveur d'abord (survit à la fermeture du navigateur et, sur iOS ≥ 17.2, est copiée dans la PWA) ;
      // `null` = indisponible → comportement localStorage d'avant.
      const sessionTokens = await fetchSessionTokens(clubSlug);
      if (cancelled) return;
      serverSession.current = sessionTokens !== null;
      const local = getDeviceTokens(clubSlug);
      // Lien de l'email d'abord, puis le lien actif, puis les autres liens de l'appareil (un lien révoqué ne bloque pas les autres).
      const candidates = [...new Set([...(fromUrl ? [fromUrl] : []), ...(sessionTokens ?? []), ...local])];

      for (const candidate of candidates) {
        try {
          const result = await getPublicMe(clubSlug, candidate);
          if (cancelled) return;
          let persisted = false;
          if (serverSession.current) {
            const toStore = [candidate, ...local.filter((t) => t !== candidate), ...(sessionTokens ?? []).filter((t) => t !== candidate)];
            const alreadyStored = sessionTokens !== null && sessionTokens[0] === candidate && local.length === 0 && !fromUrl;
            persisted = alreadyStored || (await saveSessionTokens(clubSlug, toStore, candidate));
            if (cancelled) return;
          }
          if (persisted) {
            // Migration : plus aucun jeton longue durée dans le localStorage (liens gardés en mémoire pour la page).
            clearStoredPublicToken(clubSlug);
            clearDeviceTokens(clubSlug);
            setSessionDeviceTokens(clubSlug, [candidate, ...local.filter((t) => t !== candidate), ...(sessionTokens ?? []).filter((t) => t !== candidate)]);
          } else {
            // Session serveur indisponible : le jeton reste EN MÉMOIRE de la page, jamais écrit dans le localStorage (W3).
            // L'ancien stockage, s'il existe, est laissé intact : il est migré dès que la session serveur répond.
            serverSession.current = false;
            setSessionDeviceTokens(clubSlug, [candidate, ...local.filter((t) => t !== candidate)]);
          }
          setKnownCookie(clubSlug, true);
          setLinkExpired(false);
          setIdentity({ token: candidate, licencie: result.licencie, isClubAdmin: result.isClubAdmin, derogationRequests: result.derogationRequests, tables: result.tables });
          return;
        } catch (error) {
          if (cancelled) return;
          if (error instanceof ApiError && error.code === "PERSONAL_LINK_EXPIRED") sawExpired = true;
          if (candidate === fromUrl) resetConsumedPublicToken();
          removeDeviceTokens(clubSlug, [candidate]);
          clearStoredPublicToken(clubSlug);
          if (sessionTokens?.includes(candidate)) void dropSessionTokens(clubSlug, [candidate]);
        }
      }
      if (cancelled) return;
      setKnownCookie(clubSlug, false);
      setLinkExpired(sawExpired);
      setIdentity(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [clubSlug, resolveCount]);

  const forget = useCallback(() => {
    void signOutAccount(clubSlug);
    setAccount(null);
    clearStoredPublicToken(clubSlug);
    clearDeviceTokens(clubSlug);
    resetConsumedPublicToken();
    setKnownCookie(clubSlug, false);
    void dropSessionTokens(clubSlug);
    setLinkExpired(false);
    setIdentity(null);
  }, [clubSlug]);

  const switchTo = useCallback(
    (token: string) => {
      resetConsumedPublicToken();
      if (isAccountToken(token)) {
        writeActive(clubSlug, licencieIdOfAccountToken(token));
        setIdentity(undefined);
        setResolveCount((n) => n + 1);
        return;
      }
      if (serverSession.current) {
        void saveSessionTokens(clubSlug, [token], token).then(() => {
          setIdentity(undefined);
          setResolveCount((n) => n + 1);
        });
        return;
      }
      // Sans session serveur : ordre en mémoire seulement (W3), l'ancienne clé « actif » est effacée pour qu'il prime.
      const rest = getDeviceTokens(clubSlug).filter((t) => t !== token);
      clearStoredPublicToken(clubSlug);
      setSessionDeviceTokens(clubSlug, [token, ...rest]);
      setIdentity(undefined);
      setResolveCount((n) => n + 1);
    },
    [clubSlug],
  );

  const refresh = useCallback(() => {
    setIdentity(undefined);
    setResolveCount((n) => n + 1);
  }, []);

  const forgetToken = useCallback(
    (token: string) => {
      // Une personne du compte se retire depuis « Mon compte » (côté serveur), jamais d'ici.
      if (isAccountToken(token)) return;
      removeDeviceTokens(clubSlug, [token]);
      void dropSessionTokens(clubSlug, [token]);
      if (identity && identity.token === token) {
        clearStoredPublicToken(clubSlug);
        resetConsumedPublicToken();
        setIdentity(undefined);
        setResolveCount((n) => n + 1);
      }
    },
    [clubSlug, identity],
  );

  const { name: clubName, logoUrl: clubLogoUrl } = club;
  const value = useMemo(
    () => ({ clubSlug, club: { name: clubName, logoUrl: clubLogoUrl }, identity, linkExpired, forget, switchTo, forgetToken, account, refresh }),
    [clubSlug, clubName, clubLogoUrl, identity, linkExpired, forget, switchTo, forgetToken, account, refresh],
  );
  return <PublicIdentityContext.Provider value={value}>{children}</PublicIdentityContext.Provider>;
}

export function usePublicIdentity(): PublicIdentityContextValue {
  const value = useContext(PublicIdentityContext);
  if (!value) throw new Error("usePublicIdentity doit être utilisé sous <PublicIdentityProvider> (layout /public/[clubSlug]).");
  return value;
}
