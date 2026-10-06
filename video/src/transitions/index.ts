import { tween } from "../lib/motion";
import { theme } from "../theme";

/**
 * Transitions du film — toutes portées par l'interface (aucun volet,
 * aucun fondu « PowerPoint ») :
 * - `matchCutBlur` : la caméra plonge dans un élément (tuile de match,
 *   poste attribué), un flou bref masque le raccord vers l'écran suivant ;
 * - `pageSwap` : changement de page dans le shell persistant — la page
 *   sortante s'efface/floute vite, la suivante se construit en cascade.
 */
export function matchCutBlur(frame: number, at: number, peak = 9): number {
  return tween(frame, [at - 14, at], [0, peak], theme.ease.in) * (1 - tween(frame, [at, at + 16], [0, 1], theme.ease.out));
}

export function pageSwap(frame: number, to: number, dur = 10) {
  const out = tween(frame, [to - dur, to], [0, 1], theme.ease.in);
  return { opacity: 1 - out, filter: out > 0 ? `blur(${out * 6}px)` : undefined } as const;
}
