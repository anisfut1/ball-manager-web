import type { ReactNode } from "react";
import { __setPathname } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { buildClubNav } from "@/components/shell/nav";
import type { ShellUser } from "@/components/shell/types";
import type { ClubRole } from "@/lib/permissions/roles";
import { BASE, CLUB, USER, WORKSPACE } from "../data/demo";

const ADMIN_SECTIONS = buildClubNav(CLUB.slug, ["club_admin"]);

/**
 * L'application réelle : le VRAI AppShell (Sidebar, Topbar, accent club,
 * #overlay-root), la VRAIE navigation calculée par buildClubNav pour un
 * club_admin. Seul le chemin courant est fourni par la scène.
 * `flow` : dans un viewport mobile (iframe), le shell suit le document
 * (défilement réel) au lieu d'être posé sur la scène 1920×1080.
 */
export function ProductShell({ pathname, hideBrand = false, roles, user = USER, flow = false, children }: { pathname: string; hideBrand?: boolean; roles?: ClubRole[]; user?: ShellUser; flow?: boolean; children: ReactNode }) {
  __setPathname(`${BASE}${pathname}`);
  const sections = roles ? buildClubNav(CLUB.slug, roles) : ADMIN_SECTIONS;
  return (
    <div className={hideBrand ? "brand-hidden" : undefined} style={flow ? { display: "flex", flexDirection: "column", flex: 1, background: "var(--background)" } : { position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "var(--background)", overflow: "hidden" }}>
      <AppShell variant="club" sections={sections} current={WORKSPACE} workspaces={[WORKSPACE]} user={user} isPlatformAdmin={false} accentColor={CLUB.accentColor} publicHref={`/public/${CLUB.slug}/matchs`}>
        {children}
      </AppShell>
    </div>
  );
}

/** Position (scène) de la marque Ball Manager dans la Sidebar réelle : lien mx-3 mt-3 h-10 px-2, image 28 px. */
export const SIDEBAR_BRAND = { x: 20, y: 18, size: 28 };
