/**
 * Petits utilitaires de date dans le fuseau D'UN CLUB (`club.timezone`),
 * pour la vue "par journée" du module Tables de marque — "journée" au sens
 * basket (une journée de championnat = tout le week-end, samedi + dimanche,
 * pas un seul jour calendaire ; retour du club, 2026-09-28 : "au lieu de
 * fonctionner par jour, fonctionne par journée (1 journée = semaine
 * weekend)"). Même technique DST-safe (double conversion) que
 * `computeDayRange`/`zonedWallTimeToUtc` côté ball-manager-back
 * (src/util/timezone.ts) — jamais une approximation en UTC pur ni un
 * `+24h`/`+48h` codé en dur.
 */

function zonedWallTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, second: number, timezone: string): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utcGuess);

  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const readAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));

  const offsetMs = utcGuess.getTime() - readAsUtc;
  return new Date(utcGuess.getTime() + offsetMs);
}

/** Date calendaire ("YYYY-MM-DD") du jour actuel, telle que vue dans `timezone` — jamais celle du serveur (UTC sur Vercel). */
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  // "en-CA" formate directement en YYYY-MM-DD, évite de réassembler les parts à la main.
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDaysToDateString(dateStr: string, delta: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + delta));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** 0 (dimanche) à 6 (samedi) pour une date calendaire — arithmétique pure, jamais d'heure murale ici (pas de risque DST). */
function weekdayOf(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Samedi de LA journée en cours (si on est déjà samedi ou dimanche) ou de la
 * PROCHAINE (sinon) — ancre par défaut de la vue Tables de marque. Toujours
 * un samedi : `weekendRangeForSaturday` s'appuie sur cette invariante.
 */
export function currentOrNextWeekendSaturday(timezone: string, now: Date = new Date()): string {
  const today = todayInTimezone(timezone, now);
  const weekday = weekdayOf(today); // 0 = dimanche ... 6 = samedi
  if (weekday === 6) return today;
  if (weekday === 0) return addDaysToDateString(today, -1);
  return addDaysToDateString(today, 6 - weekday);
}

/** Fenêtre `[from, to)` en UTC du week-end (samedi 00:00 -> lundi 00:00) dont `saturdayDateStr` est le samedi, dans `timezone`. Bornes recalculées indépendamment (jamais `start + 48h`, un changement d'heure peut tomber ce week-end-là). */
export function weekendRangeForSaturday(saturdayDateStr: string, timezone: string): { from: string; to: string } {
  const [satYear, satMonth, satDay] = saturdayDateStr.split("-").map(Number);
  const mondayDateStr = addDaysToDateString(saturdayDateStr, 2);
  const [monYear, monMonth, monDay] = mondayDateStr.split("-").map(Number);

  const start = zonedWallTimeToUtc(satYear, satMonth, satDay, 0, 0, 0, timezone);
  const end = zonedWallTimeToUtc(monYear, monMonth, monDay, 0, 0, 0, timezone);
  return { from: start.toISOString(), to: end.toISOString() };
}

function dayAndMonth(dateStr: string): { day: string; month: string } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12)); // midi : jamais de bascule de jour DST dans le formatage lui-même.
  return {
    day: d.toLocaleDateString("fr-FR", { timeZone: "UTC", day: "numeric" }),
    month: d.toLocaleDateString("fr-FR", { timeZone: "UTC", month: "long" }),
  };
}

/** "Week-end du 3 au 4 octobre" (ou "du 31 octobre au 1 novembre" à cheval sur 2 mois). */
export function formatWeekendLabel(saturdayDateStr: string): string {
  const sundayDateStr = addDaysToDateString(saturdayDateStr, 1);
  const sat = dayAndMonth(saturdayDateStr);
  const sun = dayAndMonth(sundayDateStr);
  const range = sat.month === sun.month ? `${sat.day} au ${sun.day} ${sun.month}` : `${sat.day} ${sat.month} au ${sun.day} ${sun.month}`;
  return `Week-end du ${range}`;
}

/**
 * Vrai si `value` est un identifiant de fuseau IANA reconnu par le runtime
 * (« Europe/Paris »). Un fuseau inconnu ferait lever un `RangeError` à
 * chaque `Intl.DateTimeFormat` des pages Tables/Dérogations du club.
 */
export function isValidTimezone(value: string): boolean {
  return Intl.supportedValuesOf("timeZone").includes(value);
}
