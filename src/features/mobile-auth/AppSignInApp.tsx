"use client";

import { useState } from "react";
import { ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { PublicLoginPanel } from "@/features/public/PublicLoginApp";
import { usePublicIdentity } from "@/features/public/PublicIdentityProvider";
import { deviceAuth } from "@/lib/api/deviceAuth";
import { getDeviceTokens } from "@/lib/publicToken";
import { callbackUrl, type SsoRequest } from "./sso-request";

/**
 * « Continuer avec Ball Manager » : page ouverte par l'app iOS dans
 * ASWebAuthenticationSession. Si ce navigateur connaît déjà la personne
 * (session web), elle confirme et l'app reçoit un code court, à usage unique,
 * lié à son PKCE — jamais le lien personnel. Sinon : recevoir son lien par
 * email, qui ouvrira directement l'app.
 */
export function AppSignInApp({ clubSlug, clubName, request }: { clubSlug: string; clubName: string; request: SsoRequest | null }) {
  const { identity } = usePublicIdentity();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!request) return <Notice tone="danger" title="Demande de connexion invalide">Ferme cette fenêtre et réessaie depuis l&apos;application Ball Manager.</Notice>;
  if (identity === undefined) return <ListSkeleton rows={3} />;
  if (identity === null) {
    return <PublicLoginPanel returnTo="accueil" title="Se connecter à l'application" lead={`Ce navigateur ne te connaît pas encore pour ${clubName}. Retrouve ton nom pour recevoir ton lien par email : il ouvrira directement l'application Ball Manager.`} />;
  }

  async function confirm() {
    if (!request || !identity) return;
    setBusy(true);
    setError(null);
    try {
      const tokens = [...new Set([identity.token, ...getDeviceTokens(clubSlug)])].slice(0, 8);
      const { code } = await deviceAuth.createSsoCode(clubSlug, tokens, request.codeChallenge, request.redirectPath ?? undefined);
      window.location.href = callbackUrl({ code, state: request.state });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="flex items-center gap-3 [&_svg]:size-6">
        <Smartphone aria-hidden className="text-accent-text" />
        <h1 className="text-[18px] font-semibold text-foreground">Continuer dans l&apos;application</h1>
      </div>
      <p className="text-[15px] text-foreground">
        Se connecter à Ball Manager ({clubName}) en tant que <strong>{identity.licencie.firstName} {identity.licencie.lastName}</strong>
        {getDeviceTokens(clubSlug).length > 1 ? " (et les autres personnes de ce navigateur)" : ""} ?
      </p>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <div className="flex flex-col gap-2">
        <Button size="lg" loading={busy} icon={<ShieldCheck />} onClick={() => void confirm()}>
          Continuer
        </Button>
        <Button variant="ghost" onClick={() => (window.location.href = callbackUrl({ error: "cancelled", state: request.state }))}>
          Annuler
        </Button>
      </div>
      <p className="type-meta">L&apos;application reçoit un accès qui lui est propre : ton lien personnel n&apos;est jamais transmis.</p>
    </Card>
  );
}
