"use client";

import { useId, type ReactNode } from "react";
import { Check, Lock } from "lucide-react";
import { ClubLogo } from "@/components/ui/Logo";
import { usePublicIdentity } from "@/features/public/PublicIdentityProvider";
import { LicensedAccessSteps } from "./LicensedAccessSteps";
import { LicensedSearchCard } from "./LicensedSearchCard";
import { licensedAccessModules, type LicensedAccessModuleId } from "./modules";

/**
 * Porte d'entrée commune de tous les espaces réservés aux licenciés (Mon
 * espace, Équipe, Planning, Entraînements, Tables de marque, Dérogations,
 * connexion de l'app). Identité : Ball Manager + club + module. Le club
 * vient du shell public (nom, logo, couleur via `--club-accent*`, déjà
 * rendue accessible) : rien n'est propre à un club ici.
 *
 * Mobile : badge, titre, une phrase, puis directement la recherche ; les
 * étapes passent sous la carte. Desktop : hero à gauche, carte à droite.
 */
export function LicensedAccessGate({ module, description, notice }: { module: LicensedAccessModuleId; description?: string; notice?: ReactNode }) {
  const { clubSlug, club } = usePublicIdentity();
  const config = licensedAccessModules[module];
  const Icon = config.icon;
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="licensed-gate relative mx-auto w-full max-w-[1080px] py-1 sm:py-4 lg:py-14">
      <LicensedBackdrop />

      <div className="relative grid items-center gap-x-16 gap-y-5 [grid-template-areas:'hero'_'card'_'steps'] lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-y-8 lg:[grid-template-areas:'hero_card'_'steps_card']">
        <div className="licensed-rise flex flex-col gap-3 [grid-area:hero] lg:gap-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {/* Le nom du club est déjà dans l'en-tête sur mobile. */}
            <span className="hidden min-w-0 items-center gap-2 lg:inline-flex">
              <ClubLogo name={club.name} src={club.logoUrl} size="xs" />
              <span className="truncate text-[13px] font-semibold text-foreground">{club.name}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-border bg-accent-softer px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-text">
              <Lock aria-hidden className="size-3" strokeWidth={2.5} />
              Accès réservé aux licenciés
            </span>
          </div>

          <div className="flex items-center gap-3.5 lg:flex-col lg:items-start lg:gap-6">
            {/* Bulles flottantes : module (+ club sur desktop). Décoratives. */}
            <div aria-hidden className="relative shrink-0">
              <span className="licensed-bubble licensed-float inline-flex size-12 items-center justify-center rounded-[16px] text-accent-text lg:size-20 lg:rounded-[24px]">
                <Icon className="size-6 lg:size-9" strokeWidth={1.75} />
              </span>
              <span className="licensed-float-late absolute -right-12 top-7 hidden lg:block">
                <span className="licensed-bubble inline-flex size-12 items-center justify-center rounded-full p-1.5">
                  <ClubLogo name={club.name} src={club.logoUrl} size="sm" className="border-0 shadow-none" />
                </span>
              </span>
              <span className="licensed-orb-dot absolute -left-5 -top-3 hidden size-3 rounded-full lg:block" />
              <span className="licensed-orb-dot absolute -bottom-4 left-24 hidden size-2 rounded-full lg:block" />
            </div>
            <div className="min-w-0">
              <h1 id={titleId} className="text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] text-foreground sm:text-[34px] lg:text-[52px]">
                {config.title}
              </h1>
              {config.audience ? <p className="mt-1.5 text-[12.5px] font-medium text-muted lg:hidden">{config.audience}</p> : null}
            </div>
          </div>

          <p className="max-w-[46ch] text-[15px] leading-relaxed text-muted lg:text-[18px]">{description ?? config.description}</p>
          {config.audience ? (
            <p className="hidden w-fit items-center gap-2 rounded-full border border-border bg-surface-raised/70 px-3 py-1.5 text-[13px] font-medium text-foreground lg:inline-flex">
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
              {config.audience}
            </p>
          ) : null}
        </div>

        <div className="licensed-rise flex flex-col gap-3 [grid-area:card] lg:self-center" style={{ animationDelay: "90ms" }}>
          {notice}
          <LicensedSearchCard clubSlug={clubSlug} clubName={club.name} returnTo={config.returnTo} />
          <p className="px-2 text-center text-[12.5px] leading-relaxed text-muted">
            <span className="mr-1.5 inline-flex size-4 translate-y-[3px] items-center justify-center rounded-full bg-success-soft align-top text-success">
              <Check aria-hidden className="size-3" strokeWidth={3} />
            </span>
            Connexion mémorisée ensuite sur cet appareil, sans mot de passe.
          </p>
        </div>

        <LicensedAccessSteps className="[grid-area:steps] lg:self-start" />
      </div>
    </section>
  );
}

/**
 * Ambiance de fond : nacre très légèrement teintée par l'accent du club,
 * trame de points estompée, halos et orbes lents. Pur CSS (aucun canvas),
 * figé si l'utilisateur réduit les animations.
 */
function LicensedBackdrop() {
  return (
    <div aria-hidden className="licensed-backdrop pointer-events-none absolute inset-y-[-6rem] left-1/2 w-screen -translate-x-1/2 overflow-hidden">
      <span className="licensed-grid absolute inset-0" />
      <span className="licensed-halo licensed-halo-a absolute" />
      <span className="licensed-halo licensed-halo-b absolute" />
      <span className="licensed-orb licensed-orb-a absolute" />
      <span className="licensed-orb licensed-orb-b absolute" />
    </div>
  );
}
