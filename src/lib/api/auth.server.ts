import "server-only";
import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Identité minimale d'une requête authentifiée (tirée des claims JWT vérifiés). */
export interface ServerAuth {
  accessToken: string;
  userId: string;
  email: string | null;
}

/**
 * Authentification de la requête serveur courante, résolue UNE SEULE FOIS
 * (`cache()` React : portée = une requête, jamais partagée entre requêtes ni
 * entre utilisateurs). Avant le LOT-01, chaque `api.*` rappelait `getUser()`
 * (un aller-retour réseau vers Supabase Auth) : 9 appels pour un tableau de
 * bord admin. Voir docs/migration/06-adr/ADR-001-auth-une-resolution-par-requete.md.
 *
 * `getClaims()` vérifie l'expiration ET la signature du JWT : localement
 * (JWKS en cache) avec des clés de signature asymétriques, sinon il retombe
 * lui-même sur `getUser()` côté Supabase — jamais moins sûr que l'ancien
 * `getUser()` systématique, jamais plus d'un appel réseau par requête.
 * ball-manager-back revalide de toute façon le JWT à chaque appel.
 */
export const getServerAuth = cache(async (): Promise<ServerAuth | null> => {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase.auth.getClaims(session.access_token);
  if (error || !data) return null;

  const email = data.claims.email;
  return { accessToken: session.access_token, userId: data.claims.sub, email: typeof email === "string" ? email : null };
});

/** Jeton d'accès Supabase pour un appel ball-manager-back depuis un Server Component / Server Action (§8 de la demande). */
export async function getServerAccessToken(): Promise<string | null> {
  return (await getServerAuth())?.accessToken ?? null;
}
