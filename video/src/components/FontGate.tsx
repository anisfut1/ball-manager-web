import { useEffect, useState, type ReactNode } from "react";
import { continueRender, delayRender } from "remotion";

const FAMILIES = ['400 15px "Geist Variable"', '600 15px "Geist Variable"', '500 15px "Space Grotesk Variable"', '400 40px "Instrument Serif"'];

/** Bloque le rendu tant que les 3 familles de l'app ne sont pas chargées (aucune frame en police de repli). */
export function FontGate({ children }: { children: ReactNode }) {
  const [handle] = useState(() => delayRender("Chargement des polices Ball Manager"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all(FAMILIES.map((f) => document.fonts.load(f)))
      .then(() => document.fonts.ready)
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch(() => {
        setReady(true);
        continueRender(handle);
      });
  }, [handle]);
  return ready ? <>{children}</> : null;
}
