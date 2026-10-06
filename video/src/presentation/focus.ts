import type { CSSProperties } from "react";
import { tween } from "../lib/motion";
import { theme } from "../theme";

/**
 * Système de focus du film (V2 — « une scène = une idée = un point focal ») :
 * les zones secondaires restent visibles (authenticité) mais reculent —
 * opacité, flou léger, désaturation — pour que le regard n'ait qu'une cible.
 */
export function dim(level: number): CSSProperties {
  if (level <= 0.001) return {};
  return {
    opacity: 1 - 0.68 * level,
    filter: `blur(${(2.2 * level).toFixed(2)}px) saturate(${(1 - 0.75 * level).toFixed(2)})`,
  };
}

/** Niveau d'atténuation entre deux instants (montée/descente adoucies). */
export function dimWindow(frame: number, from: number, to: number, ramp = 12): number {
  return tween(frame, [from, from + ramp], [0, 1], theme.ease.out) * (1 - tween(frame, [to - ramp, to], [0, 1], theme.ease.inOut));
}

/** Atténue le chrome de l'app (Sidebar, Topbar) — feuille de style, sans toucher aux composants. */
export function shellDimCss(level: number): string {
  if (level <= 0.001) return "";
  const s = dim(level);
  return `.film aside, .film header.surface-glass { opacity: ${s.opacity}; filter: ${s.filter}; }`;
}

/** Mise en avant de l'élément focal : léger relief + filet accent. */
export function lift(level: number): CSSProperties {
  if (level <= 0.001) return {};
  return {
    transform: `scale(${1 + 0.03 * level})`,
    boxShadow: `0 0 0 ${1.5 * level}px var(--club-accent-border), 0 ${18 * level}px ${44 * level}px -${16 * level}px color-mix(in oklab, var(--club-accent) 30%, transparent)`,
    borderRadius: 16,
    position: "relative",
    zIndex: 2,
  };
}
