import type { TableAssignmentsForMatchDto } from "@/lib/api/tables";

/**
 * Fonction pure isolée pour être testable indépendamment du rendu (même
 * principe que le moteur de suggestion côté ball-manager-back).
 *
 * `refereeNotNeeded` (retour du club, 2026-09-28 : "pas besoin d'arbitre")
 * retire le poste Arbitre du compte pour CE match, dans les deux sens :
 * ni compté dans `totalSlots`, ni dans `toAssign`, même s'il vaut `null` —
 * un club qui n'a jamais besoin d'arbitre ne doit jamais voir de "postes à
 * attribuer" fantômes.
 */
export function computeDaySummary(matches: TableAssignmentsForMatchDto[]): { matchCount: number; totalSlots: number; assignedSlots: number; toAssign: number; conflictSlots: number } {
  let totalSlots = 0;
  let assignedSlots = 0;
  let conflictSlots = 0;

  for (const m of matches) {
    const requiredSlots = [m.assignments.scorer, m.assignments.timekeeper, m.assignments.clubDelegate, ...(m.refereeNotNeeded ? [] : [m.assignments.referee])];
    totalSlots += requiredSlots.length;
    assignedSlots += requiredSlots.filter(Boolean).length;
    conflictSlots += [m.assignments.scorer, m.assignments.timekeeper, m.assignments.clubDelegate, m.assignments.referee].filter((s) => s?.hasConflict).length;
  }

  return { matchCount: matches.length, totalSlots, assignedSlots, toAssign: totalSlots - assignedSlots, conflictSlots };
}

/**
 * Résumé de la journée (§79 : "6 matchs domicile / 18 postes / 14
 * affectés / 4 à attribuer / 1 conflit") — bande compacte de chiffres,
 * calculée par `computeDaySummary` (inchangée).
 */
export function DaySummary({ matches }: { matches: TableAssignmentsForMatchDto[] }) {
  const { matchCount, totalSlots, assignedSlots, toAssign, conflictSlots } = computeDaySummary(matches);
  const items = [
    { label: `match${matchCount > 1 ? "s" : ""} domicile`, value: matchCount, tone: "text-foreground" },
    { label: `poste${totalSlots > 1 ? "s" : ""}`, value: totalSlots, tone: "text-foreground" },
    { label: `affecté${assignedSlots > 1 ? "s" : ""}`, value: assignedSlots, tone: "text-success" },
    { label: "à attribuer", value: toAssign, tone: toAssign > 0 ? "text-warning" : "text-foreground" },
    ...(conflictSlots > 0 ? [{ label: `conflit${conflictSlots > 1 ? "s" : ""}`, value: conflictSlots, tone: "text-danger" }] : []),
  ];
  const progress = totalSlots > 0 ? Math.round((assignedSlots / totalSlots) * 100) : 0;

  return (
    <section aria-label="Résumé de la journée" className="surface-card flex flex-col gap-4 p-4 sm:p-5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-8">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline gap-2">
            <dd className={`type-numeric text-2xl font-medium leading-none ${item.tone}`}>{item.value}</dd>
            <dt className="type-meta">{item.label}</dt>
          </div>
        ))}
      </dl>
      {totalSlots > 0 ? (
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Postes affectés">
            <div className="h-full rounded-full bg-accent shadow-[0_0_8px_var(--club-accent-glow)] transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="type-numeric text-xs text-muted">{progress}%</span>
        </div>
      ) : null}
    </section>
  );
}
