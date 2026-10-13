import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getPublicClub, type PublicClubDto } from "@/lib/api/publicTables";
import { ApiError } from "@/lib/api/client";
import { PublicShell } from "@/components/public/PublicShell";
import { appStoreId } from "@/config/ios-app";

/** Manifeste PWA du club : l'application installée s'ouvre directement sur l'accueil de CE club. */
export async function generateMetadata({ params }: { params: Promise<{ clubSlug: string }> }): Promise<Metadata> {
  const { clubSlug } = await params;
  // Smart App Banner de Safari (seulement quand l'app est publiée) : « Ouvrir » si installée, sinon App Store.
  const appId = appStoreId();
  return {
    manifest: `/public/${encodeURIComponent(clubSlug)}/manifest.webmanifest`,
    ...(appId ? { itunes: { appId, appArgument: `https://www.ball-manager.fr/public/${encodeURIComponent(clubSlug)}/accueil` } } : {}),
  };
}

/**
 * Layout commun de l'espace public sans compte : résout le club une fois
 * (404 si slug inconnu/suspendu) et pose le shell public (onglets + barre
 * du bas, retour du club, 2026-10-01). Volontairement HORS de
 * `/c/[clubSlug]` : `/public` est listé dans `PUBLIC_PATHS` (src/config/site.ts).
 */
export default async function PublicClubLayout({ children, params }: { children: ReactNode; params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  let club: PublicClubDto;
  try {
    club = await getPublicClub(clubSlug);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  return (
    <PublicShell clubSlug={clubSlug} club={{ name: club.name, logoUrl: club.logoUrl, accentColor: club.accentColor }}>
      {children}
    </PublicShell>
  );
}
