import { makeCamera } from "./camera";
import { T } from "./timeline";
import { TB } from "../scenes/S05Tables";
import { DG } from "../scenes/S05bDerogations";
import { HUB } from "../scenes/S07Connected";

/**
 * Repères mesurés dans l'app réelle rendue à 1920×1080 (composition
 * « Probe », voir README) — coordonnées scène, caméra au repos.
 */
export const ANCHORS = {
  navMatchs: { x: 120, y: 182 },
  stats: { x: 1092, y: 316 },
  results: { x: 900, y: 600 },
  u15Tile: { x: 928, y: 562 },
  tablesCard: { x: 778, y: 636 },
  choose: { x: 716, y: 592 },
  scorerSlot: { x: 650, y: 600 },
  sheet: { x: 1682, y: 540 },
  hugoChoose: { x: 1844, y: 351 },
  avatar: { x: 612, y: 215 },
  playerTable: { x: 1092, y: 565 },
  inboxCard: { x: 780, y: 420 },
  thread: { x: 1092, y: 420 },
  takeButton: { x: 673, y: 405 },
};
const A = ANCHORS;

/** La piste caméra unique du film (scène → écran). */
export const camera = makeCamera([
  // 02 → 03 : l'interface se pose derrière le logo, à plat à l'atterrissage.
  { f: T.product.in, s: 0.9, rx: 9 },
  { f: T.logo.flyEnd, s: 1, rx: 0 },
  { f: T.dashboard.start + 22 },
  // 03 : plongée vers les indicateurs, puis glisse vers les résultats.
  { f: T.dashboard.start + 110, s: 1.32, cx: A.stats.x, cy: A.stats.y, ry: -3 },
  { f: T.dashboard.start + 170, s: 1.2, cx: A.results.x, cy: A.results.y, ry: -1.5 },
  // Retour au plan large : le curseur ouvre « Matchs » dans la Sidebar.
  { f: T.matches.navClick - 12, s: 1, cx: 960, cy: 540, ry: 0 },
  { f: T.matches.start + 4 },
  // 04 : l'app glisse à droite, la synchro FFBB se raconte à gauche.
  { f: T.matches.start + 30, s: 0.9, cx: 1092, cy: 600, ax: 1340, ay: 600 },
  { f: T.matches.start + 116 },
  // Zoom sur une rencontre synchronisée.
  { f: T.matches.start + 150, s: 1.9, cx: A.u15Tile.x, cy: A.u15Tile.y, ax: 960, ay: 470 },
  { f: T.tables.start - 14 },
  { f: T.tables.start - 1, s: 2.5 },
  // 05 : raccord dans le match → ses Tables de marque.
  { f: T.tables.start, s: 2.1, cx: A.tablesCard.x, cy: A.tablesCard.y, ax: 960, ay: 540 },
  { f: T.tables.start + 34, s: 1.38 },
  { f: TB.sheetOpen - 2 },
  { f: TB.sheetOpen + 22, s: 1.02, cx: A.sheet.x, cy: A.sheet.y, ax: 1650, ay: 540 },
  { f: TB.sheetClose - 2 },
  { f: TB.sheetClose + 22, s: 1.3, cx: A.scorerSlot.x, cy: A.scorerSlot.y, ax: 1320, ay: 540 },
  { f: TB.captionOut + 4 },
  // 05b : l'app desktop s'efface pendant la demande mobile, puis revient côté coordinateur.
  { f: DG.handoff - 1, s: 0.64, cx: 960, cy: 540, ax: 1180, ay: 600, radius: 34, lift: 0.7 },
  { f: DG.thread - 2 },
  { f: DG.thread + 20, s: 0.78, cx: A.thread.x, cy: A.thread.y, ax: 1200, ay: 560 },
  { f: DG.taken + 24 },
  { f: T.player.start - 1, s: 0.92 },
  // 06 : raccord sur l'avatar → la fiche joueur.
  { f: T.player.start, s: 2.2, cx: A.avatar.x, cy: A.avatar.y, ax: 960, ay: 540, radius: 0, lift: 0 },
  { f: T.player.start + 30, s: 1.06, cx: A.playerTable.x, cy: A.playerTable.y, ax: 1330, ay: 560 },
  { f: T.player.end - 34, s: 1.1 },
  { f: T.player.end - 4, s: 1, cx: 960, cy: 540, ax: 960, ay: 540 },
  // 07 : l'app devient un objet au centre, les modules s'y branchent.
  { f: T.connected.start + 34, s: HUB.s, ay: HUB.y, radius: 46, lift: 1 },
  { f: T.connected.start + 156 },
  { f: T.connected.end - 8, s: 1, ay: 540, radius: 0, lift: 0 },
  // 08 : dézoom lent, l'interface s'éteint.
  { f: T.end.start },
  { f: T.total, s: 0.84, rx: 2.5 },
]);
