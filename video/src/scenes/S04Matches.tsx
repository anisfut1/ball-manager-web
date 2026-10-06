import { Database, Globe, House, Route } from "lucide-react";
import { PageContainer, PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { MatchCard } from "@/features/matches/MatchCard";
import { HomeMatchesAgenda } from "@/features/matches/HomeMatchesAgenda";
import { MatchFilters } from "@/features/matches/MatchFilters";
import { JourneePicker } from "@/features/matches/JourneePicker";
import { SIDE_OPTIONS, WHEN_OPTIONS } from "@/features/matches/match-filters";
import { BASE, CARD_CLUB, WEEKEND_AWAY, WEEKEND_HOME } from "../data/demo";
import { BrandTile } from "../components/BrandTile";
import { Eyebrow, MaskLine } from "../components/Caption";
import { enter, springAt, tween } from "../lib/motion";
import { T } from "../compositions/timeline";
import { theme } from "../theme";

const M = T.matches;

/**
 * Ordre d'arrivée des rencontres synchronisées : [colonne (1 = Clavel,
 * 2 = Lido), rang dans la colonne]. Chaque arrivée = un « paquet » FFBB.
 */
const ARRIVALS: Array<[number, number]> = [
  [1, 1],
  [2, 1],
  [1, 2],
  [1, 3],
  [2, 2],
  [1, 4],
];
export const ARRIVAL_AT = (i: number) => M.start + 34 + i * 11;

/**
 * Animation des tuiles À L'INTÉRIEUR du vrai HomeMatchesAgenda, sans le
 * modifier : une feuille de style par frame cible chaque <li> rendu par le
 * composant (colonne, rang).
 */
function AgendaArrivals({ frame }: { frame: number }) {
  const css = ARRIVALS.map(([col, nth], i) => {
    const p = springAt(frame, ARRIVAL_AT(i), theme.spring.ui);
    const fresh = tween(frame, [ARRIVAL_AT(i) + 6, ARRIVAL_AT(i) + 30], [1, 0]);
    return `[data-agenda] > div > section:nth-of-type(${col}) li:nth-child(${nth}) { opacity: ${Math.min(1, p * 1.5)}; transform: translate3d(0, ${(1 - p) * -34}px, 0) scale(${0.96 + 0.04 * p}); filter: blur(${(1 - Math.min(1, p)) * 6}px); }
[data-agenda] > div > section:nth-of-type(${col}) li:nth-child(${nth}) > a { box-shadow: var(--shadow-inset-highlight), var(--shadow-1), 0 0 0 ${fresh > 0 && p > 0.2 ? 1 : 0}px color-mix(in oklab, var(--club-accent) ${Math.round(fresh * 45)}%, transparent); }`;
  }).join("\n");
  return <style>{css}</style>;
}

/** Reproduction de src/app/c/[clubSlug]/matchs/page.tsx + MatchesView (vue « Journée »), composants réels. */
export function MatchesPage({ frame, start }: { frame: number; start: number }) {
  const e = (d: number, o: Parameters<typeof enter>[2] = {}) => enter(frame, start + d, o).style;
  const href = "#";
  return (
    <PageContainer width="wide">
      <div style={e(0, { y: 20 })}>
        <PageHeader
          eyebrow="Saison en cours"
          title="Matchs"
          description="Calendrier, résultats et compositions, synchronisés depuis la FFBB et FBI."
          actions={
            <ButtonLink href={href} variant="secondary" icon={<Globe />}>
              Vue publique
            </ButtonLink>
          }
        />
      </div>
      <div className="flex flex-col gap-8">
        <div style={e(6, { y: 16 })}>
          <MatchFilters
            when={WHEN_OPTIONS.map((o) => ({ label: o.label, href, active: o.value === "weekend" }))}
            side={SIDE_OPTIONS.map((o) => ({ label: o.label, href, active: o.value === "all" }))}
            teams={[{ label: "Toutes les équipes", href, active: true }]}
            resetHref={null}
          />
        </div>
        <div style={e(10, { y: 16 })}>
          <JourneePicker options={[{ saturday: "2026-10-10", label: "Week-end du 10 au 11 octobre", count: WEEKEND_HOME.length + WEEKEND_AWAY.length, href, active: true, isCurrent: true }]} prevHref={href} nextHref={href} currentHref={null} />
        </div>

        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div style={e(16, { y: 14 })}>
              <SectionHeader as="h3" icon={<House />} title="À domicile" description="Par salle — une colonne par gymnase du club." />
            </div>
            <div data-agenda style={e(20, { y: 10, blur: 0 })}>
              <AgendaArrivals frame={frame} />
              <HomeMatchesAgenda matches={WEEKEND_HOME} basePath={`${BASE}/matchs`} club={CARD_CLUB} />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div style={e(100, { y: 14 })}>
              <SectionHeader as="h3" icon={<Route />} title="À l'extérieur" />
            </div>
            <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {WEEKEND_AWAY.map((match, i) => (
                <li key={match.id} style={e(104 + i * 5, { y: 22 })}>
                  <MatchCard match={match} href={href} club={CARD_CLUB} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}

/* ── Habillage écran : FFBB → Ball Manager ───────────────────────────── */

const NODE_X = 120;
const FFBB_Y = 610;
const BM_Y = 858;
const PACKET_LABELS = ["U11 M · Frontignan · 10:00", "U13 F · Mèze · 13:30", "U15 M · Agde · 14:00", "U17 M · Castelnau 2 · 16:00", "Seniors F · Pézenas · 15:30", "Seniors 1 M · Lunel · 20:00"];

function Node({ icon, title, meta, style }: { icon: React.ReactNode; title: string; meta: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="surface-card" style={{ position: "absolute", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px 14px 14px", width: 470, ...style }}>
      {icon}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontFamily: theme.fonts.sans, fontSize: 19, fontWeight: 620, color: theme.colors.ink, letterSpacing: "-0.01em" }}>{title}</span>
        <span style={{ fontFamily: theme.fonts.sans, fontSize: 14.5, color: theme.colors.muted }}>{meta}</span>
      </div>
    </div>
  );
}

export const MATCH_CAPTION_OUT = M.start + 116;

export function S04Overlay({ frame }: { frame: number }) {
  if (frame < M.start || frame > MATCH_CAPTION_OUT + 16) return null;
  const out = MATCH_CAPTION_OUT;
  const exitT = tween(frame, [out, out + 10], [0, 1], theme.ease.in);
  const ffbb = enter(frame, M.start + 14, { y: 18 });
  const bm = enter(frame, M.start + 22, { y: 18 });
  const line = tween(frame, [M.start + 18, M.start + 34], [0, 1], theme.ease.out);
  const lineTop = FFBB_Y + 76;
  const lineBottom = BM_Y - 6;
  const synced = frame >= ARRIVAL_AT(5) + 10;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - exitT, filter: exitT > 0 ? `blur(${exitT * 6}px)` : undefined }}>
      <div style={{ position: "absolute", left: NODE_X, top: 214 }}>
        <Eyebrow frame={frame} at={M.start + 4}>
          Synchronisation FFBB
        </Eyebrow>
        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 4 }}>
          <MaskLine frame={frame} at={M.start + 6} size={104}>
            Vos matchs.
          </MaskLine>
          <MaskLine frame={frame} at={M.start + 13} size={104} color={theme.colors.muted}>
            Automatiquement.
          </MaskLine>
        </div>
      </div>

      <Node
        style={{ left: NODE_X, top: FFBB_Y, ...ffbb.style }}
        icon={
          <span className="inline-flex size-12 items-center justify-center rounded-[14px] border border-border bg-surface text-muted shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] [&_svg]:size-5">
            <Database />
          </span>
        }
        title="FFBB"
        meta="Calendrier, horaires, salles, adversaires, scores"
      />

      {/* Liaison : le filet se dessine, puis chaque rencontre descend. */}
      <svg width={40} height={lineBottom - lineTop} style={{ position: "absolute", left: NODE_X + 20, top: lineTop, overflow: "visible" }}>
        <line x1={20} x2={20} y1={0} y2={(lineBottom - lineTop) * line} stroke="rgb(23 23 26 / 0.18)" strokeWidth={1.5} strokeDasharray="3 5" />
      </svg>
      {PACKET_LABELS.map((label, i) => {
        const land = ARRIVAL_AT(i);
        const t = tween(frame, [land - 16, land], [0, 1], theme.ease.inOut);
        if (t <= 0 || t >= 1) return null;
        const y = lineTop + (lineBottom - lineTop - 30) * t;
        return (
          <div key={label} style={{ position: "absolute", left: NODE_X + 52, top: y, opacity: Math.min(1, t * 4) * Math.min(1, (1 - t) * 5), display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ position: "absolute", left: -36, top: 9, width: 9, height: 9, borderRadius: 9, background: theme.colors.accent }} />
            <span className="type-numeric" style={{ fontSize: 14, padding: "5px 10px", borderRadius: 99, background: "var(--surface-raised)", border: "1px solid var(--border)", boxShadow: "var(--shadow-1)", color: theme.colors.ink, whiteSpace: "nowrap" }}>
              {label}
            </span>
          </div>
        );
      })}

      <Node
        style={{ left: NODE_X, top: BM_Y, ...bm.style }}
        icon={<BrandTile size={48} />}
        title="Ball Manager"
        meta={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 8, background: synced ? "var(--success)" : theme.colors.accent }} />
            {synced ? "6 rencontres à domicile · à jour" : "Synchronisation en cours…"}
          </span>
        }
      />
    </div>
  );
}

/** Puces « ce que Ball Manager récupère » pendant le zoom sur une rencontre. */
export function FieldChips({ frame, at, out }: { frame: number; at: number; out: number }) {
  if (frame < at - 2 || frame > out + 12) return null;
  const exitT = tween(frame, [out, out + 10], [0, 1], theme.ease.in);
  const chips = ["Date", "Horaire", "Lieu", "Adversaire", "Équipe", "Score dès sa publication"];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, display: "flex", justifyContent: "center", gap: 12, opacity: 1 - exitT }}>
      {chips.map((c, i) => {
        const p = enter(frame, at + i * 4, { y: 16, blur: 4 });
        return (
          <span key={c} style={{ ...p.style, display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 18px", borderRadius: 99, background: "rgb(255 255 255 / 0.92)", border: "1px solid var(--border)", boxShadow: "var(--shadow-2)", fontFamily: theme.fonts.sans, fontSize: 17, fontWeight: 550, color: theme.colors.ink }}>
            <span style={{ width: 6, height: 6, borderRadius: 6, background: theme.colors.accent }} />
            {c}
          </span>
        );
      })}
    </div>
  );
}
