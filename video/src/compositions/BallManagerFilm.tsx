import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Camera, toScreen } from "../components/Camera";
import { Cursor, type CursorKey } from "../components/Cursor";
import { ProductShell } from "../components/ProductShell";
import { Scrim } from "../components/Caption";
import { Soundtrack } from "../components/Soundtrack";
import { S01Chaos, CHAOS } from "../scenes/S01Chaos";
import { S02Logo } from "../scenes/S02Logo";
import { DASH_FOCUS, DashboardPage } from "../scenes/S03Dashboard";
import { MatchesPage, MATCH_CAPTION_OUT, S04Overlay } from "../scenes/S04Matches";
import { S05Overlay, TablesPage, TB } from "../scenes/S05Tables";
import { DerogationThreadPage, DerogationsInboxPage, DG, S05bOverlay, S05bPhone } from "../scenes/S05bDerogations";
import { PlayerPage, S06Overlay } from "../scenes/S06Player";
import { S07Caption, S07Links, S07Modules, S07Phone } from "../scenes/S07Connected";
import { S08End } from "../scenes/S08End";
import { tween } from "../lib/motion";
import { matchCutBlur, pageSwap } from "../transitions";
import { theme } from "../theme";
import { camera, ANCHORS as A } from "./camera-track";
import { T } from "./timeline";

/* ── Pages de l'app dans le shell persistant ─────────────────────────── */

type PageDef = { key: string; from: number; to: number; path: string; fadeIn?: number; render: (frame: number) => ReactNode };

const PAGES: PageDef[] = [
  { key: "dashboard", from: T.product.in, to: T.dashboard.end, path: "/dashboard", render: (f) => <DashboardPage frame={f} start={T.dashboard.start} focus={DASH_FOCUS} /> },
  {
    key: "matches",
    from: T.matches.start,
    to: T.matches.end,
    path: "/matchs",
    render: (f) => <MatchesPage frame={f} start={T.matches.start} />,
  },
  { key: "tables", from: T.tables.start, to: T.tables.end, path: "/tables", render: (f) => <TablesPage frame={f} start={T.tables.start} /> },
  { key: "derog-inbox", from: DG.handoff, to: DG.thread + 6, path: "/derogations", render: (f) => <DerogationsInboxPage frame={f} /> },
  { key: "derog-thread", from: DG.thread, to: T.player.start + 4, path: "/derogations/demande", render: (f) => <DerogationThreadPage frame={f} /> },
  { key: "player", from: T.player.start, to: T.player.end, path: "/joueurs/hugo-bernard", render: (f) => <PlayerPage frame={f} start={T.player.start} /> },
  { key: "dashboard-2", from: T.player.end, to: T.total + 20, path: "/dashboard", fadeIn: 10, render: (f) => <DashboardPage frame={f} start={-1000} /> },
];

function pathAt(frame: number): string {
  if (frame >= T.player.end) return "/dashboard";
  if (frame >= T.player.start) return "/joueurs/hugo-bernard";
  if (frame >= DG.thread) return "/derogations/demande";
  if (frame >= DG.handoff) return "/derogations";
  if (frame >= T.tables.start) return "/tables";
  if (frame >= T.matches.navClick) return "/matchs";
  return "/dashboard";
}

/** Flou de « raccord » quand la caméra plonge d'un écran à l'autre. */
function productBlur(frame: number): number {
  return tween(frame, [T.product.in, T.product.clear], [18, 0], theme.ease.out) + matchCutBlur(frame, T.tables.start) + matchCutBlur(frame, T.player.start);
}

/* ── Curseurs (coordonnées SCÈNE, converties par la caméra courante) ── */

const CURSORS: Array<{ show: [number, number]; clicks: number[]; path: CursorKey[] }> = [
  { show: [T.matches.navClick - 26, T.matches.navClick + 12], clicks: [T.matches.navClick], path: [{ f: T.matches.navClick - 26, x: 700, y: 420 }, { f: T.matches.navClick - 4, x: A.navMatchs.x, y: A.navMatchs.y }] },
  { show: [T.tables.start - 36, T.tables.start - 4], clicks: [T.tables.start - 16], path: [{ f: T.tables.start - 36, x: A.u15Tile.x + 160, y: A.u15Tile.y + 140 }, { f: T.tables.start - 19, x: A.u15Tile.x + 20, y: A.u15Tile.y + 10 }] },
  { show: [TB.firstClick - 26, TB.firstClick + 12], clicks: [TB.firstClick], path: [{ f: TB.firstClick - 26, x: A.choose.x + 220, y: A.choose.y + 160 }, { f: TB.firstClick - 3, x: A.choose.x, y: A.choose.y }] },
  { show: [TB.secondClick - 28, TB.secondClick + 10], clicks: [TB.secondClick], path: [{ f: TB.secondClick - 28, x: A.hugoChoose.x - 160, y: A.hugoChoose.y + 260 }, { f: TB.secondClick - 3, x: A.hugoChoose.x, y: A.hugoChoose.y }] },
  { show: [DG.openTap - 24, DG.openTap + 8], clicks: [DG.openTap], path: [{ f: DG.openTap - 24, x: A.inboxCard.x + 300, y: A.inboxCard.y + 260 }, { f: DG.openTap - 3, x: A.inboxCard.x, y: A.inboxCard.y }] },
  { show: [DG.takeTap - 26, DG.takeTap + 12], clicks: [DG.takeTap], path: [{ f: DG.takeTap - 26, x: A.takeButton.x + 280, y: A.takeButton.y + 220 }, { f: DG.takeTap - 3, x: A.takeButton.x, y: A.takeButton.y }] },
];

export function BallManagerFilm() {
  const frame = useCurrentFrame();
  const cam = camera(frame);
  const productVisible = frame >= T.product.in;
  // L'app desktop s'efface pendant la demande sur mobile (05b), puis revient côté coordinateur.
  const productOpacity =
    tween(frame, [T.product.in, T.product.in + 26], [0, 1], theme.ease.out) *
    (frame >= DG.swap && frame < DG.handoff + 4 ? 0 : 1) *
    (frame >= DG.handoff + 4 && frame < DG.handoff + 30 ? tween(frame, [DG.handoff + 4, DG.handoff + 24], [0, 1], theme.ease.out) : 1);
  const blur = productBlur(frame);
  const hub = frame >= T.connected.start && frame < T.connected.end;

  return (
    <AbsoluteFill className="film" style={{ background: theme.colors.stone, overflow: "hidden" }}>
      <Soundtrack />
      {/* 01 — chaos (avant l'app) */}
      {frame < CHAOS.suckEnd + 4 ? <S01Chaos frame={frame} /> : null}

      {/* fond de la scène 07 : le terrain, en filigrane */}
      {hub ? <AbsoluteFill className="court-pattern" style={{ opacity: tween(frame, [T.connected.start + 10, T.connected.start + 40], [0, 0.9]) * (1 - tween(frame, [T.connected.end - 40, T.connected.end - 10], [0, 1])) }} /> : null}
      {hub ? <S07Links frame={frame} /> : null}

      {/* L'application réelle, sous la caméra */}
      {productVisible ? (
        <AbsoluteFill style={{ opacity: productOpacity, filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}>
          <Camera cam={cam}>
            <ProductShell pathname={pathAt(frame)} hideBrand={frame < T.logo.flyEnd}>
              <div style={{ position: "relative", flex: 1 }}>
                {PAGES.filter((p) => frame >= p.from && frame < p.to).map((p) => {
                  return (
                    <div key={p.key} style={{ position: "absolute", inset: 0, ...pageSwap(frame, p.to), ...(p.fadeIn ? { opacity: tween(frame, [p.from, p.from + p.fadeIn], [0, 1]) } : {}) }}>
                      {p.render(frame)}
                    </div>
                  );
                })}
              </div>
            </ProductShell>
          </Camera>
        </AbsoluteFill>
      ) : null}

      {/* Habillages écran */}
      <Scrim frame={frame} at={T.matches.start} out={MATCH_CAPTION_OUT} width={1000} />
      <S04Overlay frame={frame} />
      <Scrim frame={frame} at={TB.sheetOpen} out={TB.captionOut} width={1060} />
      <S05Overlay frame={frame} />
      <S05bOverlay frame={frame} />
      <S05bPhone frame={frame} />
      <Scrim frame={frame} at={T.player.start + 18} out={T.player.end - 30} width={960} />
      <S06Overlay frame={frame} />
      {hub ? <S07Modules frame={frame} /> : null}
      {hub ? <S07Phone frame={frame} /> : null}
      {hub ? <S07Caption frame={frame} /> : null}

      {CURSORS.map((c, i) =>
        frame >= c.show[0] && frame <= c.show[1] ? (
          <Cursor
            key={i}
            frame={frame}
            show={c.show}
            clicks={c.clicks}
            path={c.path.map((k) => {
              const [x, y] = toScreen(cam, k.x, k.y);
              return { f: k.f, x, y };
            })}
          />
        ) : null,
      )}

      {/* 02 — logo (au-dessus de tout, s'envole vers la Sidebar) */}
      <S02Logo frame={frame} />

      {/* 08 — fin */}
      <S08End frame={frame} />
    </AbsoluteFill>
  );
}
