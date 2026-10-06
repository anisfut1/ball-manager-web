import { Easing } from "remotion";

/**
 * Source unique de la mise en scène. Les couleurs de l'interface ne sont PAS
 * ici : elles viennent des tokens réels de l'application (../src/app/globals.css).
 * Seuls les éléments propres au film (noir du logo, orange du ballon) le sont.
 */
export const theme = {
  fps: 30,
  width: 1920,
  height: 1080,
  colors: {
    stone: "#F4F3EF", // --background
    ink: "#17171A", // --foreground
    muted: "#5E5D57",
    accent: "#2F5BFF", // repli plateforme --club-accent
    tile: "#0E0E10", // tuile noire du logo BM
    ball: "#F26B1D", // orange du ballon du logo BM
    night: "#0B0B0D",
  },
  fonts: {
    /** Titres marketing du film : sans-serif sportive, semi-condensée (V2 — retour « trop éditorial »). */
    display: "'Archivo Variable', 'Geist Variable', ui-sans-serif, sans-serif",
    /** Serif éditoriale de l'app (titres de page réels) — plus utilisée pour les messages du film. */
    serif: "'Instrument Serif', ui-serif, Georgia, serif",
    sans: "'Geist Variable', ui-sans-serif, system-ui, sans-serif",
    data: "'Space Grotesk Variable', 'Geist Variable', ui-sans-serif, sans-serif",
  },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    soft: Easing.bezier(0.45, 0, 0.2, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  /** Réglages typographiques des titres (Archivo : largeur 86 %, graisse 680). */
  headline: { stretch: "86%", weight: 680, tracking: "-0.028em", lineHeight: 1.02 },
  spring: {
    ui: { damping: 18, stiffness: 170, mass: 0.7 },
    smooth: { damping: 22, stiffness: 90, mass: 1 },
    heavy: { damping: 26, stiffness: 70, mass: 1.2 },
    logo: { damping: 15, stiffness: 120, mass: 0.9 },
  },
} as const;

/** Secondes → frames (toute durée du film passe par ici). */
export const sec = (s: number) => Math.round(s * theme.fps);
