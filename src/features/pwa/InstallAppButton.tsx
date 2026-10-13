"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, MoreVertical, PlusSquare, Share } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { iosNeedsSafari, readInstallEnvironment, type InstallEnvironment } from "@/lib/pwa/platform";
import { promptInstall, useNativeInstall } from "./install-prompt";
import { appStoreId } from "@/config/ios-app";

function Step({ n, icon, children }: { n: number; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-accent-ink">
        {n}
      </span>
      <span className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
        {children}
        {icon ? <span aria-hidden className="ml-1.5 inline-flex translate-y-0.5 rounded-md border border-border bg-surface px-1.5 py-0.5">{icon}</span> : null}
      </span>
    </li>
  );
}

function IosGuide({ env }: { env: InstallEnvironment }) {
  return (
    <div className="flex flex-col gap-4">
      {iosNeedsSafari(env) ? (
        <Notice tone="warning" title={env.inAppBrowser ? `Vous êtes dans ${env.inAppBrowser}` : "Utilisez Safari"}>
          {env.inAppBrowser
            ? "Ce navigateur intégré ne permet pas d'installer l'application. Ouvrez d'abord cette page dans Safari (bouton « Ouvrir dans Safari », ou icône boussole en bas à droite), puis revenez ici."
            : "L'installation sur iPhone est la plus fiable depuis Safari. Ouvrez cette page dans Safari puis suivez les étapes."}
        </Notice>
      ) : null}
      <ol className="flex flex-col gap-3.5">
        <Step n={1} icon={<Share className="size-4" />}>
          Touchez le bouton <strong>Partager</strong> de Safari (carré avec une flèche vers le haut, en bas de l&apos;écran).
        </Step>
        <Step n={2} icon={<PlusSquare className="size-4" />}>
          Faites défiler puis choisissez <strong>« Sur l&apos;écran d&apos;accueil »</strong>.
        </Step>
        <Step n={3}>
          Touchez <strong>« Ajouter »</strong> en haut à droite.
        </Step>
        <Step n={4}>Ouvrez Ball Manager depuis son icône sur l&apos;écran d&apos;accueil.</Step>
      </ol>
      <p className="type-meta">
        Astuce : ouvrez d&apos;abord votre lien personnel dans Safari, <em>puis</em> ajoutez l&apos;application à l&apos;écran d&apos;accueil — sur iOS 17.2 et plus récent, votre connexion est alors reprise automatiquement. Sinon, l&apos;application vous proposera de vous reconnaître en quelques secondes.
      </p>
    </div>
  );
}

function AndroidGuide({ env }: { env: InstallEnvironment }) {
  return (
    <div className="flex flex-col gap-4">
      {env.inAppBrowser ? (
        <Notice tone="warning" title={`Vous êtes dans ${env.inAppBrowser}`}>
          Ouvrez cette page dans Chrome (menu ⋮ puis « Ouvrir dans le navigateur ») pour pouvoir installer l&apos;application.
        </Notice>
      ) : null}
      <ol className="flex flex-col gap-3.5">
        <Step n={1} icon={<MoreVertical className="size-4" />}>
          Ouvrez le menu du navigateur.
        </Step>
        <Step n={2}>
          Choisissez <strong>« Installer l&apos;application »</strong> ou <strong>« Ajouter à l&apos;écran d&apos;accueil »</strong>.
        </Step>
        <Step n={3}>Confirmez avec « Installer ».</Step>
      </ol>
    </div>
  );
}

/**
 * Bouton discret « Installer Ball Manager » : invite native quand le navigateur
 * la propose (Android/Chrome), sinon tutoriel adapté (iPhone, Android sans
 * invite, navigateurs intégrés). Invisible quand l'application tourne déjà en
 * mode standalone.
 */
export function InstallAppButton({ className }: { className?: string }) {
  const { canPrompt, installed } = useNativeInstall();
  const [env, setEnv] = useState<InstallEnvironment | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Lecture du navigateur après l'hydratation (jamais pendant le rendu serveur).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv(readInstallEnvironment());
  }, []);

  if (!env || env.standalone || installed || env.os === "other") return null;
  // App iOS publiée : sur iPhone, c'est la bannière Safari (Smart App Banner) qui propose l'app — jamais deux invitations à la fois.
  if (env.os === "ios" && appStoreId()) return null;

  async function onClick() {
    if (canPrompt && (await promptInstall()) !== "unavailable") return;
    setOpen(true);
  }

  return (
    <>
      <Button size="sm" variant="ghost" icon={<Download aria-hidden />} onClick={onClick} className={className}>
        <span className="hidden sm:inline">Installer Ball Manager</span>
        <span className="sm:hidden">Installer</span>
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} side="bottom" title="Installer Ball Manager" description="Ouvrez le club d'un seul geste depuis votre écran d'accueil, sans navigateur.">
        {env.os === "ios" ? <IosGuide env={env} /> : <AndroidGuide env={env} />}
        <p className="type-meta mt-4 flex items-center gap-1.5">
          <ExternalLink aria-hidden className="size-3.5" />
          Aucun identifiant n&apos;est copié dans le raccourci.
        </p>
      </Sheet>
    </>
  );
}
