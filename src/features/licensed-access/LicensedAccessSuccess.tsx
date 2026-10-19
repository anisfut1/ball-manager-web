"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Check, Hourglass, Inbox, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

/** Pastille de confirmation : coche dans un halo, apparition douce. */
function StatusMark({ tone, children }: { tone: "success" | "info"; children: ReactNode }) {
  return (
    <span className={cn("licensed-pop relative inline-flex size-14 items-center justify-center rounded-full", tone === "success" ? "bg-success-soft text-success" : "bg-info-soft text-info")}>
      <span aria-hidden className={cn("absolute inset-0 rounded-full", tone === "success" ? "licensed-ring-success" : "licensed-ring-info")} />
      {children}
    </span>
  );
}

function Panel({ mark, title, children, onBack, backLabel }: { mark: ReactNode; title: string; children: ReactNode; onBack: () => void; backLabel: string }) {
  return (
    <div role="status" aria-live="polite" className="licensed-rise flex flex-col items-center gap-4 text-center">
      {mark}
      <div className="text-reflow flex flex-col gap-2">
        <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
        {children}
      </div>
      <Button variant="ghost" size="sm" icon={<ArrowLeft />} onClick={onBack}>
        {backLabel}
      </Button>
    </div>
  );
}

/** Lien envoyé : adresse masquée par le serveur (jamais l'adresse complète). */
export function LicensedLinkSent({ firstName, maskedEmail, onBack }: { firstName: string; maskedEmail: string; onBack: () => void }) {
  return (
    <Panel
      mark={
        <StatusMark tone="success">
          <Check aria-hidden className="size-7" strokeWidth={2.5} />
        </StatusMark>
      }
      title={`C'est envoyé, ${firstName} !`}
      onBack={onBack}
      backLabel="Ce n'est pas moi"
    >
      <p className="text-[15px] leading-relaxed text-muted">
        Ton lien sécurisé vient de partir à <span className="type-numeric font-medium text-foreground">{maskedEmail}</span>, l&apos;adresse enregistrée auprès du club.
      </p>
      <p className="text-[15px] leading-relaxed text-muted">Ouvre-le sur cet appareil pour accéder à ton espace.</p>
      <p className="mx-auto mt-1 flex max-w-sm items-start gap-2 rounded-[12px] bg-surface-muted/70 px-3 py-2.5 text-left text-[13px] leading-relaxed text-muted">
        <Inbox aria-hidden className="mt-0.5 size-4 shrink-0 text-subtle" />
        <span>
          Rien reçu d&apos;ici quelques minutes ? Regarde dans tes indésirables et marque-le « Ce n&apos;est pas un spam ». Chaque nouvelle demande remplace l&apos;ancien lien.
        </span>
      </p>
    </Panel>
  );
}

/** Adresse différente de celle de la fiche : l'administrateur du club valide avant tout envoi. */
export function LicensedLinkPending({ firstName, email, clubName, onBack }: { firstName: string; email: string; clubName: string; onBack: () => void }) {
  return (
    <Panel
      mark={
        <StatusMark tone="info">
          <Hourglass aria-hidden className="size-6" />
        </StatusMark>
      }
      title={`Demande transmise, ${firstName}`}
      onBack={onBack}
      backLabel="Revenir à la recherche"
    >
      <p className="text-[15px] leading-relaxed text-muted">
        Pour protéger ton profil, l&apos;administrateur de {clubName} vérifie que <span className="font-medium text-foreground">{email}</span> est bien ton adresse. Ton lien arrive par email dès qu&apos;il valide.
      </p>
      <p className="type-meta">Sans réponse sous 14 jours, la demande expire : contacte directement le club.</p>
    </Panel>
  );
}

/** « Je ne me trouve pas » : demande partie chez les administrateurs du club. */
export function LicensedRequestSent({ email, clubName, onBack }: { email: string; clubName: string; onBack: () => void }) {
  return (
    <Panel
      mark={
        <StatusMark tone="success">
          <Send aria-hidden className="size-6" />
        </StatusMark>
      }
      title="Demande envoyée"
      onBack={onBack}
      backLabel="Revenir à la recherche"
    >
      <p className="text-[15px] leading-relaxed text-muted">
        L&apos;administrateur de {clubName} va vérifier ta fiche et te répondre à <span className="font-medium text-foreground">{email}</span>.
      </p>
    </Panel>
  );
}
