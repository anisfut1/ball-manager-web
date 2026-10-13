import type { ReactNode } from "react";
import { requireClubContext, listUserClubs } from "@/lib/tenancy/club-context";
import { AppShell } from "@/components/shell/AppShell";
import { buildClubNav } from "@/components/shell/nav";
import { getShellIdentity } from "@/components/shell/session";

/**
 * Layout racine de tout l'espace club (/c/{slug}/...). Résout le
 * ClubContext UNE fois ici (voir src/lib/tenancy/club-context.ts) — les
 * pages filles n'ont qu'à relire `params.clubSlug` pour retrouver le même
 * contexte si elles en ont besoin côté service (§36 du brief SaaS).
 *
 * Le nom d'affichage vient de `GET /v1/me` (profiles.display_name résolu
 * par ball-manager-back) — ce repository ne lit jamais `profiles` lui-même.
 * La navigation n'expose que les sections autorisées par les rôles du
 * club courant (voir src/components/shell/nav.ts).
 */
export default async function ClubLayout({ children, params }: { children: ReactNode; params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  // requireClubContext() redirige déjà vers /login si non connecté.
  const [club, allClubs, identity] = await Promise.all([requireClubContext(clubSlug), listUserClubs(), getShellIdentity()]);

  return (
    <AppShell
      variant="club"
      sections={buildClubNav(club.slug, club.roles)}
      current={{ slug: club.slug, name: club.name, logoUrl: club.logoUrl }}
      workspaces={allClubs.map((c) => ({ slug: c.slug, name: c.name, logoUrl: c.logoUrl }))}
      user={identity.user}
      isPlatformAdmin={identity.isPlatformAdmin}
      accentColor={club.accentColor}
      publicHref={`/public/${club.slug}/matchs`}
    >
      {children}
    </AppShell>
  );
}
