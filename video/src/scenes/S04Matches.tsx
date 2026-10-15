import { Check, Database, Globe } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { MatchFilters } from "@/features/matches/MatchFilters";
import { SIDE_OPTIONS, WHEN_OPTIONS } from "@/features/matches/match-filters";
import { WEEKEND_HOME } from "../data/demo";
import { BrandTile } from "../components/BrandTile";
import { MaskLine } from "../components/Caption";
import { PresentationMatchCard } from "../presentation/PresentationMatchCard";
import { dim, lift, shellDimCss } from "../presentation/focus";
import { enter, springAt, tween } from "../lib/motion";
import { T } from "../compositions/timeline";
import { theme } from "../theme";

const M = T.matches;

/** Les rencontres qui « arrivent » de la FFBB, dans l'ordre du week-end. */
const SYNCED = [WEEKEND_HOME[1], WEEKEND_HOME[2], WEEKEND_HOME[3], WEEKEND_HOME[5]];
export const ARRIVAL_AT = (i: number) => M.start + 40 + i * 14;
export const MATCH_CAPTION_OUT = M.start + 118;
/** Zoom sur une rencontre (U15 M – Agde) : elle seule reste nette. */
export const MATCH_FOCUS = { from: M.start + 128, to: T.tables.start } as const;

/** FFBB → Ball Manager, dans l'app : une ligne, pas un schéma. */
function SyncRow({ frame }: { frame: number }) {
  const t = tween(frame, [ARRIVAL_AT(0) - 14, ARRIVAL_AT(SYNCED.length - 1)], [0, 1], theme.ease.inOut);
  const done = frame >= ARRIVAL_AT(SYNCED.length - 1) + 6;
  const dot = (t * 2.2) % 1;
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface-raised px-3.5 text-[15px] font-semibold text-foreground shadow-1">
        <Database aria-hidden className="size-4 text-muted" />
        FFBB
      </span>
      <span className="relative h-[2px] w-24 rounded-full bg-border-strong">
        <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${t * 100}%` }} />
        {!done ? <span className="absolute -top-[4px] size-2.5 rounded-full bg-accent shadow-[0_0_10px_var(--club-accent-glow)]" style={{ left: `calc(${dot * 100}% - 5px)` }} /> : null}
      </span>
      <span className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface-raised pl-1.5 pr-3.5 text-[15px] font-semibold text-foreground shadow-1">
        <BrandTile size={28} />
        Ball Manager
      </span>
      <span
        className="inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[15px] font-semibold"
        style={{
          background: done ? "var(--success-soft)" : "var(--club-accent-softer)",
          color: done ? "var(--success)" : "var(--club-accent-text)",
          transform: `scale(${done ? 0.94 + 0.06 * springAt(frame, ARRIVAL_AT(SYNCED.length - 1) + 6, theme.spring.ui) : 1})`,
        }}
      >
        {done ? <Check aria-hidden className="size-4" /> : null}
        {done ? `${SYNCED.length} matchs synchronisés` : "Synchronisation…"}
      </span>
    </div>
  );
}

/**
 * Scène 04 (V2) : la vraie page Matchs (en-tête, filtres réels atténués)
 * dont la liste est rendue en VERSION VIDÉO — de grandes cartes qui
 * arrivent seules, sans action : la synchronisation se voit.
 */
export function MatchesPage({ frame, start }: { frame: number; start: number }) {
  const e = (d: number, o: Parameters<typeof enter>[2] = {}) => enter(frame, start + d, o).style;
  const focus = tween(frame, [MATCH_FOCUS.from, MATCH_FOCUS.from + 16], [0, 1], theme.ease.inOut);
  const href = "#";
  return (
    <PageContainer width="wide">
      <style>{shellDimCss(0.75)}</style>
      <div style={{ ...e(0, { y: 20 }), ...dim(focus) }}>
        <PageHeader
          eyebrow="Saison en cours"
          title="Matchs"
          actions={
            <ButtonLink href={href} variant="secondary" icon={<Globe />}>
              Vue publique
            </ButtonLink>
          }
        />
      </div>
      <div style={{ ...e(4, { y: 12 }), ...dim(0.8) }}>
        <MatchFilters
          when={WHEN_OPTIONS.map((o) => ({ label: o.label, href, active: o.value === "weekend" }))}
          side={SIDE_OPTIONS.map((o) => ({ label: o.label, href, active: o.value === "all" }))}
          teams={[{ label: "Toutes les équipes", href, active: true }]}
          resetHref={null}
        />
      </div>
      <div className="-mt-2 flex max-w-[820px] flex-col gap-4">
        <div style={{ ...e(10, { y: 12 }), ...dim(focus) }}>
          <SyncRow frame={frame} />
        </div>
        <ul className="flex flex-col gap-3">
          {SYNCED.map((match, i) => {
            const p = springAt(frame, ARRIVAL_AT(i), theme.spring.ui);
            const fresh = tween(frame, [ARRIVAL_AT(i) + 4, ARRIVAL_AT(i) + 30], [1, 0]);
            const focal = i === 0;
            return (
              <li
                key={match.id}
                data-match={i}
                style={{
                  opacity: Math.min(1, p * 1.5),
                  transform: `translate3d(0, ${(1 - p) * -40}px, 0)`,
                  filter: p < 0.99 ? `blur(${(1 - Math.min(1, p)) * 6}px)` : undefined,
                }}
              >
                <div style={{ borderRadius: 16, boxShadow: p > 0.2 ? `0 0 0 1.5px color-mix(in oklab, var(--club-accent) ${Math.round(fresh * 55)}%, transparent)` : undefined, ...(focal ? lift(focus) : dim(focus)) }}>
                  <PresentationMatchCard match={match} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </PageContainer>
  );
}

/** Une seule phrase, et l'animation dit le reste. */
export function S04Overlay({ frame }: { frame: number }) {
  if (frame < M.start || frame > MATCH_CAPTION_OUT + 14) return null;
  return (
    <div style={{ position: "absolute", left: 120, top: 400, display: "flex", flexDirection: "column", gap: 6 }}>
      <MaskLine frame={frame} at={M.start + 8} out={MATCH_CAPTION_OUT} size={92}>
        Vos matchs.
      </MaskLine>
      <MaskLine frame={frame} at={M.start + 16} out={MATCH_CAPTION_OUT + 2} size={92} color={theme.colors.accent}>
        Automatiquement.
      </MaskLine>
    </div>
  );
}
