import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";

/** Shim de `next/link` : un `<a>` inerte (aucune navigation dans une vidéo). */
type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string };
  children?: ReactNode;
  prefetch?: boolean;
  scroll?: boolean;
  replace?: boolean;
};

const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, prefetch: _p, scroll: _s, replace: _r, ...rest }, ref) {
  return <a ref={ref} href={typeof href === "string" ? href : (href.pathname ?? "#")} {...rest} />;
});

export default Link;
