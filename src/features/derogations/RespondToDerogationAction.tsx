"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import type { RespondToDerogationDto, RespondToDerogationResultDto } from "@/lib/api/derogations";

type Step = { kind: "idle" } | { kind: "confirm-accept" } | { kind: "confirm-refuse"; motif: string };
type Status = { kind: "success" | "error" | "warning"; text: string } | null;

/**
 * "je veux le faire via loutil... voici les boutons a utiliser pour
 * accetper ou refuser. Si jamais on refuse, laisser un champ pour remplir
 * le motif" (demande du club, 2026-09-27) — ÉCRIT réellement sur FBI/FFBB,
 * jamais annulable depuis cet outil une fois confirmé : une confirmation
 * explicite est TOUJOURS intercalée entre le clic initial et l'envoi
 * réel, contrairement aux autres actions (lecture seule) de l'app.
 * Partagé entre la liste des dérogations et la fiche d'un match — les
 * deux exposent le même `derogation.id`.
 */
export function RespondToDerogationAction({
  clubId,
  derogationId,
  submit: submitOverride,
}: {
  clubId?: string;
  derogationId: string;
  /** Même envoi FBI depuis l'espace public (coordinateur / admin, retour du club 2026-10-02). */
  submit?: (body: RespondToDerogationDto) => Promise<RespondToDerogationResultDto>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [status, setStatus] = useState<Status>(null);

  function submit(decision: "accepted" | "refused", motifRefus: string | null) {
    startTransition(async () => {
      setStatus(null);
      try {
        const body = { decision, motifRefus };
        const result = submitOverride ? await submitOverride(body) : await browserApi.derogations.respond(clubId ?? "", derogationId, body);
        if (result.outcome === "success") {
          setStatus({ kind: "success", text: decision === "accepted" ? "Dérogation acceptée sur FBI." : "Dérogation refusée sur FBI." });
          setStep({ kind: "idle" });
          router.refresh();
        } else if (result.outcome === "error") {
          setStatus({ kind: "error", text: result.message ?? "FBI a rejeté l'envoi." });
        } else {
          // "unknown" — jamais traité comme un succès (voir ball-manager-back/docs/FBI.md) : ni confirmation ni erreur détectée, vérification manuelle nécessaire.
          setStatus({ kind: "warning", text: result.message ?? "Résultat incertain — vérifie manuellement sur FBI avant de réessayer." });
        }
      } catch (error) {
        setStatus({ kind: "error", text: error instanceof ApiError ? error.message : "Envoi impossible." });
      }
    });
  }

  const feedback = status ? (
    status.kind === "warning" ? (
      <Notice tone="warning" live>
        {status.text}
      </Notice>
    ) : (
      <FormMessage tone={status.kind === "success" ? "success" : "danger"}>{status.text}</FormMessage>
    )
  ) : null;

  if (step.kind === "confirm-accept") {
    return (
      <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--success)_24%,transparent)] bg-success-soft p-4">
        <p className="text-sm text-foreground">Confirmer l&apos;acceptation ? Cette action sera transmise à la FFBB et ne pourra pas être annulée depuis cet outil.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="success" loading={isPending} onClick={() => submit("accepted", null)} icon={<Check />}>
            {isPending ? "Envoi en cours…" : "Confirmer l'acceptation"}
          </Button>
          <Button variant="secondary" disabled={isPending} onClick={() => setStep({ kind: "idle" })}>
            Annuler
          </Button>
        </div>
        {feedback}
      </div>
    );
  }

  if (step.kind === "confirm-refuse") {
    const motifValide = step.motif.trim().length > 0;
    return (
      <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--danger)_22%,transparent)] bg-danger-soft p-4">
        <Field label="Motif de refus" hint="Obligatoire, transmis à l'adversaire sur FBI." required>
          {(props) => <Textarea {...props} value={step.motif} onChange={(e) => setStep({ kind: "confirm-refuse", motif: e.target.value })} rows={3} />}
        </Field>
        <p className="text-sm text-foreground">Confirmer le refus ? Cette action sera transmise à la FFBB et ne pourra pas être annulée depuis cet outil.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" loading={isPending} disabled={!motifValide} onClick={() => submit("refused", step.motif.trim())} icon={<X />}>
            {isPending ? "Envoi en cours…" : "Confirmer le refus"}
          </Button>
          <Button variant="secondary" disabled={isPending} onClick={() => setStep({ kind: "idle" })}>
            Annuler
          </Button>
        </div>
        {feedback}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="success" onClick={() => setStep({ kind: "confirm-accept" })} icon={<Check />}>
          Accepter
        </Button>
        <Button variant="danger" onClick={() => setStep({ kind: "confirm-refuse", motif: "" })} icon={<X />}>
          Refuser
        </Button>
      </div>
      {feedback}
    </div>
  );
}
