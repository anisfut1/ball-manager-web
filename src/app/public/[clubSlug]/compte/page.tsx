import type { Metadata } from "next";
import { AccountApp } from "@/features/accounts/AccountApp";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

/** Mon compte de l'espace licencié : licenciés suivis, invitation, suppression. */
export default async function AccountPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  return <AccountApp clubSlug={clubSlug} />;
}
