import { BarChart3 } from "lucide-react";
import { PageContainer, BackButton, SectionHeader } from "@/components/ui/PageHeader";
import { PersonAvatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/Badge";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/Table";
import { MATCH_STATUS_LABELS, formatSecondsPlayed } from "@/features/matches/detail/labels";
import { PLAYER, PLAYER_MATCHES } from "../data/demo";
import { Eyebrow, MaskLine } from "../components/Caption";
import { count, enter, tween } from "../lib/motion";
import { T } from "../compositions/timeline";
import { theme } from "../theme";

const P = T.player;

function formatMatchDate(value: string | null): string {
  if (!value) return "Date à confirmer";
  return new Date(value).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "short", year: "numeric" });
}

/** Reproduction de src/app/c/[clubSlug]/joueurs/[licencieId]/page.tsx (lecture), composants réels. */
export function PlayerPage({ frame, start }: { frame: number; start: number }) {
  const e = (d: number, o: Parameters<typeof enter>[2] = {}) => enter(frame, start + d, o).style;
  const name = `${PLAYER.lastName} ${PLAYER.firstName}`;
  // Chaque ligne arrive puis ses chiffres montent (lus sur la feuille e-Marque).
  const n = (v: number | null | undefined, i: number) => (v == null ? "—" : count(frame, start + 30 + i * 5, v));
  return (
    <PageContainer width="default">
      <div style={e(0, { y: 10 })}>
        <BackButton href="#" label="Retour aux licenciés" />
      </div>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div style={e(2, { y: 0, scale: 0.9, blur: 4 })}>
          <PersonAvatar name={name} size="xl" />
        </div>
        <div className="text-reflow flex flex-col gap-2">
          <p className="type-eyebrow" style={e(5, { y: 10 })}>
            {PLAYER.team}
          </p>
          <h1 className="type-title text-foreground" style={e(7, { y: 24 })}>
            {name}
          </h1>
          <div className="flex flex-wrap items-center gap-2" style={e(11, { y: 10 })}>
            <StatusBadge tone="neutral">
              <span className="type-numeric">{PLAYER.licenseNumber}</span>
            </StatusBadge>
            <StatusBadge tone="success">Actif·ve</StatusBadge>
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <div style={e(18, { y: 12 })}>
          <SectionHeader icon={<BarChart3 />} title={`Matchs (${PLAYER_MATCHES.length})`} description="Statistiques lues sur chaque feuille e-Marque." />
        </div>
        <div style={e(22, { y: 20 })}>
          <Table caption={`Matchs de ${name}`}>
            <THead>
              <tr>
                <Th className="sticky left-0 z-10 bg-surface">Match</Th>
                <Th>Date</Th>
                <Th align="right">Maillot</Th>
                <Th align="right">Temps</Th>
                <Th align="right">Pts</Th>
                <Th align="right">3pts</Th>
                <Th align="right">2int</Th>
                <Th align="right">2ext</Th>
                <Th align="right">LF</Th>
                <Th align="right">Fautes</Th>
              </tr>
            </THead>
            <TBody>
              {PLAYER_MATCHES.map((m, i) => (
                <Tr key={m.matchId} style={e(26 + i * 5, { y: 14, blur: 4 })}>
                  <Td className="sticky left-0 z-10 min-w-[180px] bg-surface-raised">
                    <a href="#" className="font-medium text-foreground underline-offset-4">
                      {m.isHome === false ? `@ ${m.opponentName ?? "?"}` : (m.opponentName ?? "?")}
                    </a>
                    <span className="type-meta block">{MATCH_STATUS_LABELS[m.status] ?? m.status}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{formatMatchDate(m.matchDatetime)}</Td>
                  <Td align="right" numeric className="whitespace-nowrap">
                    #{m.jerseyNumber ?? "?"}
                    {m.isCaptain ? " (C)" : ""}
                  </Td>
                  <Td align="right" numeric>
                    {formatSecondsPlayed(m.stats?.secondsPlayed == null ? null : count(frame, start + 30 + i * 5, m.stats.secondsPlayed))}
                  </Td>
                  <Td align="right" numeric className="font-semibold">
                    {n(m.stats?.points, i)}
                  </Td>
                  <Td align="right" numeric>
                    {n(m.stats?.threePointsMade, i)}
                  </Td>
                  <Td align="right" numeric>
                    {n(m.stats?.twoPointsInteriorMade, i)}
                  </Td>
                  <Td align="right" numeric>
                    {n(m.stats?.twoPointsExteriorMade, i)}
                  </Td>
                  <Td align="right" numeric>
                    {n(m.stats?.freeThrowsMade, i)}
                  </Td>
                  <Td align="right" numeric>
                    {n(m.stats?.foulsCommitted, i)}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      </section>
    </PageContainer>
  );
}

/* ── Habillage écran : la saison du joueur, dérivée du tableau ci-dessus ── */

const played = [...PLAYER_MATCHES].reverse();
const points = played.map((m) => m.stats?.points ?? 0);
const totalPoints = points.reduce((a, b) => a + b, 0);
const totalSeconds = played.reduce((a, m) => a + (m.stats?.secondsPlayed ?? 0), 0);

function PointsChart({ frame, at }: { frame: number; at: number }) {
  const W = 560;
  const H = 190;
  const max = 28;
  const pts = points.map((p, i) => [16 + (i * (W - 32)) / (points.length - 1), H - 14 - (p / max) * (H - 34)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${d} L${pts[pts.length - 1][0]} ${H} L${pts[0][0]} ${H} Z`;
  const draw = tween(frame, [at, at + 42], [0, 1], theme.ease.inOut);
  const len = 900;
  return (
    <svg width={W} height={H + 30} style={{ overflow: "visible" }}>
      {[0, 10, 20].map((v) => {
        const y = H - 14 - (v / max) * (H - 34);
        return (
          <g key={v}>
            <line x1={0} x2={W} y1={y} y2={y} stroke="rgb(23 23 26 / 0.07)" />
            <text x={W + 10} y={y + 4} fontSize={13} fill={theme.colors.muted} fontFamily={theme.fonts.data}>
              {v}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="pts-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={theme.colors.accent} stopOpacity={0.14} />
          <stop offset="100%" stopColor={theme.colors.accent} stopOpacity={0} />
        </linearGradient>
        <clipPath id="pts-clip">
          <rect x={0} y={0} width={W * draw} height={H + 30} />
        </clipPath>
      </defs>
      <path d={area} fill="url(#pts-area)" clipPath="url(#pts-clip)" />
      <path d={d} fill="none" stroke={theme.colors.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
      {pts.map(([x, y], i) => {
        const shown = tween(draw, [i / (pts.length - 1) - 0.02, i / (pts.length - 1) + 0.06], [0, 1]);
        return (
          <g key={i} opacity={shown}>
            <circle cx={x} cy={y} r={5.5} fill="#fff" stroke={theme.colors.accent} strokeWidth={2.5} />
            <text x={x} y={y - 14} fontSize={14} textAnchor="middle" fill={theme.colors.ink} fontFamily={theme.fonts.data} fontWeight={500}>
              {points[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function S06Overlay({ frame }: { frame: number }) {
  const at = P.start + 22;
  const out = P.end - 30;
  if (frame < at - 2 || frame > out + 14) return null;
  const exitT = tween(frame, [out, out + 12], [0, 1], theme.ease.in);
  const kpis = [
    { value: count(frame, at + 14, played.length), label: "matchs joués" },
    { value: count(frame, at + 18, totalPoints), label: "points" },
    { value: (count(frame, at + 22, Math.round((totalPoints / played.length) * 10)) / 10).toLocaleString("fr-FR", { minimumFractionDigits: 1 }), label: "pts / match" },
    { value: `${count(frame, at + 26, Math.round(totalSeconds / 60))}′`, label: "temps de jeu" },
  ];
  return (
    <div style={{ position: "absolute", left: 120, top: 200, opacity: 1 - exitT, filter: exitT > 0 ? `blur(${exitT * 6}px)` : undefined }}>
      <Eyebrow frame={frame} at={at}>
        Joueurs & statistiques
      </Eyebrow>
      <div style={{ marginTop: 24 }}>
        <MaskLine frame={frame} at={at + 4} size={84}>
          Chaque match compte.
        </MaskLine>
      </div>
      <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "repeat(2, 260px)", rowGap: 28 }}>
        {kpis.map((k, i) => (
          <div key={k.label} style={{ display: "flex", flexDirection: "column", gap: 4, ...enter(frame, at + 12 + i * 4, { y: 16 }).style }}>
            <span style={{ fontFamily: theme.fonts.data, fontSize: 60, fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1, color: theme.colors.ink, fontVariantNumeric: "tabular-nums" }}>{k.value}</span>
            <span style={{ fontFamily: theme.fonts.sans, fontSize: 19, color: theme.colors.muted }}>{k.label}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 40, ...enter(frame, at + 28, { y: 14 }).style }}>
        <p style={{ fontFamily: theme.fonts.data, fontSize: 14, letterSpacing: "0.14em", textTransform: "uppercase", color: theme.colors.muted, margin: "0 0 14px" }}>Points par match · feuilles e-Marque</p>
        <PointsChart frame={frame} at={at + 34} />
      </div>
    </div>
  );
}
