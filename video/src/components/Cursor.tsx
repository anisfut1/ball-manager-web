import { interpolate } from "remotion";
import { theme } from "../theme";
import { springAt, tween } from "../lib/motion";

export interface CursorKey {
  f: number;
  x: number;
  y: number;
}

/**
 * Curseur simulé (n'apparaît que pour expliquer une action réelle : ouvrir
 * un module, choisir un licencié). Trajectoire eased + léger arc, pression
 * visible au clic.
 */
export function Cursor({ frame, path, clicks = [], show }: { frame: number; path: CursorKey[]; clicks?: number[]; show: [number, number] }) {
  const vis = tween(frame, [show[0], show[0] + 8], [0, 1]) * (1 - tween(frame, [show[1] - 8, show[1]], [0, 1], theme.ease.in));
  if (vis <= 0) return null;
  let x = path[0].x;
  let y = path[0].y;
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    if (frame >= a.f) {
      const t = interpolate(frame, [a.f, b.f], [0, 1], { easing: theme.ease.inOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const arc = Math.sin(t * Math.PI) * Math.min(60, Math.hypot(b.x - a.x, b.y - a.y) * 0.08);
      x = a.x + (b.x - a.x) * t;
      y = a.y + (b.y - a.y) * t - arc;
    }
  }
  const press = clicks.reduce((acc, c) => {
    const d = frame - c;
    return d >= -3 && d <= 8 ? Math.max(acc, d < 0 ? (d + 3) / 3 : 1 - springAt(frame, c, { damping: 12, stiffness: 220 })) : acc;
  }, 0);
  const ring = clicks.map((c) => frame - c).find((d) => d >= 0 && d < 16);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: vis, pointerEvents: "none", zIndex: 50 }}>
      {ring !== undefined ? (
        <div style={{ position: "absolute", left: -22, top: -22, width: 44, height: 44, borderRadius: 99, border: `2px solid ${theme.colors.accent}`, opacity: 0.55 * (1 - ring / 16), transform: `scale(${0.4 + ring / 16})` }} />
      ) : null}
      <svg width="30" height="34" viewBox="0 0 30 34" style={{ transform: `translate(-3px, -2px) scale(${1 - press * 0.14})`, transformOrigin: "4px 3px", filter: "drop-shadow(0 4px 8px rgb(23 23 26 / 0.28))" }}>
        <path d="M4 3 L4 27 L10.5 21 L15 31 L19.5 29 L15.2 19.4 L24 19.2 Z" fill={theme.colors.ink} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
