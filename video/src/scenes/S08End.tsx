import { AbsoluteFill } from "remotion";
import { ArrowRight } from "lucide-react";
import { BrandTile } from "../components/BrandTile";
import { enter, springAt, tween } from "../lib/motion";
import { T } from "../compositions/timeline";
import { theme } from "../theme";

const E = T.end.start;
export const END = { darkFrom: E + 18, darkTo: E + 84, logo: E + 66, word: E + 80, tagline: E + 98, cta: E + 120, fade: T.total - 14 } as const;

/**
 * SCÈNE 08 — END CARD. Le dashboard recule lentement et s'éteint (voile
 * noir du logo), la marque se pose au centre, puis la promesse et un CTA
 * discret. Fin au noir, sans effet.
 */
export function S08End({ frame }: { frame: number }) {
  if (frame < END.darkFrom) return null;
  const dark = tween(frame, [END.darkFrom, END.darkTo], [0, 0.94], theme.ease.soft);
  const logo = springAt(frame, END.logo, theme.spring.logo);
  const word = springAt(frame, END.word, theme.spring.smooth);
  const fade = tween(frame, [END.fade, T.total - 1], [0, 1], theme.ease.inOut);
  const breathe = 1 + Math.sin((frame - END.logo) / 26) * 0.006;
  const cta = enter(frame, END.cta, { y: 12, blur: 6 });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: theme.colors.night, opacity: dark }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30, transform: `scale(${breathe})` }}>
          <div style={{ opacity: Math.min(1, logo * 1.5), transform: `scale(${0.7 + 0.3 * logo})`, filter: logo < 0.99 ? `blur(${(1 - logo) * 12}px)` : undefined }}>
            <BrandTile size={112} style={{ boxShadow: "0 0 0 1px rgb(255 255 255 / 0.08)" }} />
          </div>
          <div style={{ clipPath: `inset(0 ${(1 - word) * 100}% 0 0)`, transform: `translate3d(${(1 - word) * -30}px, 0, 0)`, fontFamily: theme.fonts.sans, fontWeight: 620, fontSize: 92, letterSpacing: "-0.035em", color: "#F4F3EF", whiteSpace: "nowrap", lineHeight: 1.15 }}>
            Ball Manager
          </div>
        </div>
        <div style={{ marginTop: 34, overflow: "hidden", paddingBottom: 10 }}>
          <div style={{ fontFamily: theme.fonts.display, fontStretch: theme.headline.stretch, fontWeight: 650, fontSize: 60, color: "#CFCDC6", letterSpacing: theme.headline.tracking, transform: `translate3d(0, ${(1 - springAt(frame, END.tagline, theme.spring.smooth)) * 110}%, 0)` }}>
            Pilotez votre club<span style={{ color: theme.colors.ball }}>.</span>
          </div>
        </div>
        <div style={{ marginTop: 56, ...cta.style }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 50, padding: "0 22px", borderRadius: 14, border: "1px solid rgb(255 255 255 / 0.16)", background: "rgb(255 255 255 / 0.04)", fontFamily: theme.fonts.sans, fontSize: 18, fontWeight: 520, color: "#EDEBE5" }}>
            Découvrir Ball Manager
            <ArrowRight size={18} />
          </span>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: theme.colors.night, opacity: fade }} />
    </AbsoluteFill>
  );
}
