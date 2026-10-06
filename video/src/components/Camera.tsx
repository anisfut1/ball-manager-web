import type { CSSProperties, ReactNode } from "react";
import type { CameraState } from "../compositions/camera";

/**
 * Caméra 2.5D posée sur une « scène » 1920×1080 (l'application réelle).
 * Le point (cx, cy) de la scène est amené au point écran (ax, ay), avec un
 * zoom `s` et une inclinaison autour de ce même point (profondeur).
 * Le `transform` est TOUJOURS présent : il fait de cette boîte le bloc
 * conteneur des éléments `position: fixed` de l'app (Sidebar, Sheet, Toast).
 */
export function Camera({ cam, children, style }: { cam: CameraState; children: ReactNode; style?: CSSProperties }) {
  const { s, cx, cy, ax, ay, rx, ry, radius, lift } = cam;
  const tx = ax - cx * s;
  const ty = ay - cy * s;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1920,
        height: 1080,
        transformOrigin: "0 0",
        transform: `translate3d(${tx}px, ${ty}px, 0) scale(${s}) translate(${cx}px, ${cy}px) perspective(2400px) rotateX(${rx}deg) rotateY(${ry}deg) translate(${-cx}px, ${-cy}px)`,
        borderRadius: radius,
        overflow: "hidden",
        boxShadow: lift > 0 ? `0 ${30 * lift}px ${90 * lift}px -${20 * lift}px rgb(23 23 26 / ${0.32 * lift}), 0 0 0 ${1 / Math.max(s, 0.2)}px rgb(23 23 26 / ${0.1 * lift})` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Coordonnées scène → écran (caméra sans inclinaison) : sert au curseur et aux annotations. */
export function toScreen(cam: CameraState, x: number, y: number): [number, number] {
  return [cam.ax + (x - cam.cx) * cam.s, cam.ay + (y - cam.cy) * cam.s];
}
