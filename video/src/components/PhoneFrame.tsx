import type { CSSProperties, ReactNode } from "react";
import { theme } from "../theme";

export const PHONE = { screenW: 390, screenH: 844, status: 44, bezel: 12 } as const;

/**
 * Habillage d'appareil (pas une interface : un simple boîtier neutre) autour
 * du vrai rendu mobile. Barre d'état + indicateur d'accueil génériques.
 */
export function PhoneFrame({ children, overlay, style }: { children: ReactNode; overlay?: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        width: PHONE.screenW + PHONE.bezel * 2,
        height: PHONE.screenH + PHONE.bezel * 2,
        padding: PHONE.bezel,
        borderRadius: 62,
        background: theme.colors.tile,
        boxShadow: "0 0 0 1.5px #2A2A2E inset, 0 50px 100px -30px rgb(23 23 26 / 0.45), 0 18px 36px -18px rgb(23 23 26 / 0.3)",
        ...style,
      }}
    >
      <div style={{ position: "relative", width: PHONE.screenW, height: PHONE.screenH, borderRadius: 50, overflow: "hidden", background: "var(--background)" }}>
        <div style={{ height: PHONE.status, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 30px 0 34px", fontFamily: theme.fonts.sans, fontSize: 15, fontWeight: 600, color: theme.colors.ink, background: "var(--surface-overlay)" }}>
          <span>9:41</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="18" height="11" viewBox="0 0 18 11" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <rect key={i} x={i * 4.6} y={8 - i * 2.6} width="3.2" height={3 + i * 2.6} rx="0.8" fill={theme.colors.ink} />
              ))}
            </svg>
            <svg width="26" height="12" viewBox="0 0 26 12" aria-hidden>
              <rect x="0.5" y="0.5" width="22" height="11" rx="3.2" fill="none" stroke={theme.colors.ink} strokeOpacity="0.45" />
              <rect x="2.3" y="2.3" width="16" height="7.4" rx="1.8" fill={theme.colors.ink} />
              <rect x="23.6" y="4" width="1.6" height="4" rx="0.8" fill={theme.colors.ink} fillOpacity="0.45" />
            </svg>
          </span>
        </div>
        <div style={{ position: "absolute", top: 11, left: "50%", width: 120, height: 34, marginLeft: -60, borderRadius: 20, background: "#000" }} />
        {children}
        {overlay}
        <div style={{ position: "absolute", bottom: 8, left: "50%", width: 134, height: 5, marginLeft: -67, borderRadius: 5, background: "rgb(23 23 26 / 0.85)", zIndex: 90 }} />
      </div>
    </div>
  );
}

/** Retour visuel d'un « tap » (coordonnées du viewport mobile). */
export function Tap({ frame, at, x, y }: { frame: number; at: number; x: number; y: number }) {
  const d = frame - at;
  if (d < -6 || d > 18) return null;
  const pre = d < 0 ? (d + 6) / 6 : 1;
  const t = Math.max(0, d) / 18;
  return (
    <div style={{ position: "absolute", left: x - 22, top: PHONE.status + y - 22, width: 44, height: 44, borderRadius: 44, zIndex: 95, pointerEvents: "none", background: `rgb(23 23 26 / ${0.16 * pre * (1 - t)})`, border: `2px solid rgb(47 91 255 / ${0.6 * (1 - t)})`, transform: `scale(${d < 0 ? 0.7 + 0.2 * pre : 0.9 + t * 0.7})` }} />
  );
}
