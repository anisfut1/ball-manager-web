import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, ChevronLeft, ChevronRight, KeyRound } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink, buttonClasses } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Toast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { DaySummary } from "@/features/tables/DaySummary";
import { TableMatchCard } from "@/features/tables/TableMatchCard";
import { TABLE_ROLE_LABELS, chooseRolePanelTitle } from "@/features/tables/role-labels";
import type { TablesClient } from "@/features/tables/tables-client";
import { formatWeekendLabel } from "@/lib/timezone";
import { OTHER_TABLE_MATCHES, SUGGESTIONS, TABLE_MATCH, TABLE_MATCH_ASSIGNED } from "../data/demo";
import { MaskLine } from "../components/Caption";
import { PresentationCandidate, PresentationTableMatch, type CandidateTag } from "../presentation/PresentationTables";
import { dim, dimWindow, lift, shellDimCss } from "../presentation/focus";
import { enter, springAt, tween } from "../lib/motion";
import { T } from "../compositions/timeline";
import { theme } from "../theme";

const S = T.tables.start;

/**
 * Minutage interne de la scène 05 (frames globales) — V2 :
 * un match → 3 profils → 1 recommandé → « Choisir ».
 */
export const TB = {
  focusIn: S + 18,
  firstClick: S + 50,
  sheetOpen: S + 54,
  rows: S + 72,
  tags: S + 94,
  recommend: S + 122,
  suggest: S + 124,
  decide: S + 154,
  secondClick: S + 184,
  sheetClose: S + 192,
  toastOut: S + 252,
  captionOut: S + 244,
  focusOut: S + 262,
} as const;

/** Client inerte : la scène pilote l'état ; aucun appel réseau n'existe dans la vidéo. */
const STATIC_CLIENT: TablesClient = {
  suggestions: async () => SUGGESTIONS,
  assign: async () => ({ assignment: TABLE_MATCH_ASSIGNED.assignments.scorer! }),
  unassign: async () => undefined,
  setRefereeStatus: async () => undefined,
};
const noop = () => undefined;

/** Les 3 profils (données réelles du moteur, résumées en puces). */
const PROFILES: Array<{ name: string; team: string; tags: CandidateTag[]; unavailable?: boolean; recommended?: boolean }> = [
  { name: "Hugo Bernard", team: "U17 M", tags: [{ label: "Disponible", tone: "success" }, { label: "Même salle", tone: "neutral" }, { label: "1 table cette saison", tone: "neutral" }], recommended: true },
  { name: "Manon Fabre", team: "Seniors F", tags: [{ label: "Disponible", tone: "success" }, { label: "5 tables cette saison", tone: "neutral" }] },
  { name: "Inès Lambert", team: "U18 F", tags: [{ label: "Joue à 17:00", tone: "danger" }], unavailable: true },
];

function SuggestionsBody({ frame }: { frame: number }) {
  const rec = springAt(frame, TB.recommend, theme.spring.ui);
  const tagsShown = (i: number) => Math.round(tween(frame, [TB.tags + i * 4, TB.tags + i * 4 + 12], [0, 3]));
  return (
    <div className="flex flex-col gap-3">
      {PROFILES.map((p, i) => (
        <div key={p.name} data-candidate={i} style={{ ...enter(frame, TB.rows + i * 7, { y: 22, blur: 6 }).style, ...(p.recommended ? {} : dim(rec * 0.85)) }}>
          <PresentationCandidate name={p.name} team={p.team} tags={p.tags} tagsShown={tagsShown(i)} recommended={p.recommended ? rec : 0} unavailable={p.unavailable} choosing={p.recommended && frame >= TB.secondClick && frame < TB.sheetClose} />
        </div>
      ))}
    </div>
  );
}

/** Reproduction de src/app/c/[clubSlug]/tables/page.tsx : en-tête, journée et résumé réels (atténués), le match en version vidéo. */
export function TablesPage({ frame, start }: { frame: number; start: number }) {
  // Le Portal du Sheet cible #overlay-root : on attend qu'il soit dans le DOM.
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);

  const e = (d: number, o: Parameters<typeof enter>[2] = {}) => enter(frame, start + d, o).style;
  const assigned = frame >= TB.sheetClose;
  const current = assigned ? TABLE_MATCH_ASSIGNED : TABLE_MATCH;
  const open = frame >= TB.sheetOpen && frame < TB.sheetClose + 14;
  const sheetIn = springAt(frame, TB.sheetOpen, theme.spring.ui);
  const sheetOut = tween(frame, [TB.sheetClose, TB.sheetClose + 12], [0, 1], theme.ease.in);
  const sheetP = Math.min(1, sheetIn) * (1 - sheetOut);
  const focus = dimWindow(frame, TB.focusIn, TB.focusOut, 14);
  const fresh = tween(frame, [TB.sheetClose + 4, TB.sheetClose + 60], [1, 0], theme.ease.soft);
  const base = "#";

  return (
    <PageContainer width="wide">
      <style>{`
        #overlay-root { --sheet-x: ${(1 - sheetP) * 500}px; --sheet-backdrop: ${sheetP}; --sheet-opacity: ${Math.min(1, sheetP * 2)}; }
        ${shellDimCss(focus)}
      `}</style>
      <div style={{ ...e(0, { y: 20 }), ...dim(focus) }}>
        <PageHeader
          eyebrow="Matchs à domicile"
          title="Tables de marque"
          actions={
            <ButtonLink href={base} variant="secondary" icon={<KeyRound />}>
              Gérer les accès publics
            </ButtonLink>
          }
        />
      </div>

      <nav aria-label="Choisir la journée" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ ...e(5, { y: 14 }), ...dim(focus) }}>
        <div className="flex items-center gap-2">
          <Link href={base} aria-label="Journée précédente" className={buttonClasses({ variant: "secondary", className: "w-11 px-0 sm:w-10" })}>
            <ChevronLeft aria-hidden />
          </Link>
          <p className="type-card min-w-0 flex-1 px-2 text-center text-foreground sm:min-w-[260px]">{formatWeekendLabel("2026-10-10")}</p>
          <Link href={base} aria-label="Journée suivante" className={buttonClasses({ variant: "secondary", className: "w-11 px-0 sm:w-10" })}>
            <ChevronRight aria-hidden />
          </Link>
        </div>
        <Link href={base} aria-current="true" className={cn(buttonClasses({ variant: "outline" }), "border-accent-border bg-accent-soft text-accent-text")}>
          <CalendarCheck aria-hidden />
          Ce week-end
        </Link>
      </nav>

      <div style={{ ...e(9, { y: 16 }), ...dim(focus) }}>
        <DaySummary matches={[current, ...OTHER_TABLE_MATCHES]} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 2xl:grid-cols-2">
        <div data-u15 style={{ ...e(14, { y: 26 }), ...lift(focus * 0.6) }}>
          <div style={{ borderRadius: 16, boxShadow: assigned ? `0 0 0 2px color-mix(in oklab, var(--success) ${Math.round(fresh * 60)}%, transparent)` : undefined }}>
            <PresentationTableMatch match={current.match} assignee={assigned ? { name: "Hugo Bernard", team: "U17 M" } : null} />
          </div>
        </div>
        <div style={{ ...e(18, { y: 26 }), ...dim(focus) }}>
          <TableMatchCard client={STATIC_CLIENT} match={OTHER_TABLE_MATCHES[1]} onChanged={noop} />
        </div>
      </div>

      {frame >= TB.sheetClose + 4 && frame < TB.toastOut ? (
        <div style={{ opacity: tween(frame, [TB.toastOut - 10, TB.toastOut], [1, 0]), transform: `translate3d(0, ${(1 - springAt(frame, TB.sheetClose + 4)) * 24}px, 0)` }}>
          <Toast message={`Hugo Bernard affecté·e comme ${TABLE_ROLE_LABELS.SCORER.toLowerCase()}.`} />
        </div>
      ) : null}

      {mounted && open ? (
        <Sheet open onClose={noop} title={chooseRolePanelTitle("SCORER")}>
          <SuggestionsBody frame={frame} />
        </Sheet>
      ) : null}
    </PageContainer>
  );
}

/* ── Habillage écran : une seule promesse ─────────────────────────────── */

export function S05Overlay({ frame }: { frame: number }) {
  if (frame < TB.suggest - 2 || frame > TB.captionOut + 14) return null;
  return (
    <div style={{ position: "absolute", left: 120, top: 400, display: "flex", flexDirection: "column", gap: 8 }}>
      <MaskLine frame={frame} at={TB.suggest} out={TB.captionOut} size={88}>
        Ball Manager suggère.
      </MaskLine>
      <MaskLine frame={frame} at={TB.decide} out={TB.captionOut + 2} size={88} color={theme.colors.accent}>
        Vous décidez.
      </MaskLine>
    </div>
  );
}
