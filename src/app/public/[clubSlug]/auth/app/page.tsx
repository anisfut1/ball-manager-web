import type { Metadata } from "next";
import { getPublicClub } from "@/lib/api/publicTables";
import { PageContainer } from "@/components/ui/PageHeader";
import { AppSignInApp } from "@/features/mobile-auth/AppSignInApp";
import { parseSsoRequest } from "@/features/mobile-auth/sso-request";

export const metadata: Metadata = { title: "Connexion à l'application", robots: { index: false } };

/** Connexion de l'app iOS depuis Safari (ASWebAuthenticationSession + PKCE). Voir docs/IOS_SECURITY.md. */
export default async function AppSignInPage({ params, searchParams }: { params: Promise<{ clubSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ clubSlug }, query] = await Promise.all([params, searchParams]);
  const club = await getPublicClub(clubSlug);
  return (
    <PageContainer className="gap-6">
      <AppSignInApp clubSlug={clubSlug} clubName={club.name} request={parseSsoRequest(query, clubSlug)} />
    </PageContainer>
  );
}
