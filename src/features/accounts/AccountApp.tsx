"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Hourglass, Loader2, LogOut, Share2, Trash2, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { PersonAvatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";
import { usePublicIdentity } from "@/features/public/PublicIdentityProvider";
import { LicensedSearchCard } from "@/features/licensed-access/LicensedSearchCard";
import { AccountAuthForm } from "./AccountAuthForm";
import { getAccountAccessToken, signOutAccount } from "@/lib/account/client";
import { createInvite, deleteAccount, unlinkLicencie, type AccountInviteDto, type AccountPersonDto } from "@/lib/api/accounts";
import { ApiError } from "@/lib/api/errors";

function messageOf(err: unknown): string {
  return err instanceof ApiError && err.status < 500 ? err.message : "Impossible pour le moment. Réessaie dans un instant.";
}

/**
 * `/public/{slug}/compte` — Mon compte : licenciés suivis, invitation d'un
 * proche, ajout d'un licencié, déconnexion et suppression du compte
 * (exigence App Store, même écran que l'app iOS).
 */
export function AccountApp({ clubSlug }: { clubSlug: string }) {
  const { account, club, refresh, forget } = usePublicIdentity();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [invite, setInvite] = useState<{ person: AccountPersonDto; invite: AccountInviteDto } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (account === undefined) {
    return (
      <div role="status" className="flex flex-1 items-center justify-center gap-3 py-24 text-sm text-muted">
        <Loader2 aria-hidden className="size-5 animate-spin" />
        Chargement…
      </div>
    );
  }

  if (account === null) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-6">
        <PageHeader eyebrow={club.name} title="Mon compte" description="Un compte par personne : chaque parent peut avoir le sien, et suivre plusieurs enfants." />
        <Card className="p-5 sm:p-7">
          <AccountAuthForm clubSlug={clubSlug} onAuthenticated={refresh} />
        </Card>
      </div>
    );
  }

  async function withToken<T>(key: string, run: (accessToken: string) => Promise<T>): Promise<T | undefined> {
    setBusy(key);
    setError(null);
    try {
      const accessToken = await getAccountAccessToken(clubSlug);
      if (!accessToken) {
        refresh();
        return undefined;
      }
      return await run(accessToken);
    } catch (err) {
      setError(messageOf(err));
      return undefined;
    } finally {
      setBusy(null);
    }
  }

  async function openInvite(person: AccountPersonDto) {
    const created = await withToken(`invite-${person.licencieId}`, (t) => createInvite(clubSlug, t, person.licencieId));
    if (created) {
      setCopied(false);
      setInvite({ person, invite: created });
    }
  }

  async function shareInvite() {
    if (!invite) return;
    const text = `Rejoins l'espace de ${invite.person.firstName} sur Ball Manager (${club.name}) : ${invite.invite.url}`;
    if (navigator.share) {
      await navigator.share({ title: "Ball Manager", text }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(invite.invite.url).catch(() => undefined);
    setCopied(true);
  }

  async function unlink(person: AccountPersonDto) {
    await withToken(`unlink-${person.licencieId}`, (t) => unlinkLicencie(clubSlug, t, person.licencieId));
    refresh();
  }

  async function removeAccount() {
    const done = await withToken("delete", async (t) => {
      await deleteAccount(clubSlug, t);
      return true;
    });
    if (done) {
      await signOutAccount(clubSlug);
      forget();
      router.replace(`/public/${clubSlug}/accueil`);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-2">
      <PageHeader eyebrow={club.name} title="Mon compte" description={account.email ?? undefined} />

      {error ? (
        <Notice tone="danger" live>
          {error}
        </Notice>
      ) : null}

      <section aria-labelledby="people-title" className="flex flex-col gap-3">
        <SectionHeader id="people-title" title="Licenciés suivis" description="Toi-même, tes enfants : tu reçois leurs convocations et tu peux répondre pour eux." />
        {account.people.length === 0 ? <Notice tone="info">Ton compte ne suit encore personne dans ce club.</Notice> : null}
        {account.people.map((person) => (
          <Card key={person.licencieId} className="flex flex-wrap items-center gap-3 p-4">
            <PersonAvatar name={`${person.firstName} ${person.lastName}`} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold text-foreground">
                {person.firstName} {person.lastName}
              </p>
              {person.status === "pending" ? (
                <StatusBadge tone="neutral" icon={<Hourglass />}>
                  En attente de validation du club
                </StatusBadge>
              ) : null}
            </div>
            {person.status === "active" ? (
              <Button variant="secondary" size="sm" icon={<Share2 />} loading={busy === `invite-${person.licencieId}`} onClick={() => void openInvite(person)}>
                Inviter un proche
              </Button>
            ) : null}
            <Button variant="danger-ghost" size="sm" icon={<UserMinus />} loading={busy === `unlink-${person.licencieId}`} onClick={() => void unlink(person)}>
              Ne plus suivre
            </Button>
          </Card>
        ))}
        <Button variant="primary" icon={<UserPlus />} className="self-start" onClick={() => setAdding(true)}>
          Ajouter un licencié
        </Button>
      </section>

      <section aria-labelledby="session-title" className="flex flex-col gap-3">
        <SectionHeader id="session-title" title="Connexion" />
        <Button variant="secondary" icon={<LogOut />} className="self-start" onClick={() => void signOutAccount(clubSlug).then(() => router.replace(`/public/${clubSlug}/connexion`))}>
          Me déconnecter de cet appareil
        </Button>
      </section>

      <section aria-labelledby="delete-title" className="flex flex-col gap-3">
        <SectionHeader id="delete-title" title="Supprimer mon compte" description="Ton compte et ses accès sont supprimés. Les fiches sportives restent au club, et les comptes des autres membres de ta famille ne changent pas." />
        {confirmDelete ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" icon={<Trash2 />} loading={busy === "delete"} onClick={() => void removeAccount()}>
              Oui, supprimer définitivement
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
          </div>
        ) : (
          <Button variant="danger-ghost" icon={<Trash2 />} className="self-start" onClick={() => setConfirmDelete(true)}>
            Supprimer mon compte
          </Button>
        )}
      </section>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Ajouter un licencié" description="Retrouve le nom de ton enfant (ou le tien) pour l'ajouter à ton compte." side="bottom">
        <LicensedSearchCard clubSlug={clubSlug} clubName={club.name} returnTo="accueil" variant="bare" />
      </Sheet>

      <Sheet open={invite !== null} onClose={() => setInvite(null)} title="Inviter un proche" description={invite ? `L'autre parent (ou ${invite.person.firstName}) crée son propre compte avec ce lien et suit ${invite.person.firstName} tout de suite.` : undefined} side="bottom">
        {invite ? (
          <div className="flex flex-col gap-4">
            <p className="break-all rounded-[12px] bg-surface-muted px-3 py-2.5 font-mono text-[13px] text-foreground">{invite.invite.url}</p>
            <p className="type-meta">Valable 7 jours, pour une seule personne.</p>
            <Button variant="primary" icon={copied ? <Check /> : typeof navigator !== "undefined" && "share" in navigator ? <Share2 /> : <Copy />} onClick={() => void shareInvite()}>
              {copied ? "Lien copié" : "Partager le lien"}
            </Button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
