import { sec } from "../theme";

/**
 * Minutage global du film (frames à 30 i/s), aligné sur le storyboard :
 * 01 Chaos 0–6 s · 02 Logo 6–10 s · 03 Dashboard 10–17 s · 04 Matchs 17–24 s
 * 05 Tables 24–34 s · 05b Dérogations (mobile → desktop) 34–46 s · 06 Joueur 46–53 s
 * 07 Connecté 53–60 s · 08 Fin 60–67 s.
 */
export const T = {
  total: sec(67),
  logo: { in: 176, wordmark: 194, club: 214, outil: 230, out: 262, flyStart: 270, flyEnd: 300 },
  product: { in: 250, clear: 296 },
  dashboard: { start: 296, end: 520 },
  matches: { navClick: 508, start: 516, end: 732 },
  tables: { start: 726, end: 1030 },
  derog: { start: 1030, end: 1390 },
  player: { start: 1384, end: 1600 },
  connected: { start: 1592, end: 1806 },
  end: { start: 1800 },
} as const;
