import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { requireClubAdminContext } from "@/lib/tenancy/club-context";
import { api } from "@/lib/api/server";
import { PageContainer, PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { ClubLogo } from "@/components/ui/Logo";
import { cn } from "@/components/ui/cn";
import { PrintBookingButton } from "@/features/matches/PrintBookingButton";
import { buildBookingGrid, monthKey, monthLabel, monthRange, parseBookingMonth, shiftMonth, shortVenue, type BookingCell } from "@/features/matches/venue-booking";

/** Mois d'une saison de basket (septembre → juin) autour du mois affiché. */
function seasonMonths(year: number, month: number) {
  const startYear = month >= 7 ? year : year - 1;
  return Array.from({ length: 10 }, (_, i) => shiftMonth(startYear, 9, i));
}

/**
 * « Réservation salle » (admins du club, demande du 2026-10-20) : le
 * planning mensuel des matchs, une ligne par jour de week-end, une colonne
 * par équipe, l'heure dans la case — à exporter en PDF paysage pour
 * réserver les gymnases. Calculé depuis les matchs programmés (FFBB/FBI).
 */
export default async function VenueBookingPage({ params, searchParams }: { params: Promise<{ clubSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { clubSlug } = await params;
  const query = await searchParams;
  const club = await requireClubAdminContext(clubSlug);
  const timeZone = club.timezone || "Europe/Paris";
  const { year, month } = parseBookingMonth(typeof query.mois === "string" ? query.mois : undefined, timeZone, new Date());
  const homeOnly = query.lieu !== "tous";

  const [teams, matches] = await Promise.all([api.clubs.teams(club.id), api.matches.list(club.id, monthRange(year, month))]);
  const grid = buildBookingGrid({ matches, teams: teams.filter((t) => t.active).map((t) => t.name), year, month, timeZone, homeOnly });

  const base = `/c/${clubSlug}/matchs/reservation-salle`;
  const href = (target: { year: number; month: number }, lieu = homeOnly ? null : "tous") => `${base}?mois=${monthKey(target.year, target.month)}${lieu ? `&lieu=${lieu}` : ""}`;
  const current = { year, month };
  const clubName = club.shortName ?? club.name;
  const generatedAt = new Date().toLocaleDateString("fr-FR", { timeZone, day: "numeric", month: "long", year: "numeric" });

  return (
    <PageContainer width="wide">
      <div className="booking-screen-only flex flex-col gap-5">
        <PageHeader
          eyebrow="Administration"
          title="Réservation salle"
          description="Le planning du mois, équipe par équipe, prêt à envoyer pour réserver les gymnases."
          actions={
            <>
              <ButtonLink href={`/c/${clubSlug}/matchs`} variant="secondary" icon={<ArrowLeft />}>
                Matchs
              </ButtonLink>
              <PrintBookingButton />
            </>
          }
        />

        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface-raised p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1">
            <Link href={href(shiftMonth(year, month, -1))} aria-label="Mois précédent" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-muted">
              <ChevronLeft className="size-5" />
            </Link>
            <div className="flex gap-1 overflow-x-auto">
              {seasonMonths(year, month).map((m) => {
                const active = m.year === year && m.month === month;
                return (
                  <Link
                    key={monthKey(m.year, m.month)}
                    href={href(m)}
                    aria-current={active ? "page" : undefined}
                    className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors", active ? "bg-accent text-accent-ink" : "text-muted hover:bg-surface-muted hover:text-foreground")}
                  >
                    {monthLabel(m.year, m.month).split(" ")[0]}
                  </Link>
                );
              })}
            </div>
            <Link href={href(shiftMonth(year, month, 1))} aria-label="Mois suivant" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-muted">
              <ChevronRight className="size-5" />
            </Link>
          </div>
          <div className="flex rounded-full bg-surface-muted p-1 text-sm font-medium" role="group" aria-label="Matchs affichés">
            <Link href={href(current, null)} aria-current={homeOnly ? "true" : undefined} className={cn("rounded-full px-3 py-1.5", homeOnly ? "bg-surface-raised text-foreground shadow-1" : "text-muted")}>
              À domicile
            </Link>
            <Link href={href(current, "tous")} aria-current={!homeOnly ? "true" : undefined} className={cn("rounded-full px-3 py-1.5", !homeOnly ? "bg-surface-raised text-foreground shadow-1" : "text-muted")}>
              Tous les matchs
            </Link>
          </div>
        </div>
      </div>

      <section className="booking-sheet mt-5 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface-raised shadow-2">
        <header className="booking-head flex items-center gap-4 bg-accent px-5 py-4 text-accent-ink">
          <ClubLogo name={clubName} src={club.logoUrl} size="md" className="bg-white" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">{clubName} · Planning des matchs</p>
            <h2 className="text-2xl font-bold leading-tight">{grid.monthLabel}</h2>
          </div>
          <div className="text-right text-xs leading-relaxed opacity-90">
            <p className="font-semibold">{homeOnly ? "Matchs à domicile" : "Tous les matchs"}</p>
            <p>
              {grid.matchCount} match{grid.matchCount > 1 ? "s" : ""}
              {grid.mainVenue ? ` · ${shortVenue(grid.mainVenue)} sauf mention` : ""}
            </p>
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="booking-table w-full border-collapse text-center text-[13px]">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 min-w-28 border-b border-r border-border bg-surface px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-subtle">
                  Jour
                </th>
                {grid.teams.map((team) => (
                  <th key={team} scope="col" className="min-w-[4.5rem] border-b border-r border-border bg-accent-soft px-1.5 py-2.5 text-[12px] font-bold text-accent-text last:border-r-0">
                    {team}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.days.map((day) => {
                const weekend = day.weekday === 0 || day.weekday === 6;
                const empty = Object.keys(day.cells).length === 0;
                return [
                  day.startsWeek ? (
                    <tr key={`${day.key}-gap`} aria-hidden className="booking-gap">
                      <td colSpan={grid.teams.length + 1} className="h-2 bg-surface" />
                    </tr>
                  ) : null,
                  <tr key={day.key} className={cn(empty && "booking-empty")}>
                    <th scope="row" className={cn("sticky left-0 z-10 border-b border-r border-border px-3 py-2 text-left font-semibold whitespace-nowrap", weekend ? "bg-surface-raised text-foreground" : "bg-warning-soft text-foreground")}>
                      {day.label}
                    </th>
                    {grid.teams.map((team) => (
                      <td key={team} className="border-b border-r border-border px-1 py-1.5 align-middle last:border-r-0">
                        {(day.cells[team] ?? []).map((cell) => (
                          <Cell key={cell.matchId} cell={cell} clubSlug={clubSlug} />
                        ))}
                      </td>
                    ))}
                  </tr>,
                ];
              })}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-5 py-3 text-[11px] text-subtle">
          <span className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden className="size-3.5" />
            {grid.mainVenue ? `Gymnase principal : ${grid.mainVenue.split(/\s[—–-]\s|,/)[0]}. Autre salle indiquée sous l'heure.` : "Salle indiquée sous l'heure quand elle diffère."}
          </span>
          <span>Généré le {generatedAt} · Ball Manager · horaires FFBB/FBI</span>
        </footer>
      </section>

      {grid.matchCount === 0 ? <p className="booking-screen-only mt-4 text-center text-sm text-muted">Aucun match programmé ce mois-ci{homeOnly ? " à domicile" : ""}.</p> : null}
    </PageContainer>
  );
}

function Cell({ cell, clubSlug }: { cell: BookingCell; clubSlug: string }) {
  const off = cell.status === "cancelled" || cell.status === "postponed";
  return (
    <Link
      href={`/c/${clubSlug}/matchs/${cell.matchId}`}
      title={cell.opponent ? `vs ${cell.opponent}` : undefined}
      className={cn(
        "booking-cell mx-auto my-0.5 flex w-fit min-w-12 flex-col items-center rounded-md px-2 py-1 leading-tight",
        !cell.isHome ? "border border-dashed border-border-strong text-muted" : cell.venue ? "bg-warning-soft text-foreground" : "bg-accent-soft text-accent-text",
        off && "line-through opacity-60",
      )}
    >
      <span className="text-[13px] font-bold">{cell.time}</span>
      {cell.venue ? <span className="text-[10px] font-semibold uppercase tracking-wide">{cell.venue}</span> : null}
    </Link>
  );
}
