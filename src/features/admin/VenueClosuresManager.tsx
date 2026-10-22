"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarOff, CheckCircle2, Dumbbell, Trash2, Trophy } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Field, FormMessage, Input, Select } from "@/components/ui/Field";
import { useConfirm } from "@/components/ui/Dialog";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import type { ClubVenueAdminDto, VenueClosureDto, VenueClosurePeriod } from "@/lib/api/members";

export const PERIOD_LABELS: Record<VenueClosurePeriod, string> = {
  day: "Journée entière",
  morning: "Matin (avant 13 h)",
  afternoon: "Après-midi (dès 13 h)",
};

/** « samedi 7 novembre » ; « du 7 au 9 novembre » pour une période. */
export function closureDates(startDate: string, endDate: string): string {
  const fmt = (key: string, options: Intl.DateTimeFormatOptions) => new Date(`${key}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC", ...options });
  if (startDate === endDate) return fmt(startDate, { weekday: "long", day: "numeric", month: "long" });
  return `du ${fmt(startDate, { day: "numeric", month: "long" })} au ${fmt(endDate, { day: "numeric", month: "long" })}`;
}

function conflictWhen(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString("fr-FR", { timeZone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function todayKey(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/**
 * Indisponibilités des gymnases (demande du club, 2026-10-22) : journée,
 * matin ou après-midi, sur une période ; chaque indisponibilité montre les
 * matchs à domicile et entraînements prévus pendant ce temps. Tout passe par
 * ball-manager-back.
 */
export function VenueClosuresManager({ clubId, clubSlug, timeZone, venues, initialClosures }: { clubId: string; clubSlug: string; timeZone: string; venues: ClubVenueAdminDto[]; initialClosures: VenueClosureDto[] }) {
  const [closures, setClosures] = useState(initialClosures);
  const [venueId, setVenueId] = useState(venues.find((v) => v.active)?.id ?? venues[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [period, setPeriod] = useState<VenueClosurePeriod>("day");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const today = todayKey(timeZone);

  async function add(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!venueId || !startDate) return setMessage({ tone: "danger", text: "Choisis le gymnase et la date." });
    const end = endDate || startDate;
    if (end < startDate) return setMessage({ tone: "danger", text: "La date de fin doit être après la date de début." });
    setSaving(true);
    try {
      const closure = await browserApi.members.createVenueClosure(clubId, { clubVenueId: venueId, startDate, endDate: end, period, ...(reason.trim() ? { reason: reason.trim() } : {}) });
      setClosures((list) => [...list, closure].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setStartDate("");
      setEndDate("");
      setReason("");
      const count = closure.conflicts.length;
      setMessage(count ? { tone: "danger", text: `Indisponibilité ajoutée : ${count} conflit${count > 1 ? "s" : ""} à régler.` } : { tone: "success", text: "Indisponibilité ajoutée, aucun conflit." });
    } catch (err) {
      setMessage({ tone: "danger", text: err instanceof ApiError ? err.message : "Ajout impossible pour le moment." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(closure: VenueClosureDto) {
    const ok = await confirm({ title: "Supprimer cette indisponibilité ?", description: `${closure.venueName}, ${closureDates(closure.startDate, closure.endDate)} (${PERIOD_LABELS[closure.period].toLowerCase()}).`, confirmLabel: "Supprimer", destructive: true });
    if (!ok) return;
    setMessage(null);
    try {
      await browserApi.members.deleteVenueClosure(clubId, closure.id);
      setClosures((list) => list.filter((c) => c.id !== closure.id));
    } catch (err) {
      setMessage({ tone: "danger", text: err instanceof ApiError ? err.message : "Suppression impossible pour le moment." });
    }
  }

  return (
    <Card className="flex flex-col gap-5">
      {confirmDialog}
      <CardHeader icon={<CalendarOff />} title="Indisponibilités" description="Journées ou demi-journées où un gymnase n'est pas disponible. Les matchs à domicile et entraînements prévus pendant ce temps apparaissent comme conflits (et dans Anomalies pour les matchs)." />

      {venues.length > 0 ? (
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
          <Field label="Gymnase" required>
            {(props) => (
              <Select {...props} value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Période" required>
            {(props) => (
              <Select {...props} value={period} onChange={(e) => setPeriod(e.target.value as VenueClosurePeriod)}>
                {(Object.keys(PERIOD_LABELS) as VenueClosurePeriod[]).map((p) => (
                  <option key={p} value={p}>
                    {PERIOD_LABELS[p]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Du" required>
            {(props) => <Input {...props} type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} />}
          </Field>
          <Field label="Au" optional hint="Vide : un seul jour. La période choisie s'applique à chaque jour.">
            {(props) => <Input {...props} type="date" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} />}
          </Field>
          <Field label="Motif" optional className="sm:col-span-2">
            {(props) => <Input {...props} maxLength={200} placeholder="Ex. tournoi de la mairie, travaux…" value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" variant="primary" loading={saving} icon={<CalendarOff />}>
              Ajouter l’indisponibilité
            </Button>
            {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
          </div>
        </form>
      ) : null}

      {closures.length === 0 ? (
        <p className="type-meta">Aucune indisponibilité à venir.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {closures.map((closure) => (
            <li key={closure.id} className="flex flex-col gap-2 py-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{closure.venueName}</p>
                  <p className="type-meta first-letter:uppercase">
                    {closureDates(closure.startDate, closure.endDate)} · {PERIOD_LABELS[closure.period]}
                    {closure.reason ? ` · ${closure.reason}` : ""}
                  </p>
                </div>
                {closure.conflicts.length ? (
                  <StatusBadge tone="danger" icon={<AlertTriangle />} size="sm">
                    {closure.conflicts.length} conflit{closure.conflicts.length > 1 ? "s" : ""}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="success" icon={<CheckCircle2 />} size="sm">
                    Aucun conflit
                  </StatusBadge>
                )}
                <IconButton label="Supprimer l'indisponibilité" variant="danger-ghost" size="sm" onClick={() => remove(closure)}>
                  <Trash2 />
                </IconButton>
              </div>
              {closure.conflicts.length ? (
                <ul className="flex flex-col gap-1.5 rounded-md border border-danger/30 bg-danger-soft/40 p-2.5">
                  {closure.conflicts.map((conflict) => (
                    <li key={`${conflict.kind}:${conflict.id}`} className="flex items-center gap-2 text-sm">
                      {conflict.kind === "MATCH" ? <Trophy aria-hidden className="size-4 shrink-0 text-danger" /> : <Dumbbell aria-hidden className="size-4 shrink-0 text-danger" />}
                      <span className="tabular-nums text-muted first-letter:uppercase">{conflictWhen(conflict.startsAt, timeZone)}</span>
                      <Link
                        href={conflict.kind === "MATCH" ? `/c/${clubSlug}/matchs/${conflict.id}` : `/c/${clubSlug}/entrainements`}
                        className="min-w-0 truncate font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {conflict.kind === "MATCH" ? `Match ${conflict.teamName ?? ""}${conflict.opponentName ? ` contre ${conflict.opponentName}` : ""}` : `Entraînement ${conflict.teamName ?? ""}`}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
