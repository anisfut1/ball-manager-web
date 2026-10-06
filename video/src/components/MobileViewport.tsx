import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { continueRender, delayRender } from "remotion";

/**
 * Vrai viewport mobile pour les composants réels : une iframe de 390 px a
 * sa PROPRE largeur de viewport, donc les media queries Tailwind de l'app
 * (sm:, lg:…) s'y évaluent comme sur un téléphone — barre de navigation du
 * bas, topbar mobile, piles verticales. Le contenu est rendu par portail
 * React (même arbre, même frame) ; les feuilles de style du film y sont
 * recopiées. `scrollY` fait défiler le document de l'iframe pour de vrai
 * (les éléments `sticky` de l'app se comportent comme sur l'appareil).
 */
export function MobileViewport({ width = 390, height = 800, scrollY = 0, children, style }: { width?: number; height?: number; scrollY?: number; children: ReactNode; style?: CSSProperties }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [handle] = useState(() => delayRender("Viewport mobile : styles et polices"));

  useLayoutEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write("<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\"></head><body></body></html>");
    doc.close();
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => doc.head.appendChild(node.cloneNode(true)));
    doc.documentElement.className = "film";
    doc.documentElement.style.cssText = "height:100%;scrollbar-width:none;";
    doc.body.style.cssText = "margin:0;min-height:100%;display:flex;flex-direction:column;";
    const root = doc.createElement("div");
    root.style.cssText = "display:flex;flex-direction:column;flex:1;min-height:100%;";
    doc.body.appendChild(root);
    setMount(root);
    const families = ['400 15px "Geist Variable"', '600 15px "Geist Variable"', '500 15px "Space Grotesk Variable"', '400 30px "Instrument Serif"', '700 30px "Archivo Variable"'];
    Promise.all(families.map((f) => doc.fonts.load(f)))
      .then(() => doc.fonts.ready)
      .finally(() => continueRender(handle));
  }, [handle]);

  useLayoutEffect(() => {
    frameRef.current?.contentWindow?.scrollTo(0, scrollY);
  });

  return (
    <>
      <iframe ref={frameRef} title="Ball Manager mobile" style={{ width, height, border: 0, display: "block", background: "var(--background)", ...style }} />
      {mount ? createPortal(children, mount) : null}
    </>
  );
}
