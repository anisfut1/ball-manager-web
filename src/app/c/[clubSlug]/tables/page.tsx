import Link from "next/link";
import { CalendarCheck, ChevronLeft, ChevronRight, KeyRound, Trophy } from "lucide-react";
import { requireAnyClubRoleContext } from "@/lib/tenancy/club-context";
import { isClubAdmin } from "@/lib/permissions/roles";
import { api } from "@/lib/api/server";
import { addDaysToDateString, currentOrNextWeekendSaturday, formatWeekendLabel, weekendRangeForSaturday } from "@/lib/timezone";
import { PageContainer, PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink, buttonClasses } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { DaySummary } from "@/features/tables/DaySummary";
import { TablesBoard } from "@/features/tables/TablesBoard";

/**
 * Page "Tables de marque" (§64-§69 de la demande) : vue PAR JOURNÉE — au
 * sens basket, une journée de championnat couvre tout le week-end (samedi +
 * dimanche), pas un seul jour calendaire (retour du club, 2026-09-28 : "au
 * lieu de fonctionner par jour, fonctionne par journée (1 journée = semaine
 * weekend)"). Matchs à domicile uniquement (§4/§36 — un match extérieur ne
 * sert qu'à calculer l'indisponibilité, jamais affiché ici), chaque match =
 * une card avec ses postes. Accessible à club_admin ET responsable_tables
 * (§31, même porte que ball-manager-back — voir `requireAnyClubRole` côté API).
 */
export default async function TablesPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { clubSlug } = await params;
  const club = await requireAnyClubRoleContext(clubSlug, ["club_admin", "responsable_tables"]);

  const resolvedSearchParams = await searchParams;
  const requestedWeekend = typeof resolvedSearchParams.weekend === "string" ? resolvedSearchParams.weekend : null;
  const saturday = requestedWeekend && /^\d{4}-\d{2}-\d{2}$/.test(requestedWeekend) ? requestedWeekend : currentOrNextWeekendSaturday(club.timezone);

  const { from, to } = weekendRangeForSaturday(saturday, club.timezone);
  const matches = await api.tables.list(club.id, { from, to });

  const previousWeekend = addDaysToDateString(saturday, -7);
  const nextWeekend = addDaysToDateString(saturday, 7);
  const defaultWeekend = currentOrNextWeekendSaturday(club.timezone);
  const base = `/c/${clubSlug}/tables`;

  return (
    <PageContainer width="wide">
      <PageHeader
        eyebrow="Matchs à domicile"
        title="Tables de marque"
        description="Marqueur, chronométreur, délégué de club et arbitre : un poste à la fois, choisi parmi des suggestions expliquées."
        actions={
          <>
            <ButtonLink href={`${base}/classement`} variant="secondary" icon={<Trophy />}>
              Classement
            </ButtonLink>
            {isClubAdmin(club.roles) ? (
              <ButtonLink href={`${base}/public-access`} variant="secondary" icon={<KeyRound />}>
                Gérer les accès publics
              </ButtonLink>
            ) : null}
          </>
        }
      />

      <nav aria-label="Choisir la journée" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href={`${base}?weekend=${previousWeekend}`} aria-label="Journée précédente" title="Journée précédente" className={buttonClasses({ variant: "secondary", className: "w-11 px-0 sm:w-10" })}>
            <ChevronLeft aria-hidden />
          </Link>
          <p className="type-card min-w-0 flex-1 px-2 text-center text-foreground sm:min-w-[260px]" aria-live="polite">
            {formatWeekendLabel(saturday)}
          </p>
          <Link href={`${base}?weekend=${nextWeekend}`} aria-label="Journée suivante" title="Journée suivante" className={buttonClasses({ variant: "secondary", className: "w-11 px-0 sm:w-10" })}>
            <ChevronRight aria-hidden />
          </Link>
        </div>
        <Link
          href={`${base}?weekend=${defaultWeekend}`}
          aria-current={saturday === defaultWeekend ? "true" : undefined}
          className={cn(buttonClasses({ variant: saturday === defaultWeekend ? "outline" : "ghost" }), saturday === defaultWeekend && "border-accent-border bg-accent-soft text-accent-text")}
        >
          <CalendarCheck aria-hidden />
          Ce week-end
        </Link>
      </nav>

      <DaySummary matches={matches} />

      <TablesBoard clubId={club.id} matches={matches} />
    </PageContainer>
  );
}
