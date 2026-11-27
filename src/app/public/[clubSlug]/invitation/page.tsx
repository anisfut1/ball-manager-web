import type { Metadata } from "next";
import { InvitationApp } from "@/features/accounts/InvitationApp";

export const metadata: Metadata = { title: "Invitation", robots: { index: false } };

/** Invitation d'un proche (`#<code>`) : connexion ou création de compte, puis rattachement. */
export default async function InvitationPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  return <InvitationApp clubSlug={clubSlug} />;
}
