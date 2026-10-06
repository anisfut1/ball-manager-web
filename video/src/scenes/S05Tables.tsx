import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Check, ChevronLeft, ChevronRight, KeyRound, Search } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink, buttonClasses } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { DaySummary } from "@/features/tables/DaySummary";
import { TableMatchCard } from "@/features/tables/TableMatchCard";
import { CandidateRow, SectionTitle, UnavailableRow } from "@/features/tables/TableSuggestionsSheet";
import { TABLE_ROLE_LABELS, chooseRolePanelTitle } from "@/features/tables/role-labels";
import type { TablesClient } from "@/features/tables/tables-client";
import { formatWeekendLabel } from "@/lib/timezone";
import { OTHER_TABLE_MATCHES, SUGGESTIONS, TABLE_MATCH, TABLE_MATCH_ASSIGNED } from "../data/demo";
import { Eyebrow, MaskLine } from "../components/Caption";
import { enter, springAt, tween } from "../lib/motion";
import { T } from "../compositions/timeline";
import { theme } from "../theme";

const S = T.tables.start;

/** Minutage interne de la scène 05 (frames globales). */
export const TB = {
  firstClick: S + 50,
  sheetOpen: S + 54,
  loaded: S + 96,
  suggest: S + 138,
  decide: S + 160,
  secondClick: S + 198,
  sheetClose: S + 206,
  toastOut: S + 280,
  analysisOut: S + 132,
  captionOut: S + 262,
} as const;

/** Client inerte : la scène pilote l'état ; aucun appel réseau n'existe dans la vidéo. */
const STATIC_CLIENT: TablesClient = {
  suggestions: async () => SUGGESTIONS,
  assign: async () => ({ assignment: TABLE_MATCH_ASSIGNED.assignments.scorer! }),
  unassign: async () => undefined,
  setRefereeStatus: async () => undefined,
};
const noop = () => undefined;

/** Contenu du VRAI panneau « Choisir un marqueur » (mêmes rangées, mêmes sections, même chargement). */
function SuggestionsBody({ frame }: { frame: number }) {
  const loading = frame < TB.loaded;
  const row = (i: number) => enter(frame, TB.loaded + 4 + i * 6, { y: 18, blur: 6 }).style;
  const section = (i: number) => enter(frame, TB.loaded + i * 10, { y: 10, blur: 0 }).style;
  const choosing = frame >= TB.secondClick && frame < TB.sheetClose;
  return (
    <div className="flex flex-col gap-5">
      <label className="relative block">
        <span className="sr-only">Rechercher un nom, une équipe</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
        <Input type="search" value="" onChange={noop} placeholder="Rechercher un nom, une équipe…" className="pl-10" />
      </label>
      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border p-3" style={{ opacity: 0.55 + 0.45 * Math.abs(Math.sin((frame + i * 6) / 9)) }}>
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2.5" style={section(0)}>
            <SectionTitle count={SUGGESTIONS.recommended.length}>Recommandés</SectionTitle>
            <ul className="flex flex-col gap-2">
              {SUGGESTIONS.recommended.map((c, i) => (
                <div key={c.licencie.id} style={row(i)} data-candidate={i}>
                  <CandidateRow candidate={c} onChoose={noop} choosing={choosing && i === 0} />
                </div>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-2.5" style={section(1)}>
            <SectionTitle count={SUGGESTIONS.available.length}>Potentiellement disponibles</SectionTitle>
            <ul className="flex flex-col gap-2">
              {SUGGESTIONS.available.map((c, i) => (
                <div key={c.licencie.id} style={row(2 + i)}>
                  <CandidateRow candidate={c} onChoose={noop} choosing={false} />
                </div>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-2.5" style={section(2)}>
            <SectionTitle count={SUGGESTIONS.unavailable.length}>Indisponibles</SectionTitle>
            <ul className="flex flex-col gap-2">
              {SUGGESTIONS.unavailable.map((c, i) => (
                <div key={c.licencie.id} style={row(3 + i)}>
                  <UnavailableRow candidate={c} />
                </div>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

/** Reproduction de src/app/c/[clubSlug]/tables/page.tsx (+ TablesBoard), composants réels. */
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
  const freshSlot = tween(frame, [TB.sheetClose + 4, TB.sheetClose + 60], [1, 0], theme.ease.soft);
  const base = "#";

  return (
    <PageContainer width="wide">
      <style>{`
        #overlay-root { --sheet-x: ${(1 - sheetP) * 500}px; --sheet-backdrop: ${sheetP}; --sheet-opacity: ${Math.min(1, sheetP * 2)}; }
        [data-u15] > div > div.grid > div:nth-child(1) { box-shadow: 0 0 0 ${assigned ? 1.5 : 0}px color-mix(in oklab, var(--club-accent) ${Math.round(freshSlot * 60)}%, transparent), 0 10px 30px -14px color-mix(in oklab, var(--club-accent) ${Math.round(freshSlot * 50)}%, transparent); }
      `}</style>
      <div style={e(0, { y: 20 })}>
        <PageHeader
          eyebrow="Matchs à domicile"
          title="Tables de marque"
          description="Marqueur, chronométreur, délégué de club et arbitre : un poste à la fois, choisi parmi des suggestions expliquées."
          actions={
            <ButtonLink href={base} variant="secondary" icon={<KeyRound />}>
              Gérer les accès publics
            </ButtonLink>
          }
        />
      </div>

      <nav aria-label="Choisir la journée" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={e(5, { y: 14 })}>
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

      <div style={e(9, { y: 16 })}>
        <DaySummary matches={[current, ...OTHER_TABLE_MATCHES]} />
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <div data-u15 style={e(14, { y: 26 })}>
          <TableMatchCard client={STATIC_CLIENT} match={current} onChanged={noop} />
        </div>
        <div style={e(18, { y: 26 })}>
          <TableMatchCard client={STATIC_CLIENT} match={OTHER_TABLE_MATCHES[1]} onChanged={noop} />
        </div>
      </div>

      {frame >= TB.sheetClose + 4 && frame < TB.toastOut ? (
        <div style={{ opacity: tween(frame, [TB.toastOut - 10, TB.toastOut], [1, 0]), transform: `translate3d(0, ${(1 - springAt(frame, TB.sheetClose + 4)) * 24}px, 0)` }}>
          <Toast message={`Hugo Bernard affecté·e comme ${TABLE_ROLE_LABELS.SCORER.toLowerCase()}.`} />
        </div>
      ) : null}

      {mounted && open ? (
        <Sheet open onClose={noop} title={chooseRolePanelTitle("SCORER")} description={`Aucune suggestion n'est affectée automatiquement — ${TABLE_ROLE_LABELS.SCORER.toLowerCase()} choisi uniquement sur clic « Choisir ».`}>
          <SuggestionsBody frame={frame} />
        </Sheet>
      ) : null}
    </PageContainer>
  );
}

/* ── Habillage écran : l'analyse, puis la promesse ───────────────────── */

const CRITERIA = ["Disponibilité", "Horaires de ses propres matchs", "Équipe et salle", "Tables déjà réalisées", "Contraintes avant / après le match"];

export function S05Overlay({ frame }: { frame: number }) {
  if (frame < TB.sheetOpen || frame > TB.captionOut + 14) return null;
  const left = 120;
  const analysisExit = tween(frame, [TB.analysisOut, TB.analysisOut + 10], [0, 1], theme.ease.in);
  const scanned = Math.round(tween(frame, [TB.sheetOpen + 10, TB.loaded + 10], [0, 23], theme.ease.soft));
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {analysisExit < 1 ? (
        <div style={{ position: "absolute", left, top: 300, opacity: 1 - analysisExit, filter: analysisExit > 0 ? `blur(${analysisExit * 6}px)` : undefined }}>
          <Eyebrow frame={frame} at={TB.sheetOpen + 4}>
            Tables de marque
          </Eyebrow>
          <div style={{ marginTop: 22, display: "flex", alignItems: "baseline", gap: 16, fontFamily: theme.fonts.data, color: theme.colors.ink, ...enter(frame, TB.sheetOpen + 8, { y: 14 }).style }}>
            <span style={{ fontSize: 88, fontWeight: 500, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{scanned}</span>
            <span style={{ fontFamily: theme.fonts.sans, fontSize: 24, color: theme.colors.muted }}>licenciés analysés</span>
          </div>
          <ul style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 16, padding: 0, listStyle: "none" }}>
            {CRITERIA.map((c, i) => {
              const at = TB.sheetOpen + 16 + i * 7;
              const done = springAt(frame, at + 10, theme.spring.ui);
              return (
                <li key={c} style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: theme.fonts.sans, fontSize: 25, color: theme.colors.ink, ...enter(frame, at, { y: 12, blur: 4 }).style }}>
                  <span style={{ width: 30, height: 30, borderRadius: 30, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1.5px solid", borderColor: done > 0.5 ? "var(--success)" : "var(--border-strong)", background: `color-mix(in oklab, var(--success) ${Math.round(done * 12)}%, var(--surface-raised))`, color: "var(--success)" }}>
                    <Check size={17} strokeWidth={2.4} style={{ opacity: done, transform: `scale(${0.4 + 0.6 * done})` }} />
                  </span>
                  {c}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div style={{ position: "absolute", left, top: 380, display: "flex", flexDirection: "column", gap: 8 }}>
        <MaskLine frame={frame} at={TB.suggest} out={TB.captionOut} size={96}>
          Ball Manager suggère.
        </MaskLine>
        <MaskLine frame={frame} at={TB.decide} out={TB.captionOut + 2} size={96} color={theme.colors.accent}>
          Vous décidez.
        </MaskLine>
      </div>
    </div>
  );
}
