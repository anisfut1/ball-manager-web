"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Rappel du lien commun à distribuer (retour du club, 2026-09-29 : "je vais
 * envoyer le lien à tout le monde"). Un seul lien, sans jeton — chacun
 * retrouve ensuite son nom (`LicensedAccessGate`) et reçoit son
 * lien personnel par email (2026-10-01).
 */
export function PublicLinkBanner({ clubSlug }: { clubSlug: string }) {
  const [copied, setCopied] = useState(false);
  // Page de connexion : un nouveau s'y identifie, quelqu'un de déjà reconnu part directement sur son accueil.
  const path = `/public/${clubSlug}/connexion`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible (permissions navigateur) — le lien reste affiché ci-dessous, copiable à la main.
    }
  }

  return (
    <Card variant="glow">
      <CardHeader icon={<Link2 />} title="Lien commun à distribuer" description="Un seul lien pour tout le monde — chacun tape son nom, reçoit son lien personnel par email puis arrive sur son accueil." />
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="type-numeric min-w-0 flex-1 truncate rounded-md border border-border bg-surface px-3 py-2.5 text-[13px] text-foreground">{path}</code>
        <Button variant={copied ? "success" : "primary"} onClick={copy} icon={copied ? <Check /> : <Copy />}>
          {copied ? "Copié !" : "Copier le lien"}
        </Button>
      </div>
      <p aria-live="polite" className="sr-only">
        {copied ? "Lien copié dans le presse-papiers" : ""}
      </p>
    </Card>
  );
}
