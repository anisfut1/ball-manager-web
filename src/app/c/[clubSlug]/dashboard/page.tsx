import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Trophy,
  Users,
} from "lucide-react";
import { requireClubContext } from "@/lib/tenancy/club-context";
import {
  DEROGATION_REQUEST_ROLES,
  hasAnyRole,
  isClubAdmin,
} from "@/lib/permissions/roles";
import { api } from "@/lib/api/server";
import { currentSeasonStart } from "@/lib/season";
import { getShellIdentity } from "@/components/shell/session";
import { PageContainer, SectionHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { MatchCard } from "@/features/matches/MatchCard";
import {
  defaultWeekend,
  matchWeekendKey,
} from "@/features/matches/match-filters";
import { QuickLink } from "@/features/dashboard/QuickLink";
import { DashboardRequestsCard } from "@/features/derogation-requests/DashboardRequestsCard";

function greetingDate(): string {
  return new Date().toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Tableau de bord : uniquement des données réelles déjà exposées par
 * ball-manager-back (matchs de la saison, anomalies, dérogations). Les
 * indicateurs admin ne sont chargés — et affichés — que pour un club_admin ;
 * les raccourcis ne mènent qu'aux pages que le rôle peut réellement ouvrir.
 */
export default async function ClubDashboardPage({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;
  const club = await requireClubContext(clubSlug);
  const admin = isClubAdmin(club.roles);
  const canTables = hasAnyRole(club.roles, [
    "club_admin",
    "responsable_tables",
  ]);
  const canRequests = hasAnyRole(club.roles, DEROGATION_REQUEST_ROLES);

  const [identity, matches, issues, derogations, requests] = await Promise.all([
    getShellIdentity(),
    api.matches.list(club.id, { from: currentSeasonStart().toISOString() }),
    admin ? api.issues.list(club.id) : Promise.resolve(null),
    admin ? api.derogations.list(club.id) : Promise.resolve(null),
    // Bloc secondaire : une panne du module ne casse jamais l'accueil.
    canRequests
      ? Promise.all([
          api.derogationRequests.context(club.id),
          api.derogationRequests.list(club.id, { limit: 200 }),
        ]).catch(() => null)
      : Promise.resolve(null),
  ]);

  const now = new Date();
  const thisWeekend = defaultWeekend(now);
  const dated = matches.filter((m) => m.matchDatetime !== null);
  const weekend = dated.filter(
    (m) => matchWeekendKey(m.matchDatetime!) === thisWeekend,
  );
  const upcoming = dated
    .filter((m) => new Date(m.matchDatetime!) >= now)
    .sort(
      (a, b) =>
        new Date(a.matchDatetime!).getTime() -
        new Date(b.matchDatetime!).getTime(),
    );
  const results = dated
    .filter(
      (m) =>
        new Date(m.matchDatetime!) < now &&
        m.scoreHome !== null &&
        m.scoreAway !== null,
    )
    .sort(
      (a, b) =>
        new Date(b.matchDatetime!).getTime() -
        new Date(a.matchDatetime!).getTime(),
    );
  const openIssues = issues?.filter((i) => i.status === "open") ?? null;
  const derogationsToAnswer =
    derogations?.filter((d) => d.actionRequired) ?? null;

  const firstName = identity.user.displayName.includes("@")
    ? null
    : identity.user.displayName.split(" ")[0];
  const cardClub = {
    name: club.shortName ?? club.name,
    logoUrl: club.logoUrl,
    showDerogation: admin || identity.isPlatformAdmin,
  };
  const base = `/c/${clubSlug}`;

  return (
    <PageContainer width="wide" className="gap-10">
      <header className="flex flex-col gap-2 [animation:rise-in_var(--duration-slow)_var(--ease-out)]">
        <p className="type-eyebrow first-letter:uppercase">{greetingDate()}</p>
        <h1 className="type-display text-foreground">
          Bonjour{firstName ? <> {firstName}</> : null}
          <span className="text-accent-text">.</span>
        </h1>
        <p className="max-w-2xl text-[15px] text-muted">
          Voici l&apos;essentiel de{" "}
          <span className="font-medium text-foreground">{club.name}</span> pour
          la saison en cours.
        </p>
      </header>

      <section
        aria-label="Indicateurs"
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        <StatCard
          label="Cette journée"
          value={weekend.length}
          icon={<CalendarDays />}
          hint={`dont ${weekend.filter((m) => m.isHome === true).length} à domicile`}
          href={`${base}/matchs`}
        />
        <StatCard
          label="À venir"
          value={upcoming.length}
          icon={<CalendarRange />}
          hint="matchs restants cette saison"
          href={`${base}/matchs?when=upcoming`}
          tone="neutral"
        />
        {openIssues ? (
          <StatCard
            label="Anomalies"
            value={openIssues.length}
            icon={<AlertTriangle />}
            hint={openIssues.length ? "à examiner" : "rien à signaler"}
            href={`${base}/admin/issues`}
            tone={openIssues.length ? "warning" : "success"}
          />
        ) : (
          <StatCard
            label="Résultats"
            value={results.length}
            icon={<Trophy />}
            hint="matchs joués cette saison"
            href={`${base}/matchs?when=past`}
            tone="neutral"
          />
        )}
        {derogationsToAnswer ? (
          <StatCard
            label="Dérogations FBI"
            value={derogationsToAnswer.length}
            icon={<CalendarClock />}
            hint={
              derogationsToAnswer.length
                ? "en attente de votre réponse"
                : "aucune réponse attendue"
            }
            href={`${base}/admin/derogations`}
            tone={derogationsToAnswer.length ? "warning" : "neutral"}
          />
        ) : (
          <StatCard
            label="Victoires"
            value={
              results.filter((m) =>
                m.isHome
                  ? m.scoreHome! > m.scoreAway!
                  : m.scoreAway! > m.scoreHome!,
              ).length
            }
            icon={<Trophy />}
            hint={`sur ${results.length} match${results.length > 1 ? "s" : ""} joué${results.length > 1 ? "s" : ""}`}
            tone="success"
          />
        )}
      </section>

      {/* Mobile/tablette : les demandes en attente passent avant les résultats (dans la colonne latérale sur desktop). */}
      {requests ? (
        <div className="-mt-4 xl:hidden">
          <DashboardRequestsCard
            requests={requests[1].requests}
            manager={requests[0].canManage}
            href={`${base}/derogations`}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col gap-4">
          {/* Retour du club, 2026-10-01 : « sur la page accueil enlève prochains matchs, mets juste derniers résultats ». */}
          <SectionHeader
            title="Derniers résultats"
            action={
              <ButtonLink
                href={`${base}/resultats`}
                variant="ghost"
                size="sm"
                iconRight={<ArrowRight />}
              >
                Tout voir
              </ButtonLink>
            }
          />
          {results.length === 0 ? (
            <EmptyState
              icon={<Trophy />}
              title="Aucun résultat pour l'instant"
              description="Les scores apparaissent ici dès qu'ils sont publiés par la FFBB."
              compact
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
              {results.slice(0, 6).map((match) => (
                <li key={match.id}>
                  <MatchCard
                    match={match}
                    href={`${base}/matchs/${match.id}`}
                    club={cardClub}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          {requests ? (
            <div className="hidden xl:block">
              <DashboardRequestsCard
                requests={requests[1].requests}
                manager={requests[0].canManage}
                href={`${base}/derogations`}
              />
            </div>
          ) : null}
          <SectionHeader title="Accès rapides" />
          <nav aria-label="Accès rapides" className="flex flex-col gap-2.5">
            <QuickLink
              href={`${base}/matchs`}
              icon={<CalendarDays />}
              title="Matchs"
              description="Calendrier, résultats et composition, synchronisés automatiquement."
            />
            <QuickLink
              href={`${base}/joueurs`}
              icon={<Users />}
              title="Joueurs"
              description="Fiche par licencié : historique des matchs et statistiques."
            />
            {canTables ? (
              <QuickLink
                href={`${base}/tables`}
                icon={<ClipboardList />}
                title="Tables de marque"
                description="Marqueur, chronométreur, délégué de club : à attribuer pour chaque match à domicile."
              />
            ) : null}
            {admin ? (
              <QuickLink
                href={`${base}/admin/derogations`}
                icon={<CalendarClock />}
                title="Dérogations FBI"
                description="Statut officiel des dérogations connues sur FBI (lecture)."
              />
            ) : null}
          </nav>
        </aside>
      </div>
    </PageContainer>
  );
}
