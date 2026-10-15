import { makeCamera } from "./camera";
import { T } from "./timeline";
import { TB } from "../scenes/S05Tables";
import { DG } from "../scenes/S05bDerogations";
import { DASH, DASH_BEATS } from "../scenes/S03Dashboard";
import { MATCH_CAPTION_OUT, MATCH_FOCUS } from "../scenes/S04Matches";
import { ALL_IN_ONE, HUB } from "../scenes/S07Connected";

/**
 * Repères mesurés dans l'app réelle rendue à 1920×1080 (composition
 * « Probe », voir README) — coordonnées scène, caméra au repos.
 */
export const ANCHORS = {
  navMatchs: { x: 120, y: 182 },
  stats: { x: 1092, y: 316 },
  results: { x: 900, y: 600 },
  u15Tile: { x: 882, y: 364 },
  tablesCard: { x: 778, y: 520 },
  choose: { x: 986, y: 530 },
  scorerSlot: { x: 650, y: 600 },
  sheet: { x: 1682, y: 300 },
  hugoChoose: { x: 1833, y: 187 },
  avatar: { x: 612, y: 215 },
  playerTable: { x: 1092, y: 565 },
  inboxCard: { x: 780, y: 322 },
  thread: { x: 1092, y: 326 },
  takeButton: { x: 903, y: 438 },
};
const A = ANCHORS;

/** La piste caméra unique du film (scène → écran). */
export const camera = makeCamera([
  // 02 → 03 : l'interface se pose derrière le logo, à plat à l'atterrissage.
  { f: T.product.in, s: 0.9, rx: 9 },
  { f: T.logo.flyEnd, s: 1, rx: 0 },
  { f: T.dashboard.start + 22 },
  // 03 (V2) : focus 1 — « Cette journée » —, puis focus 2 — un score —, puis plan large.
  { f: DASH_BEATS.focusIn, s: 1 },
  { f: DASH_BEATS.focusIn + 24, s: 2.1, cx: DASH.stat0.x, cy: DASH.stat0.y, ry: -2 },
  { f: DASH_BEATS.toResult - 4 },
  { f: DASH_BEATS.toResult + 22, s: 1.95, cx: DASH.result0.x, cy: DASH.result0.y, ry: -1 },
  { f: DASH_BEATS.focusOut - 6 },
  // Retour au plan large : le curseur ouvre « Matchs » dans la Sidebar.
  { f: T.matches.navClick - 12, s: 1, cx: 960, cy: 540, ry: 0 },
  { f: T.matches.start + 4 },
  // 04 (V2) : la liste à droite, la phrase à gauche ; puis une seule rencontre, en grand.
  { f: T.matches.start + 30, s: 1.15, cx: 882, cy: 520, ax: 1310, ay: 560 },
  { f: MATCH_CAPTION_OUT + 4 },
  { f: MATCH_FOCUS.from + 22, s: 1.9, cx: A.u15Tile.x, cy: A.u15Tile.y, ax: 960, ay: 540 },
  { f: T.tables.start - 14 },
  { f: T.tables.start - 1, s: 2.5 },
  // 05 (V2) : raccord dans le match → sa carte ; puis le panneau, cadré sur les 3 profils.
  { f: T.tables.start, s: 2.1, cx: A.tablesCard.x, cy: A.tablesCard.y, ax: 960, ay: 540 },
  { f: T.tables.start + 34, s: 1.55 },
  { f: TB.sheetOpen - 2 },
  { f: TB.sheetOpen + 22, s: 1.45, cx: A.sheet.x, cy: A.sheet.y, ax: 1480, ay: 500 },
  { f: TB.sheetClose - 2 },
  { f: TB.sheetClose + 22, s: 1.45, cx: A.tablesCard.x, cy: A.tablesCard.y, ax: 1300, ay: 540 },
  { f: TB.captionOut + 4 },
  // 05 → 05b : l'app se pose en « fenêtre », exactement comme le viewport qui va devenir téléphone.
  { f: DG.swap - 2, s: 0.86, cx: 960, cy: 540, ax: 960, ay: 540, radius: 35, lift: 0.7 },
  // 05b : l'app desktop s'efface pendant la demande mobile, puis revient côté coordinateur.
  { f: DG.handoff - 1, s: 0.7, cx: 960, cy: 540, ax: 1190, ay: 620, radius: 34, lift: 0.7 },
  { f: DG.inboxArrive - 6 },
  { f: DG.inboxArrive + 16, s: 0.95, cx: A.inboxCard.x, cy: A.inboxCard.y, ax: 1190, ay: 560 },
  { f: DG.thread - 2 },
  { f: DG.thread + 20, s: 1.0, cx: A.thread.x, cy: A.thread.y, ax: 1250, ay: 600 },
  { f: DG.taken + 24 },
  { f: T.player.start - 1, s: 0.92 },
  // 06 : raccord sur l'avatar → la fiche joueur.
  { f: T.player.start, s: 2.2, cx: A.avatar.x, cy: A.avatar.y, ax: 960, ay: 540, radius: 0, lift: 0 },
  { f: T.player.start + 30, s: 1.06, cx: A.playerTable.x, cy: A.playerTable.y, ax: 1330, ay: 560 },
  { f: T.player.end - 34, s: 1.1 },
  { f: T.player.end - 4, s: 1, cx: 960, cy: 540, ax: 960, ay: 540 },
  // 07 : l'app devient un objet au centre, les modules s'y branchent.
  { f: T.connected.start + 34, s: HUB.s, ay: HUB.y, radius: 46, lift: 1 },
  { f: ALL_IN_ONE.captionOut - 6 },
  { f: T.connected.end - 6, s: 1, ay: 540, radius: 0, lift: 0 },
  // 08 : dézoom lent, l'interface s'éteint.
  { f: T.end.start },
  { f: T.total, s: 0.84, rx: 2.5 },
]);
