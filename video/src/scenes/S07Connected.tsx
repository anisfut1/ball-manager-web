import { BarChart3, CalendarClock, CalendarDays, ClipboardList, Shirt, Users } from "lucide-react";
import { IconMedallion } from "@/components/ui/Card";
import { MaskLine } from "../components/Caption";
import { MobileViewport } from "../components/MobileViewport";
import { PHONE, PhoneFrame } from "../components/PhoneFrame";
import { ProductShell } from "../components/ProductShell";
import { DashboardPage } from "./S03Dashboard";
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
/** V2 : 6 catégories, une étiquette chacune — l'all-in-one se lit sans phrase. */
const MODULES = [
  { key: "matchs", title: "Matchs", icon: <CalendarDays />, x: 300, y: 380 },
  { key: "stats", title: "Stats", icon: <BarChart3 />, x: 1620, y: 380 },
  { key: "joueurs", title: "Joueurs", icon: <Users />, x: 300, y: 800 },
  { key: "tables", title: "Tables", icon: <ClipboardList />, x: 1620, y: 800 },
  { key: "equipes", title: "Équipes", icon: <Shirt />, x: 960, y: 212 },
  { key: "derogations", title: "Dérogations", icon: <CalendarClock />, x: 960, y: 962 },
];

const appear = (i: number) => C.start + 36 + i * 8;
const COLLAPSE = C.start + 152;
/** La promesse, une fois tout rassemblé. */
export const ALL_IN_ONE = { caption: COLLAPSE + 22, captionOut: C.end - 34 } as const;

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
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "14px 24px 14px 14px",
              transform: `translate(-50%, -50%) scale(${(0.8 + 0.2 * Math.min(1, p)) * (1 - k * 0.7)})`,
              opacity: Math.min(1, p * 1.6) * (1 - k),
              filter: p < 0.99 || k > 0 ? `blur(${(1 - Math.min(1, p)) * 8 + k * 8}px)` : undefined,
            }}
          >
            <IconMedallion tone="accent" size="lg" className="!size-14 [&_svg]:!size-6">
              {m.icon}
            </IconMedallion>
            <span style={{ fontFamily: theme.fonts.display, fontStretch: theme.headline.stretch, fontWeight: 700, fontSize: 30, letterSpacing: "0.03em", textTransform: "uppercase", color: theme.colors.ink, whiteSpace: "nowrap" }}>{m.title}</span>
          </div>
        );
      })}
    </div>
  );
}

export function S07Caption({ frame }: { frame: number }) {
  if (frame < ALL_IN_ONE.caption - 2 || frame > ALL_IN_ONE.captionOut + 14) return null;
  return (
    <div style={{ position: "absolute", top: 120, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 28 }}>
      <MaskLine frame={frame} at={ALL_IN_ONE.caption} out={ALL_IN_ONE.captionOut} size={92}>
        Tout votre club.
      </MaskLine>
      <MaskLine frame={frame} at={ALL_IN_ONE.caption + 10} out={ALL_IN_ONE.captionOut + 2} size={92} color={theme.colors.accent}>
        Au même endroit.
      </MaskLine>
    </div>
  );
}

/**
 * Le même produit, sur téléphone : le VRAI dashboard rendu dans un viewport
 * mobile (barre du bas, cartes empilées), posé contre l'app desktop.
 */
export function S07Phone({ frame }: { frame: number }) {
  if (frame < C.start + 36 || frame > ALL_IN_ONE.captionOut + 12) return null;
  const p = springAt(frame, C.start + 44, theme.spring.smooth);
  // Le téléphone reste aux côtés de l'app pendant la promesse, puis s'efface avec le retour au plan large.
  const k = tween(frame, [ALL_IN_ONE.captionOut - 6, ALL_IN_ONE.captionOut + 10], [0, 1], theme.ease.in);
  const scale = 0.5 * (1 - k * 0.6);
  const x = 1300 + (HUB.x - 1300) * k;
  const y = 700 + (1 - p) * 80 + (HUB.y - 700) * k;
  const w = (PHONE.screenW + PHONE.bezel * 2) * scale;
  const h = (PHONE.screenH + PHONE.bezel * 2) * scale;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: Math.min(1, p * 1.5) * (1 - k), filter: k > 0 ? `blur(${k * 8}px)` : undefined }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        <PhoneFrame>
          <MobileViewport width={PHONE.screenW} height={PHONE.screenH - PHONE.status}>
            <ProductShell flow pathname="/dashboard">
              <DashboardPage frame={frame} start={-1000} />
            </ProductShell>
          </MobileViewport>
        </PhoneFrame>
      </div>
    </div>
  );
}
