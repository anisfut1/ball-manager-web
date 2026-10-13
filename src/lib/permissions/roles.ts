import type { ClubRole } from "@/types/database";

export type { ClubRole };

/**
 * Libellés affichables des rôles (docs/MULTI_TENANCY.md). Tenus séparés des
 * valeurs de l'enum SQL pour pouvoir changer le libellé sans migration.
 *
 * `club_admin` = tous les droits SUR UN CLUB (ex-`super_admin`, renommé
 * lors de la migration multi-tenant pour ne jamais le confondre avec
 * `platform_admin`, qui appartient à l'opérateur de la plateforme et vit
 * dans une table séparée — voir src/lib/auth/platform.ts).
 */
export const ROLE_LABELS: Record<ClubRole, string> = {
  club_admin: "Administrateur du club",
  correspondant_club: "Coordinateur",
  responsable_tables: "Responsable tables",
  coach: "Coach",
  joueur: "Joueur",
  parent: "Parent",
};

/**
 * Un utilisateur peut cumuler plusieurs rôles SUR UN MÊME CLUB : ces
 * fonctions opèrent donc toujours sur une liste de rôles déjà résolue pour
 * un club donné (voir ClubContext), jamais sur un rôle global.
 */
export function hasRole(roles: readonly ClubRole[], role: ClubRole): boolean {
  return roles.includes(role);
}

export function hasAnyRole(roles: readonly ClubRole[], allowed: readonly ClubRole[]): boolean {
  return allowed.some((role) => roles.includes(role));
}

export function isClubAdmin(roles: readonly ClubRole[]): boolean {
  return hasRole(roles, "club_admin");
}

/**
 * Demandes de dérogation internes (coach → coordinateur) : coachs,
 * coordinateur (`correspondant_club`) et club_admin — même porte que
 * ball-manager-back (la portée fine par équipe y est appliquée).
 */
export const DEROGATION_REQUEST_ROLES: readonly ClubRole[] = ["club_admin", "correspondant_club", "coach"];
