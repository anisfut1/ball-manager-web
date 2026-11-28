"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRoundX, Unlink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { SectionHeader } from "@/components/ui/PageHeader";
import { PersonAvatar } from "@/components/ui/Avatar";
import { useConfirm } from "@/components/ui/Dialog";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import type { AdminAccountLinkDto } from "@/lib/api/accounts";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });

/**
 * « Comptes rattachés » : un compte suit un licencié dès qu'il le demande,
 * sans validation. Le club garde la main après coup : retirer un rattachement
 * (accès coupé, nouvelle demande bloquée) ou retirer le compte entier du club
 * (supprimé s'il ne suit personne ailleurs). Replié par défaut.
 */
export function AccountLinksPanel({ clubId, links }: { clubId: string; links: AdminAccountLinkDto[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [confirm, confirmDialog] = useConfirm();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return links;
    return links.filter((l) => `${l.firstName} ${l.lastName} ${l.email ?? ""}`.toLowerCase().includes(q));
  }, [links, query]);

  if (links.length === 0) return null;

  async function act(link: AdminAccountLinkDto, action: "remove" | "removeAccount") {
    const name = `${link.firstName} ${link.lastName}`;
    const who = link.email ?? "ce compte";
    const ok = await confirm(
      action === "remove"
        ? { title: `Retirer ${who} de ${name} ?`, description: `Ce compte n'aura plus accès à l'espace de ${link.firstName} et ne pourra pas le redemander.`, confirmLabel: "Retirer", destructive: true }
        : { title: `Supprimer le compte ${who} ?`, description: "Il perd l'accès à tous les licenciés du club. S'il ne suit personne dans un autre club, le compte est supprimé définitivement.", confirmLabel: "Supprimer le compte", destructive: true },
    );
    if (!ok) return;
    setBusy(`${link.id}:${action}`);
    setError(null);
    setNotice(null);
    try {
      if (action === "remove") {
        await browserApi.accountLinks.remove(clubId, link.id);
        setNotice(`${who} n'a plus accès à l'espace de ${link.firstName}.`);
      } else {
        const { accountDeleted } = await browserApi.accountLinks.removeAccount(clubId, link.id);
        setNotice(accountDeleted ? `Le compte ${who} est supprimé.` : `Le compte ${who} n'a plus accès au club (il reste utilisé ailleurs).`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action impossible pour le moment.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <details className="group">
        <summary className="cursor-pointer list-none">
          <SectionHeader title="Comptes rattachés" description={`${links.length} compte${links.length > 1 ? "s suivent" : " suit"} un licencié. Ouvre pour retirer un accès ou supprimer un compte.`} />
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          {error ? <FormMessage tone="danger">{error}</FormMessage> : null}
          {notice ? <FormMessage tone="success">{notice}</FormMessage> : null}
          {links.length > 8 ? (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher un nom ou un email"
              aria-label="Chercher un compte rattaché"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
          ) : null}
          <ul className="surface-card divide-y divide-border overflow-hidden">
            {visible.map((link) => {
              const name = `${link.firstName} ${link.lastName}`;
              return (
                <li key={link.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <PersonAvatar name={name} size="sm" />
                  <div className="flex min-w-0 flex-1 basis-48 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{name}</span>
                    <span className="type-meta truncate">
                      {link.email ?? "Compte sans adresse"} · depuis le {dateFormat.format(new Date(link.createdAt))}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" icon={<Unlink />} loading={busy === `${link.id}:remove`} onClick={() => void act(link, "remove")}>
                      Retirer
                    </Button>
                    <Button size="sm" variant="ghost" icon={<UserRoundX />} loading={busy === `${link.id}:removeAccount`} onClick={() => void act(link, "removeAccount")}>
                      Supprimer le compte
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </details>
      {confirmDialog}
    </section>
  );
}
