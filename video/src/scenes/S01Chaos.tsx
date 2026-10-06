import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { BellRing, FileSpreadsheet, FileText, Mail, MessageCircle, PhoneMissed, Globe, CalendarRange } from "lucide-react";
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
/** Fenêtres agrandies : à l'écran, le chaos doit remplir le cadre et rester lisible. */
const WINDOW_SCALE = 1.3;

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
    ["J4", "10/10", "10:00", "SC Sète – Frontignan"],
    ["J4", "10/10", "14:00", "SC Sète – Agde"],
    ["J4", "10/10", "16:00", "SC Sète – Castelnau 2"],
    ["J4", "10/10", "17:00", "Béziers – SC Sète"],
    ["J4", "11/10", "15:30", "SC Sète – Pézenas"],
  ];
  return (
    <Win title="Site fédéral — Calendrier des rencontres" icon={<Globe size={15} />} tint="#2563A8" width={520}>
      <div style={{ padding: "10px 14px 14px" }}>
        <div style={{ fontSize: 12, color: "#807E76", marginBottom: 8 }}>Compétition › Départementale › Poule B › Journée 4</div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 56px 56px 1fr", gap: 8, fontSize: 13.5, padding: "7px 0", borderTop: "1px solid #EEECE7", fontFamily: i === -1 ? undefined : theme.fonts.sans }}>
            <span style={{ color: "#807E76" }}>{r[0]}</span>
            <span>{r[1]}</span>
            <span style={{ fontWeight: 600 }}>{r[2]}</span>
            <span>{r[3]}</span>
          </div>
        ))}
      </div>
    </Win>
  );
}

function ScoreSheet() {
  return (
    <Win title="feuille_de_match_21042.pdf — e-Marque" icon={<FileText size={15} />} tint="#C2331F" width={430}>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
          <span>ÉQUIPE A</span>
          <span style={{ fontFamily: theme.fonts.data }}>58 – 64</span>
          <span>ÉQUIPE B</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 2 }}>
          {Array.from({ length: 96 }, (_, i) => (
            <span key={i} style={{ height: 13, border: "1px solid #E6E4DE", fontSize: 8.5, fontFamily: theme.fonts.data, display: "flex", alignItems: "center", justifyContent: "center", color: "#5E5D57" }}>
              {(i * 7) % 5 === 0 ? (i % 40) + 2 : ""}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: "#807E76" }}>Marqueur : ____________ · Chrono : ____________</div>
      </div>
    </Win>
  );
}

function MailWin() {
  return (
    <Win title="Boîte de réception — 14 non lus" icon={<Mail size={15} />} tint="#5E5D57" width={470}>
      {[
        ["Comité départemental", "Dérogation U18 F : réponse avant vendredi", true],
        ["Mairie — service des sports", "Créneaux gymnase du Lido modifiés", true],
        ["Coach U13 F", "RE: RE: RE: horaire samedi ??", false],
      ].map(([from, subject, unread], i) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderBottom: "1px solid #EEECE7", fontSize: 13.5 }}>
          <span style={{ width: 8, height: 8, marginTop: 6, borderRadius: 8, background: unread ? theme.colors.accent : "transparent" }} />
          <span style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: unread ? 650 : 450 }}>{from}</span>
            <span style={{ color: "#5E5D57" }}>{subject}</span>
          </span>
        </div>
      ))}
    </Win>
  );
}

function Planning() {
  const blocks = [
    [0, 1, "U11"],
    [0, 3, "U15"],
    [1, 2, "U17"],
    [1, 4, "SF"],
    [2, 0, "U13"],
    [2, 3, "S1"],
    [3, 1, "U18"],
    [3, 2, "?"],
    [4, 4, "S2"],
  ] as const;
  return (
    <Win title="Planning gymnases — semaine 41" icon={<CalendarRange size={15} />} tint="#A15C07" width={500}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gridTemplateRows: "22px repeat(5, 30px)", gap: 4, padding: 12, fontSize: 11.5 }}>
        {["Lun", "Mar", "Mer", "Ven", "Sam"].map((d) => (
          <span key={d} style={{ color: "#807E76", textAlign: "center" }}>
            {d}
          </span>
        ))}
        {blocks.map(([c, r, label], i) => (
          <span key={i} style={{ gridColumn: c + 1, gridRow: r + 2, borderRadius: 6, background: label === "?" ? "#FCE7E3" : ["#E8EEFF", "#FFF1DE", "#E3F4EA"][i % 3], color: label === "?" ? "#C2331F" : "#17171A", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {label}
          </span>
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

function Sticky({ text }: { text: string }) {
  return (
    <div style={{ width: 210, padding: "18px 16px", background: "#FBE7A1", boxShadow: "0 14px 30px -14px rgb(23 23 26 / 0.4)", fontFamily: theme.fonts.sans, fontSize: 19, fontWeight: 600, color: "#3A3320", lineHeight: 1.25 }}>{text}</div>
  );
}

/* ── Programme d'apparition : de plus en plus serré ─────────────────── */

type Item = { at: number; x: number; y: number; tilt: number; node: ReactNode };

const ITEMS: Item[] = [
  { at: 4, x: 230, y: 150, tilt: -1.2, node: <Chat title="Parents U15 M · 38 participants" lines={[["Sophie", "Qui tient la table samedi à 14h ?"], ["Karim", "Pas moi, je bosse"], ["Moi", "Je regarde le planning…", true]]} /> },
  { at: 22, x: 1180, y: 120, tilt: 1, node: <Sheet title="planning_tables_v7_FINAL (2).xlsx" rows={[["Date", "Match", "Marqueur", "Chrono"], ["10/10", "U11 M", "Inès", "Théo"], ["10/10", "U15 M", "???", "Camille"], ["10/10", "U17 M", "Hugo", "???"], ["11/10", "SF", "???", "???"]]} /> },
  { at: 38, x: 640, y: 560, tilt: 0.8, node: <Federation /> },
  { at: 52, x: 140, y: 600, tilt: -0.6, node: <ScoreSheet /> },
  { at: 63, x: 1340, y: 600, tilt: -1, node: <MailWin /> },
  { at: 72, x: 1500, y: 90, tilt: 0, node: <Toast icon={<MessageCircle size={17} />} tint="#1E9E5A" title="Coach U17 M" text="On joue à quelle heure finalement ?" /> },
  { at: 80, x: 880, y: 80, tilt: 1.4, node: <Planning /> },
  { at: 87, x: 80, y: 80, tilt: 0, node: <Toast icon={<BellRing size={17} />} tint="#A15C07" title="Rappel" text="Convocations U13 F à envoyer" /> },
  { at: 93, x: 1460, y: 420, tilt: 0, node: <Toast icon={<PhoneMissed size={17} />} tint="#C2331F" title="Appel manqué" text="Président — 3 appels" /> },
  { at: 98, x: 470, y: 330, tilt: -2, node: <Sticky text={"TABLE U15\n→ ???"} /> },
  { at: 103, x: 980, y: 380, tilt: 0.6, node: <Chat title="Bureau du club" lines={[["Marc", "Dérogation U18 refusée ?"], ["Julie", "Faut relancer le comité"]]} /> },
  { at: 107, x: 60, y: 420, tilt: 0, node: <Toast icon={<MessageCircle size={17} />} tint="#1E9E5A" title="Parents U11 M" text="12 nouveaux messages" /> },
  { at: 111, x: 1250, y: 880, tilt: 0, node: <Toast icon={<FileText size={17} />} tint="#C2331F" title="e-Marque" text="Feuille de match à récupérer" /> },
  { at: 114, x: 300, y: 860, tilt: 0, node: <Toast icon={<Mail size={17} />} tint="#2563A8" title="Comité départemental" text="Arbitre manquant — U11 M" /> },
  { at: 117, x: 760, y: 200, tilt: 1, node: <Sheet title="stats_saison_2026.csv" width={420} rows={[["Joueur", "Pts", "3pts", "LF"], ["Bernard", "98", "11", "13"], ["?", "?", "?", "?"]]} /> },
  { at: 120, x: 1560, y: 260, tilt: 0, node: <Toast icon={<MessageCircle size={17} />} tint="#1E9E5A" title="Sophie" text="Du coup quelqu'un pour la table ??" /> },
  { at: 122, x: 820, y: 860, tilt: 0, node: <Toast icon={<BellRing size={17} />} tint="#A15C07" title="Planning" text="Conflit de créneau — Lido, samedi" /> },
  { at: 124, x: 40, y: 260, tilt: 0, node: <Toast icon={<PhoneMissed size={17} />} tint="#C2331F" title="Appel manqué" text="Coach Seniors F" /> },
  { at: 126, x: 1100, y: 700, tilt: 0, node: <Toast icon={<MessageCircle size={17} />} tint="#1E9E5A" title="Parents U15 M" text="27 nouveaux messages" /> },
];

/** Instants d'apparition (le design sonore pose une notification sur chacun). */
export const CHAOS_BEATS = ITEMS.map((item) => item.at);

export function S01Chaos({ frame }: { frame: number }) {
  // Tension : la caméra se resserre à mesure que tout s'empile.
  const push = 1 + tween(frame, [0, CHAOS.freeze], [0, 0.07], theme.ease.soft);
  // Silence : tout se fige et se désature.
  const silence = tween(frame, [CHAOS.freeze, CHAOS.freeze + 8], [0, 1], theme.ease.out);
  const unread = Math.round(tween(frame, [10, CHAOS.freeze], [3, 147], theme.ease.soft));

  return (
    <AbsoluteFill style={{ background: theme.colors.stone, overflow: "hidden" }}>
      <AbsoluteFill className="court-pattern" style={{ opacity: 0.6 }} />
      <AbsoluteFill style={{ transform: `scale(${push})`, filter: silence > 0 ? `saturate(${1 - silence * 0.85})` : undefined }}>
        {ITEMS.map((item, i) => {
          const p = springAt(frame, item.at, theme.spring.ui);
          if (p <= 0.001) return null;
          // Chaque arrivée repousse légèrement les fenêtres précédentes (profondeur).
          const later = ITEMS.filter((o) => o.at > item.at && frame >= o.at).length;
          const depth = 1 - Math.min(0.12, later * 0.012);
          // Aspiration vers le centre, les plus lointaines d'abord.
          const dist = Math.hypot(item.x - 760, item.y - 400);
          const delay = Math.round((1 - dist / 1100) * 10);
          const suck = tween(frame, [CHAOS.suckStart + delay * 0.6, CHAOS.suckEnd - 2], [0, 1], theme.ease.inOut);
          const cx = 960 - 200;
          const cy = 540 - 120;
          const x = item.x + (cx - item.x) * suck;
          const y = item.y + (cy - item.y) * suck;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                zIndex: i,
                whiteSpace: "pre-line",
                transformOrigin: "200px 120px",
                opacity: Math.min(1, p * 1.6) * (1 - tween(suck, [0.7, 1], [0, 1])),
                transform: `translate3d(0, ${(1 - p) * 26}px, 0) scale(${WINDOW_SCALE * (0.94 + 0.06 * p) * depth * (1 - suck * 0.95)}) rotate(${item.tilt * (1 - suck)}deg)`,
                filter: `blur(${(1 - Math.min(1, p)) * 6 + suck * 10}px) brightness(${1 - (1 - depth) * 0.6})`,
              }}
            >
              {item.node}
            </div>
          );
        })}
      </AbsoluteFill>

      {/* Horloge + compteur : le rythme de la journée d'un bénévole. */}
      <div style={{ position: "absolute", left: 72, bottom: 64, display: "flex", alignItems: "baseline", gap: 28, fontFamily: theme.fonts.data, color: theme.colors.ink, opacity: tween(frame, [6, 20], [0, 1]) * (1 - tween(frame, [CHAOS.suckStart, CHAOS.suckStart + 10], [0, 1])) }}>
        <span style={{ fontSize: 15, letterSpacing: "0.16em", textTransform: "uppercase", color: theme.colors.muted }}>Samedi · 8 h 12</span>
        <span style={{ fontSize: 15, letterSpacing: "0.16em", textTransform: "uppercase", color: "#C2331F", fontVariantNumeric: "tabular-nums" }}>{unread} notifications</span>
      </div>
    </AbsoluteFill>
  );
}
