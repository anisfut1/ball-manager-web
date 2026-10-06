
/**
 * Minutage global du film (frames à 30 i/s), aligné sur le storyboard :
 * 01 Chaos 0–6 s · 02 Logo 6–10 s · 03 Dashboard 10–17 s · 04 Matchs 17–24 s
 * 05 Tables 24–34 s · 05b Desktop → mobile, puis Dérogations (coach → coordinateur) 34–47.5 s
 * 06 Joueur 47.5–54.5 s · 07 Tout-en-un 54.5–63 s · 08 Fin 63–69.8 s.
 */
export const T = {
  total: 2094,
  logo: { in: 176, wordmark: 194, tagline: 202, taglineOut: 222, club: 226, outil: 236, out: 264, flyStart: 270, flyEnd: 300 },
  product: { in: 250, clear: 296 },
  dashboard: { start: 296, end: 520 },
  matches: { navClick: 508, start: 516, end: 732 },
  tables: { start: 726, end: 1020 },
  derog: { start: 1010, end: 1428 },
  player: { start: 1422, end: 1638 },
  connected: { start: 1630, end: 1890 },
  end: { start: 1884 },
} as const;
