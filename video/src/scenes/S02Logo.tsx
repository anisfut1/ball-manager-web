import { AbsoluteFill } from "remotion";
import { BrandTile } from "../components/BrandTile";
import { MaskLine } from "../components/Caption";
import { SIDEBAR_BRAND } from "../components/ProductShell";
import { springAt, tween } from "../lib/motion";
import { T } from "../compositions/timeline";
import { theme } from "../theme";

const L = T.logo;
const TILE = 132;
const WORDMARK_W = 600;
const GAP = 34;

/**
 * SCÈNE 02 — BALL MANAGER (6–10 s).
 * Le logo réel naît du point où le chaos a été aspiré, se verrouille avec
 * son wordmark (Geist, comme dans la Sidebar), puis « UN CLUB. UN OUTIL. »
 * — le point final en accent, comme le « Bonjour Julien. » du dashboard.
 * L'interface apparaît derrière ; la tuile s'envole et atterrit
 * EXACTEMENT sur la marque de la Sidebar réelle (transition par le composant).
 */
export function S02Logo({ frame }: { frame: number }) {
  if (frame < L.in - 2 || frame > L.flyEnd + 2) return null;

  const born = springAt(frame, L.in, theme.spring.logo);
  const lock = springAt(frame, L.wordmark, theme.spring.smooth);
  const unlock = tween(frame, [L.out, L.flyStart + 2], [0, 1], theme.ease.inOut);
  const fly = tween(frame, [L.flyStart, L.flyEnd], [0, 1], theme.ease.inOut);

  // Centre de la tuile : seule → verrouillée avec le wordmark → recentrée → Sidebar.
  const lockedX = 960 - (TILE + GAP + WORDMARK_W) / 2 + TILE / 2;
  const restX = 960 + (lockedX - 960) * lock * (1 - unlock);
  const restY = 540 - 70 * lock * (1 - unlock);
  const size = TILE + (SIDEBAR_BRAND.size - TILE) * fly;
  const dest = { x: SIDEBAR_BRAND.x + SIDEBAR_BRAND.size / 2, y: SIDEBAR_BRAND.y + SIDEBAR_BRAND.size / 2 };
  const x = restX + (dest.x - restX) * fly;
  // Légère courbe : la tuile monte avant de glisser vers la Sidebar.
  const y = restY + (dest.y - restY) * fly - Math.sin(fly * Math.PI) * 60;

  const wordOut = tween(frame, [L.out, L.out + 9], [0, 1], theme.ease.in);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Wordmark : révélé par masque, de la tuile vers la droite. */}
      <div
        style={{
          position: "absolute",
          left: lockedX + TILE / 2 + GAP,
          top: 470 - 58,
          width: WORDMARK_W,
          clipPath: `inset(0 ${(1 - lock) * 100}% 0 0)`,
          opacity: 1 - wordOut,
          filter: wordOut > 0 ? `blur(${wordOut * 8}px)` : undefined,
          transform: `translate3d(${(1 - lock) * -40}px, ${wordOut * -14}px, 0)`,
          fontFamily: theme.fonts.sans,
          fontWeight: 620,
          fontSize: 100,
          letterSpacing: "-0.035em",
          lineHeight: 1.16,
          color: theme.colors.ink,
          whiteSpace: "nowrap",
        }}
      >
        Ball Manager
      </div>

      {/* Positionnement : on sait tout de suite que c'est du basket. */}
      <div
        style={{
          position: "absolute",
          top: 596,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 14,
          opacity: tween(frame, [L.tagline, L.tagline + 10], [0, 1]) * (1 - tween(frame, [L.taglineOut, L.taglineOut + 6], [0, 1], theme.ease.in)),
          transform: `translate3d(0, ${(1 - springAt(frame, L.tagline, theme.spring.ui)) * 14}px, 0)`,
          fontFamily: theme.fonts.display,
          fontStretch: theme.headline.stretch,
          fontWeight: 600,
          fontSize: 30,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: theme.colors.muted,
        }}
      >
        <span style={{ width: 12, height: 12, borderRadius: 12, background: theme.colors.ball }} />
        Gestion de club de basket
      </div>

      <div style={{ position: "absolute", top: 590, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 30 }}>
        <MaskLine frame={frame} at={L.club} out={L.out} size={84}>
          UN CLUB.
        </MaskLine>
        <MaskLine frame={frame} at={L.outil} out={L.out + 2} size={84}>
          UN OUTIL<span style={{ color: theme.colors.accent }}>.</span>
        </MaskLine>
      </div>

      <div
        style={{
          position: "absolute",
          left: x - size / 2,
          top: y - size / 2,
          opacity: Math.min(1, born * 1.5),
          transform: `scale(${0.55 + 0.45 * born})`,
          filter: born < 0.99 ? `blur(${(1 - born) * 14}px)` : undefined,
          boxShadow: `0 ${30 * (1 - fly)}px ${70 * (1 - fly)}px -${24 * (1 - fly)}px rgb(23 23 26 / ${0.45 * (1 - fly)})`,
          borderRadius: size * 0.22,
        }}
      >
        <BrandTile size={size} />
      </div>
    </AbsoluteFill>
  );
}
