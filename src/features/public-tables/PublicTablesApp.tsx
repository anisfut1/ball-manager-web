"use client";

import { ListSkeleton } from "@/components/ui/Skeleton";
import { usePublicIdentity } from "@/features/public/PublicIdentityProvider";
import { LicensedAccessGate } from "@/features/licensed-access/LicensedAccessGate";
import { BoardView } from "./BoardView";

/**
 * Onglet Tables de l'espace public : identification par lien personnel
 * envoyé par email (`LicensedAccessGate`, retour du club, 2026-10-01) puis
 * tableau de positionnement (`BoardView`). L'identité est partagée par tout
 * l'espace public (`PublicIdentityProvider`, posé par le layout) — aucune
 * session Supabase nulle part dans cet arbre.
 */
export function PublicTablesApp({ clubSlug, clubTimezone }: { clubSlug: string; clubTimezone: string }) {
  const { identity, forget } = usePublicIdentity();

  if (identity === undefined) return <ListSkeleton rows={4} />;

  if (identity === null) {
    return <LicensedAccessGate module="tables" />;
  }

  return <BoardView clubSlug={clubSlug} clubTimezone={clubTimezone} token={identity.token} me={identity.licencie} canManage={identity.tables.canManage} onLogout={forget} />;
}
