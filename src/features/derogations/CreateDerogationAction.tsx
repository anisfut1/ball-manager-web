"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import { CalendarPlus, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, FormMessage, Input, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import type { CreateDerogationDto, CreateDerogationResultDto } from "@/lib/api/matches";

export type FormState = {
  modifierDate: boolean;
  dateDerogation: string; // <input type="date"> → "YYYY-MM-DD"
  modifierHoraire: boolean;
  horaire: string; // <input type="time"> → "HH:MM", même format que FBI
  inverserRencontre: boolean;
  inverserEquipe: boolean;
  motif: string;
};

const INITIAL_FORM: FormState = {
  modifierDate: false,
  dateDerogation: "",
  modifierHoraire: false,
  horaire: "",
  inverserRencontre: false,
  inverserEquipe: false,
  motif: "",
};

type Status = { kind: "success" | "error" | "warning"; text: string } | null;

/**
 * "on a vu comment accepter ou refuser une dérog, mtn faut en créer une.
 * (sur chaque rencontre faut un bouton "Créer une dérogation") On va dans
 * dérog > état : à créer > on cherche la rencontre concernée > on remplit
 * et choisi le motif, et on envoie de la meme facon que pour accpter ou
 * refuser" (demande du club, 2026-09-28). ÉCRIT réellement sur FBI/FFBB,
 * jamais annulable depuis cet outil une fois envoyée — "on cherche la
 * rencontre concernée" est fait côté SERVEUR (à partir du `matchId` déjà
 * connu), jamais une recherche manuelle ici.
 *
 * Champs REELS confirmés par le formulaire de création FBI (voir
 * ball-manager-back/docs/FBI.md) : modifier date/horaire (chacun affiche son
 * propre champ, comme sur FBI), inverser la rencontre / inverser seulement
 * les équipes (mutuellement exclusives, même règle que le JS réel de la
 * page), motif obligatoire. La modification de SALLE n'est volontairement
 * PAS proposée ici (mécanique de la modale FBI jamais observée sur du HTML
 * réel — voir la doc de `BrowserFbiClient.createDerogation`).
 */
export function CreateDerogationAction({
  clubId,
  matchId,
  submit: submitOverride,
  initial,
  openLabel = "Créer une dérogation",
  onSuccess,
}: {
  clubId: string;
  matchId: string;
  /** Autre déclencheur du MÊME envoi FBI (ex. depuis une demande interne, retour du club 2026-10-01). */
  submit?: (body: CreateDerogationDto) => Promise<CreateDerogationResultDto>;
  /** Pré-remplissage (ex. date et heure du créneau demandé par le coach). */
  initial?: Partial<FormState>;
  openLabel?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const startForm = { ...INITIAL_FORM, ...initial };
  const [form, setForm] = useState<FormState>(startForm);
  const [status, setStatus] = useState<Status>(null);

  function reset() {
    setForm(startForm);
    setStatus(null);
    setOpen(false);
  }

  const motifValide = form.motif.trim().length > 0;
  const dateValide = !form.modifierDate || form.dateDerogation.length > 0;
  const horaireValide = !form.modifierHoraire || form.horaire.length > 0;
  const inversionValide = !(form.inverserRencontre && form.inverserEquipe);
  const auMoinsUneModification = form.modifierDate || form.modifierHoraire || form.inverserRencontre || form.inverserEquipe;
  const formValide = motifValide && dateValide && horaireValide && inversionValide && auMoinsUneModification;

  function submit() {
    startTransition(async () => {
      setStatus(null);
      try {
        // "DD/MM/YYYY" — format FBI réel (voir rencontreDateRencontre sur la
        // page de création), jamais celui de <input type="date"> ("YYYY-MM-DD").
        const [year, month, day] = form.dateDerogation.split("-");
        const dateDerogation = form.modifierDate && year && month && day ? `${day}/${month}/${year}` : null;

        const body: CreateDerogationDto = {
          motif: form.motif.trim(),
          modifierDate: form.modifierDate,
          dateDerogation,
          modifierHoraire: form.modifierHoraire,
          horaire: form.modifierHoraire ? form.horaire : null,
          inverserRencontre: form.inverserRencontre,
          inverserEquipe: form.inverserEquipe,
        };
        const result = submitOverride ? await submitOverride(body) : await browserApi.matches.createDerogation(clubId, matchId, body);

        if (result.outcome === "success") {
          setStatus({ kind: "success", text: "Dérogation créée sur FBI." });
          setForm(startForm);
          setOpen(false);
          onSuccess?.();
          router.refresh();
        } else if (result.outcome === "error") {
          setStatus({ kind: "error", text: result.message ?? "FBI a rejeté la création." });
        } else {
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

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button variant="secondary" onClick={() => setOpen(true)} icon={<CalendarPlus />}>
          {openLabel}
        </Button>
        {feedback}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 rounded-[var(--radius-md)] border border-border bg-surface p-4">
      <div>
        <p className="type-card text-foreground">Nouvelle demande de dérogation</p>
        <p className="type-meta mt-0.5">Cochez au moins une modification, puis indiquez le motif.</p>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-[var(--radius-md)] border border-border bg-surface-raised px-3">
        <div className="flex flex-col">
          <Checkbox label="Modifier la date" checked={form.modifierDate} onChange={(e) => setForm((f) => ({ ...f, modifierDate: e.target.checked }))} />
          {form.modifierDate ? (
            <div className="pb-3 pl-[30px]">
              <Input type="date" aria-label="Nouvelle date" value={form.dateDerogation} onChange={(e) => setForm((f) => ({ ...f, dateDerogation: e.target.value }))} className="max-w-xs" />
            </div>
          ) : null}
        </div>
        <div className="flex flex-col">
          <Checkbox label="Modifier l'horaire" checked={form.modifierHoraire} onChange={(e) => setForm((f) => ({ ...f, modifierHoraire: e.target.checked }))} />
          {form.modifierHoraire ? (
            <div className="pb-3 pl-[30px]">
              <Input type="time" aria-label="Nouvel horaire" value={form.horaire} onChange={(e) => setForm((f) => ({ ...f, horaire: e.target.value }))} className="max-w-xs" />
            </div>
          ) : null}
        </div>
        <Checkbox
          label="Inverser la rencontre"
          checked={form.inverserRencontre}
          onChange={(e) => setForm((f) => ({ ...f, inverserRencontre: e.target.checked, inverserEquipe: e.target.checked ? false : f.inverserEquipe }))}
        />
        <Checkbox
          label="Inverser seulement les équipes"
          checked={form.inverserEquipe}
          onChange={(e) => setForm((f) => ({ ...f, inverserEquipe: e.target.checked, inverserRencontre: e.target.checked ? false : f.inverserRencontre }))}
        />
      </div>

      <Field label="Motif de la demande" required>
        {(props) => <Textarea {...props} value={form.motif} onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))} rows={3} />}
      </Field>

      {!inversionValide ? <FormMessage tone="danger">« Inverser la rencontre » et « Inverser seulement les équipes » sont mutuellement exclusives.</FormMessage> : null}
      {inversionValide && !auMoinsUneModification ? <p className="type-meta">Coche au moins une modification (date, horaire, ou inversion).</p> : null}

      <Notice tone="warning">Cette demande sera transmise à la FFBB et ne pourra pas être annulée depuis cet outil.</Notice>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" loading={isPending} disabled={!formValide} onClick={submit} icon={<Send />}>
          {isPending ? "Envoi en cours…" : "Envoyer à la FFBB"}
        </Button>
        <Button variant="secondary" disabled={isPending} onClick={reset}>
          Annuler
        </Button>
      </div>

      {feedback}
    </div>
  );
}
