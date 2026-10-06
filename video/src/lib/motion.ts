import { interpolate, spring, type SpringConfig } from "remotion";
import { theme } from "../theme";

type Ease = (t: number) => number;

/** interpolate() toujours bridé, jamais linéaire. */
export function tween(frame: number, range: [number, number], out: [number, number], ease: Ease = theme.ease.out): number {
  return interpolate(frame, range, out, { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

/** Courbe multi-points (caméra) : chaque segment est eased. */
export function track(frame: number, keys: Array<[number, number]>, ease: Ease = theme.ease.inOut): number {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i += 1) {
    const [f0, v0] = keys[i];
    const [f1, v1] = keys[i + 1];
    if (frame <= f1) return interpolate(frame, [f0, f1], [v0, v1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }
  return keys[keys.length - 1][1];
}

export function springAt(frame: number, delay: number, config: Partial<SpringConfig> = theme.spring.ui, durationInFrames?: number): number {
  return spring({ frame: frame - delay, fps: theme.fps, config, durationInFrames });
}

/** Entrée premium : opacité + Y + flou → net (+ léger scale). */
export function enter(frame: number, delay: number, opts: { y?: number; blur?: number; scale?: number; config?: Partial<SpringConfig> } = {}) {
  const { y = 24, blur = 8, scale = 0.985, config = theme.spring.ui } = opts;
  const p = springAt(frame, delay, config);
  return {
    p,
    style: {
      opacity: Math.min(1, p * 1.4),
      transform: `translate3d(0, ${(1 - p) * y}px, 0) scale(${scale + (1 - scale) * p})`,
      filter: blur > 0 && p < 0.999 ? `blur(${(1 - Math.min(1, p)) * blur}px)` : undefined,
    } as const,
  };
}

/** Sortie (plus rapide que l'entrée). */
export function exit(frame: number, start: number, dur = 10, opts: { y?: number; blur?: number } = {}) {
  const { y = -16, blur = 6 } = opts;
  const t = tween(frame, [start, start + dur], [0, 1], theme.ease.in);
  return {
    t,
    style: { opacity: 1 - t, transform: `translate3d(0, ${t * y}px, 0)`, filter: t > 0.001 ? `blur(${t * blur}px)` : undefined } as const,
  };
}

/** Compteur : valeur entière qui monte avec un ressort. */
export function count(frame: number, delay: number, to: number, from = 0): number {
  const p = spring({ frame: frame - delay, fps: theme.fps, config: { damping: 30, stiffness: 55 } });
  return Math.round(from + (to - from) * Math.min(1, p));
}
