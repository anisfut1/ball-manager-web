"use client";

import { ChevronRight, SearchX } from "lucide-react";
import { PersonAvatar } from "@/components/ui/Avatar";
import type { PublicLicencieMatch } from "@/lib/api/publicTables";

/** Prénom + initiale : jamais plus (ni email, ni date de naissance, ni licence) sur une page publique. */
export const licencieDisplayName = (l: PublicLicencieMatch) => `${l.firstName} ${l.lastInitial}.`;

/** Pendant la recherche : deux lignes fantômes à la place des résultats (pas de gros spinner). */
export function LicensedResultsSkeleton() {
  return (
    <div role="status" aria-label="Recherche en cours" className="flex flex-col gap-2">
      {[0, 1].map((i) => (
        <div key={i} className="flex h-16 items-center gap-3 rounded-[14px] border border-border/70 bg-surface/80 px-3.5">
          <span className="skeleton size-9 rounded-full" />
          <span className="flex flex-1 flex-col gap-1.5">
            <span className="skeleton h-3 w-28 rounded-full" />
            <span className="skeleton h-2.5 w-16 rounded-full" />
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Fiches trouvées (au plus 5, prénom + initiale). Une ligne entière est le
 * bouton « C'est moi » : grande cible tactile, clavier natif.
 */
export function LicensedSearchResults({ results, onChoose, onNotFound }: { results: PublicLicencieMatch[]; onChoose: (licencie: PublicLicencieMatch) => void; onNotFound: () => void }) {
  return (
    <div className="licensed-rise flex flex-col gap-2.5">
      <p className="px-1 text-[13px] font-medium text-muted">{results.length > 1 ? `${results.length} licenciés correspondent — lequel es-tu ?` : "Est-ce toi ?"}</p>
      <ul className="flex flex-col gap-2">
        {results.map((l, index) => (
          <li key={l.id} className="licensed-rise" style={{ animationDelay: `${index * 50}ms` }}>
            <button
              type="button"
              onClick={() => onChoose(l)}
              className="group flex min-h-16 w-full items-center gap-3 rounded-[14px] border border-border bg-surface-raised px-3.5 py-2.5 text-left shadow-1 transition-[border-color,box-shadow,transform] duration-150 hover:border-accent-border hover:shadow-glow-sm focus-visible:border-accent focus-visible:shadow-glow-sm active:scale-[0.99]"
            >
              <PersonAvatar name={licencieDisplayName(l)} />
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">{licencieDisplayName(l)}</span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-semibold text-accent-text transition-colors group-hover:bg-accent group-hover:text-accent-ink">
                C&apos;est moi
                <ChevronRight aria-hidden className="size-3.5" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onNotFound} className="self-start px-1 text-[13px] font-medium text-muted underline-offset-4 hover:text-foreground hover:underline">
        Ce n&apos;est aucun de ces noms
      </button>
    </div>
  );
}

/** Aucun licencié : jamais de message technique, une piste et une issue. */
export function LicensedNoResult({ onNotFound }: { onNotFound: () => void }) {
  return (
    <div className="licensed-rise flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-border-strong bg-surface/70 px-4 py-5 text-center">
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-surface-muted text-muted">
        <SearchX aria-hidden className="size-5" />
      </span>
      <p className="text-[15px] font-semibold text-foreground">Aucun licencié trouvé</p>
      <p className="max-w-xs text-[13.5px] leading-relaxed text-muted">Vérifie l&apos;orthographe ou essaie avec ton nom tel qu&apos;il figure sur ta licence.</p>
      <button type="button" onClick={onNotFound} className="mt-1 text-[13.5px] font-semibold text-accent-text underline-offset-4 hover:underline">
        Je ne me trouve pas : prévenir le club
      </button>
    </div>
  );
}
