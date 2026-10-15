import { Img } from "remotion";
import icon from "@/app/icon.png";

/** Le logo réel de Ball Manager (src/app/icon.png, 512 px — même visuel que favicon et BrandMark). */
export function BrandTile({ size, style }: { size: number; style?: React.CSSProperties }) {
  return <Img src={icon} alt="" style={{ width: size, height: size, borderRadius: size * 0.22, display: "block", ...style }} />;
}
