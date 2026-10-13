"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ActionStatus } from "@/components/ui/ActionStatus";

/**
 * "je ne veux pas avoir à appuyer 200 fois" (§10 de la demande) : chaque
 * appel ne traite qu'un petit lot (`CLUB_JOB_BATCH_SIZE`, côté
 * ball-manager-back) — tant que le lot renvoyé est plein (`claimed > 0`),
 * il en reste probablement d'autres, donc on relance automatiquement DANS
 * CE MÊME clic, sans que l'admin ait à recliquer. Un seul clic vide toute
 * la file, tant que l'onglet reste ouvert (le fetch continue même en
 * arrière-plan) — `MAX_ROUNDS` est juste un filet de sécurité pour ne
 * jamais boucler indéfiniment si le backend renvoyait toujours `claimed >
 * 0` sans jamais vider la file (bug, ou file alimentée plus vite qu'elle
 * n'est vidée).
 *
 * INCIDENT constaté en production le 2026-09-24 (déploiement initial de
 * cette boucle auto, sans les deux garde-fous ci-dessous) : la boucle a
 * enchaîné ~190 connexions FBI en quelques minutes, sans aucune pause —
 * `fbi_integration_status.last_error` est passé de "Connecté ✅" à
 * "Formulaire de connexion FBI non reconnu" en cours de route, chaque job
 * étant alors marqué en échec PERMANENT (`AUTH_FLOW_CHANGED`, jamais
 * retried, voir errors.ts côté ball-manager-back) — signature cohérente
 * avec un blocage anti-bot FBI déclenché par le rythme, jamais observé
 * avant cette boucle malgré des dizaines de connexions manuelles
 * (espacées naturellement par le temps de clic de l'admin). Arrêté côté
 * base (jobs replanifiés + remis en attente) le temps du correctif —
 * jamais reproductible sans ces deux garde-fous :
 * - `ROUND_DELAY_MS` : pause entre deux lots, jamais un enchaînement
 *   immédiat (le rythme manuel précédent, ~30s+ entre clics, n'avait
 *   jamais déclenché ce comportement).
 * - Coupe-circuit : un lot ENTIÈREMENT en échec (`succeeded === 0` alors
 *   que des jobs ont été réclamés) interrompt la boucle après
 *   `MAX_CONSECUTIVE_FULL_FAILURES` lots consécutifs de ce type — un vrai
 *   problème (identifiants, blocage FBI) ne se corrige jamais en
 *   insistant, autant arrêter tôt plutôt que de vider toute la file en
 *   échecs permanents.
 */
const MAX_ROUNDS = 100;
const ROUND_DELAY_MS = 5_000;
const MAX_CONSECUTIVE_FULL_FAILURES = 2;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Status = { kind: "pending" | "success" | "error"; text: string };

/**
 * "FBI connecté" ne récupère rien tout seul : la connexion réussie prouve
 * juste que les identifiants sont valides, la récupération réelle des
 * documents e-Marque tourne comme des jobs `discover_emarque` en arrière-plan
 * (voir docs/FBI.md côté ball-manager-back). Ces jobs dépendaient jusqu'ici
 * uniquement de `/internal/cron/fbi-jobs` (une fois par jour) — ce bouton
 * appelle `POST .../fbi/process-jobs`, qui traite un petit lot des jobs de
 * CE club DANS LA REQUÊTE, sans dépendre du cron ni du dashboard Vercel.
 */
export function ProcessFbiJobsButton({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status | null>(null);

  function handleClick() {
    startTransition(async () => {
      let claimed = 0;
      let succeeded = 0;
      let failed = 0;
      let consecutiveFullFailures = 0;
      let stoppedOnCircuitBreaker = false;

      try {
        for (let round = 0; round < MAX_ROUNDS; round += 1) {
          if (round > 0) await delay(ROUND_DELAY_MS);

          setStatus({ kind: "pending", text: claimed > 0 ? `Traitement en cours… (${claimed} jobs traités jusqu'ici)` : "Traitement en cours…" });

          const result = await browserApi.integrations.processFbiJobs(clubId);
          claimed += result.claimed;
          succeeded += result.succeeded;
          failed += result.failed;

          if (result.claimed === 0) break;

          consecutiveFullFailures = result.succeeded === 0 ? consecutiveFullFailures + 1 : 0;
          if (consecutiveFullFailures >= MAX_CONSECUTIVE_FULL_FAILURES) {
            stoppedOnCircuitBreaker = true;
            break;
          }
        }

        if (claimed === 0) {
          setStatus({ kind: "success", text: "Rien en attente pour l'instant." });
        } else {
          const parts = [`${claimed} job${claimed > 1 ? "s" : ""} traité${claimed > 1 ? "s" : ""}`];
          if (succeeded > 0) parts.push(`${succeeded} réussi${succeeded > 1 ? "s" : ""}`);
          if (failed > 0) parts.push(`${failed} en échec`);
          if (stoppedOnCircuitBreaker) parts.push("arrêté après plusieurs lots entièrement en échec — vérifie le statut FBI avant de recliquer");
          setStatus({ kind: failed > 0 ? "error" : "success", text: parts.join(", ") + "." });
        }

        router.refresh();
      } catch (error) {
        setStatus({ kind: "error", text: `${claimed} job${claimed > 1 ? "s" : ""} traités avant l'erreur : ${error instanceof ApiError ? error.message : "traitement impossible."}` });
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" onClick={handleClick} loading={isPending} icon={<Download />}>
        {isPending ? "Traitement en cours…" : "Traiter les jobs FBI en attente"}
      </Button>
      <ActionStatus status={status} />
    </div>
  );
}
