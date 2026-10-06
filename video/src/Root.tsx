import { Composition } from "remotion";
import "./styles.css";
import { FontGate } from "./components/FontGate";
import { BallManagerFilm } from "./compositions/BallManagerFilm";
import { Probe, type ProbeProps } from "./compositions/Probe";
import { T } from "./compositions/timeline";
import { theme } from "./theme";

const Film = () => (
  <FontGate>
    <BallManagerFilm />
  </FontGate>
);

const ProbeGate = (props: ProbeProps) => (
  <FontGate>
    <Probe {...props} />
  </FontGate>
);

export function RemotionRoot() {
  return (
    <>
      <Composition id="BallManagerFilm" component={Film} durationInFrames={T.total} fps={theme.fps} width={theme.width} height={theme.height} />
      <Composition id="Probe" component={ProbeGate} durationInFrames={1} fps={theme.fps} width={theme.width} height={theme.height} defaultProps={{ page: "dashboard" } as ProbeProps} />
    </>
  );
}
