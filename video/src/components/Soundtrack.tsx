import { Html5Audio, Sequence, interpolate, staticFile } from "remotion";
import { CHAOS, CHAOS_BEATS } from "../scenes/S01Chaos";
import { TB } from "../scenes/S05Tables";
import { T } from "../compositions/timeline";

/**
 * Design sonore minimal (kit synthétisé par scripts/make-sfx.mjs) :
 * notifications de plus en plus serrées → SILENCE au gel du chaos → impact
 * du logo → clics d'interface synchronisés au curseur → souffles sur les
 * grands mouvements caméra → nappe chaude sur l'end card.
 * Chaque son part 2 frames AVANT l'image (perçu comme synchrone).
 */

function Sfx({ at, src, volume = 1, rate = 1 }: { at: number; src: string; volume?: number; rate?: number }) {
  return (
    <Sequence from={Math.max(0, at - 2)} layout="none">
      <Html5Audio src={staticFile(`sfx/${src}.wav`)} volume={volume} playbackRate={rate} />
    </Sequence>
  );
}

export function Soundtrack() {
  const clicks = [T.matches.navClick, T.tables.start - 16, TB.firstClick, TB.secondClick];
  const whooshes = [CHAOS.suckStart + 6, T.logo.flyStart, T.tables.start - 10, T.player.start - 10, T.connected.start + 6, T.connected.end - 40];
  return (
    <>
      {CHAOS_BEATS.filter((f) => f < CHAOS.freeze).map((f, i) => (
        <Sfx key={`n${f}`} at={f} src="notif" volume={0.16 + Math.min(0.2, i * 0.012)} rate={1 + ((i * 7) % 5) * 0.04} />
      ))}
      <Sfx at={T.logo.in} src="thump" volume={0.75} />
      {whooshes.map((f) => (
        <Sfx key={`w${f}`} at={f} src="whoosh" volume={0.22} />
      ))}
      {clicks.map((f) => (
        <Sfx key={`c${f}`} at={f} src="click" volume={0.5} />
      ))}
      <Sequence from={T.end.start} layout="none">
        <Html5Audio src={staticFile("sfx/pad.wav")} volume={(f) => interpolate(f, [0, 40, T.total - T.end.start - 20, T.total - T.end.start], [0, 0.32, 0.32, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      </Sequence>
      <Sfx at={T.end.start + 66} src="thump" volume={0.45} />
    </>
  );
}
