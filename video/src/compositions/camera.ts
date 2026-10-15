import { interpolate } from "remotion";
import { theme } from "../theme";

export interface CameraState {
  s: number;
  cx: number;
  cy: number;
  ax: number;
  ay: number;
  rx: number;
  ry: number;
  /** Coins arrondis de l'app quand elle devient un objet dans l'espace (scène 07). */
  radius: number;
  /** 0–1 : ombre portée de l'app « décollée » du fond. */
  lift: number;
}

export type CameraKey = { f: number } & Partial<CameraState>;

const IDENTITY: CameraState = { s: 1, cx: 960, cy: 540, ax: 960, ay: 540, rx: 0, ry: 0, radius: 0, lift: 0 };

/**
 * Une seule piste caméra pour tout le film : chaque clé hérite des valeurs
 * de la précédente, et chaque segment est interpolé en ease-in-out (jamais
 * linéaire). Changer un cadrage = changer une ligne.
 */
export function makeCamera(keys: CameraKey[], ease: (t: number) => number = theme.ease.inOut) {
  const resolved: Array<{ f: number; v: CameraState }> = [];
  let prev = IDENTITY;
  for (const k of keys) {
    const { f, ...rest } = k;
    prev = { ...prev, ...rest };
    resolved.push({ f, v: prev });
  }
  return (frame: number): CameraState => {
    if (frame <= resolved[0].f) return resolved[0].v;
    for (let i = 0; i < resolved.length - 1; i += 1) {
      const a = resolved[i];
      const b = resolved[i + 1];
      if (frame <= b.f) {
        const t = interpolate(frame, [a.f, b.f], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const out = {} as CameraState;
        (Object.keys(a.v) as Array<keyof CameraState>).forEach((key) => {
          out[key] = a.v[key] + (b.v[key] - a.v[key]) * t;
        });
        return out;
      }
    }
    return resolved[resolved.length - 1].v;
  };
}
