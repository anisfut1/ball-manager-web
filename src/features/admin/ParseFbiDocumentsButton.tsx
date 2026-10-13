"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import { ScanText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ActionStatus } from "@/components/ui/ActionStatus";

/** Même filet de sécurité que ProcessFbiJobsButton — voir son commentaire pour le détail du raisonnement. */
const MAX_ROUNDS = 100;

type Status = { kind: "pending" | "success" | "error"; text: string };

/**
 * Deuxième étape, séparée de `ProcessFbiJobsButton` : télécharger un
 * document e-Marque ne le transforme pas en composition/stats/officiels
 * affichables — il faut le parser (OCR/PDF). Sans ce bouton, un document
 * reste "Téléchargé" indéfiniment, en attendant le cron quotidien
 * `/internal/cron/emarque-parse` (voir docs/FBI.md côté ball-manager-back).
 *
 * Relance automatiquement tant que le lot renvoyé est plein (§10 de la
 * demande : "je ne veux pas avoir à appuyer 200 fois") — un seul clic
 * traite toute la file tant que l'onglet reste ouvert.
 */
export function ParseFbiDocumentsButton({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status | null>(null);

  function handleClick() {
    startTransition(async () => {
      let candidatesExamined = 0;
      let imported = 0;
      let errors = 0;

      try {
        for (let round = 0; round < MAX_ROUNDS; round += 1) {
          setStatus({ kind: "pending", text: candidatesExamined > 0 ? `Traitement en cours… (${candidatesExamined} documents traités jusqu'ici)` : "Traitement en cours…" });

          const result = await browserApi.integrations.parseFbiDocuments(clubId);
          candidatesExamined += result.candidatesExamined;
          imported += result.imported;
          errors += result.errors;

          if (result.candidatesExamined === 0) break;
        }

        if (candidatesExamined === 0) {
          setStatus({ kind: "success", text: "Rien à parser pour l'instant." });
        } else {
          const parts = [`${candidatesExamined} document${candidatesExamined > 1 ? "s" : ""} traité${candidatesExamined > 1 ? "s" : ""}`];
          if (imported > 0) parts.push(`${imported} importé${imported > 1 ? "s" : ""}`);
          if (errors > 0) parts.push(`${errors} en échec`);
          setStatus({ kind: errors > 0 ? "error" : "success", text: parts.join(", ") + "." });
        }

        router.refresh();
      } catch (error) {
        setStatus({
          kind: "error",
          text: `${candidatesExamined} document${candidatesExamined > 1 ? "s" : ""} traités avant l'erreur : ${error instanceof ApiError ? error.message : "traitement impossible."}`,
        });
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" onClick={handleClick} loading={isPending} icon={<ScanText />}>
        {isPending ? "Traitement en cours…" : "Parser les documents téléchargés"}
      </Button>
      <ActionStatus status={status} />
    </div>
  );
}
