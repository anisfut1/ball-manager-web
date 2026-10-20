"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck2, CalendarSync, CheckCircle2, CircleDot, Hand, History, MapPin, SendHorizontal, UserRound, XCircle } from "lucide-react";
import { PersonAvatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useConfirm } from "@/components/ui/Dialog";
import { Field, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { Toast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { derogationClient, type DerogationSource } from "./client";
import { ApiError } from "@/lib/api/client";
import type { ClubVenueDto, DerogationAction, DerogationMessageDto, DerogationRequestDetailDto } from "@/lib/api/derogationRequests";
import { ACTION_LABELS, formatDayLongCapitalized, formatShortDateTime, formatTime, isActive, localDateKey } from "./labels";
import { CreateDerogationAction, type FormState as OfficialFormState } from "@/features/derogations/CreateDerogationAction";
import { MatchHeadline, RequestStatusBadge } from "./parts";
import { AWAY_NOTICE, DateChooser, SlotChooser } from "./SlotPicker";
import type { SlotSelection } from "./VenuePlanning";

/**
 * Conversation d'une demande (coach ↔ coordinateur). Les messages sont
 * immuables ; les événements SYSTEM (envoi, prise en charge, nouveau
 * créneau…) s'affichent comme des lignes discrètes. Aucune action ici ne
 * modifie FFBB/FBI ni la date officielle du match.
 */
export function RequestThread({ source, initial, timezone, venues, justSent }: { source: DerogationSource; initial: DerogationRequestDetailDto; timezone: string; venues: ClubVenueDto[]; justSent: boolean }) {
  const router = useRouter();
  const [request, setRequest] = useState(initial);
  const [toast, setToast] = useState<string | null>(justSent ? "Demande envoyée au coordinateur." : null);
  const [busy, setBusy] = useState<DerogationAction | "message" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    // `?sent=1` ne doit pas réafficher le toast au rechargement.
    if (justSent) router.replace(window.location.pathname, { scroll: false });
  }, [justSent, router]);

  function applied(next: DerogationRequestDetailDto, message: string) {
    setRequest(next);
    setToast(message);
    setError(null);
    router.refresh();
  }

  async function act(action: DerogationAction, message?: string) {
    if (action === "CANCEL") {
      const ok = await confirm({ title: "Annuler la demande ?", description: "Le coordinateur verra que la demande est annulée. Tu pourras en refaire une ensuite.", confirmLabel: "Annuler la demande", destructive: true });
      if (!ok) return;
    }
    setBusy(action);
    setError(null);
    try {
      const next = await derogationClient(source).action(request.id, action, message ?? null);
      const toasts: Record<DerogationAction, string> = {
        TAKE_IN_CHARGE: "Tu t'occupes de cette demande.",
        REQUEST_CHANGE: "Le coach est invité à proposer un autre créneau.",
        COMPLETE: "Demande marquée comme traitée.",
        CANCEL: "Demande annulée.",
      };
      applied(next, toasts[action]);
      setChangeOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action impossible pour le moment.");
    } finally {
      setBusy(null);
    }
  }

  const actions = request.permissions.actions;
  const managerActions = actions.filter((a) => a !== "CANCEL");
  const active = isActive(request.status);
  const proposals = request.proposals;
  const previous = proposals.slice(0, -1).reverse();

  return (
    <div className="flex flex-col gap-5">
      {toast ? <Toast message={toast} /> : null}
      {confirmDialog}

      {/* En-tête : match, statut, créneau demandé */}
      <Card variant="glow" className="flex flex-col gap-4">
        <MatchHeadline match={request.match} timezone={timezone} trailing={<RequestStatusBadge status={request.status} />} />
        <div className="grid grid-cols-1 gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-3.5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="type-eyebrow">Créneau demandé</p>
            <p className="type-numeric text-[17px] font-semibold text-foreground">
              {formatDayLongCapitalized(request.requestedStartAt, timezone)} · {formatTime(request.requestedStartAt, timezone)} → {formatTime(request.requestedEndAt, timezone)}
            </p>
            <p className="type-meta flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden className="size-3.5" />
                {request.requestedVenue?.name ?? "À l'extérieur — à confirmer avec le club adverse"}
              </span>
              <span className="inline-flex items-center gap-1">
                <UserRound aria-hidden className="size-3.5" />
                Demande formulée par : <span className="font-medium text-foreground">{request.requesterDisplayName}</span>
              </span>
            </p>
          </div>
          {request.permissions.canPropose ? (
            <Button variant="secondary" icon={<CalendarSync />} onClick={() => setProposeOpen(true)}>
              Proposer un autre créneau
            </Button>
          ) : null}
        </div>

        <OfficialSchedule request={request} timezone={timezone} />
        {request.match.isHome === false && active ? <p className="type-meta">{AWAY_NOTICE}</p> : null}

        {previous.length > 0 ? (
          <details className="group">
            <summary className="type-meta flex cursor-pointer list-none items-center gap-1.5 hover:text-foreground">
              <History aria-hidden className="size-3.5" />
              Créneaux proposés précédemment ({previous.length})
            </summary>
            <ul className="mt-2 flex flex-col gap-1.5 border-l border-border pl-3">
              {previous.map((p) => (
                <li key={p.id} className="type-meta">
                  <span className="type-numeric text-muted line-through decoration-subtle/70">
                    {formatShortDateTime(p.requestedStartAt, timezone)} – {p.venue?.name ?? "extérieur"}
                  </span>{" "}
                  · par {p.proposedByDisplayName}
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {managerActions.length > 0 || actions.includes("CANCEL") ? (
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-center">
            {managerActions.includes("TAKE_IN_CHARGE") ? (
              <Button variant="primary" icon={<Hand />} loading={busy === "TAKE_IN_CHARGE"} onClick={() => act("TAKE_IN_CHARGE")}>
                {ACTION_LABELS.TAKE_IN_CHARGE}
              </Button>
            ) : null}
            {managerActions.includes("COMPLETE") ? (
              <Button variant="success" icon={<CheckCircle2 />} loading={busy === "COMPLETE"} onClick={() => act("COMPLETE")}>
                {ACTION_LABELS.COMPLETE}
              </Button>
            ) : null}
            {managerActions.includes("REQUEST_CHANGE") ? (
              <Button variant="outline" icon={<XCircle />} onClick={() => setChangeOpen(true)}>
                {ACTION_LABELS.REQUEST_CHANGE}
              </Button>
            ) : null}
            {actions.includes("CANCEL") ? (
              <Button variant="danger-ghost" loading={busy === "CANCEL"} onClick={() => act("CANCEL")} className="sm:ml-auto">
                {ACTION_LABELS.CANCEL}
              </Button>
            ) : null}
          </div>
        ) : null}
        {request.permissions.canSubmitOfficial ? (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="type-meta">
              Demande officielle : envoie la dérogation à la FFBB (FBI) avec la nouvelle date et l&apos;horaire déjà remplis. Puis « Marquer comme traitée ».
            </p>
            <CreateDerogationAction
              clubId={source.kind === "club" ? source.clubId : ""}
              matchId={request.match.id}
              openLabel="Faire la demande officielle (FBI)"
              initial={officialPrefill(request, timezone)}
              venues={venues}
              submit={async (body) => {
                const result = await derogationClient(source).official(request.id, body);
                setRequest(result.request);
                if (result.outcome === "success") setToast("Demande officielle envoyée à la FFBB.");
                return { outcome: result.outcome, message: result.message };
              }}
            />
          </div>
        ) : null}
        {managerActions.includes("COMPLETE") ? (
          <p className="type-meta">« Marquer comme traitée » indique seulement que tu as fait les démarches : le calendrier officiel se mettra à jour via la synchronisation FFBB.</p>
        ) : null}
      </Card>

      {error ? (
        <Notice tone="danger" live>
          {error}
        </Notice>
      ) : null}

      <Timeline messages={request.messages} timezone={timezone} />

      {request.permissions.canMessage ? (
        <Composer
          busy={busy === "message"}
          onSend={async (body) => {
            setBusy("message");
            setError(null);
            try {
              const next = await derogationClient(source).message(request.id, body);
              setRequest(next);
              router.refresh();
              return true;
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Message non envoyé. Réessaie.");
              return false;
            } finally {
              setBusy(null);
            }
          }}
        />
      ) : (
        <p className="type-meta text-center">{active ? "Tu peux lire cette conversation, sans y répondre." : "Conversation close."}</p>
      )}

      <RequestChangeSheet open={changeOpen} onClose={() => setChangeOpen(false)} busy={busy === "REQUEST_CHANGE"} onSubmit={(message) => act("REQUEST_CHANGE", message)} />
      {request.permissions.canPropose ? (
        <ProposeSheet
          open={proposeOpen}
          onClose={() => setProposeOpen(false)}
          source={source}
          request={request}
          timezone={timezone}
          venues={venues}
          onProposed={(next) => {
            setProposeOpen(false);
            applied(next, "Nouveau créneau envoyé au coordinateur.");
          }}
        />
      ) : null}
    </div>
  );
}

function OfficialSchedule({ request, timezone }: { request: DerogationRequestDetailDto; timezone: string }) {
  const o = request.officialSchedule;
  if (!o.changedSinceRequest) return null;
  return (
    <Notice
      tone={o.matchesCurrentProposal ? "success" : "info"}
      icon={<CalendarCheck2 />}
      action={o.matchesCurrentProposal ? <StatusBadge tone="success">Calendrier mis à jour</StatusBadge> : undefined}
    >
      Le calendrier FFBB indique désormais : <strong className="type-numeric">{formatShortDateTime(o.currentScheduledAt, timezone)}</strong>.
    </Notice>
  );
}

function Timeline({ messages, timezone }: { messages: DerogationMessageDto[]; timezone: string }) {
  const endRef = useRef<HTMLLIElement>(null);
  const count = messages.length;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [count]);

  return (
    <section aria-label="Conversation" className="flex flex-col gap-1">
      <h2 className="type-section mb-2 text-foreground">Conversation</h2>
      <ol className="flex flex-col gap-3">
        {messages.map((m) =>
          m.type === "SYSTEM" ? (
            <li key={m.id} className="flex items-start gap-2.5 px-1 py-0.5">
              <CircleDot aria-hidden className="mt-[3px] size-3.5 shrink-0 text-subtle" />
              <p className="text-reflow flex-1 text-[13px] leading-snug text-muted">{m.body}</p>
              <time dateTime={m.createdAt} className="type-numeric shrink-0 text-[11.5px] text-subtle">
                {formatShortDateTime(m.createdAt, timezone)}
              </time>
            </li>
          ) : (
            <li key={m.id} className={cn("flex items-end gap-2.5", m.isMine && "flex-row-reverse")}>
              {m.isMine ? null : <PersonAvatar name={m.authorDisplayName} size="sm" />}
              <div className={cn("flex max-w-[85%] flex-col gap-1 sm:max-w-[70%]", m.isMine && "items-end")}>
                <p className="flex flex-wrap items-baseline gap-x-2 px-1 text-[12px]">
                  <span className="font-medium text-foreground">{m.isMine ? "Toi" : m.authorDisplayName}</span>
                  {m.authorRoleLabel && !m.isMine ? <span className="text-subtle">{m.authorRoleLabel}</span> : null}
                  <time dateTime={m.createdAt} className="type-numeric text-subtle">
                    {formatShortDateTime(m.createdAt, timezone)}
                  </time>
                </p>
                <p
                  className={cn(
                    "text-reflow whitespace-pre-wrap rounded-[16px] px-3.5 py-2.5 text-[14.5px] leading-relaxed",
                    m.isMine ? "rounded-br-[6px] bg-accent-soft text-foreground" : "rounded-bl-[6px] border border-border bg-surface-raised text-foreground shadow-1",
                  )}
                >
                  {m.body}
                </p>
              </div>
            </li>
          ),
        )}
        <li ref={endRef} aria-hidden />
      </ol>
    </section>
  );
}

function Composer({ busy, onSend }: { busy: boolean; onSend: (body: string) => Promise<boolean> }) {
  const [text, setText] = useState("");
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    if (await onSend(body)) setText("");
  }
  return (
    <form
      onSubmit={submit}
      className="sticky bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+8px)] z-30 flex items-end gap-2 rounded-[var(--radius-lg)] border border-border bg-surface-raised p-2 shadow-3 lg:bottom-4"
    >
      <label className="sr-only" htmlFor="derogation-composer">
        Écrire un message
      </label>
      <textarea
        id="derogation-composer"
        rows={1}
        maxLength={3000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
        }}
        placeholder="Écrire un message…"
        className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2.5 py-2.5 text-[15px] leading-snug text-foreground outline-none placeholder:text-subtle"
      />
      <IconButton label="Envoyer le message" type="submit" variant="primary" disabled={!text.trim() || busy}>
        <SendHorizontal />
      </IconButton>
    </form>
  );
}

function RequestChangeSheet({ open, onClose, busy, onSubmit }: { open: boolean; onClose: () => void; busy: boolean; onSubmit: (message: string) => void }) {
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const missing = !message.trim();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ce n'est pas possible"
      description="Explique pourquoi : le coach verra ton message et pourra proposer un autre créneau."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Retour
          </Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={() => {
              setTouched(true);
              if (!missing) onSubmit(message.trim());
            }}
          >
            Demander un autre créneau
          </Button>
        </div>
      }
    >
      <Field label="Message au coach" required error={touched && missing ? "Un message est obligatoire." : undefined}>
        {(props) => <Textarea {...props} rows={5} maxLength={3000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ex. : le gymnase est réservé pour un tournoi ce week-end-là." />}
      </Field>
    </Sheet>
  );
}

function ProposeSheet({
  open,
  onClose,
  source,
  request,
  timezone,
  venues,
  onProposed,
}: {
  open: boolean;
  onClose: () => void;
  source: DerogationSource;
  request: DerogationRequestDetailDto;
  timezone: string;
  venues: ClubVenueDto[];
  onProposed: (next: DerogationRequestDetailDto) => void;
}) {
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotSelection | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!slot) return;
    setSending(true);
    setError(null);
    try {
      const next = await derogationClient(source).propose(request.id, { requestedStartAt: slot.startAt, requestedVenueId: slot.venueId, message: message.trim() || null });
      setDate(null);
      setSlot(null);
      setMessage("");
      onProposed(next);
    } catch (err) {
      if (err instanceof ApiError && err.code === "DEROGATION_SLOT_CONFLICT") setSlot(null);
      setError(err instanceof ApiError ? err.message : "Impossible d'envoyer ce créneau pour le moment.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width="wide"
      title="Proposer un autre créneau"
      description="Le coordinateur recevra le nouveau créneau dans la conversation."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Retour
          </Button>
          <Button variant="primary" loading={sending} disabled={!slot} onClick={submit}>
            {slot ? `Proposer ${slot.localStart}` : "Choisis un créneau"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {error ? (
          <Notice tone="danger" live>
            {error}
          </Notice>
        ) : null}
        <DateChooser
          timezone={timezone}
          value={date}
          onChange={(d) => {
            if (d !== date) setSlot(null);
            setDate(d);
          }}
        />
        {date ? <SlotChooser source={source} matchId={request.match.id} date={date} timezone={timezone} venues={venues} value={slot} onChange={setSlot} /> : null}
        <Field label="Message" optional>
          {(props) => <Textarea {...props} rows={2} maxLength={3000} value={message} onChange={(e) => setMessage(e.target.value)} />}
        </Field>
      </div>
    </Sheet>
  );
}

/**
 * Pré-remplissage de la demande officielle FBI à partir du créneau demandé
 * (fuseau du club) : la date/l'horaire ne sont cochés que s'ils changent
 * réellement par rapport au calendrier officiel actuel.
 */
function officialPrefill(request: DerogationRequestDetailDto, timezone: string): Partial<OfficialFormState> {
  const requested = new Date(request.requestedStartAt);
  const current = request.officialSchedule.currentScheduledAt ?? request.originalScheduledAt;
  const newDate = localDateKey(requested, timezone);
  const newTime = formatTime(request.requestedStartAt, timezone);
  const sameDate = current ? localDateKey(new Date(current), timezone) === newDate : false;
  const sameTime = current ? formatTime(current, timezone) === newTime : false;
  // Salle : cochée si le gymnase demandé n'est pas celui du match (libellé FBI « NOM - VILLE »).
  const venue = request.requestedVenue;
  const otherVenue = !!venue && !(request.match.venueName ?? "").toUpperCase().startsWith(venue.name.toUpperCase());
  return { modifierDate: !sameDate, dateDerogation: newDate, modifierHoraire: !sameTime, horaire: newTime, modifierSalle: otherVenue, clubVenueId: venue?.id ?? "" };
}
