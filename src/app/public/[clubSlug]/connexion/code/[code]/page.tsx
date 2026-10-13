import type { Metadata } from "next";
import { getPublicClub } from "@/lib/api/publicTables";
import { PageContainer } from "@/components/ui/PageHeader";
import { LoginCodeApp } from "@/features/mobile-auth/LoginCodeApp";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

/** Lien de connexion à usage unique (le GET n'utilise jamais le code). */
export default async function LoginCodePage({ params }: { params: Promise<{ clubSlug: string; code: string }> }) {
  const { clubSlug, code } = await params;
  const club = await getPublicClub(clubSlug);
  return (
    <PageContainer className="gap-6">
      <LoginCodeApp clubSlug={clubSlug} clubName={club.name} code={code} />
    </PageContainer>
  );
}
