import type { ReactNode } from "react";
import { ClubLogo } from "@/components/ui/Logo";
import { BrandMark } from "@/components/brand/BrandMark";
import { PLATFORM_NAME } from "@/config/site";
import { clubAccentStyle } from "@/lib/ui/accent";
import { PublicIdentityProvider } from "@/features/public/PublicIdentityProvider";
import { InstallAppButton } from "@/features/pwa/InstallAppButton";
import { PwaReconnectNotice } from "@/features/pwa/PwaReconnectNotice";
import { PublicAccountChip } from "./PublicAccountChip";
import { PublicBottomNav, PublicTopTabs } from "./PublicNav";

/**
 * Cadre de l'espace public sans compte (/public/{slug}/...) : identité et
 * couleur du club, onglets Matchs / Tables / Dérogations (en-tête ≥ lg,
 * barre du bas en dessous), identité par lien personnel partagée par tous
 * les onglets. Aucune action d'administration ici.
 */
export function PublicShell({ clubSlug, club, children }: { clubSlug: string; club: { name: string; logoUrl: string | null; accentColor: string | null }; children: ReactNode }) {
  return (
    <PublicIdentityProvider clubSlug={clubSlug} club={{ name: club.name, logoUrl: club.logoUrl }}>
      <div style={clubAccentStyle(club.accentColor)} className="accent-scope flex min-h-full flex-1 flex-col">
        <a
          href="#main"
          className="sr-only z-[80] rounded-md bg-surface-raised px-4 py-2 text-sm font-medium shadow-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Aller au contenu
        </a>
        <header className="surface-glass sticky top-0 z-30 border-b border-border">
          <div className="mx-auto flex h-[var(--topbar-height)] w-full max-w-[var(--content-wide)] items-center gap-3 px-4 sm:px-6 lg:gap-8 lg:px-10">
            <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
              <ClubLogo name={club.name} src={club.logoUrl} size="sm" />
              <p className="min-w-0 truncate text-[15px] font-semibold text-foreground">{club.name}</p>
            </div>
            <PublicTopTabs clubSlug={clubSlug} />
            <div className="flex items-center gap-2 lg:ml-auto">
              <InstallAppButton />
              <PublicAccountChip />
            </div>
          </div>
        </header>
        <PwaReconnectNotice />
        <main id="main" tabIndex={-1} className="pb-safe-nav flex flex-1 flex-col overflow-x-clip outline-none lg:pb-0">
          {children}
        </main>
        <footer className="hidden border-t border-border lg:block">
          <div className="mx-auto flex w-full max-w-[var(--content-wide)] items-center gap-2 px-10 py-5 text-xs text-muted">
            <BrandMark className="size-5 rounded-[6px]" />
            {PLATFORM_NAME}
          </div>
        </footer>
        <PublicBottomNav clubSlug={clubSlug} />
        <div id="overlay-root" />
      </div>
    </PublicIdentityProvider>
  );
}
