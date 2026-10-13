import { MapPin } from "lucide-react";
import type { MatchListItemDto } from "@/lib/api/matches";
import { MatchCard, type MatchCardClub } from "./MatchCard";

/**
 * "Pour les matchs à domicile, faut faire 2 colonnes car là il y a 2
 * gymnases pour le club de sète. Je veux un rendu type agenda carré propre
 * premium" (demande du club, 2026-09-28).
 *
 * Les 2 gymnases réels du club, confirmés par les données réelles (jamais
 * devinés — requête SQL sur `matches.venue_raw_label` pour les matchs à
 * domicile de SC Sète Basket, 2026-09-28) : GYMNASE MAURICE CLAVEL (67
 * matchs) et COMPLEXE SPORTIF DU LIDO (9 matchs). Une poignée de matchs
 * "à domicile" pointent vers d'autres salles (GYMNASE LE HETET, PALAIS DES
 * SPORTS, SALLE THOMAS BARONCHELLI) avec un adversaire ET une équipe Sète
 * inconnue — a priori une particularité FFBB (plateau/salle de repli) plutôt
 * qu'une 3e salle régulière du club ; ils sont regroupés dans "Autre salle"
 * plutôt que forcés dans l'une des 2 colonnes, pour ne jamais afficher une
 * fausse localisation.
 *
 * Le rapprochement se fait par mot-clé tolérant (normalisation des accents,
 * comme `venuesLikelyMatch` côté ball-manager-back) plutôt que par égalité
 * stricte : `venueLabel` renvoyé par l'API peut différer en formatage de
 * `venue_raw_label` observé en base.
 */
const HOME_VENUES = [
  { key: "clavel", keyword: "CLAVEL", label: "Gymnase Maurice Clavel" },
  { key: "lido", keyword: "LIDO", label: "Complexe sportif du Lido" },
] as const;

/** Retire les diacritiques (accents) après décomposition NFD — évite tout souci d'échappement Unicode dans une regex. */
function normalizeVenue(label: string): string {
  let result = "";
  for (const char of label.normalize("NFD")) {
    const codePoint = char.codePointAt(0) ?? 0;
    const isCombiningMark = codePoint >= 0x0300 && codePoint <= 0x036f;
    if (!isCombiningMark) result += char;
  }
  return result.toUpperCase();
}

function resolveVenueColumnKey(venueLabel: string | null): (typeof HOME_VENUES)[number]["key"] | "autre" {
  if (!venueLabel) return "autre";
  const normalized = normalizeVenue(venueLabel);
  const match = HOME_VENUES.find((venue) => normalized.includes(venue.keyword));
  return match?.key ?? "autre";
}

function AgendaColumn({
  label,
  matches,
  basePath,
  club,
  wide = false,
}: {
  wide?: boolean;
  label: string;
  matches: MatchListItemDto[];
  basePath: string;
  club: MatchCardClub;
}) {
  return (
    <section className="flex flex-col gap-3" aria-label={label}>
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <h4 className="type-card flex items-center gap-2 text-foreground">
          <MapPin aria-hidden className="size-4 text-accent-text" />
          {label}
        </h4>
        <span className="type-numeric text-xs text-muted">
          {matches.length} match{matches.length > 1 ? "s" : ""}
        </span>
      </div>
      {matches.length === 0 ? (
        <p className="type-meta rounded-[var(--radius-md)] border border-dashed border-border-strong px-4 py-6 text-center">Aucun match dans cette salle.</p>
      ) : (
        <ul className={`grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 ${wide ? "lg:grid-cols-3 2xl:grid-cols-4" : ""}`}>
          {matches.map((match) => (
            <li key={match.id}>
              <MatchCard match={match} href={`${basePath}/${match.id}`} club={club} variant="tile" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Rendu "agenda carré" des matchs à domicile, 2 colonnes (une par gymnase du
 * club) + une 3e colonne repliée uniquement si des matchs "autre salle"
 * existent réellement (jamais affichée vide).
 */
export function HomeMatchesAgenda({
  matches,
  basePath,
  club,
}: {
  matches: MatchListItemDto[];
  /** Préfixe des liens vers la fiche match — `/c/{clubSlug}/matchs` (vue admin) ou `/public/{clubSlug}/matchs` (vue publique sans compte, retour du club, 2026-09-29). */
  basePath: string;
  club: MatchCardClub;
}) {
  const autreMatches = matches.filter((match) => resolveVenueColumnKey(match.venueLabel) === "autre");
  // Colonnes vides masquées : avec le regroupement par week-end, une salle
  // sans match ce week-end-là répéterait sinon « aucun match » à chaque journée.
  const columns = [
    ...HOME_VENUES.map((venue) => ({ key: venue.key as string, label: venue.label as string, matches: matches.filter((match) => resolveVenueColumnKey(match.venueLabel) === venue.key) })),
    { key: "autre", label: "Autre salle", matches: autreMatches },
  ].filter((column) => column.matches.length > 0);

  return (
    <div className={`grid grid-cols-1 gap-8 ${columns.length >= 3 ? "xl:grid-cols-3" : columns.length === 2 ? "lg:grid-cols-2" : ""}`}>
      {columns.map((column) => (
        <AgendaColumn key={column.key} label={column.label} matches={column.matches} basePath={basePath} club={club} wide={columns.length === 1} />
      ))}
    </div>
  );
}
