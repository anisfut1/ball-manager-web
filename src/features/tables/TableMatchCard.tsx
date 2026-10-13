"use client";

import { useState } from "react";
import { House, MapPin, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { useConfirm } from "@/components/ui/Dialog";
import { ApiError } from "@/lib/api/client";
import type { TableAssignmentRole, TableAssignmentResultDto, TableAssignmentsForMatchDto } from "@/lib/api/tables";
import { formatMatchDateTime, matchDateParts } from "@/features/matches/match-display";
import { TableAssignmentSlot } from "./TableAssignmentSlot";
import { TableSuggestionsSheet } from "./TableSuggestionsSheet";
import { TABLE_ROLES, TABLE_ROLE_LABELS } from "./role-labels";
import type { TablesClient } from "./tables-client";

/**
 * Card d'un match à domicile avec ses 4 postes (§64-§66 de la demande,
 * Arbitre ajouté le 2026-09-28). Le rafraîchissement après
 * affectation/retrait/bascule "pas besoin d'arbitre" passe par `onChanged`
 * (fourni par `TablesBoard`, qui appelle `router.refresh()` + affiche un
 * toast) — jamais de ré-affectation locale silencieuse qui divergerait de
 * l'état réel côté serveur.
 */
export function TableMatchCard({ client, match, onChanged }: { client: TablesClient; match: TableAssignmentsForMatchDto; onChanged: (message: string) => void }) {
  const [openRole, setOpenRole] = useState<TableAssignmentRole | null>(null);
  const [removingRole, setRemovingRole] = useState<TableAssignmentRole | null>(null);
  const [togglingReferee, setTogglingReferee] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  const slotByRole = {
    SCORER: match.assignments.scorer,
    TIMEKEEPER: match.assignments.timekeeper,
    CLUB_DELEGATE: match.assignments.clubDelegate,
    REFEREE: match.assignments.referee,
  } as const;

  async function handleAssigned(role: TableAssignmentRole, result: TableAssignmentResultDto) {
    onChanged(`${result.assignment.licencie.firstName} ${result.assignment.licencie.lastName} affecté·e comme ${TABLE_ROLE_LABELS[role].toLowerCase()}.`);
  }

  async function handleRemove(role: TableAssignmentRole) {
    const slot = slotByRole[role];
    if (!slot) return;
    const ok = await confirm({
      title: "Retirer l'affectation ?",
      description: `Retirer l'affectation de ${slot.licencie.firstName} ${slot.licencie.lastName} ?`,
      confirmLabel: "Retirer",
      destructive: true,
    });
    if (!ok) return;

    setRemovingRole(role);
    try {
      await client.unassign(match.match.id, role);
      onChanged("Affectation retirée — poste remis à « À attribuer ».");
    } catch (error) {
      onChanged(error instanceof ApiError ? error.message : "Retrait impossible.");
    } finally {
      setRemovingRole(null);
    }
  }

  /**
   * Retour du club, 2026-09-28 : "il est possible qu'un arbitre officiel
   * soit désigné, donc avoir la possibilité de cocher un truc style pas
   * besoin d'arbitre". N'affecte jamais aucun licencié — voir
   * ball-manager-back/docs/TABLE_ASSIGNMENTS.md, match_referee_overrides.
   */
  async function handleToggleRefereeNotNeeded(noRefereeNeeded: boolean) {
    setTogglingReferee(true);
    try {
      await client.setRefereeStatus(match.match.id, noRefereeNeeded);
      onChanged(noRefereeNeeded ? "Marqué « pas besoin d'arbitre »." : "Un arbitre du club est de nouveau nécessaire.");
    } catch (error) {
      onChanged(error instanceof ApiError ? error.message : "Mise à jour du statut arbitre impossible.");
    } finally {
      setTogglingReferee(false);
    }
  }

  const parts = matchDateParts(match.match.matchDatetime);

  return (
    <Card data-glow={match.hasConflict || undefined}>
      <div className="flex items-start gap-3">
        <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-[12px] border border-border bg-surface py-2">
          <span className="type-eyebrow">{parts?.weekday ?? "—"}</span>
          <span className="type-numeric text-xl font-medium leading-tight text-foreground">{parts?.time ?? "--:--"}</span>
        </div>
        <div className="text-reflow flex-1">
          <h2 className="type-card flex flex-wrap items-center gap-2 text-foreground">
            {match.match.teamName ?? "Équipe"} <span className="font-normal text-muted">vs</span> {match.match.opponentName ?? "?"}
          </h2>
          <div className="type-meta mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{formatMatchDateTime(match.match.matchDatetime)}</span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5 shrink-0 text-subtle" aria-hidden />
              {match.match.venueLabel ?? "Lieu à confirmer"}
            </span>
          </div>
        </div>
        {match.hasConflict ? (
          <StatusBadge tone="danger" icon={<TriangleAlert />} size="sm">
            Conflit
          </StatusBadge>
        ) : (
          <StatusBadge tone="accent" icon={<House />} size="sm">
            Domicile
          </StatusBadge>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {TABLE_ROLES.map((role) => (
          <TableAssignmentSlot
            key={role}
            role={role}
            slot={slotByRole[role]}
            onChoose={() => setOpenRole(role)}
            onRemove={() => handleRemove(role)}
            removing={removingRole === role}
            headerExtra={
              role === "REFEREE" ? (
                <label className="flex min-h-8 cursor-pointer items-center gap-1.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--club-accent)]"
                    checked={match.refereeNotNeeded}
                    disabled={togglingReferee}
                    onChange={(e) => handleToggleRefereeNotNeeded(e.target.checked)}
                  />
                  Pas besoin d&apos;arbitre
                </label>
              ) : undefined
            }
            notice={role === "REFEREE" && match.refereeNotNeeded ? "Arbitre officiel FFBB déjà désigné — aucune affectation nécessaire." : undefined}
          />
        ))}
      </div>

      {openRole ? (
        <TableSuggestionsSheet
          client={client}
          matchId={match.match.id}
          role={openRole}
          open={openRole !== null}
          onClose={() => setOpenRole(null)}
          onAssigned={(result) => handleAssigned(openRole, result)}
        />
      ) : null}
      {confirmDialog}
    </Card>
  );
}
