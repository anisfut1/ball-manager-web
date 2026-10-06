import type { ReactNode } from "react";
import { __setPathname } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { buildClubNav } from "@/components/shell/nav";
import { BASE, CLUB, USER, WORKSPACE } from "../data/demo";

const SECTIONS = buildClubNav(CLUB.slug, ["club_admin"]);

/**
 * L'application réelle : le VRAI AppShell (Sidebar, Topbar, accent club,
 * #overlay-root), la VRAIE navigation calculée par buildClubNav pour un
 * club_admin. Seul le chemin courant est fourni par la scène.
 */
export function ProductShell({ pathname, hideBrand = false, children }: { pathname: string; hideBrand?: boolean; children: ReactNode }) {
  __setPathname(`${BASE}${pathname}`);
  return (
    <div className={hideBrand ? "brand-hidden" : undefined} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "var(--background)", overflow: "hidden" }}>
      <AppShell variant="club" sections={SECTIONS} current={WORKSPACE} workspaces={[WORKSPACE]} user={USER} isPlatformAdmin={false} accentColor={CLUB.accentColor} publicHref={`/public/${CLUB.slug}/matchs`}>
        {children}
      </AppShell>
    </div>
  );
}

/** Position (scène) de la marque Ball Manager dans la Sidebar réelle : lien mx-3 mt-3 h-10 px-2, image 28 px. */
export const SIDEBAR_BRAND = { x: 20, y: 18, size: 28 };
