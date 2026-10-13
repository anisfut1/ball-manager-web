"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, RotateCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { FormMessage } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { SectionHeader } from "@/components/ui/PageHeader";
import { PersonAvatar } from "@/components/ui/Avatar";
import { useConfirm } from "@/components/ui/Dialog";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import type { PublicAccessEntryDto } from "@/lib/api/tables";

/**
 * Gestion admin des accès publics sans compte (retour du club, 2026-09-29 :
 * "sauf si admin remet à reset son profil"). `club_admin` uniquement (voir
 * la page appelante, `requireClubAdminContext`). La réinitialisation ne
 * touche JAMAIS les affectations déjà existantes du licencié — seul son
 * lien d'accès change (voir ball-manager-back/docs/PUBLIC_TABLE_ACCESS.md).
 */
export function PublicAccessList({ clubId, entries }: { clubId: string; entries: PublicAccessEntryDto[] }) {
  const router = useRouter();
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  async function reset(licencieId: string, label: string) {
    const ok = await confirm({
      title: "Réinitialiser l'accès public ?",
      description: `Réinitialiser l'accès public de ${label} ? Son lien actuel cessera de fonctionner ; il pourra en redemander un depuis le lien commun, envoyé à l'email de sa fiche.`,
      confirmLabel: "Réinitialiser",
      destructive: true,
    });
    if (!ok) return;

    setResettingId(licencieId);
    setError(null);
    try {
      await browserApi.tables.resetPublicAccess(clubId, licencieId);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Réinitialisation impossible.");
    } finally {
      setResettingId(null);
    }
  }

  if (entries.length === 0) {
    return <EmptyState icon={<Users />} title="Aucun licencié actif" description="Rien à afficher — aucun licencié actif dans ce club." />;
  }

  const claimedCount = entries.filter((e) => e.claimed).length;

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Licenciés" description={`${claimedCount} lien${claimedCount > 1 ? "s" : ""} revendiqué${claimedCount > 1 ? "s" : ""} sur ${entries.length}`} />
      {error ? <FormMessage tone="danger">{error}</FormMessage> : null}
      <ul className="surface-card divide-y divide-border overflow-hidden">
        {entries.map((entry) => {
          const label = `${entry.licencie.firstName} ${entry.licencie.lastName}`;
          return (
            <li key={entry.licencie.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <PersonAvatar name={label} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{label}</span>
                <span className="type-meta truncate">{entry.claimed ? (entry.email ? `Lien revendiqué — ${entry.email}` : "Lien revendiqué") : "Lien non revendiqué"}</span>
              </div>
              {entry.claimed ? (
                <>
                  <StatusBadge tone="success" icon={<Link2 />} size="sm" className="hidden sm:inline-flex">
                    Revendiqué
                  </StatusBadge>
                  <Button variant="secondary" size="sm" loading={resettingId === entry.licencie.id} onClick={() => reset(entry.licencie.id, label)} icon={<RotateCcw />}>
                    Réinitialiser
                  </Button>
                </>
              ) : (
                <StatusBadge tone="neutral" size="sm">
                  Non revendiqué
                </StatusBadge>
              )}
            </li>
          );
        })}
      </ul>
      {confirmDialog}
    </section>
  );
}
