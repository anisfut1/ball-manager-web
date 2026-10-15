import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { FileSpreadsheet, FileText, Mail, MessageCircle, PhoneMissed, Globe } from "lucide-react";
import { springAt, tween } from "../lib/motion";
import { theme } from "../theme";

/**
 * SCÈNE 01 — LE CHAOS (0 → ~6 s).
 * Ce que vit un responsable de club AVANT Ball Manager : messageries,
 * tableurs, sites fédéraux, PDF e-Marque, mails de dérogation… Ces fenêtres
 * ne sont PAS Ball Manager : volontairement génériques (aucun logo tiers),
 * elles s'empilent de plus en plus vite, se figent (silence), puis sont
 * aspirées vers le centre, d'où naît le logo (scène 02).
 */
export const CHAOS = { freeze: 138, suckStart: 146, suckEnd: 178 } as const;

/* ── Chrome de fenêtre générique ─────────────────────────────────────── */

function Win({ title, icon, tint, width, children }: { title: string; icon: ReactNode; tint: string; width: number; children: ReactNode }) {
  return (
    <div style={{ width, borderRadius: 14, background: "#fff", border: "1px solid rgb(23 23 26 / 0.1)", boxShadow: "0 1px 0 #fff inset, 0 24px 60px -24px rgb(23 23 26 / 0.35), 0 4px 12px rgb(23 23 26 / 0.06)", overflow: "hidden", fontFamily: theme.fonts.sans, color: theme.colors.ink }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: 38, padding: "0 14px", borderBottom: "1px solid rgb(23 23 26 / 0.07)", background: "#FBFAF8" }}>
        <span style={{ display: "flex", gap: 6 }}>
          {["#E5E3DD", "#E5E3DD", "#E5E3DD"].map((c, i) => (
            <span key={i} style={{ width: 10, height: 10, borderRadius: 9, background: c }} />
          ))}
        </span>
        <span style={{ display: "inline-flex", color: tint, marginLeft: 6 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 550, color: "#5E5D57", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

const bubble = (mine: boolean): CSSProperties => ({
  alignSelf: mine ? "flex-end" : "flex-start",
  maxWidth: "82%",
  padding: "8px 12px",
  borderRadius: 12,
  fontSize: 14,
  lineHeight: 1.35,
  background: mine ? "#DCF4E3" : "#F1F0EC",
});

function Chat({ title, lines }: { title: string; lines: Array<[string, string, boolean?]> }) {
  return (
    <Win title={title} icon={<MessageCircle size={15} />} tint="#1E9E5A" width={400}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14, background: "#FAF9F6" }}>
        {lines.map(([who, text, mine], i) => (
          <div key={i} style={bubble(Boolean(mine))}>
            {!mine ? <div style={{ fontSize: 11.5, fontWeight: 600, color: "#1E9E5A", marginBottom: 2 }}>{who}</div> : null}
            {text}
          </div>
        ))}
      </div>
    </Win>
  );
}

function Sheet({ title, rows, width = 560 }: { title: string; rows: string[][]; width?: number }) {
  return (
    <Win title={title} icon={<FileSpreadsheet size={15} />} tint="#1F7A45" width={width}>
      <div style={{ display: "grid", gridTemplateColumns: `36px repeat(${rows[0].length}, 1fr)`, fontSize: 12.5, fontFamily: theme.fonts.data }}>
        <span style={{ background: "#F1F0EC", borderRight: "1px solid #E6E4DE", borderBottom: "1px solid #E6E4DE" }} />
        {rows[0].map((_, c) => (
          <span key={c} style={{ background: "#F1F0EC", textAlign: "center", padding: "4px 0", color: "#807E76", borderRight: "1px solid #E6E4DE", borderBottom: "1px solid #E6E4DE" }}>
            {String.fromCharCode(65 + c)}
          </span>
        ))}
        {rows.map((row, r) => (
          <Row key={r} r={r} row={row} />
        ))}
      </div>
    </Win>
  );
}

function Row({ r, row }: { r: number; row: string[] }) {
  return (
    <>
      <span style={{ background: "#F1F0EC", textAlign: "center", padding: "6px 0", color: "#807E76", borderRight: "1px solid #E6E4DE", borderBottom: "1px solid #EEECE7" }}>{r + 1}</span>
      {row.map((cell, c) => {
        const alert = cell.includes("?");
        return (
          <span key={c} style={{ padding: "6px 8px", borderRight: "1px solid #EEECE7", borderBottom: "1px solid #EEECE7", whiteSpace: "nowrap", overflow: "hidden", fontWeight: r === 0 ? 600 : 400, background: alert ? "#FCE7E3" : r === 0 ? "#FAF9F6" : "#fff", color: alert ? "#C2331F" : theme.colors.ink }}>
            {cell}
          </span>
        );
      })}
    </>
  );
}

function Federation() {
  const rows = [
    ["Sam 10/10", "14:00", "SC Sète", "Agde"],
    ["Sam 10/10", "16:00", "SC Sète", "Castelnau 2"],
    ["Sam 10/10", "17:00", "Béziers", "SC Sète"],
  ];
  return (
    <Win title="Calendrier FFBB — Journée 4" icon={<Globe size={15} />} tint="#2563A8" width={480}>
      <div style={{ padding: "6px 16px 12px" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "84px 56px 1fr", alignItems: "center", gap: 10, fontSize: 16, padding: "10px 0", borderTop: i ? "1px solid #EEECE7" : undefined }}>
            <span style={{ color: "#807E76", fontSize: 14 }}>{r[0]}</span>
            <span style={{ fontFamily: theme.fonts.data, fontWeight: 600 }}>{r[1]}</span>
            <span>
              <b style={{ fontWeight: 650 }}>{r[2]}</b> <span style={{ color: "#807E76" }}>vs</span> <b style={{ fontWeight: 650 }}>{r[3]}</b>
            </span>
          </div>
        ))}
      </div>
    </Win>
  );
}

function Toast({ icon, title, text, tint }: { icon: ReactNode; title: string; text: string; tint: string }) {
  return (
    <div style={{ width: 360, display: "flex", gap: 12, padding: "12px 14px", borderRadius: 16, background: "rgb(255 255 255 / 0.96)", border: "1px solid rgb(23 23 26 / 0.08)", boxShadow: "0 18px 40px -18px rgb(23 23 26 / 0.4)", fontFamily: theme.fonts.sans }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${tint}1A`, color: tint, flexShrink: 0 }}>{icon}</span>
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 650, color: theme.colors.ink }}>{title}</span>
        <span style={{ fontSize: 13, color: "#5E5D57", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{text}</span>
      </span>
    </div>
  );
}

/* ── Éléments « basket » lisibles en une seconde (V2) ─────────────────── */

/** Feuille de match papier : score, quart-temps, cases de la table de marque. */
function MatchSheet() {
  const quarters = [
    ["Q1", "14", "18"],
    ["Q2", "16", "12"],
    ["Q3", "11", "19"],
    ["Q4", "17", "15"],
  ];
  return (
    <Win title="Feuille de match — U17 M · J3" icon={<FileText size={15} />} tint="#C2331F" width={560}>
      <div style={{ padding: "16px 20px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.04em" }}>SC SÈTE</span>
          <span style={{ fontFamily: theme.fonts.data, fontSize: 54, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1 }}>58 – 64</span>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", textAlign: "right" }}>AGDE</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", border: "1px solid #E6E4DE", borderRadius: 8, overflow: "hidden", fontFamily: theme.fonts.data }}>
          {quarters.map(([q, a, b]) => (
            <div key={q} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 0", borderRight: "1px solid #EEECE7", fontSize: 15 }}>
              <span style={{ fontSize: 11, color: "#807E76", letterSpacing: "0.1em" }}>{q}</span>
              <span>
                {a} – {b}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, fontSize: 13 }}>
          {["Marqueur", "Chronométreur", "Arbitre"].map((r) => (
            <div key={r} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ color: "#807E76" }}>{r}</span>
              <span style={{ height: 22, borderBottom: "1.5px dashed #C9C6BE", color: "#C2331F", fontWeight: 600 }}>{r === "Marqueur" ? "???" : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </Win>
  );
}

/** Fiche stats d'un joueur (tableur exporté à la main). */
function PlayerStats() {
  return (
    <Win title="stats_joueurs_2026.xlsx" icon={<FileSpreadsheet size={15} />} tint="#1F7A45" width={430}>
      <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ width: 64, height: 64, borderRadius: 64, background: "#F1F0EC", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: theme.fonts.data, fontSize: 26, fontWeight: 600 }}>#7</span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          <span style={{ fontSize: 18, fontWeight: 650 }}>Hugo Bernard · U17 M</span>
          <span style={{ fontSize: 14, color: "#807E76" }}>vs Agde — à recopier depuis la feuille</span>
        </span>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontFamily: theme.fonts.data, fontSize: 40, fontWeight: 600, lineHeight: 1 }}>21</span>
          <span style={{ fontSize: 12, color: "#807E76", letterSpacing: "0.1em" }}>PTS</span>
        </span>
      </div>
    </Win>
  );
}

/** Tracé de terrain en fond : le basket se lit avant le moindre mot. */
function FullCourt() {
  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }} aria-hidden>
      <g fill="none" stroke="rgb(23 23 26 / 0.09)" strokeWidth="3">
        <rect x="90" y="110" width="1740" height="860" rx="6" />
        <line x1="960" y1="110" x2="960" y2="970" />
        <circle cx="960" cy="540" r="120" />
        <rect x="90" y="400" width="300" height="280" />
        <rect x="1530" y="400" width="300" height="280" />
        <path d="M90 170 H230 A420 420 0 0 1 230 910 H90" />
        <path d="M1830 170 H1690 A420 420 0 0 0 1690 910 H1830" />
        <circle cx="390" cy="540" r="90" />
        <circle cx="1530" cy="540" r="90" />
      </g>
    </svg>
  );
}

/* ── Programme d'apparition : 5 éléments lisibles, puis l'emballement ── */

type Item = { at: number; x: number; y: number; tilt: number; scale: number; node: ReactNode };

const ITEMS: Item[] = [
  { at: 6, x: 610, y: 380, tilt: -1, scale: 1.4, node: <MatchSheet /> },
  { at: 30, x: 1420, y: 330, tilt: 1.2, scale: 1.35, node: <Chat title="Parents U15 M" lines={[["Sophie", "Qui tient la table samedi à 14h ?"], ["Karim", "Pas moi, je joue à 16h"], ["Moi", "Je regarde le planning…", true]]} /> },
  { at: 52, x: 1270, y: 790, tilt: -0.8, scale: 1.3, node: <Sheet title="planning_tables_v7_FINAL.xlsx" rows={[["Match", "Marqueur", "Chrono"], ["U15 M – Agde", "???", "Camille"], ["U17 M – Castelnau", "Hugo", "???"], ["Seniors F – Pézenas", "???", "???"]]} /> },
  { at: 72, x: 560, y: 800, tilt: 0.8, scale: 1.3, node: <Federation /> },
  { at: 92, x: 1000, y: 210, tilt: -1.4, scale: 1.3, node: <PlayerStats /> },
  { at: 110, x: 1610, y: 110, tilt: 0, scale: 1.2, node: <Toast icon={<MessageCircle size={17} />} tint="#1E9E5A" title="Coach U17 M" text="On joue à quelle heure finalement ?" /> },
  { at: 118, x: 300, y: 120, tilt: 0, scale: 1.2, node: <Toast icon={<PhoneMissed size={17} />} tint="#C2331F" title="Appel manqué" text="Président — 3 appels" /> },
  { at: 124, x: 1650, y: 980, tilt: 0, scale: 1.2, node: <Toast icon={<Mail size={17} />} tint="#2563A8" title="Comité départemental" text="Dérogation U18 F : réponse avant vendredi" /> },
];

/** Instants d'apparition (le design sonore pose une notification sur chacun). */
export const CHAOS_BEATS = ITEMS.map((item) => item.at);

export function S01Chaos({ frame }: { frame: number }) {
  // Tension : la caméra se resserre à mesure que tout s'empile.
  const push = 1 + tween(frame, [0, CHAOS.freeze], [0, 0.05], theme.ease.soft);
  // Silence : tout se fige et se désature.
  const silence = tween(frame, [CHAOS.freeze, CHAOS.freeze + 8], [0, 1], theme.ease.out);

  return (
    <AbsoluteFill style={{ background: theme.colors.stone, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: tween(frame, [0, 20], [0, 1]) * (1 - tween(frame, [CHAOS.suckStart, CHAOS.suckEnd], [0, 1])) }}>
        <FullCourt />
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${push})`, filter: silence > 0 ? `saturate(${1 - silence * 0.85})` : undefined }}>
        {ITEMS.map((item, i) => {
          const p = springAt(frame, item.at, theme.spring.ui);
          if (p <= 0.001) return null;
          // Le dernier arrivé est le point focal : les précédents reculent (profondeur, atténuation).
          const later = ITEMS.filter((o) => o.at > item.at && frame >= o.at + 4).length;
          const depth = Math.min(1, later);
          // Aspiration vers le centre, les plus lointaines d'abord.
          const dist = Math.hypot(item.x - 960, item.y - 540);
          const delay = Math.round((1 - dist / 1100) * 10);
          const suck = tween(frame, [CHAOS.suckStart + delay * 0.6, CHAOS.suckEnd - 2], [0, 1], theme.ease.inOut);
          const x = item.x + (960 - item.x) * suck;
          const y = item.y + (540 - item.y) * suck;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                zIndex: i,
                whiteSpace: "pre-line",
                opacity: Math.min(1, p * 1.6) * (1 - tween(suck, [0.7, 1], [0, 1])),
                transform: `translate(-50%, -50%) translate3d(0, ${(1 - p) * 30}px, 0) scale(${item.scale * (0.94 + 0.06 * p) * (1 - 0.06 * depth) * (1 - suck * 0.95)}) rotate(${item.tilt * (1 - suck)}deg)`,
                filter: `blur(${(1 - Math.min(1, p)) * 6 + depth * 1.2 + suck * 10}px) brightness(${1 - depth * 0.05}) saturate(${1 - depth * 0.35})`,
              }}
            >
              {item.node}
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
