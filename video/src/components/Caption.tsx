import type { CSSProperties, ReactNode } from "react";
import { springAt, tween } from "../lib/motion";
import { theme } from "../theme";

/**
 * Ligne de titre révélée par masque (la ligne monte de sous sa propre
 * ligne de base), net → flou à la sortie. Typo display réelle du produit.
 */
export function MaskLine({ frame, at, out, children, size = 112, color = theme.colors.ink, style, font = theme.fonts.display }: { frame: number; at: number; out?: number; children: ReactNode; size?: number; color?: string; style?: CSSProperties; font?: string }) {
  const p = springAt(frame, at, theme.spring.smooth);
  const o = out === undefined ? 0 : tween(frame, [out, out + 10], [0, 1], theme.ease.in);
  return (
    <div style={{ overflow: "hidden", paddingBottom: size * 0.14, marginBottom: -size * 0.14, ...style }}>
      <div
        style={{
          fontFamily: font,
          fontSize: size,
          fontWeight: theme.headline.weight,
          fontStretch: theme.headline.stretch,
          lineHeight: theme.headline.lineHeight,
          letterSpacing: theme.headline.tracking,
          color,
          whiteSpace: "nowrap",
          transform: `translate3d(0, ${(1 - p) * 105 - o * 30}%, 0)`,
          opacity: 1 - o,
          filter: o > 0.001 ? `blur(${o * 8}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Eyebrow éditorial (Space Grotesk, capitales espacées) avec filet accent. */
export function Eyebrow({ frame, at, out, children, color = theme.colors.muted, style }: { frame: number; at: number; out?: number; children: ReactNode; color?: string; style?: CSSProperties }) {
  const p = springAt(frame, at, theme.spring.ui);
  const o = out === undefined ? 0 : tween(frame, [out, out + 8], [0, 1], theme.ease.in);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: Math.min(1, p * 1.5) * (1 - o), transform: `translate3d(${(1 - p) * -12}px, 0, 0)`, ...style }}>
      <span style={{ width: 28 * p, height: 2, borderRadius: 2, background: theme.colors.accent }} />
      <span style={{ fontFamily: theme.fonts.data, fontSize: 17, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color }}>{children}</span>
    </div>
  );
}

/** Voile pierre (couleur --background) côté texte : lisibilité sans boîte. */
export function Scrim({ frame, at, out, side = "left", width = 900 }: { frame: number; at: number; out: number; side?: "left" | "right" | "bottom"; width?: number }) {
  const o = tween(frame, [at, at + 18], [0, 1], theme.ease.out) * (1 - tween(frame, [out, out + 14], [0, 1], theme.ease.in));
  if (o <= 0) return null;
  const dir = side === "left" ? "90deg" : side === "right" ? "270deg" : "0deg";
  const pos: CSSProperties = side === "bottom" ? { left: 0, right: 0, bottom: 0, height: width } : { top: 0, bottom: 0, [side]: 0, width };
  return <div style={{ position: "absolute", ...pos, opacity: o, background: `linear-gradient(${dir}, rgb(244 243 239 / 0.97) 0%, rgb(244 243 239 / 0.9) 45%, rgb(244 243 239 / 0) 100%)` }} />;
}
