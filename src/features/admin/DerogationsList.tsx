"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BellRing, CalendarClock, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataList } from "@/components/ui/DataList";
import { EmptyState } from "@/components/ui/States";
import { Notice } from "@/components/ui/Notice";
import { cn } from "@/components/ui/cn";
import type { DerogationListItemDto, RespondToDerogationDto, RespondToDerogationResultDto } from "@/lib/api/derogations";
import { RespondToDerogationAction } from "@/features/derogations/RespondToDerogationAction";
import { changesKnown, derogationVerdict, describeRequestedChanges, etatTone, groupDerogationsByMatch, hasDerogationDetail, isRetainedSchedule, supersededBy, type DerogationMatchGroup, type DerogationVerdict } from "./derogation-groups";

// `timeZone: "Europe/Paris"` explicite partout ci-dessous — jamais le
// fuseau ambiant du runtime (UTC côté rendu serveur Vercel, potentiellement
// différent aussi côté navigateur) : demande du club, 2026-09-27,
// "elle est a 18h sur notre outil" alors que FBI/FFBB disent 20h pour la
// MÊME rencontre — `match_datetime` était pourtant déjà stocké juste en
// UTC, seul l'affichage oubliait de reconvertir en heure française. Le
// basket géré ici n'existe qu'en France : toujours Europe/Paris.
function formatDateTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "—";
}

/**
 * "en prenant le créneau du match de 15h" (demande du club, 2026-09-26) —
 * affiche la plage 2h COMPLÈTE du match déjà prévu, jamais juste son heure
 * de début, pour que l'alerte explique elle-même pourquoi il y a conflit.
 */
function formatSlotRange(matchDatetimeIso: string): string {
  const start = new Date(matchDatetimeIso);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const dateLabel = start.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
  const startLabel = start.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
  const endLabel = end.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} ${startLabel}–${endLabel}`;
}

/**
 * `demandeur` ("Domicile"/"Visiteur") est un jargon FBI relatif à CETTE
 * rencontre précise, jamais toujours "notre équipe" — demande du club,
 * 2026-09-27 : "c ecrit demandeur domicile mais je sais pas cest qui qui
 * joue à domicile" (ex. rencontre 9538 : Montpellier est domicile, Sète
 * est visiteur — "Domicile" y désigne donc Montpellier). Résolu vers le
 * nom réel via `domicile`/`visiteur` (mêmes champs bruts FBI que la page
 * de détail), jamais deviné : `null` si le libellé FBI n'est ni
 * "Domicile" ni "Visiteur" (valeur imprévue) ou si le nom correspondant
 * n'a pas pu être lu.
 */
function resolveDemandeurTeam(derogation: Pick<DerogationListItemDto, "demandeur" | "domicile" | "visiteur">): string | null {
  if (derogation.demandeur === "Domicile") return derogation.domicile;
  if (derogation.demandeur === "Visiteur") return derogation.visiteur;
  return null;
}

/**
 * "sur la page dérogation met moi un filtre avec des boutons pour choisir
 * par état" — les boutons sont générés DYNAMIQUEMENT à partir des `etat`
 * réellement présents dans la liste reçue de ball-manager-back (jamais un
 * libellé FBI deviné/codé en dur : voir docs/FBI.md côté ball-manager-back,
 * les vraies valeurs — "En Cours", "Acceptée par...", "Refusée" — ne sont
 * connues qu'à l'exécution). Filtre 100% client (la liste complète est déjà
 * chargée), aucun aller-retour serveur par clic.
 */
export function DerogationsList({
  clubId,
  derogations,
  matchBasePath,
  readOnly = false,
  respond,
}: {
  /** Requis pour répondre à une dérogation — absent en lecture seule. */
  clubId?: string;
  derogations: DerogationListItemDto[];
  /** Préfixe des liens vers la fiche match (`/c/{slug}/matchs` ou `/public/{slug}/matchs`). */
  matchBasePath: string;
  /**
   * Espace public (licencié admin reconnu par lien personnel, retour du
   * club, 2026-10-01) : consultation uniquement, jamais d'accepter/refuser
   * — une écriture FBI exige une vraie session club_admin.
   */
  readOnly?: boolean;
  /** Espace public, coordinateur / admin (2026-10-02) : accepter / refuser via le lien personnel. */
  respond?: (derogationId: string, body: RespondToDerogationDto) => Promise<RespondToDerogationResultDto>;
}) {
  const CONFLICTS = "__conflits__";
  const [selectedEtat, setSelectedEtat] = useState<string | null>(null);
  // Matchs passés archivés (retour du club, 2026-10-08) : masqués par défaut.
  const [showArchives, setShowArchives] = useState(false);
  // Instant de référence "match passé / à venir", figé au montage.
  const [now] = useState(() => Date.now());

  // Une carte par match, historique complet à l'intérieur (retour du club, 2026-10-07).
  const allGroups = useMemo(() => groupDerogationsByMatch(derogations), [derogations]);
  const isPast = (group: DerogationMatchGroup) => (group.match.matchDatetime ? Date.parse(group.match.matchDatetime) < now : false);
  const archivedCount = allGroups.filter(isPast).length;
  // Une dérogation qui attend la réponse du club n'est jamais archivée.
  const groups = allGroups.filter((group) => (showArchives ? isPast(group) && !group.actionRequired : !isPast(group) || group.actionRequired));

  // Filtre par état : compte les MATCHS ayant au moins une dérogation dans cet état.
  const etatCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const group of groups) {
      for (const etat of new Set(group.derogations.map((d) => d.etat).filter((e): e is string => Boolean(e)))) {
        counts.set(etat, (counts.get(etat) ?? 0) + 1);
      }
    }
    // Tri alphabétique — pas d'ordre de priorité FBI connu/confirmé, jamais deviné.
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b, "fr"));
  }, [groups]);

  // Conflits de créneau (retour du club, 2026-10-08 : "un filtre conflits pour voir les conflits").
  const hasConflict = (group: DerogationMatchGroup) => group.derogations.some((d) => d.scheduleConflict);
  const conflictCount = groups.filter(hasConflict).length;

  const filtered =
    selectedEtat === null
      ? groups
      : selectedEtat === CONFLICTS
        ? groups.filter(hasConflict)
        : groups.filter((group) => group.derogations.some((d) => d.etat === selectedEtat));

  if (derogations.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock />}
        title="Aucune dérogation connue"
        description={
          readOnly
            ? "Aucune demande de dérogation n'a encore été récupérée depuis FBI pour ce club."
            : "Lance une vérification globale depuis Intégrations → FBI pour récupérer les demandes de dérogation connues de FBI."
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label="Période" className="flex gap-1.5">
        <FilterButton active={!showArchives} onClick={() => { setShowArchives(false); setSelectedEtat(null); }} count={allGroups.length - archivedCount}>
          À venir
        </FilterButton>
        <FilterButton active={showArchives} onClick={() => { setShowArchives(true); setSelectedEtat(null); }} count={archivedCount}>
          Archives (matchs passés)
        </FilterButton>
      </div>
      <div role="group" aria-label="Filtrer par état" className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <FilterButton active={selectedEtat === null} onClick={() => setSelectedEtat(null)} count={groups.length}>
          Tous les matchs
        </FilterButton>
        <FilterButton active={selectedEtat === CONFLICTS} onClick={() => setSelectedEtat(CONFLICTS)} count={conflictCount}>
          Conflits
        </FilterButton>
        {etatCounts.map(([etat, count]) => (
          <FilterButton key={etat} active={selectedEtat === etat} onClick={() => setSelectedEtat(etat)} count={count}>
            {etat}
          </FilterButton>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={selectedEtat === CONFLICTS ? "Aucun conflit de créneau" : showArchives ? "Aucun match passé pour ce filtre" : "Aucun match à venir pour ce filtre"}
          description={showArchives ? "Choisis un autre filtre ci-dessus." : "Choisis un autre filtre, ou ouvre les archives (matchs passés)."}
          compact
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {filtered.map((group) => (
            <li key={group.key}>
              <MatchDerogationsCard group={group} now={now} matchBasePath={matchBasePath} clubId={clubId} readOnly={readOnly} respond={respond} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "samedi 26 septembre 2026 à 17h30" — heure française, sans secondes. */
function formatOfficialSchedule(iso: string): string {
  const value = new Date(iso);
  const day = value.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = value.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).replace(":", "h");
  return `${day} à ${time}`;
}

const VERDICT_COPY: Record<DerogationVerdict["kind"], { tone: "warning" | "info" | "success" | "danger" | "neutral"; text: string }> = {
  action_required: { tone: "warning", text: "Une demande attend ta réponse (voir ci-dessous)." },
  pending: { tone: "info", text: "Demande en cours : réponse de l'adversaire ou de l'organisme dirigeant attendue. L'horaire officiel reste celui ci-dessus tant qu'elle n'est pas acceptée." },
  accepted_current: { tone: "success", text: "Dérogation acceptée : le match se joue à l'horaire officiel ci-dessus." },
  all_refused: { tone: "danger", text: "Demande(s) refusée(s) : l'horaire n'a pas changé, le match se joue à l'horaire officiel ci-dessus." },
  settled: { tone: "neutral", text: "Plus rien en attente. L'horaire en vigueur est l'horaire officiel ci-dessus." },
};

function MatchDerogationsCard({
  group,
  now,
  matchBasePath,
  clubId,
  readOnly,
  respond,
}: {
  group: DerogationMatchGroup;
  now: number;
  matchBasePath: string;
  clubId?: string;
  readOnly: boolean;
  respond?: (derogationId: string, body: RespondToDerogationDto) => Promise<RespondToDerogationResultDto>;
}) {
  const { match, derogations } = group;
  const single = derogations.length === 1;
  const isPast = match.matchDatetime ? Date.parse(match.matchDatetime) < now : false;
  const verdict = VERDICT_COPY[derogationVerdict(group).kind];
  return (
    <Card data-glow={group.actionRequired || undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="type-card text-reflow flex-1 text-foreground">
          <Link href={`${matchBasePath}/${match.matchId}`} className="underline-offset-4 hover:text-accent-text hover:underline">
            Rencontre {match.numero ?? "?"}
            {/*
             * `teamName` (ex. "Seniors 2") plutôt que `categoryLabel`
             * (ex. "Seniors") — demande du club, 2026-09-26 : "faut
             * préciser quelle équipe, seniors ya 4 equipes SM1 SM2
             * SM3 SF, pareil sur dautres catégories". Repli sur
             * `categoryLabel` si l'équipe du club n'a pas pu être
             * résolue (match non retrouvé côté FFBB).
             */}
            {match.teamName ?? match.categoryLabel ? ` (${match.teamName ?? match.categoryLabel})` : ""} — vs {match.opponentName ?? "?"}
          </Link>
        </h2>
        {/*
         * "sur la derog si action besoin de ma part, faut un badge
         * action requise" (demande du club, 2026-09-27) — vrai
         * uniquement quand c'est au CLUB de répondre.
         */}
        {group.actionRequired ? (
          <StatusBadge tone="warning" icon={<BellRing />}>
            Action requise
          </StatusBadge>
        ) : null}
      </div>

      {/* Ce qui compte en premier (retour du club, 2026-10-07) : QUAND le match se joue, et ce que les dérogations ont changé. */}
      <div className="surface-panel mt-4 flex flex-col gap-2 p-4">
        <p className="type-eyebrow">Horaire officiel actuel</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold text-foreground first-letter:uppercase">{match.matchDatetime ? formatOfficialSchedule(match.matchDatetime) : "Date inconnue"}</p>
          {match.matchDatetime ? (
            <StatusBadge tone={isPast ? "neutral" : "accent"} size="sm">
              {isPast ? "Match passé" : "À venir"}
            </StatusBadge>
          ) : null}
        </div>
        <Notice tone={verdict.tone}>{verdict.text}</Notice>
      </div>

      <p className="type-eyebrow mt-5">{single ? "La dérogation" : `Historique : ${derogations.length} dérogations`}</p>
      <ol className="mt-2 flex flex-col gap-3" aria-label="Historique des dérogations de ce match">
        {derogations.map((derogation, index) => (
          <li key={derogation.id ?? index}>
            <DerogationEntry
              derogation={derogation}
              isCurrentSchedule={isRetainedSchedule(derogation)}
              replacedOn={isRetainedSchedule(derogation) ? null : supersededBy(derogation, derogations)}
              defaultOpen={derogation.actionRequired}
              clubId={clubId}
              readOnly={readOnly}
              respond={respond}
            />
          </li>
        ))}
      </ol>
    </Card>
  );
}

function DerogationEntry({
  derogation,
  isCurrentSchedule,
  replacedOn,
  defaultOpen,
  clubId,
  readOnly,
  respond,
}: {
  derogation: DerogationListItemDto;
  isCurrentSchedule: boolean;
  /** Date de dépôt de la dérogation acceptée plus récente qui l'a remplacée. */
  replacedOn: string | null;
  defaultOpen: boolean;
  clubId?: string;
  readOnly: boolean;
  respond?: (derogationId: string, body: RespondToDerogationDto) => Promise<RespondToDerogationResultDto>;
}) {
  const demandeurTeam = resolveDemandeurTeam(derogation);
  const detailKnown = hasDerogationDetail(derogation);
  const changes = describeRequestedChanges(derogation);
  const changesText =
    changes.length > 0 ? changes.join(" · ") : detailKnown ? (changesKnown(derogation) ? "Aucun changement coché sur FBI" : "Changement non précisé") : "Détail non récupéré sur FBI";
  const requester = derogation.demandeur ? `${demandeurTeam ?? derogation.demandeur}` : null;
  return (
    <details open={defaultOpen} className="group surface-panel overflow-hidden [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={etatTone(derogation.etat)} size="sm">
            {derogation.etat ?? "État inconnu"}
          </StatusBadge>
          {isCurrentSchedule ? (
            <StatusBadge tone="accent" size="sm">
              Horaire retenu
            </StatusBadge>
          ) : replacedOn ? (
            <StatusBadge tone="neutral" size="sm">
              Remplacée le {replacedOn.split(" ")[0]}
            </StatusBadge>
          ) : null}
          {derogation.actionRequired ? (
            <StatusBadge tone="warning" size="sm" icon={<BellRing />}>
              Action requise
            </StatusBadge>
          ) : null}
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">{changesText}</span>
          <span className="type-meta">
            {derogation.dateDepot ? `Déposée le ${derogation.dateDepot}` : "Date de dépôt inconnue"}
            {requester ? ` par ${requester}` : ""}
            {derogation.motif ? ` · « ${derogation.motif} »` : ""}
          </span>
        </span>
        <ChevronDown aria-hidden className="hidden size-4 shrink-0 text-subtle transition-transform duration-150 group-open:rotate-180 sm:block" />
      </summary>

      <div className="flex flex-col gap-5 border-t border-border px-4 py-4">
        {derogation.scheduleConflict ? (
          <Notice tone="danger" title="Conflit de créneau (un créneau de match dure 2h)">
            Un match {derogation.scheduleConflict.teamName ? `de l'équipe ${derogation.scheduleConflict.teamName} ` : ""}est déjà prévu sur le créneau {formatSlotRange(derogation.scheduleConflict.matchDatetime)} — Rencontre{" "}
            {derogation.scheduleConflict.numero ?? "?"} vs {derogation.scheduleConflict.opponentName ?? "?"}.
          </Notice>
        ) : null}

        {derogation.actionRequired && !readOnly && respond && derogation.id ? (
          <RespondToDerogationAction derogationId={derogation.id} submit={(body) => respond(derogation.id!, body)} />
        ) : derogation.actionRequired && !readOnly && clubId && derogation.id ? (
          <RespondToDerogationAction clubId={clubId} derogationId={derogation.id} />
        ) : null}

        {!detailKnown ? (
          <Notice tone="info">
            Le détail de cette dérogation (demandeur, motif, horaire demandé, réponse) n&apos;a pas été récupéré sur FBI : seules les informations du tableau des dérogations sont connues.
          </Notice>
        ) : null}

        <DataList
          columns={3}
          items={[
            { label: "État", value: derogation.etat ?? "—" },
            { label: "Demandeur", value: `${derogation.demandeur ?? "—"}${demandeurTeam ? ` (${demandeurTeam})` : ""}` },
            { label: "Date de dépôt", value: derogation.dateDepot ?? "—" },
            { label: "Changements demandés", value: changesText, span: 2 },
            { label: "Rencontre du", value: derogation.dateRencontre ?? "—" },
            { label: "Motif de la demande", value: derogation.motif ?? "—", span: 2 },
            { label: "Dernière vérification", value: formatDateTime(derogation.checkedAt) },
          ]}
        />

        {derogation.adversaire || derogation.dateReponse || derogation.acceptation || derogation.motifRefus ? (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
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
      </div>
    </details>
  );
}

function FilterButton({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border px-3 text-[13px] font-medium transition-[background-color,border-color,box-shadow,color] duration-150",
        active ? "border-accent-border bg-accent-soft text-accent-text shadow-glow-xs" : "border-border bg-surface-raised text-muted shadow-1 hover:border-border-strong hover:text-foreground",
      )}
    >
      {children}
      <span className={cn("type-numeric rounded-full px-1.5 text-[11px] leading-5", active ? "bg-surface-raised/70" : "bg-surface-muted")}>{count}</span>
    </button>
  );
}
