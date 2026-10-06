"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarSearch, ChevronRight, MessageSquareText, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { EmptyState } from "@/components/ui/States";
import { cn } from "@/components/ui/cn";
import { derogationClient, type DerogationSource } from "./client";
import { ApiError } from "@/lib/api/client";
import type { DerogationContextDto } from "@/lib/api/derogationRequests";
import { formatDayLongCapitalized, formatShortDateTime } from "./labels";
import { MatchHeadline } from "./parts";
import { AWAY_NOTICE, DateChooser, PENDING_WARNING, SlotChooser } from "./SlotPicker";
import type { SlotSelection } from "./VenuePlanning";

export const NO_COORDINATOR_MESSAGE = "Aucun coordinateur n'est actuellement configuré pour recevoir les demandes de dérogation.";

const STEPS = ["Match", "Date", "Créneau", "Résumé"] as const;
export type StepIndex = 0 | 1 | 2 | 3;

/**
 * Demande de dérogation interne (coach → coordinateur) : Match → Date →
 * Créneau → Résumé → Envoyer. Rien ici ne touche FFBB/FBI : l'envoi crée
 * seulement une demande interne que le coordinateur traitera lui-même.
 */
export function RequestWizard({ source, basePath, context, initialMatchId }: { source: DerogationSource; basePath: string; context: DerogationContextDto; initialMatchId: string | null }) {
  const router = useRouter();
  const base = basePath;
  const initial = context.eligibleMatches.find((m) => m.id === initialMatchId && !m.activeRequestId) ?? null;
  const [step, setStep] = useState<StepIndex>(initial ? 1 : 0);
  const [matchId, setMatchId] = useState<string | null>(initial?.id ?? null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotSelection | null>(null);
  const [comment, setComment] = useState("");
  const [requesterName, setRequesterName] = useState(context.requesterDisplayName);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  const match = useMemo(() => context.eligibleMatches.find((m) => m.id === matchId) ?? null, [context.eligibleMatches, matchId]);
  const tz = context.timezone;
  const askName = context.requesterNameSource === "EMAIL";

  function go(next: StepIndex) {
    setError(null);
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function send() {
    if (!match || !slot) return;
    setSending(true);
    setError(null);
    try {
      const created = await derogationClient(source).create({
        matchId: match.id,
        requestedStartAt: slot.startAt,
        requestedVenueId: slot.venueId,
        comment: comment.trim() || null,
        requesterDisplayName: askName ? requesterName.trim() || null : null,
      });
      router.push(`${base}/${created.id}?sent=1`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "DEROGATION_SLOT_CONFLICT") {
        // Le créneau a été pris entre-temps : retour au planning, rafraîchi.
        setSlot(null);
        setStep(2);
        setError({ message: err.message });
      } else if (err instanceof ApiError && err.code === "DEROGATION_REQUEST_ALREADY_ACTIVE") {
        setError({ message: err.message, requestId: typeof err.details?.requestId === "string" ? err.details.requestId : undefined });
      } else {
        setError({ message: err instanceof ApiError ? err.message : "Impossible d'envoyer la demande pour le moment. Réessaie dans quelques minutes." });
      }
      setSending(false);
    }
  }

  if (!context.canCreate) {
    return (
      <EmptyState
        icon={<CalendarSearch />}
        title="Aucune équipe à ta charge"
        description="Seul un coach peut demander une dérogation pour les matchs de ses équipes. Demande à l'administrateur du club de t'attribuer le rôle Coach."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Stepper step={step} onStep={(i) => i < step && go(i)} />

      {!context.coordinatorsConfigured ? <Notice tone="warning">{NO_COORDINATOR_MESSAGE} Tu pourras préparer ta demande, mais pas l&apos;envoyer tant qu&apos;un coordinateur n&apos;est pas désigné par l&apos;administrateur.</Notice> : null}

      {error ? (
        <Notice
          tone="danger"
          live
          action={
            error.requestId ? (
              <Link href={`${base}/${error.requestId}`} className="text-[13px] font-medium text-accent-text underline-offset-2 hover:underline">
                Voir la demande
              </Link>
            ) : undefined
          }
        >
          {error.message}
        </Notice>
      ) : null}

      {step === 0 ? (
        <section aria-labelledby="step-match" className="flex flex-col gap-3">
          <h2 id="step-match" className="type-section text-foreground">
            Quel match veux-tu déplacer ?
          </h2>
          {context.eligibleMatches.length === 0 ? (
            <EmptyState compact icon={<CalendarSearch />} title="Aucun match à venir" description="Aucun match à venir n'est programmé pour tes équipes." />
          ) : (
            <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {context.eligibleMatches.map((m) => (
                <li key={m.id}>
                  {m.activeRequestId ? (
                    <Link
                      href={`${base}/${m.activeRequestId}`}
                      className="flex min-h-16 items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-border bg-surface px-4 py-3 transition-colors duration-150 hover:border-border-strong"
                    >
                      <MatchHeadline match={m} timezone={tz} className="flex-1" />
                      <span className="flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-accent-text">
                        Demande en cours
                        <ChevronRight aria-hidden className="size-4" />
                      </span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (m.id !== matchId) {
                          setSlot(null);
                          setDate(null);
                        }
                        setMatchId(m.id);
                        go(1);
                      }}
                      aria-pressed={m.id === matchId}
                      className={cn(
                        "flex min-h-16 w-full items-center gap-3 rounded-[var(--radius-md)] border bg-surface-raised px-4 py-3 text-left shadow-1 transition-[border-color,box-shadow] duration-150",
                        m.id === matchId ? "border-accent shadow-glow-xs" : "border-border hover:border-border-strong",
                      )}
                    >
                      <MatchHeadline match={m} timezone={tz} className="flex-1" />
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-subtle" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {step >= 1 && match ? (
        <Card padded={false} className="px-4 py-3">
          <MatchHeadline match={match} timezone={tz} />
        </Card>
      ) : null}

      {step === 1 && match ? (
        <section aria-labelledby="step-date" className="flex flex-col gap-3">
          <h2 id="step-date" className="type-section text-foreground">
            Quelle date ?
          </h2>
          <DateChooser
            timezone={tz}
            value={date}
            onChange={(d) => {
              if (d !== date) setSlot(null);
              setDate(d);
            }}
          />
          <Footer onBack={() => go(0)} backLabel="Changer de match">
            <Button variant="primary" iconRight={<ArrowRight />} disabled={!date} onClick={() => go(2)}>
              Voir les créneaux
            </Button>
          </Footer>
        </section>
      ) : null}

      {step === 2 && match && date ? (
        <section aria-labelledby="step-slot" className="flex flex-col gap-3">
          <h2 id="step-slot" className="type-section text-foreground">
            {formatDayLongCapitalized(`${date}T12:00:00Z`, "UTC")} — quel créneau ?
          </h2>
          <SlotChooser source={source} matchId={match.id} date={date} timezone={tz} venues={context.venues} value={slot} onChange={setSlot} />
          <Footer onBack={() => go(1)} backLabel="Changer de date">
            <Button variant="primary" iconRight={<ArrowRight />} disabled={!slot} onClick={() => go(3)}>
              {slot ? `Continuer avec ${slot.localStart}` : "Choisis un créneau"}
            </Button>
          </Footer>
        </section>
      ) : null}

      {step === 3 && match && slot ? (
        <section aria-labelledby="step-summary" className="flex flex-col gap-4">
          <h2 id="step-summary" className="type-section text-foreground">
            Résumé de la demande
          </h2>
          <Card className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SummaryItem label="Date actuelle">{formatShortDateTime(match.matchDatetime, tz)}</SummaryItem>
              <SummaryItem label="Nouveau créneau demandé" strong>
                {formatDayLongCapitalized(slot.startAt, tz)} · {slot.localStart} → {slot.localEnd}
              </SummaryItem>
              <SummaryItem label="Gymnase">{slot.venueName ?? "À l'extérieur — à confirmer avec le club adverse"}</SummaryItem>
              <SummaryItem label="Demande formulée par">{askName ? requesterName.trim() || "—" : context.requesterDisplayName}</SummaryItem>
            </dl>
            {match.isHome === false ? <Notice tone="info">{AWAY_NOTICE}</Notice> : null}
            {slot.warnings.length > 0 ? <Notice tone="warning">{PENDING_WARNING}</Notice> : null}
          </Card>

          {askName ? (
            <Field label="Ton prénom" required hint="Affiché au coordinateur : « Demande formulée par … ».">
              {(props) => <Input {...props} value={requesterName} maxLength={80} onChange={(e) => setRequesterName(e.target.value)} autoComplete="given-name" className="max-w-sm" />}
            </Field>
          ) : null}

          <Field label="Message au coordinateur" optional hint="Ex. : la salle est libre ce jour-là, l'adversaire est d'accord…">
            {(props) => <Textarea {...props} rows={3} maxLength={3000} value={comment} onChange={(e) => setComment(e.target.value)} />}
          </Field>

          <Notice tone="neutral" icon={<MessageSquareText />}>
            La demande part au coordinateur du club, qui s&apos;occupe des démarches officielles. Le calendrier officiel n&apos;est pas modifié automatiquement.
          </Notice>

          <Footer onBack={() => go(2)} backLabel="Changer de créneau">
            <Button variant="primary" size="lg" icon={<Send />} loading={sending} disabled={!context.coordinatorsConfigured || (askName && !requesterName.trim())} onClick={send}>
              Envoyer la demande
            </Button>
          </Footer>
        </section>
      ) : null}
    </div>
  );
}

export function SummaryItem({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="type-eyebrow">{label}</dt>
      <dd className={cn("text-reflow text-[15px]", strong ? "font-semibold text-foreground" : "text-foreground")}>{children}</dd>
    </div>
  );
}

export function Footer({ onBack, backLabel, children }: { onBack: () => void; backLabel: string; children: React.ReactNode }) {
  return (
    <div className="sticky bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] z-30 -mx-4 mt-2 flex items-center justify-between gap-2 border-t border-border bg-[color-mix(in_oklab,var(--background)_92%,transparent)] px-4 py-2.5 backdrop-blur sm:mx-0 sm:rounded-[var(--radius-md)] sm:border sm:py-3 lg:bottom-4">
      <Button variant="ghost" icon={<ArrowLeft />} onClick={onBack} aria-label={backLabel} className="px-2.5 sm:px-4">
        <span className="sm:hidden">Retour</span>
        <span className="hidden sm:inline">{backLabel}</span>
      </Button>
      {children}
    </div>
  );
}

export function Stepper({ step, onStep }: { step: StepIndex; onStep: (i: StepIndex) => void }) {
  return (
    <nav aria-label="Étapes de la demande">
      <p className="type-meta mb-2 sm:hidden">
        Étape {step + 1} sur {STEPS.length} · <span className="font-medium text-foreground">{STEPS[step]}</span>
      </p>
      <ol className="grid grid-cols-4 gap-1.5">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label}>
              <button
                type="button"
                disabled={!done}
                onClick={() => onStep(i as StepIndex)}
                aria-current={current ? "step" : undefined}
                className="group flex w-full flex-col gap-1.5 text-left disabled:cursor-default"
              >
                <span className={cn("h-1 rounded-full transition-colors duration-200", current ? "bg-accent shadow-[0_0_10px_var(--club-accent-glow)]" : done ? "bg-accent/55 group-hover:bg-accent" : "bg-border")} />
                <span className={cn("hidden text-[12.5px] sm:block", current ? "font-medium text-foreground" : done ? "text-muted group-hover:text-foreground" : "text-subtle")}>
                  {i + 1}. {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
