import type { TableAssignmentRole } from "@/lib/api/tables";

/** Libellés FR des 4 rôles (§3 de la demande, REFEREE ajouté le 2026-09-28) — mêmes libellés que `ROLE_LABELS` côté ball-manager-back (table-suggestion-service.ts), capitalisés ici pour les titres d'UI. */
export const TABLE_ROLE_LABELS: Record<TableAssignmentRole, string> = {
  SCORER: "Marqueur",
  TIMEKEEPER: "Chronométreur",
  CLUB_DELEGATE: "Délégué de club",
  REFEREE: "Arbitre",
};

/** "Choisir un marqueur" / "...un chronométreur" / "...un délégué de club" / "...un arbitre" (§72) — les 4 rôles sont masculins, toujours "un". */
export function chooseRolePanelTitle(role: TableAssignmentRole): string {
  return `Choisir un ${TABLE_ROLE_LABELS[role].toLowerCase()}`;
}

export const TABLE_ROLES: readonly TableAssignmentRole[] = ["SCORER", "TIMEKEEPER", "CLUB_DELEGATE", "REFEREE"];
