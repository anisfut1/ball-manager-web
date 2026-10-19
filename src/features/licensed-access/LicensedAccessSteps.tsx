import { cn } from "@/components/ui/cn";

const STEPS = ["Retrouve ton nom", "Reçois ton lien sécurisé", "Accède à ton espace"];

/** Le parcours en un coup d'œil (moins de 5 secondes de lecture). */
export function LicensedAccessSteps({ className }: { className?: string }) {
  return (
    <ol aria-label="Comment ça marche" className={cn("grid grid-cols-3 gap-2 sm:gap-3", className)}>
      {STEPS.map((label, index) => (
        <li key={label} className="licensed-rise flex flex-col gap-2 rounded-[14px] border border-border/80 bg-surface-raised/60 px-3 py-3 backdrop-blur-sm" style={{ animationDelay: `${240 + index * 70}ms` }}>
          <span className="type-numeric inline-flex size-6 items-center justify-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent-text">{index + 1}</span>
          <span className="text-[12.5px] font-medium leading-snug text-foreground sm:text-[13.5px]">{label}</span>
        </li>
      ))}
    </ol>
  );
}
