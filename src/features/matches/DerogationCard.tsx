"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import { BellRing, CalendarClock, RefreshCw } from "lucide-react";
import { Card, CardDivider, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataList } from "@/components/ui/DataList";
import { FormMessage } from "@/components/ui/Field";
import type { DerogationStatusDto } from "@/lib/api/matches";
import { RespondToDerogationAction } from "@/features/derogations/RespondToDerogationAction";
import { CreateDerogationAction } from "@/features/derogations/CreateDerogationAction";

type Status = { kind: "success" | "error" | "pending"; text: string };

/**
 * `demandeur` ("Domicile"/"Visiteur") est un jargon FBI relatif à CETTE
 * rencontre précise, jamais toujours "notre équipe" — demande du club,
 * 2026-09-27 : "c ecrit demandeur domicile mais je sais pas cest qui qui
 * joue à domicile". Résolu vers le nom réel via `domicile`/`visiteur`
 * (mêmes champs bruts FBI), jamais deviné.
 */
function resolveDemandeurTeam(derogation: { demandeur: string | null; domicile: string | null; visiteur: string | null }): string | null {
  if (derogation.demandeur === "Domicile") return derogation.domicile;
  if (derogation.demandeur === "Visiteur") return derogation.visiteur;
  return null;
}

/**
 * Consultation de l'état d'une dérogation FBI pour ce match (demande du
 * club, voir docs/FBI.md côté ball-manager-back : "faut qu'on gere les
 * derog depuis l'outil"). `isAdmin` uniquement (même verrou que POST
 * .../derogation/check côté API). "Vérifier sur FBI" est SYNCHRONE depuis
 * 2026-09-28 ("doit y avoir rien en attente") : login/consulte FBI et
 * affiche le résultat réel de CE clic, jamais un job à espérer voir
 * traité par ailleurs.
 *
 * Depuis 2026-09-27 ("je veux le faire via loutil"), une dérogation "En
 * Cours" attendant une décision DU CLUB (`derogation.actionRequired`)
 * affiche aussi le bouton Accepter/Refuser (`RespondToDerogationAction`)
 * — ÉCRIT réellement sur FBI/FFBB, jamais annulable depuis cet outil.
 */
export function DerogationCard({ clubId, matchId, derogation, isAdmin }: { clubId: string; matchId: string; derogation: DerogationStatusDto | null; isAdmin: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status | null>(null);

  function handleCheck() {
    startTransition(async () => {
      setStatus({ kind: "pending", text: "Vérification en cours…" });

      try {
        const result = await browserApi.matches.checkDerogation(clubId, matchId);
        setStatus({ kind: "success", text: result.found ? "Vérification terminée." : "Vérification terminée — aucune dérogation trouvée pour ce match sur FBI." });
        router.refresh();
      } catch (error) {
        setStatus({ kind: "error", text: error instanceof ApiError ? error.message : "Vérification impossible." });
      }
    });
  }

  const demandeurTeam = derogation ? resolveDemandeurTeam(derogation) : null;

  return (
    <Card>
      <CardHeader
        icon={<CalendarClock />}
        title="Statut officiel (FBI)"
        description={derogation ? `Dernière vérification : ${new Date(derogation.checkedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}` : undefined}
        actions={
          derogation?.actionRequired ? (
            <StatusBadge tone="warning" icon={<BellRing />}>
              Action requise
            </StatusBadge>
          ) : null
        }
      />
      <CardDivider />
      {derogation ? (
        <div className="flex flex-col gap-5">
          <DataList
            items={[
              { label: "État", value: derogation.etat ?? "—" },
              { label: "Demandeur", value: `${derogation.demandeur ?? "—"}${demandeurTeam ? ` (${demandeurTeam})` : ""}` },
              { label: "Rencontre initiale", value: `${derogation.dateRencontre ?? "—"} ${derogation.heure ?? ""}`.trim() },
              { label: "Rencontre demandée", value: `${derogation.dateRencontreDemandee ?? "—"} ${derogation.heureDemandee ?? ""}`.trim() },
              { label: "Motif de la demande", value: derogation.motif ?? "—", span: 2 },
              { label: "Date de dérogation", value: derogation.dateDerogation ?? "—" },
            ]}
          />

          {derogation.adversaire || derogation.dateReponse || derogation.acceptation || derogation.motifRefus ? (
            <div className="surface-panel flex flex-col gap-3 p-4">
              <p className="type-eyebrow">Réponse de l&apos;adversaire</p>
              <DataList
                items={[
                  { label: "Adversaire", value: derogation.adversaire ?? "—" },
                  { label: "Date de réponse", value: derogation.dateReponse ?? "—" },
                  { label: "Acceptation", value: derogation.acceptation ?? "—" },
                  { label: "Motif de refus", value: derogation.motifRefus ?? "—" },
                ]}
              />
            </div>
          ) : null}

          {isAdmin && derogation.actionRequired && derogation.id ? <RespondToDerogationAction clubId={clubId} derogationId={derogation.id} /> : null}
        </div>
      ) : (
        <p className="type-meta">Aucune dérogation connue pour ce match pour l&apos;instant.</p>
      )}

      {isAdmin ? (
        <div className="mt-5 flex flex-col items-start gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={handleCheck} loading={isPending} icon={<RefreshCw />}>
              {isPending ? "Vérification en cours…" : "Vérifier sur FBI"}
            </Button>
          </div>
          {status ? (
            status.kind === "pending" ? (
              <p role="status" className="type-meta">
                {status.text}
              </p>
            ) : (
              <FormMessage tone={status.kind === "success" ? "success" : "danger"}>{status.text}</FormMessage>
            )
          ) : null}
          {/* "sur chaque rencontre faut un bouton 'Créer une dérogation'" (demande du club, 2026-09-28) — toujours disponible, indépendamment d'une dérogation déjà connue ou non pour ce match. */}
          <CreateDerogationAction clubId={clubId} matchId={matchId} />
        </div>
      ) : null}
    </Card>
  );
}
