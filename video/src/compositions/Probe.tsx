import { useLayoutEffect, useState } from "react";
import { AbsoluteFill } from "remotion";
import { ProductShell } from "../components/ProductShell";
import { DashboardPage } from "../scenes/S03Dashboard";
import { MatchesPage } from "../scenes/S04Matches";
import { TablesPage, TB } from "../scenes/S05Tables";
import { PlayerPage } from "../scenes/S06Player";

/**
 * Outil de calage caméra : rend une page de l'app au repos (caméra
 * identité) et journalise la position des éléments ciblés par la caméra et
 * le curseur. `npx remotion still src/index.ts Probe --props='{"page":"tables"}' --log=verbose`.
 */
export type ProbeProps = { page: "dashboard" | "matches" | "tables" | "sheet" | "player" };

const TARGETS: Record<ProbeProps["page"], Record<string, string>> = {
  dashboard: { navMatchs: 'aside nav a[href$="/matchs"]', stats: 'section[aria-label="Indicateurs"]', results: "ul.grid" },
  matches: { u15Tile: "[data-agenda] > div > section:nth-of-type(1) li:nth-child(2)", agenda: "[data-agenda]" },
  tables: { tablesCard: "[data-u15]", scorerSlot: "[data-u15] > div > div.grid > div:nth-child(1)", choose: "[data-u15] > div > div.grid > div:nth-child(1) button" },
  sheet: { sheet: '#overlay-root [role="dialog"] > div', hugoChoose: '[data-candidate="0"] button' },
  player: { avatar: "header > div:first-child", playerTable: "table" },
};

export function Probe({ page }: ProbeProps) {
  const [marks, setMarks] = useState<Array<{ name: string; x: number; y: number; w: number; h: number } | { name: string; missing: true }>>([]);
  useLayoutEffect(() => {
    setMarks(
      Object.entries(TARGETS[page]).map(([name, sel]) => {
        const r = document.querySelector(sel)?.getBoundingClientRect();
        return r ? { name, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) } : { name, missing: true as const };
      }),
    );
  }, [page]);
  const frame = page === "sheet" ? TB.loaded + 60 : 100000;
  const pages = {
    dashboard: { path: "/dashboard", node: <DashboardPage frame={frame} start={0} /> },
    matches: { path: "/matchs", node: <MatchesPage frame={frame} start={0} /> },
    tables: { path: "/tables", node: <TablesPage frame={page === "tables" ? TB.sheetOpen - 10 : frame} start={0} /> },
    sheet: { path: "/tables", node: <TablesPage frame={frame} start={0} /> },
    player: { path: "/joueurs/x", node: <PlayerPage frame={frame} start={0} /> },
  };
  return (
    <AbsoluteFill className="film">
      <div style={{ position: "absolute", inset: 0, transform: "translate3d(0,0,0)" }}>
        <ProductShell pathname={pages[page].path}>
          <div style={{ position: "relative", flex: 1 }}>
            <div style={{ position: "absolute", inset: 0 }}>{pages[page].node}</div>
          </div>
        </ProductShell>
      </div>
      {marks.map((m, i) =>
        "missing" in m ? (
          <div key={m.name} style={{ position: "absolute", left: 10, top: 10 + i * 30, background: "red", color: "#fff", font: "18px monospace" }}>{m.name} introuvable</div>
        ) : (
          <div key={m.name}>
            <div style={{ position: "absolute", left: m.x - m.w / 2, top: m.y - m.h / 2, width: m.w, height: m.h, outline: "2px solid magenta" }} />
            <div style={{ position: "absolute", left: m.x, top: m.y, background: "magenta", color: "#fff", font: "16px monospace", padding: 2, zIndex: 99 }}>{`${m.name} ${m.x},${m.y} ${m.w}x${m.h}`}</div>
          </div>
        ),
      )}
    </AbsoluteFill>
  );
}
