import type { ClubRole } from "@/lib/permissions/roles";

/** Gestion des entraînements côté compte : admin du club et coachs (portée par équipe vérifiée par ball-manager-back). */
export const TEAM_LIFE_MANAGER_ROLES: readonly ClubRole[] = ["club_admin", "coach"];
