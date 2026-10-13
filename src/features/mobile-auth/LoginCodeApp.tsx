"use client";

import { useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { ApiError } from "@/lib/api/errors";
import { deviceAuth } from "@/lib/api/deviceAuth";

/**
 * Lien de connexion à usage unique reçu par email (AUTH_LINK_CODES=1).
 * Ouvrir la page ne consomme RIEN (un scanner d'email peut la précharger sans
 * effet) : c'est le bouton qui échange le code. Le lien personnel obtenu suit
 * ensuite le chemin habituel du web (fragment lu puis retiré de l'URL, session
 * HttpOnly). Si l'app iOS est installée, ce lien l'ouvre directement.
 */
export function LoginCodeApp({ clubSlug, clubName, code }: { clubSlug: string; clubName: string; code: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; renew: boolean } | null>(null);

  async function continueWeb() {
    setBusy(true);
    setError(null);
    try {
      const { tokens, redirectPath } = await deviceAuth.exchangeForWeb(clubSlug, code);
      const target = redirectPath && redirectPath.startsWith(`/public/${clubSlug}/`) ? redirectPath : `/public/${clubSlug}/accueil`;
      window.location.replace(`${target}#token=${encodeURIComponent(tokens[0]!)}`);
    } catch (err) {
      const renew = err instanceof ApiError && ["CODE_USED", "CODE_EXPIRED", "INVALID_CODE", "INVALID_PERSONAL_LINK"].includes(err.code);
      setError({ message: err instanceof Error ? err.message : "Connexion impossible.", renew });
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto flex w-full max-w-md flex-col gap-5">
      <h1 className="text-[18px] font-semibold text-foreground">Connexion à {clubName}</h1>
      <p className="text-[15px] text-foreground">Ce lien de connexion ne fonctionne qu&apos;une fois. Touche le bouton pour ouvrir ton espace.</p>
      {error ? <Notice tone="danger">{error.message}</Notice> : null}
      {error?.renew ? (
        <Link href={`/public/${clubSlug}/connexion`} className="text-[15px] font-medium text-accent-text hover:underline">
          Recevoir un nouveau lien
        </Link>
      ) : (
        <Button size="lg" loading={busy} icon={<LogIn />} onClick={() => void continueWeb()}>
          Me connecter
        </Button>
      )}
    </Card>
  );
}
