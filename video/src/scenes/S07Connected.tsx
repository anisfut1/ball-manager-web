import { BarChart3, CalendarDays, ClipboardList, FileText, RefreshCw, Shirt, Users } from "lucide-react";
import { IconMedallion } from "@/components/ui/Card";
import { MaskLine } from "../components/Caption";
import { springAt, tween } from "../lib/motion";
import { T } from "../compositions/timeline";
import { theme } from "../theme";

const C = T.connected;

/** Le produit, réduit, est posé au centre de ce point (voir piste caméra). */
export const HUB = { x: 960, y: 590, s: 0.42 };

/**
 * SCÈNE 07 — TOUT EST CONNECTÉ. Les modules RÉELS de Ball Manager (icônes
 * Lucide de la navigation : NAV_ICONS / MASTER.md §8, médaillons
 * IconMedallion) se branchent sur l'application, qui est au centre — pas un
 * schéma abstrait : c'est le vrai dashboard, en direct, qui reçoit les flux.
 */
const MODULES = [
  { key: "ffbb", title: "FFBB", meta: "Calendrier & résultats officiels", icon: <RefreshCw />, x: 300, y: 470, tone: "neutral" as const },
  { key: "emarque", title: "e-Marque", meta: "Feuilles de match importées", icon: <FileText />, x: 300, y: 730, tone: "neutral" as const },
  { key: "matchs", title: "Matchs", meta: "Toute la saison, par journée", icon: <CalendarDays />, x: 700, y: 292, tone: "accent" as const },
  { key: "joueurs", title: "Joueurs", meta: "Fiches et historique", icon: <Users />, x: 1220, y: 292, tone: "accent" as const },
  { key: "stats", title: "Statistiques", meta: "Par joueur, par match", icon: <BarChart3 />, x: 1620, y: 470, tone: "accent" as const },
  { key: "tables", title: "Tables de marque", meta: "Suggestions expliquées", icon: <ClipboardList />, x: 1620, y: 730, tone: "accent" as const },
  { key: "equipes", title: "Équipes", meta: "Effectifs et coachs", icon: <Shirt />, x: 960, y: 912, tone: "accent" as const },
];

const appear = (i: number) => C.start + 34 + i * 4;
const COLLAPSE = C.start + 142;

function collapseT(frame: number, i: number) {
  return tween(frame, [COLLAPSE + i * 1.5, COLLAPSE + 16 + i * 1.5], [0, 1], theme.ease.in);
}

/** Liaisons + impulsions — rendues SOUS l'application (elles s'arrêtent à son bord). */
export function S07Links({ frame }: { frame: number }) {
  if (frame < C.start + 30 || frame > COLLAPSE + 30) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {MODULES.map((m, i) => {
        const draw = tween(frame, [appear(i) + 6, appear(i) + 30], [0, 1], theme.ease.inOut) * (1 - tween(frame, [COLLAPSE - 6, COLLAPSE + 8], [0, 1], theme.ease.in));
        const x2 = m.x + (HUB.x - m.x) * draw;
        const y2 = m.y + (HUB.y - m.y) * draw;
        // Impulsions de données : du module vers le produit, en continu.
        const pulses = [0, 1, 2].map((k) => {
          const local = (frame - appear(i) - 30 - k * 16 - i * 3) % 48;
          if (frame - appear(i) - 30 - k * 16 < 0 || frame > COLLAPSE - 8) return null;
          const t = theme.ease.inOut(Math.min(1, Math.max(0, local / 36)));
          return <circle key={k} cx={m.x + (HUB.x - m.x) * t} cy={m.y + (HUB.y - m.y) * t} r={4} fill={theme.colors.accent} opacity={Math.sin(t * Math.PI)} />;
        });
        return (
          <g key={m.key}>
            <line x1={m.x} y1={m.y} x2={x2} y2={y2} stroke="rgb(23 23 26 / 0.16)" strokeWidth={1.5} />
            {pulses}
          </g>
        );
      })}
    </svg>
  );
}

/** Cartes-modules — rendues AU-DESSUS de l'application. */
export function S07Modules({ frame }: { frame: number }) {
  if (frame < C.start + 30 || frame > COLLAPSE + 30) return null;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {MODULES.map((m, i) => {
        const p = springAt(frame, appear(i), theme.spring.ui);
        const k = collapseT(frame, i);
        // Les modules jaillissent du produit, puis y retournent.
        const out = 1 - p;
        const x = m.x + (HUB.x - m.x) * Math.max(out * 0.5, k);
        const y = m.y + (HUB.y - m.y) * Math.max(out * 0.5, k);
        return (
          <div
            key={m.key}
            className="surface-card"
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 300,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: 14,
              transform: `translate(-50%, -50%) scale(${(0.8 + 0.2 * Math.min(1, p)) * (1 - k * 0.7)})`,
              opacity: Math.min(1, p * 1.6) * (1 - k),
              filter: p < 0.99 || k > 0 ? `blur(${(1 - Math.min(1, p)) * 8 + k * 8}px)` : undefined,
            }}
          >
            <IconMedallion tone={m.tone} size="lg">
              {m.icon}
            </IconMedallion>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="type-card text-foreground" style={{ fontSize: 17 }}>
                {m.title}
              </span>
              <span className="type-meta" style={{ fontSize: 14 }}>
                {m.meta}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function S07Caption({ frame }: { frame: number }) {
  if (frame < C.start + 50 || frame > C.end + 6) return null;
  return (
    <div style={{ position: "absolute", top: 96, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 30 }}>
      <MaskLine frame={frame} at={C.start + 60} out={C.end - 70} size={84}>
        Moins d&apos;administratif.
      </MaskLine>
      <MaskLine frame={frame} at={C.start + 80} out={C.end - 68} size={84} color={theme.colors.accent}>
        Plus de basket.
      </MaskLine>
    </div>
  );
}
