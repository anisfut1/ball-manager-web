"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Hourglass, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { SectionHeader } from "@/components/ui/PageHeader";
import { PersonAvatar } from "@/components/ui/Avatar";
import { useConfirm } from "@/components/ui/Dialog";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import type { AdminAccountLinkDto } from "@/lib/api/accounts";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

/**
 * « Demandes de rattachement » : un compte demande à suivre un licencié
 * alors que son adresse n'est pas connue sur la fiche (parent, nouvelle
 * adresse…). Accepter donne au compte les mêmes droits que les autres comptes
 * de ce licencié. Masqué quand il n'y en a aucune.
 */
export function AccountLinkRequestsPanel({ clubId, requests }: { clubId: string; requests: AdminAccountLinkDto[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  if (requests.length === 0) return null;

  async function decide(request: AdminAccountLinkDto, decision: "accept" | "refuse") {
    const name = `${request.firstName} ${request.lastName}`;
    const ok = await confirm(
      decision === "accept"
        ? { title: `Rattacher ${request.email ?? "ce compte"} à ${name} ?`, description: `Ce compte pourra voir l'espace de ${request.firstName} et répondre pour lui. Accepte seulement si tu sais que c'est lui ou un proche (parent).`, confirmLabel: "Accepter" }
        : { title: "Refuser la demande ?", description: `Le compte n'aura pas accès à l'espace de ${request.firstName}.`, confirmLabel: "Refuser", destructive: true },
    );
    if (!ok) return;
    setBusy(`${request.id}:${decision}`);
    setError(null);
    try {
      await browserApi.accountLinks.decide(clubId, request.id, decision);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action impossible pour le moment.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Demandes de rattachement" description={`${requests.length} compte${requests.length > 1 ? "s demandent" : " demande"} à suivre un licencié. Rien n'est accessible avant ta décision.`} />
      {error ? <FormMessage tone="danger">{error}</FormMessage> : null}
      <ul className="surface-card divide-y divide-border overflow-hidden">
        {requests.map((request) => {
          const name = `${request.firstName} ${request.lastName}`;
          return (
            <li key={request.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <PersonAvatar name={name} size="sm" />
              <div className="flex min-w-0 flex-1 basis-48 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{name}</span>
                <span className="type-meta truncate">
                  <Hourglass className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
                  {request.email ?? "Compte sans adresse"} · {dateFormat.format(new Date(request.createdAt))}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" icon={<Check />} loading={busy === `${request.id}:accept`} onClick={() => void decide(request, "accept")}>
                  Accepter
                </Button>
                <Button size="sm" variant="ghost" icon={<X />} loading={busy === `${request.id}:refuse`} onClick={() => void decide(request, "refuse")}>
                  Refuser
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {confirmDialog}
    </section>
  );
}
