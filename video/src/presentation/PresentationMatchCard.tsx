import { House, MapPin, Route } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { TeamLogo } from "@/components/ui/Logo";
import { matchDateParts } from "@/features/matches/match-display";
import type { MatchListItemDto } from "@/lib/api/matches";
import { CLUB } from "../data/demo";

/**
 * VERSION VIDÉO de MatchCard (src/features/matches/MatchCard.tsx) : mêmes
 * primitives (surface-card, TeamLogo, StatusBadge, typo data), mais
 * seulement ce qu'on lit en une seconde — équipe, adversaire, date, heure,
 * lieu. Le composant de production n'est pas modifié.
 */
export function PresentationMatchCard({ match, className }: { match: MatchListItemDto; className?: string }) {
  const p = matchDateParts(match.matchDatetime);
  const home = match.isHome !== false;
  const venue = (match.venueLabel ?? "").replace(/, .*$/, "");
  return (
    <div className={`surface-card flex items-center gap-5 px-5 py-4 ${className ?? ""}`}>
      <div className="flex w-[88px] shrink-0 flex-col items-center gap-0.5 border-r border-border pr-4">
        <span className="type-eyebrow">
          {p?.weekday} {p?.day} {p?.month}
        </span>
        <span className="type-numeric text-[30px] font-medium leading-none text-foreground">{p?.time}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <TeamLogo name={CLUB.shortName} size="sm" accent />
          <span className="truncate text-[19px] font-semibold text-foreground">{match.teamName}</span>
          <span className="text-[15px] text-subtle">vs</span>
          <TeamLogo name={match.opponentName} size="sm" />
          <span className="truncate text-[19px] font-medium text-foreground">{match.opponentName}</span>
        </div>
        <span className="flex items-center gap-1.5 text-[14.5px] text-muted">
          <MapPin aria-hidden className="size-4 text-subtle" />
          {venue}
        </span>
      </div>
      <StatusBadge tone={home ? "accent" : "neutral"} icon={home ? <House /> : <Route />}>
        {home ? "Domicile" : "Extérieur"}
      </StatusBadge>
    </div>
  );
}
