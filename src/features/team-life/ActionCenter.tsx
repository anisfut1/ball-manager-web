"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, Dumbbell, MapPin, UserPlus } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { SectionHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";
import { publicTeamLife, type ActionCenterActionDto, type ActionCenterDto, type ConvocationResponseValue, type MatchAvailabilityValue, type TrainingResponseValue } from "@/lib/api/teamLife";
import { getDeviceTokens, removeDeviceTokens } from "@/lib/publicToken";
import { countsSummary, locationLabel, relativeDay, timeOf } from "./labels";
import { AvailabilityCard, CoachLaundryCard, CoachMatchCard, ConvocationCard, LaundryDutyCard, TablesCard, type LaundryDutyAction, type AvailabilityAction, type ConvocationAction } from "./MatchActionCards";
import { ResponseButtons } from "./ResponseButtons";

type ResponseAction = Extract<ActionCenterActionDto, { type: "TRAINING_RESPONSE" }>;
type CoachAction = Extract<ActionCenterActionDto, { type: "COACH_TRAINING_SUMMARY" }>;

/**
 * Home « À faire » (Vie d'équipe, Lot 1) : ce que le parent / joueur / coach
 * doit faire MAINTENANT, avant tout le reste — « Lina — entraînement mardi
 * 19h [Présente] [Absente] [Incertaine] », un clic, terminé. Tous les liens
 * de l'appareil sont fusionnés (un par enfant). Réponse optimiste : l'état
 * change tout de suite, et revient en arrière avec un message si l'envoi
 * échoue.
 */
/**
 * Chargement de la Home « À faire » : tous les liens de l'appareil (un par
 * enfant). Partagé par le bloc « À faire » et « Mon agenda » de l'accueil.
 */
export function useActionCenter(clubSlug: string, activeToken: string): { data: ActionCenterDto | null; tokens: string[]; failed: boolean } {
  const [state, setState] = useState<{ data: ActionCenterDto | null; tokens: string[]; failed: boolean }>({ data: null, tokens: [], failed: false });
  useEffect(() => {
    let cancelled = false;
    const deviceTokens = [...new Set([activeToken, ...getDeviceTokens(clubSlug)])];
    publicTeamLife
      .actionCenter(clubSlug, deviceTokens)
      .then((result) => {
        if (cancelled) return;
        // Liens révoqués : oubliés sur cet appareil, sans bloquer les autres.
        if (result.invalidTokenIndexes.length) removeDeviceTokens(clubSlug, result.invalidTokenIndexes.map((i) => deviceTokens[i]!).filter(Boolean));
        setState({ data: result, tokens: deviceTokens, failed: false });
      })
      .catch(() => !cancelled && setState({ data: null, tokens: [], failed: true }));
    return () => {
      cancelled = true;
    };
  }, [clubSlug, activeToken]);
  return state;
}

/**
 * Home « À faire » (Vie d'équipe, Lot 1) : ce que le parent / joueur / coach
 * doit faire MAINTENANT, avant tout le reste — « Lina — entraînement mardi
 * 19h [Présente] [Absente] [Incertaine] », un clic, terminé. Réponse
 * optimiste : l'état change tout de suite, et revient en arrière avec un
 * message si l'envoi échoue. « Ajouter un enfant » seulement quand c'est
 * plausible (homonyme de nom de famille au club, ou déjà plusieurs enfants).
 */
export function ActionCenter({
  clubSlug,
  timezone,
  data,
  tokens,
  failed,
  onAddPerson,
  matchId,
}: {
  clubSlug: string;
  timezone: string;
  data: ActionCenterDto | null;
  tokens: string[];
  failed: boolean;
  onAddPerson?: () => void;
  /** Page d'un match (lien de convocation, app iOS) : seulement ce que la famille a à faire pour CE match. */
  matchId?: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ tone: "success" | "danger"; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const showToast = useCallback((next: { tone: "success" | "danger"; message: string }) => {
    setToast(next);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  /** Réponse optimiste avec le lien de l'enfant concerné ; retour en arrière + message si l'envoi échoue. */
  const respond = useCallback(
    async (action: AnswerableAction, value: string, send: (token: string) => Promise<unknown>) => {
      if (!data) return;
      const key = keyOf(action);
      const person = data.people.find((p) => p.licencieId === action.licencieId);
      const token = person ? tokens[person.tokenIndex] : undefined;
      if (!token) return;
      const previous = key in answers ? answers[key]! : action.currentResponse;
      setAnswers((a) => ({ ...a, [key]: value }));
      setSaving((s) => ({ ...s, [key]: true }));
      try {
        await send(token);
      } catch {
        setAnswers((a) => ({ ...a, [key]: previous }));
        showToast({ tone: "danger", message: "Impossible d'enregistrer la réponse." });
      } finally {
        setSaving((s) => ({ ...s, [key]: false }));
      }
    },
    [answers, data, showToast, tokens],
  );

  /** « J'ai vu » (maillots) : optimiste, retour en arrière si l'envoi échoue. */
  const markSeen = async (key: string, action: LaundryDutyAction) => {
    if (!data) return;
    const person = data.people.find((p) => p.licencieId === action.licencieId);
    const token = person ? tokens[person.tokenIndex] : undefined;
    if (!token) return;
    setAnswers((a) => ({ ...a, [key]: "SEEN" }));
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      await publicTeamLife.markLaundrySeen(clubSlug, token, action.match.id);
    } catch {
      setAnswers((a) => ({ ...a, [key]: null }));
      showToast({ tone: "danger", message: "Impossible d'enregistrer la réponse." });
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  };

  if (failed) return null; // La Home reste utilisable : le reste de l'accueil s'affiche normalement.
  if (!data) {
    return (
      <section aria-label="À faire" className="flex flex-col gap-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-36 w-full rounded-[18px]" />
      </section>
    );
  }

  const current = (a: AnswerableAction): string | null => {
    const key = keyOf(a);
    return key in answers ? answers[key]! : a.currentResponse;
  };
  // Une seule liste (retour du club, 2026-10-10) : ce qui reste à faire d'abord (ordre de l'API :
  // réponses attendues, convocations, coach), puis ce qui est fait — en vert grisé, toujours modifiable.
  // Un élément fait sur place passe en vert tout de suite, sans changer de place avant le prochain passage.
  const several = data.people.length > 1;
  const items: HomeItem[] = [];
  const forMatch = (a: ActionCenterActionDto): boolean => !matchId || ((a.type === "MATCH_AVAILABILITY" || a.type === "CONVOCATION_RESPONSE" || a.type === "LAUNDRY_DUTY") && a.match.id === matchId);
  for (const a of data.actions.filter(forMatch)) {
    if (isAnswerable(a)) items.push({ key: keyOf(a), kind: "answer", action: a, doneAtLoad: !isTodo(a) });
    else if (a.type === "COACH_MATCH") {
      items.push({ key: `coach-m-${a.match.id}`, kind: "coach-match", action: a, doneAtLoad: coachMatchDone(a) });
      // Table de marque de ses matchs à domicile : à faire tant qu'elle n'est pas complète.
      if (a.tables) items.push({ key: `tables-${a.match.id}`, kind: "tables", action: a, doneAtLoad: a.tables.filled >= a.tables.total });
      // Maillots (Lot 3) : à attribuer par le coach, « Fait » une fois attribués.
      items.push({ key: `laundry-c-${a.match.id}`, kind: "coach-laundry", action: a, doneAtLoad: a.laundryAssigned });
    } else if (a.type === "LAUNDRY_DUTY") {
      items.push({ key: `laundry-${a.match.id}:${a.licencieId}`, kind: "laundry", action: a, doneAtLoad: a.seenAt !== null });
    } else if (a.type === "COACH_TRAINING_SUMMARY") items.push({ key: `coach-${a.training.id}`, kind: "coach-training", action: a, doneAtLoad: false });
  }
  const isDone = (item: HomeItem): boolean => {
    if (item.kind === "laundry") return item.doneAtLoad || answers[item.key] === "SEEN";
    if (item.kind !== "answer") return item.doneAtLoad;
    const value = current(item.action);
    return value !== null && value !== "PENDING";
  };
  const ordered = [...items.filter((i) => !i.doneAtLoad), ...items.filter((i) => i.doneAtLoad)];
  const remaining = items.filter((i) => !isDone(i) && i.kind !== "coach-training").length;

  const renderItem = (item: HomeItem) => {
    if (item.kind === "coach-training") {
      const a = item.action;
      return <CoachSummaryCard action={a} timezone={timezone} href={`/public/${clubSlug}/entrainements?equipe=${a.training.team.id}&seance=${a.training.id}`} />;
    }
    if (item.kind === "coach-match") return <CoachMatchCard action={item.action} timezone={timezone} href={`/public/${clubSlug}/matchs/${item.action.match.id}#vie-equipe`} />;
    if (item.kind === "tables") return <TablesCard action={item.action} timezone={timezone} href={`/public/${clubSlug}/tables`} />;
    if (item.kind === "coach-laundry") return <CoachLaundryCard action={item.action} timezone={timezone} href={`/public/${clubSlug}/matchs/${item.action.match.id}#vie-equipe`} />;
    if (item.kind === "laundry") {
      const a = item.action;
      return <LaundryDutyCard action={a} timezone={timezone} seen={isDone(item)} saving={saving[item.key] === true} onSeen={() => void markSeen(item.key, a)} />;
    }
    return renderAnswer(item.key, item.action);
  };

  const renderAnswer = (key: string, a: AnswerableAction) => {
    const busy = saving[key] === true;
    if (a.type === "TRAINING_RESPONSE") {
      return <TrainingResponseCard action={a} timezone={timezone} value={current(a) as TrainingResponseValue | null} saving={busy} showTeam={several} onRespond={(v) => void respond(a, v, (token) => publicTeamLife.respond(clubSlug, token, a.training.id, v))} />;
    }
    if (a.type === "MATCH_AVAILABILITY") {
      return <AvailabilityCard action={a} timezone={timezone} value={current(a) as MatchAvailabilityValue | null} saving={busy} onRespond={(v) => void respond(a, v, (token) => publicTeamLife.respondAvailability(clubSlug, token, a.match.id, v))} />;
    }
    return <ConvocationCard action={a} timezone={timezone} value={(current(a) ?? "PENDING") as ConvocationResponseValue} saving={busy} onRespond={(v) => void respond(a, v, (token) => publicTeamLife.respondConvocation(clubSlug, token, a.match.id, v))} />;
  };

  if (matchId && items.length === 0) return null;

  return (
    <section id={matchId ? "convocation" : undefined} aria-labelledby="todo-title" className="flex scroll-mt-24 flex-col gap-4">
      <SectionHeader
        id="todo-title"
        title={matchId ? "Pour ce match" : "À faire"}
        description={several ? `Pour ${data.people.map((p) => p.firstName).join(", ")}.` : undefined}
        action={
          data.canAddRelative && !matchId && onAddPerson ? (
            <Button variant="ghost" size="sm" icon={<UserPlus />} onClick={onAddPerson}>
              Ajouter un enfant
            </Button>
          ) : null
        }
      />

      {remaining === 0 ? (
        <Card className="flex items-center gap-3">
          <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success [&_svg]:size-5">
            <CheckCircle2 />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-foreground">Tout est à jour</p>
            <p className="type-meta">{items.length ? "Tout ce qui était demandé est fait." : "Aucune réponse attendue pour le moment."}</p>
          </div>
        </Card>
      ) : null}

      {ordered.length ? (
        <ul className="flex flex-col gap-3">
          {ordered.map((item) => (
            <li key={item.key}>
              <DoneShell done={isDone(item)}>{renderItem(item)}</DoneShell>
            </li>
          ))}
        </ul>
      ) : null}

      {toast ? <Toast tone={toast.tone} message={toast.message} /> : null}
    </section>
  );
}

type AnswerableAction = ResponseAction | AvailabilityAction | ConvocationAction;

function isAnswerable(a: ActionCenterActionDto): a is AnswerableAction {
  return a.type === "TRAINING_RESPONSE" || a.type === "MATCH_AVAILABILITY" || a.type === "CONVOCATION_RESPONSE";
}

function isTodo(a: AnswerableAction): boolean {
  if (a.type === "CONVOCATION_RESPONSE") return a.currentResponse === "PENDING" && !a.matchClosed;
  return a.currentResponse === null;
}

type CoachMatchAction = Extract<ActionCenterActionDto, { type: "COACH_MATCH" }>;
type HomeItem =
  | { key: string; kind: "answer"; action: AnswerableAction; doneAtLoad: boolean }
  | { key: string; kind: "coach-match"; action: CoachMatchAction; doneAtLoad: boolean }
  | { key: string; kind: "tables"; action: CoachMatchAction; doneAtLoad: boolean }
  | { key: string; kind: "coach-laundry"; action: CoachMatchAction; doneAtLoad: boolean }
  | { key: string; kind: "laundry"; action: LaundryDutyAction; doneAtLoad: boolean }
  | { key: string; kind: "coach-training"; action: CoachAction; doneAtLoad: boolean };

/** Convocation envoyée, match inchangé, aucun refus à gérer : rien à faire pour le coach. */
function coachMatchDone(a: CoachMatchAction): boolean {
  return a.stage === "CONVOCATION_SENT" && !a.matchChanged && (a.convocationCounts?.declined ?? 0) === 0;
}

/** Fait : bulle verte grisée avec « Fait », le contenu reste utilisable (changer d'avis). */
function DoneShell({ done, children }: { done: boolean; children: React.ReactNode }) {
  // Toujours le même conteneur (seul le style change) : la carte n'est jamais remontée, le focus reste en place.
  return (
    <div
      className={cn(
        "relative rounded-[18px] transition-[opacity,outline-color] duration-200",
        done && "opacity-70 outline outline-2 outline-[color-mix(in_oklab,var(--success)_45%,transparent)] hover:opacity-100 focus-within:opacity-100 [&_.surface-card]:bg-success-soft",
      )}
    >
      {done ? (
        <span className="pointer-events-none absolute -top-2.5 right-4 z-10 inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[11.5px] shadow-1 font-semibold text-white [&_svg]:size-3.5">
          <CheckCircle2 aria-hidden /> Fait
        </span>
      ) : null}
      {children}
    </div>
  );
}

function keyOf(a: AnswerableAction): string {
  if (a.type === "TRAINING_RESPONSE") return `T:${a.training.id}:${a.licencieId}`;
  return `${a.type === "MATCH_AVAILABILITY" ? "A" : "C"}:${a.match.id}:${a.licencieId}`;
}

function TrainingResponseCard({ action, timezone, value, saving, showTeam, onRespond, compact }: { action: ResponseAction; timezone: string; value: TrainingResponseValue | null; saving: boolean; showTeam: boolean; onRespond: (v: TrainingResponseValue) => void; compact?: boolean }) {
  const t = action.training;
  const place = locationLabel(t.location);
  const Wrapper = compact ? "div" : Card;
  return (
    <Wrapper className={compact ? "flex flex-col gap-3" : "flex flex-col gap-3.5"}>
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-accent-soft text-accent-text [&_svg]:size-5">
          <Dumbbell />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-reflow text-[15.5px] font-semibold leading-snug text-foreground">
            {action.firstName} — entraînement {relativeDay(t.startsAt, timezone)} <span className="type-numeric">{timeOf(t.startsAt, timezone)}</span>
          </p>
          <p className="type-meta mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {showTeam ? <span>{t.team.name}</span> : null}
            <span className="type-numeric">
              {timeOf(t.startsAt, timezone)}–{timeOf(t.endsAt, timezone)}
            </span>
            {place ? (
              <span className="inline-flex min-w-0 items-center gap-1 [&_svg]:size-3.5">
                <MapPin aria-hidden />
                <span className="truncate">{place}</span>
              </span>
            ) : null}
            {t.isModified ? (
              <StatusBadge size="sm" tone="warning">
                Horaire modifié
              </StatusBadge>
            ) : null}
          </p>
        </div>
      </div>
      <ResponseButtons value={value} onChange={onRespond} disabled={saving} label={`Réponse pour ${action.firstName}`} />
    </Wrapper>
  );
}

function CoachSummaryCard({ action, timezone, href }: { action: CoachAction; timezone: string; href: string }) {
  const t = action.training;
  const counts = t.counts;
  return (
    <Link href={href} className="block rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
      <Card variant="interactive" className="flex items-center gap-3">
        <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-info-soft text-info [&_svg]:size-5">
          <ClipboardCheck />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-reflow text-[15px] font-semibold text-foreground">
            {t.team.name} — entraînement {relativeDay(t.startsAt, timezone)} <span className="type-numeric">{timeOf(t.startsAt, timezone)}</span>
          </p>
          <p className="type-meta mt-0.5">{counts ? countsSummary(counts) : "Réponses de l'équipe"}</p>
        </div>
        <ArrowRight aria-hidden className="size-4 shrink-0 text-subtle" />
      </Card>
    </Link>
  );
}
