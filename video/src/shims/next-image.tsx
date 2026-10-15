import { Img } from "remotion";
import type { CSSProperties } from "react";

/** Shim de `next/image` : `<Img>` Remotion (attend le chargement avant de capturer la frame). */
export default function Image({ src, alt, className, style, width, height }: { src: string | { src: string }; alt: string; className?: string; style?: CSSProperties; width?: number; height?: number; [key: string]: unknown }) {
  return <Img src={typeof src === "string" ? src : src.src} alt={alt} className={className} style={style} width={width} height={height} />;
}
