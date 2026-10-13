import type { TrainingResponseValue, TrainingSeriesDto } from "@/lib/api/teamLife";

/** Libellés et dates de la Vie d'équipe (fuseau du club, jamais celui de l'appareil). */

export const RESPONSE_LABELS: Record<TrainingResponseValue, { label: string; feminine: string }> = {
  PRESENT: { label: "Présent", feminine: "Présente" },
  ABSENT: { label: "Absent", feminine: "Absente" },
  UNCERTAIN: { label: "Incertain", feminine: "Incertaine" },
};

export const RESPONSE_ORDER: TrainingResponseValue[] = ["PRESENT", "ABSENT", "UNCERTAIN"];

/** Libellé neutre (« Présent·e ») : le sexe du licencié n'est pas connu ici, jamais deviné depuis le prénom. */
export function responseLabel(value: TrainingResponseValue): string {
  return value === "PRESENT" ? "Présent·e" : value === "ABSENT" ? "Absent·e" : "Incertain·e";
}

/** 0 = dimanche … 6 = samedi (même convention que l'API). */
export const WEEKDAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;
/** Ordre d'affichage d'une semaine de club : lundi d'abord. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function fmt(iso: string, timezone: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleString("fr-FR", { timeZone: timezone, ...options });
}

/** « 19:00 » */
export function timeOf(iso: string, timezone: string): string {
  return fmt(iso, timezone, { hour: "2-digit", minute: "2-digit" });
}

/** « mardi 14 oct. » */
export function dayOf(iso: string, timezone: string): string {
  return fmt(iso, timezone, { weekday: "long", day: "numeric", month: "short" });
}

/** « mardi » (aujourd'hui / demain quand c'est le cas). */
export function relativeDay(iso: string, timezone: string, now: Date = new Date()): string {
  const key = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const target = key(new Date(iso));
  if (target === key(now)) return "aujourd'hui";
  if (target === key(new Date(now.getTime() + 86_400_000))) return "demain";
  return fmt(iso, timezone, { weekday: "long", day: "numeric", month: "short" });
}

/** « Mardi 19:00–20:30 » d'un créneau récurrent. */
export function seriesLabel(series: Pick<TrainingSeriesDto, "weekday" | "startTime" | "endTime">): string {
  return `${WEEKDAYS[series.weekday]} ${series.startTime}–${series.endTime}`;
}

export function locationLabel(location: { label: string | null; address: string | null }): string | null {
  return location.label ?? location.address ?? null;
}

/** « 30 juin 2027 » depuis « 2027-06-30 ». */
export function formatDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Fin de saison (30 juin) de la saison qui contient `todayKey` (saison d'août à juin). */
export function seasonEndKey(todayKey: string): string {
  const [y, m] = todayKey.split("-").map(Number) as [number, number];
  return `${m >= 7 ? y + 1 : y}-06-30`;
}

/** Date calendaire locale (« AAAA-MM-JJ ») d'un instant. */
export function dateKeyOf(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** « 18 présents · 2 absents · 1 incertain · 4 sans réponse » (les zéros sont omis, sauf tout à zéro). */
export function countsSummary(counts: { present: number; absent: number; uncertain: number; noResponse: number }): string {
  const parts = [
    counts.present ? `${counts.present} présent${counts.present > 1 ? "s" : ""}` : null,
    counts.absent ? `${counts.absent} absent${counts.absent > 1 ? "s" : ""}` : null,
    counts.uncertain ? `${counts.uncertain} incertain${counts.uncertain > 1 ? "s" : ""}` : null,
    counts.noResponse ? `${counts.noResponse} sans réponse` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Aucun joueur dans l'effectif";
}

/** « U15 (F) » — même règle que ball-manager-back (`formatTeamNameWithGender`). */
export function teamDisplayName(team: { name: string; sexe: "M" | "F" | null }): string {
  if (team.sexe !== "M" && team.sexe !== "F") return team.name;
  if (new RegExp(`(^|\\s)${team.sexe}$`).test(team.name.trim())) return team.name;
  return `${team.name} (${team.sexe})`;
}

/** « U15 (F) contre Agde » (adversaire inconnu : l'équipe seule). */
export function matchTitle(match: { team: { name: string }; opponent: string | null }): string {
  return match.opponent ? `${match.team.name} contre ${match.opponent}` : match.team.name;
}

/** « Sam. 10 oct. · 18:00 » ; date inconnue : « Date à confirmer ». */
export function shortDateTime(iso: string | null, timezone: string): string {
  if (!iso) return "Date à confirmer";
  const day = new Date(iso).toLocaleDateString("fr-FR", { timeZone: timezone, weekday: "short", day: "numeric", month: "short" });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${timeOf(iso, timezone)}`;
}

/** « 11 disponibles · 1 indisponible · 2 sans réponse » (zéros omis). */
export function availabilitySummary(c: { available: number; unavailable: number; uncertain: number; noResponse: number }): string {
  const parts = [
    c.available ? `${c.available} disponible${c.available > 1 ? "s" : ""}` : null,
    c.unavailable ? `${c.unavailable} indisponible${c.unavailable > 1 ? "s" : ""}` : null,
    c.uncertain ? `${c.uncertain} incertain${c.uncertain > 1 ? "s" : ""}` : null,
    c.noResponse ? `${c.noResponse} sans réponse` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Aucun joueur dans l'effectif";
}

/** « 10 convoqués · 7 confirmés · 1 refus · 2 en attente ». */
export function convocationSummary(c: { convoked: number; confirmed: number; declined: number; pending: number }): string {
  return [
    `${c.convoked} convoqué${c.convoked > 1 ? "s" : ""}`,
    c.confirmed ? `${c.confirmed} confirmé${c.confirmed > 1 ? "s" : ""}` : null,
    c.declined ? `${c.declined} refus` : null,
    c.pending ? `${c.pending} en attente` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
