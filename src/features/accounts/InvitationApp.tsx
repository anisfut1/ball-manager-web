"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { usePublicIdentity } from "@/features/public/PublicIdentityProvider";
import { AccountAuthForm } from "./AccountAuthForm";
import { getAccountAccessToken } from "@/lib/account/client";
import { acceptInvite } from "@/lib/api/accounts";
import { ApiError } from "@/lib/api/errors";

function subscribeHash(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** Code mémorisé : l'URL est nettoyée après acceptation, sans perdre le code affiché. */
let lastCode: string | null = null;
function readHashCode(): string {
  const fromHash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (/^[A-Za-z0-9_-]{16,64}$/.test(fromHash)) lastCode = fromHash;
  return lastCode ?? "";
}

/**
 * `/public/{slug}/invitation#<code>` — invitation d'un proche : on se
 * connecte (ou on crée son compte), puis le licencié est ajouté au compte.
 * Le code reste dans le fragment de l'URL : jamais envoyé au serveur web.
 */
export function InvitationApp({ clubSlug }: { clubSlug: string }) {
  const { account, club, refresh } = usePublicIdentity();
  const router = useRouter();
  // Code lu dans le fragment côté navigateur seulement (`null` au rendu serveur, `""` s'il est invalide).
  const code = useSyncExternalStore(subscribeHash, readHashCode, () => null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    if (!code) return;
    setBusy(true);
    setError(null);
    try {
      const accessToken = await getAccountAccessToken(clubSlug);
      if (!accessToken) {
        refresh();
        return;
      }
      await acceptInvite(clubSlug, accessToken, code);
      window.history.replaceState(null, "", window.location.pathname);
      refresh();
      router.replace(`/public/${clubSlug}/accueil`);
    } catch (err) {
      setError(err instanceof ApiError && err.status < 500 ? err.message : "Impossible pour le moment. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  if (code === "") {
    return (
      <div className="mx-auto w-full max-w-md py-6">
        <Notice tone="warning" title="Invitation introuvable">
          Ce lien est incomplet. Demande à la personne qui t&apos;a invité de te le renvoyer.
        </Notice>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-6">
      <PageHeader eyebrow={club.name} title="Tu es invité" description="Un proche t'invite à suivre un licencié du club avec ton propre compte." />
      <Card className="flex flex-col gap-4 p-5 sm:p-7">
        {account ? (
          <>
            <p className="text-[15px] leading-relaxed text-muted">
              Connecté avec <span className="font-medium text-foreground">{account.email}</span>.
            </p>
            {error ? (
              <Notice tone="danger" live>
                {error}
              </Notice>
            ) : null}
            <Button variant="primary" size="lg" loading={busy} icon={<Link2 />} onClick={() => void accept()} disabled={!code}>
              Accepter l&apos;invitation
            </Button>
          </>
        ) : account === null ? (
          <>
            <AccountAuthForm clubSlug={clubSlug} intro="Crée ton compte (ou connecte-toi) pour accepter l'invitation." onAuthenticated={accept} />
            {error ? (
              <Notice tone="danger" live>
                {error}
              </Notice>
            ) : null}
          </>
        ) : null}
      </Card>
    </div>
  );
}
