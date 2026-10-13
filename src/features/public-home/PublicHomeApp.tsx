"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CalendarDays, CalendarPlus, CalendarRange, ClipboardList, Dumbbell, Megaphone, Shirt, Trophy, UserRound, Users } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { formatShortDateTime } from "@/features/derogation-requests/labels";
import { MatchCard } from "@/features/matches/MatchCard";
import { IdentifyView } from "@/features/public/IdentifyView";
import { PublicLoginPanel } from "@/features/public/PublicLoginApp";
import { usePublicIdentity, type PublicIdentity } from "@/features/public/PublicIdentityProvider";
import { TABLE_ROLE_LABELS } from "@/features/tables/role-labels";
import { ActionCenter, useActionCenter } from "@/features/team-life/ActionCenter";
import { buildAgenda, type AgendaItem } from "@/features/team-life/agenda";
import { PlanningEventCard } from "@/features/team-life/PlanningView";
import { ApiError } from "@/lib/api/client";
import { getPublicHome, type HomeRelation, type PublicHomeDto } from "@/lib/api/publicHome";
import { getTableLeaderboard } from "@/lib/api/publicTables";
import { groupByDay } from "./group-by-day";

interface HomeClub {
  name: string;
  logoUrl: string | null;
  timezone: string;
}

const RELATION_LABEL: Record<HomeRelation, string> = { COACH: "Tu coaches", PLAYER: "Ton équipe" };

/**
 * Accueil personnel (retour du club, 2026-10-01 : « un onglet accueil pour
 * les coachs, il verra son agenda avec les matchs de ses équipes et où il
 * doit coacher. Pareil pour le joueur : en fonction de sa licence, on sait
 * son équipe »). Données réelles uniquement (ball-manager-back `/home`).
 */
export function PublicHomeApp({ clubSlug, club }: { clubSlug: string; club: HomeClub }) {
  const { identity, forget } = usePublicIdentity();

  if (identity === undefined) return <ListSkeleton rows={5} />;
  if (identity === null) return <PublicLoginPanel returnTo="accueil" title="Mon espace" lead="Ton équipe, tes prochains matchs et tes tables de marque au même endroit : retrouve ton nom pour recevoir ton lien d'accès par email." />;
  return <PersonalHome key={identity.token} clubSlug={clubSlug} club={club} identity={identity} onForget={forget} />;
}

function PersonalHome({ clubSlug, club, identity, onForget }: { clubSlug: string; club: HomeClub; identity: PublicIdentity; onForget: () => void }) {
  const [home, setHome] = useState<PublicHomeDto | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [addingPerson, setAddingPerson] = useState(false);
  const center = useActionCenter(clubSlug, identity.token);
  // Tables tenues cette saison (classement public) — bloc secondaire : une panne n'empêche pas l'accueil.
  const [tablesDone, setTablesDone] = useState<number | null>(null);
  const base = `/public/${clubSlug}`;

  useEffect(() => {
    let cancelled = false;
    getTableLeaderboard(clubSlug)
      .then((board) => !cancelled && setTablesDone(board.entries.find((e) => e.licencie.id === identity.licencie.id)?.done ?? 0))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [clubSlug, identity.licencie.id]);

  useEffect(() => {
    let cancelled = false;
    getPublicHome(clubSlug, identity.token)
      .then((result) => !cancelled && setHome(result))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err : new Error("Chargement impossible.")));
    return () => {
      cancelled = true;
    };
  }, [clubSlug, identity.token]);

  if (error instanceof ApiError && error.isUnauthorized) {
    return <ErrorState title="Lien personnel expiré" description="Ton lien a été remplacé ou révoqué. Demande un nouveau lien." action={<Button onClick={onForget}>Demander un nouveau lien</Button>} />;
  }
  if (error) return <ErrorState title="Accueil indisponible" description={error.message} />;
  if (!home) return <ListSkeleton rows={5} />;

  const cardClub = { name: club.name, logoUrl: club.logoUrl };
  // Matchs de l'accueil + entraînements (et matchs des autres enfants de l'appareil), retour du club 2026-10-09.
  const agenda = buildAgenda(home, center.data);
  const severalPeople = (center.data?.people.length ?? 0) > 1;
  const coachTeams = home.teams.filter((t) => t.relation === "COACH");
  const playerTeams = home.teams.filter((t) => t.relation === "PLAYER");
  // Une entrée par équipe (coach d'abord) : coacher et jouer dans la même équipe ne donne qu'un bouton.
  const myTeams = [...coachTeams.map((t) => ({ id: t.id, name: t.name, coach: true })), ...playerTeams.map((t) => ({ id: t.id, name: t.name, coach: false }))].filter((t, i, all) => all.findIndex((o) => o.id === t.id) === i);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow={club.name}
        title={`Bonjour ${home.licencie.firstName}`}
        description={coachTeams.length ? "Ton agenda de coach et tes prochains rendez-vous au club." : "Ton équipe, tes prochains matchs et tes rendez-vous au club."}
        meta={
          <>
            {playerTeams.map((t) => (
              <Link key={`p-${t.id}`} href={`${base}/equipes/${t.id}`} className="rounded-full hover:opacity-80" aria-label={`Page de l'équipe ${t.name}`}>
                <StatusBadge tone="accent" icon={<Shirt />}>
                  Joue en {t.name} →
                </StatusBadge>
              </Link>
            ))}
            {coachTeams.map((t) => (
              <Link key={`c-${t.id}`} href={`${base}/equipes/${t.id}`} className="rounded-full hover:opacity-80" aria-label={`Page de l'équipe ${t.name}`}>
                <StatusBadge tone="info" icon={<Megaphone />}>
                  Coach {t.name} →
                </StatusBadge>
              </Link>
            ))}
            {home.roles.coordinator ? <StatusBadge tone="neutral">Coordinateur</StatusBadge> : null}
            {home.roles.admin ? <StatusBadge tone="neutral">Admin</StatusBadge> : null}
          </>
        }
        actions={
          <>
            {/* Retour du club, 2026-10-10 : « j'ai pas la fiche équipe, aucun bouton pour y accéder ». */}
            {myTeams.map((t) => (
              <ButtonLink key={`team-${t.id}`} href={`${base}/equipes/${t.id}`} variant="primary" icon={<Users />} iconRight={<ArrowRight />}>
                {t.coach ? "Fiche équipe" : "Mon équipe"} {t.name}
              </ButtonLink>
            ))}
            {home.roles.coach || home.roles.admin ? (
              <ButtonLink href={`${base}/entrainements`} variant="secondary" icon={<Dumbbell />}>
                Entraînements
              </ButtonLink>
            ) : null}
            {home.roles.coach || home.roles.coordinator || home.roles.admin ? (
              <>
              {home.roles.coach ? (
                <ButtonLink href={`${base}/derogations/nouvelle`} variant="secondary" icon={<CalendarPlus />}>
                  Demander une dérogation
                </ButtonLink>
              ) : null}
              <ButtonLink href={`${base}/derogations`} variant="ghost" icon={<CalendarClock />}>
                Dérogations
              </ButtonLink>
              </>
            ) : null}
          </>
        }
      />

      <ActionCenter clubSlug={clubSlug} timezone={club.timezone} {...center} onAddPerson={() => setAddingPerson(true)} />
      <Sheet
        open={addingPerson}
        onClose={() => setAddingPerson(false)}
        title="Ajouter un enfant"
        description="Un parent avec plusieurs enfants au club : retrouve le nom de l'autre enfant et ouvre son lien sur ce téléphone. Les entraînements de chacun s'afficheront ensemble ici."
        side="bottom"
      >
        <IdentifyView clubSlug={clubSlug} clubName={club.name} returnTo="accueil" searchFirst header={<span />} />
      </Sheet>

      {home.teams.length === 0 ? (
        <Notice tone="info">
          Aucune équipe n&apos;est encore associée à ton profil. Un responsable du club peut t&apos;ajouter à ton équipe {home.roles.coach ? "ou à celles que tu coaches " : ""}depuis la liste des joueurs.
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="agenda-title" className="flex flex-col gap-4">
          <SectionHeader
            id="agenda-title"
            title="Mon agenda"
            description={coachTeams.length ? "Tes matchs à coacher et tes entraînements." : "Tes matchs et tes entraînements."}
          />
          {/* Retour du club, 2026-10-10 : « un plus gros bouton, mieux visible, ce sera beaucoup cliqué ». */}
          <ButtonLink href={`${base}/planning`} variant="primary" size="lg" icon={<CalendarRange />} iconRight={<ArrowRight />} className="w-full sm:w-auto sm:self-start">
            Voir mon planning
          </ButtonLink>
          {agenda.length === 0 ? (
            <EmptyState compact icon={<CalendarDays />} title="Rien de prévu" description={home.teams.length ? "Les prochains matchs (publiés par la FFBB) et les entraînements de tes équipes apparaîtront ici." : "Ton agenda s'affichera dès qu'une équipe sera associée à ton profil."} />
          ) : (
            <DayGroups
              groups={groupByDay(agenda, (item) => item.at, club.timezone)}
              render={(item: AgendaItem) => {
                const relations = item.kind === "MATCH" ? item.entry.relations : item.relations;
                const forNames = item.kind === "EVENT" && severalPeople ? item.forFirstNames : [];
                const badges =
                  home.teams.length > 1 || severalPeople || relations.includes("COACH") ? (
                    <p className="flex flex-wrap gap-1.5">
                      {relations.map((r) => (
                        <StatusBadge key={r} size="sm" tone={r === "COACH" ? "info" : "accent"} icon={r === "COACH" ? <Megaphone /> : <Shirt />}>
                          {RELATION_LABEL[r]}
                        </StatusBadge>
                      ))}
                      {forNames.length ? (
                        <StatusBadge size="sm" tone="neutral" icon={<UserRound />}>
                          {forNames.join(", ")}
                        </StatusBadge>
                      ) : null}
                    </p>
                  ) : null;
                if (item.kind === "MATCH") {
                  const { match } = item.entry;
                  return (
                    <div className="flex flex-col gap-1.5">
                      {badges}
                      <MatchCard match={match} href={`${base}/matchs/${match.id}`} club={cardClub} hideDate />
                    </div>
                  );
                }
                const e = item.event;
                const href = e.kind === "MATCH" ? `${base}/matchs/${e.id}` : relations.includes("COACH") && e.team ? `${base}/entrainements?equipe=${e.team.id}&seance=${e.id}` : null;
                const card = <PlanningEventCard event={e} timezone={club.timezone} interactive={Boolean(href)} />;
                return (
                  <div className="flex flex-col gap-1.5">
                    {badges}
                    {href ? (
                      <Link href={href} className="block rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
                        {card}
                      </Link>
                    ) : (
                      card
                    )}
                  </div>
                );
              }}
              itemKey={(item) => item.key}
              unit="rendez-vous"
            />
          )}
        </section>

        {/* Retour du club, 2026-10-10 : tables et derniers résultats remontés (avant l'agenda sur mobile, à droite sur grand écran). */}
        <aside className="order-first flex flex-col gap-8 xl:order-none">
          <section aria-labelledby="duties-title" className="flex flex-col gap-3">
            <SectionHeader id="duties-title" title="Mes tables de marque" as="h2" />
            <Link href={`${base}/tables`} className="block rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
              <Card variant="interactive" className="flex items-center gap-3">
                <span aria-hidden className="inline-flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-accent-soft text-accent-text [&_svg]:size-5">
                  <ClipboardList />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15.5px] font-semibold text-foreground">
                    {tablesDone === null ? "Tables de marque" : (
                      <>
                        <span className="type-numeric">{tablesDone}</span> table{tablesDone > 1 ? "s" : ""} réalisée{tablesDone > 1 ? "s" : ""} cette saison
                      </>
                    )}
                  </p>
                  <p className="type-meta">{home.tableDuties.length ? `${home.tableDuties.length} prévue${home.tableDuties.length > 1 ? "s" : ""} · ` : ""}Clique pour te positionner sur un match.</p>
                </div>
                <ArrowRight aria-hidden className="size-5 shrink-0 text-accent-text" />
              </Card>
            </Link>
            {home.tableDuties.length ? (
              <ul className="flex flex-col gap-2">
                {home.tableDuties.map((d) => (
                  <li key={`${d.matchId}-${d.role}`}>
                    <Card padded={false} className="flex items-start gap-3 p-3.5">
                      <span aria-hidden className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success [&_svg]:size-4">
                        <ClipboardList />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-foreground">{TABLE_ROLE_LABELS[d.role]}</p>
                        <p className="type-meta truncate">
                          <span className="type-numeric">{formatShortDateTime(d.matchDatetime, club.timezone)}</span>
                          {d.teamName ? ` · ${d.teamName}` : ""}
                          {d.opponentName ? ` vs ${d.opponentName}` : ""}
                        </p>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : null}
            {home.tableDuties.length ? (
              <ButtonLink href={`${base}/tables`} variant="secondary" icon={<ClipboardList />} iconRight={<ArrowRight />} className="w-full sm:w-auto sm:self-start">
                Se positionner sur une autre table
              </ButtonLink>
            ) : null}
          </section>

          <section aria-labelledby="results-title" className="flex flex-col gap-3">
            <SectionHeader id="results-title" title="Derniers résultats" />
            {home.recentResults.length === 0 ? (
              <EmptyState compact icon={<Trophy />} title="Pas encore de résultat" description="Les scores de tes équipes apparaissent ici dès leur publication." />
            ) : (
              <DayGroups
                groups={groupByDay(home.recentResults, (e) => e.match.matchDatetime, club.timezone)}
                render={({ match }) => (
                  <div className="flex flex-col gap-1.5">
                    <MatchCard match={match} href={`${base}/matchs/${match.id}`} club={cardClub} hideDate />
                    <ButtonLink href={`${base}/matchs/${match.id}`} variant="secondary" size="sm" iconRight={<ArrowRight />} className="w-full sm:w-auto sm:self-end">
                      Voir le détail du match
                    </ButtonLink>
                  </div>
                )}
                itemKey={(e) => e.match.id}
                compact
              />
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

/** Un en-tête de date par jour, puis les matchs de ce jour (jamais la même date répétée sur chaque carte). */
function DayGroups<T>({ groups, render, itemKey, compact, unit = "matchs" }: { groups: ReturnType<typeof groupByDay<T>>; render: (item: T) => React.ReactNode; itemKey: (item: T) => string; compact?: boolean; unit?: string }) {
  return (
    <ol className={compact ? "flex flex-col gap-5" : "flex flex-col gap-7"}>
      {groups.map((g) => (
        <li key={g.key} className="flex flex-col gap-2.5">
          <h3 className="flex items-baseline gap-2 border-b border-border pb-1.5">
            <span className={compact ? "text-[14px] font-semibold text-foreground" : "text-[15.5px] font-semibold text-foreground"}>{g.label}</span>
            {g.items.length > 1 ? <span className="type-meta">{g.items.length} {unit}</span> : null}
          </h3>
          <ul className="flex flex-col gap-3">
            {g.items.map((item) => (
              <li key={itemKey(item)}>{render(item)}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
