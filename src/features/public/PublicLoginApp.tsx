"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LicensedAccessGate } from "@/features/licensed-access/LicensedAccessGate";
import { usePublicIdentity } from "./PublicIdentityProvider";

/**
 * `/public/{slug}/connexion` — lien direct à partager aux nouveaux. Déjà
 * reconnu → accueil. Les onglets restent visibles : rien n'est bloqué.
 */
export function PublicLoginApp({ clubSlug }: { clubSlug: string }) {
  const { identity } = usePublicIdentity();
  const router = useRouter();
  const home = `/public/${clubSlug}/accueil`;

  useEffect(() => {
    if (identity) router.replace(home);
  }, [identity, home, router]);

  if (identity !== null) {
    return (
      <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-sm text-muted">
        <Loader2 aria-hidden className="size-5 animate-spin" />
        {identity ? "Ouverture de ton espace…" : "Chargement…"}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 px-4 pb-10">
      <LicensedAccessGate module="home" />
      <Link href={`/public/${clubSlug}/resultats`} className="type-meta relative underline-offset-4 hover:text-foreground hover:underline">
        Voir les résultats et les matchs sans me connecter
      </Link>
    </div>
  );
}
