import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasAnyRole, isClubAdmin, type ClubRole } from "@/lib/permissions/roles";
import { api } from "@/lib/api/server";
import type { ClubDto } from "@/lib/api/clubs";

/**
 * Point d'entrée UNIQUE pour résoudre "quel club, avec quels droits" pour
 * une requête donnée (voir docs/MULTI_TENANCY.md). Depuis la migration vers
 * ball-manager-back (§12/§13 de la demande), ce module ne lit plus JAMAIS
 * `clubs`/`club_memberships` directement dans Supabase : il appelle
 * `GET /v1/clubs`, qui ne renvoie déjà que les clubs dont l'utilisateur est
 * membre actif (RLS appliquée côté backend) — un slug qui n'y figure pas
 * est traité EXACTEMENT comme un club inexistant (jamais de distinction,
 * cohérent avec le comportement précédent).
 *
 * `cache()` (React, scope = une seule requête serveur) évite un appel
 * réseau dupliqué quand le layout ET une page appellent ce module pour la
 * même requête — jamais un cache partagé entre requêtes ou entre
 * utilisateurs (voir §41 de la demande, docs/API_CLIENT.md).
 */
const getUserClubs = cache(async (): Promise<ClubDto[]> => {
  await requireUser();
  return api.clubs.list();
});

/** Résout le club pour un slug d'URL — `null` si le club n'existe pas OU si l'utilisateur n'en est pas membre (jamais distingué, voir ci-dessus). */
export async function getClubContext(slug: string): Promise<ClubDto | null> {
  const clubs = await getUserClubs();
  return clubs.find((club) => club.slug === slug) ?? null;
}

/** Variante stricte : 404 si le club n'existe pas ou n'a pas cet utilisateur pour membre. */
export async function requireClubContext(slug: string): Promise<ClubDto> {
  const club = await getClubContext(slug);
  if (!club) notFound();
  return club;
}

/** Variante stricte réservée au club_admin de CE club (ex: /c/{slug}/admin/*). */
export async function requireClubAdminContext(slug: string): Promise<ClubDto> {
  const club = await requireClubContext(slug);

  if (!isClubAdmin(club.roles)) {
    redirect(`/c/${slug}/dashboard`);
  }

  return club;
}

/**
 * Variante stricte pour un ENSEMBLE de rôles équivalents sur un module
 * (ex: Tables de marque, §31 de la demande : club_admin OU
 * responsable_tables — même porte d'entrée que ball-manager-back,
 * `requireAnyClubRole`, voir routes.ts côté API).
 */
export async function requireAnyClubRoleContext(slug: string, roles: readonly ClubRole[]): Promise<ClubDto> {
  const club = await requireClubContext(slug);

  if (!hasAnyRole(club.roles, roles)) {
    redirect(`/c/${slug}/dashboard`);
  }

  return club;
}

/** Liste des clubs actifs auxquels l'utilisateur appartient (club switcher, §14 du brief SaaS / §12 de la demande). */
export async function listUserClubs(): Promise<ClubDto[]> {
  return getUserClubs();
}
