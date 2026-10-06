/**
 * Jeu de données de démonstration — typé avec les VRAIS DTO de l'application
 * (../src/lib/api/*). Si le contrat d'API change, `npm run typecheck` casse
 * ici : la vidéo ne peut pas dériver silencieusement du produit.
 *
 * Club : SC Sète Basket (club fondateur, gymnases réellement codés dans
 * HomeMatchesAgenda). Personnes : noms fictifs. Week-end : 10–11 octobre 2026
 * (heure de Paris = UTC+2 à cette date).
 */
import type { MatchListItemDto } from "@/lib/api/matches";
import type { TableAssignmentsForMatchDto, TableAssignmentSlotDto, TableSuggestionCandidateDto, TableUnavailableCandidateDto } from "@/lib/api/tables";
import type { LicencieMatchDto } from "@/lib/api/licencies";
import type { DerogationRequestSummaryDto } from "@/lib/api/derogationRequests";
import type { ShellUser, ShellWorkspace } from "@/components/shell/types";
import type { MatchCardClub } from "@/features/matches/MatchCard";

export const CLUB = {
  slug: "sc-sete",
  name: "SC Sète Basket",
  shortName: "SC Sète",
  logoUrl: null as string | null,
  accentColor: "#2F5BFF",
};

export const WORKSPACE: ShellWorkspace = { slug: CLUB.slug, name: CLUB.name, logoUrl: CLUB.logoUrl };
export const USER: ShellUser = { displayName: "Julien Navarro", email: "julien@scsete-basket.fr" };
export const CARD_CLUB: MatchCardClub = { name: CLUB.shortName, logoUrl: CLUB.logoUrl, showDerogation: true };

export const BASE = `/c/${CLUB.slug}`;

const CLAVEL = "Gymnase Maurice Clavel, Sète";
const LIDO = "Complexe sportif du Lido, Sète";

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String((seq += 1)).padStart(12, "0")}`;

function match(m: Partial<MatchListItemDto> & Pick<MatchListItemDto, "matchDatetime" | "isHome" | "teamName" | "opponentName">): MatchListItemDto {
  return {
    id: uuid(),
    numero: String(21000 + seq * 7),
    journee: "4",
    competitionName: null,
    categoryLabel: null,
    opponentLogoUrl: null,
    venueLabel: m.isHome ? CLAVEL : null,
    scoreHome: null,
    scoreAway: null,
    status: "scheduled",
    emarqueStatus: "not_applicable",
    derogationStatus: null,
    ...m,
  };
}

/* ── Journée du 10–11 octobre (synchronisée depuis la FFBB) ─────────── */

export const WEEKEND_HOME: MatchListItemDto[] = [
  match({ matchDatetime: "2026-10-10T08:00:00Z", isHome: true, teamName: "U11 M", opponentName: "Frontignan La Peyrade", competitionName: "Départementale U11 M", venueLabel: CLAVEL }),
  match({ matchDatetime: "2026-10-10T12:00:00Z", isHome: true, teamName: "U15 M", opponentName: "Agde", competitionName: "Départementale U15 M", venueLabel: CLAVEL }),
  match({ matchDatetime: "2026-10-10T14:00:00Z", isHome: true, teamName: "U17 M", opponentName: "Castelnau Basket - 2", competitionName: "Régionale U17 M", venueLabel: CLAVEL, derogationStatus: "acceptee" }),
  match({ matchDatetime: "2026-10-10T18:00:00Z", isHome: true, teamName: "Seniors 1 M", opponentName: "Lunel", competitionName: "Pré-Nationale M", venueLabel: CLAVEL }),
  match({ matchDatetime: "2026-10-10T11:30:00Z", isHome: true, teamName: "U13 F", opponentName: "Mèze", competitionName: "Départementale U13 F", venueLabel: LIDO }),
  match({ matchDatetime: "2026-10-11T13:30:00Z", isHome: true, teamName: "Seniors F", opponentName: "Pézenas", competitionName: "Régionale 2 F", venueLabel: LIDO }),
];

export const WEEKEND_AWAY: MatchListItemDto[] = [
  match({ matchDatetime: "2026-10-10T15:00:00Z", isHome: false, teamName: "U18 F", opponentName: "Béziers", competitionName: "Régionale U18 F", venueLabel: "Palais des sports, Béziers", derogationStatus: "en_cours" }),
  match({ matchDatetime: "2026-10-11T08:30:00Z", isHome: false, teamName: "Seniors 2 M", opponentName: "Balaruc", competitionName: "Départementale 1 M", venueLabel: "Salle Jean Moulin, Balaruc" }),
];

/* ── Derniers résultats (journée 3) ──────────────────────────────────── */

export const RESULTS: MatchListItemDto[] = [
  match({ matchDatetime: "2026-10-03T18:00:00Z", isHome: true, teamName: "Seniors 1 M", opponentName: "Montpellier Croix d'Argent", competitionName: "Pré-Nationale M", journee: "3", scoreHome: 78, scoreAway: 71, status: "played" }),
  match({ matchDatetime: "2026-10-03T14:00:00Z", isHome: false, teamName: "U17 M", opponentName: "Agde", competitionName: "Régionale U17 M", journee: "3", venueLabel: "Gymnase Jean Moulin, Agde", scoreHome: 58, scoreAway: 64, status: "played" }),
  match({ matchDatetime: "2026-10-04T13:30:00Z", isHome: true, teamName: "Seniors F", opponentName: "Lattes", competitionName: "Régionale 2 F", journee: "3", venueLabel: LIDO, scoreHome: 66, scoreAway: 59, status: "played" }),
  match({ matchDatetime: "2026-10-03T12:00:00Z", isHome: true, teamName: "U15 M", opponentName: "Mèze", competitionName: "Départementale U15 M", journee: "3", scoreHome: 52, scoreAway: 61, status: "played" }),
];

export const DEROGATION_REQUESTS = [
  { status: "REQUESTED" },
  { status: "REQUESTED" },
  { status: "IN_PROGRESS" },
] as unknown as DerogationRequestSummaryDto[];

/* ── Tables de marque : U15 M – Agde, samedi 14:00 ───────────────────── */

const ref = (firstName: string, lastName: string) => ({ id: uuid(), firstName, lastName });
const team = (name: string) => ({ id: uuid(), name });

export const PEOPLE = {
  lea: ref("Léa", "Martin"),
  hugo: ref("Hugo", "Bernard"),
  camille: ref("Camille", "Roux"),
  nathan: ref("Nathan", "Petit"),
  ines: ref("Inès", "Lambert"),
  theo: ref("Théo", "Garcia"),
  manon: ref("Manon", "Fabre"),
};

const slot = (licencie: TableAssignmentSlotDto["licencie"], teams: string[]): TableAssignmentSlotDto => ({ id: uuid(), licencie, teams: teams.map(team), hasConflict: false, conflictReason: null });

export const TABLE_MATCH: TableAssignmentsForMatchDto = {
  match: {
    id: WEEKEND_HOME[1].id,
    numero: WEEKEND_HOME[1].numero,
    matchDatetime: WEEKEND_HOME[1].matchDatetime,
    teamName: "U15 M",
    opponentName: "Agde",
    venueLabel: CLAVEL,
  },
  assignments: { scorer: null, timekeeper: slot(PEOPLE.camille, ["Seniors F"]), clubDelegate: slot(PEOPLE.nathan, ["Seniors 1 M"]), referee: null },
  refereeNotNeeded: true,
  hasConflict: false,
};

/** Après « Choisir » : même match, marqueur affecté. */
export const TABLE_MATCH_ASSIGNED: TableAssignmentsForMatchDto = {
  ...TABLE_MATCH,
  assignments: { ...TABLE_MATCH.assignments, scorer: slot(PEOPLE.hugo, ["U17 M"]) },
};

/** Les autres matchs à domicile de la journée (pour le résumé chiffré réel). */
export const OTHER_TABLE_MATCHES: TableAssignmentsForMatchDto[] = WEEKEND_HOME.filter((m) => m.id !== TABLE_MATCH.match.id).map((m, i) => ({
  match: { id: m.id, numero: m.numero, matchDatetime: m.matchDatetime, teamName: m.teamName, opponentName: m.opponentName, venueLabel: m.venueLabel },
  assignments: {
    scorer: slot(PEOPLE.ines, ["U18 F"]),
    timekeeper: i === 2 ? null : slot(PEOPLE.theo, ["U17 M"]),
    clubDelegate: slot(PEOPLE.manon, ["Seniors F"]),
    referee: null,
  },
  refereeNotNeeded: true,
  hasConflict: false,
}));

const candidate = (licencie: TableSuggestionCandidateDto["licencie"], teams: string[], c: Partial<TableSuggestionCandidateDto>): TableSuggestionCandidateDto => ({
  licencie,
  teams: teams.map(team),
  eligibility: "RECOMMENDED",
  priorityTier: "AVAILABLE_OTHER",
  score: 0,
  reasons: [],
  seasonAssignmentCount: 0,
  sameDayAssignmentCount: 0,
  isCurrentHolder: false,
  ...c,
});

/** Libellés au format des raisons renvoyées par le moteur de suggestions (club-manager-api). */
export const SUGGESTIONS = {
  recommended: [
    candidate(PEOPLE.hugo, ["U17 M"], {
      priorityTier: "ADJACENT_NEXT_HOME",
      score: 92,
      seasonAssignmentCount: 1,
      reasons: [
        { code: "NEXT_HOME_MATCH", label: "Joue juste après, à 16:00, à domicile" },
        { code: "SAME_VENUE", label: "Même salle : Gymnase Maurice Clavel" },
        { code: "SEASON_DUTY_COUNT", label: "1 table cette saison" },
      ],
    }),
    candidate(PEOPLE.lea, ["U11 M"], {
      priorityTier: "ADJACENT_PREVIOUS_HOME",
      score: 81,
      seasonAssignmentCount: 2,
      reasons: [
        { code: "PREVIOUS_HOME_MATCH", label: "Son équipe joue juste avant, à 10:00, même salle" },
        { code: "SEASON_DUTY_COUNT", label: "2 tables cette saison" },
      ],
    }),
  ],
  available: [
    candidate(PEOPLE.manon, ["Seniors F"], {
      eligibility: "POTENTIALLY_AVAILABLE",
      score: 40,
      seasonAssignmentCount: 5,
      reasons: [{ code: "SEASON_DUTY_COUNT", label: "5 tables cette saison" }],
    }),
  ],
  unavailable: [
    { licencie: PEOPLE.ines, teams: [team("U18 F")], eligibility: "UNAVAILABLE", reasonCode: "MATCH_CONFLICT", reason: "Joue à 17:00 à Béziers (U18 F) — départ avant la fin", conflictingMatchId: WEEKEND_AWAY[0].id },
    { licencie: PEOPLE.camille, teams: [team("Seniors F")], eligibility: "UNAVAILABLE", reasonCode: "ALREADY_ASSIGNED_ON_MATCH", reason: "Déjà chronométreur sur ce match", conflictingMatchId: null },
  ] satisfies TableUnavailableCandidateDto[],
};

/* ── Fiche joueur : Hugo Bernard, U17 M ──────────────────────────────── */

export const PLAYER = {
  firstName: "Hugo",
  lastName: "Bernard",
  team: "U17 M",
  licenseNumber: "VT870412",
};

const pm = (date: string, opponentName: string, isHome: boolean, scoreHome: number, scoreAway: number, jersey: string, s: [number, number, number, number, number, number, number]): LicencieMatchDto => ({
  matchId: uuid(),
  numero: null,
  matchDatetime: date,
  isHome,
  opponentName,
  scoreHome,
  scoreAway,
  status: "played",
  jerseyNumber: jersey,
  isCaptain: true,
  isStarter: true,
  stats: { secondsPlayed: s[0], points: s[1], threePointsMade: s[2], twoPointsInteriorMade: s[3], twoPointsExteriorMade: s[4], freeThrowsMade: s[5], foulsCommitted: s[6] },
});

/** Du plus récent au plus ancien, comme la fiche réelle. */
export const PLAYER_MATCHES: LicencieMatchDto[] = [
  pm("2026-10-03T14:00:00Z", "Agde", false, 58, 64, "7", [1712, 21, 3, 4, 1, 3, 2]),
  pm("2026-09-26T14:00:00Z", "Lattes", true, 71, 55, "7", [1580, 17, 2, 3, 2, 1, 3]),
  pm("2026-09-19T13:00:00Z", "Frontignan La Peyrade", false, 60, 62, "7", [1835, 24, 4, 3, 2, 2, 1]),
  pm("2026-06-07T12:00:00Z", "Béziers", true, 66, 49, "7", [1402, 12, 1, 3, 0, 3, 4]),
  pm("2026-05-31T14:00:00Z", "Mèze", false, 52, 57, "7", [1655, 15, 1, 4, 1, 1, 2]),
  pm("2026-05-24T14:00:00Z", "Lunel", true, 63, 50, "7", [1510, 9, 0, 3, 0, 3, 3]),
];
