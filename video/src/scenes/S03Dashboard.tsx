import { AlertTriangle, ArrowRight, CalendarClock, CalendarDays, CalendarRange, ClipboardList, Users } from "lucide-react";
import { PageContainer, SectionHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ButtonLink } from "@/components/ui/Button";
import { MatchCard } from "@/features/matches/MatchCard";
import { QuickLink } from "@/features/dashboard/QuickLink";
import { DashboardRequestsCard } from "@/features/derogation-requests/DashboardRequestsCard";
import { BASE, CARD_CLUB, CLUB, DEROGATION_REQUESTS, RESULTS, WEEKEND_AWAY, WEEKEND_HOME } from "../data/demo";
import { count, enter, tween } from "../lib/motion";
import { dim, dimWindow, lift, shellDimCss } from "../presentation/focus";
import { theme } from "../theme";

/** Focus de la scène : intensité globale (`level`) et poids de chaque bloc (1 = point focal). */
export interface DashboardFocus {
  level: (frame: number) => number;
  weight: (key: string, frame: number) => number;
}

/**
 * SCÈNE 03 — DASHBOARD. Reproduction 1:1 de
 * src/app/c/[clubSlug]/dashboard/page.tsx (vue club_admin) avec les mêmes
 * composants : StatCard, MatchCard, DashboardRequestsCard, QuickLink.
 * Seule la mise en scène est ajoutée : entrées en cascade, compteurs.
 * `start` = frame où la page commence à se construire.
 */
export function DashboardPage({ frame, start, focus }: { frame: number; start: number; focus?: DashboardFocus }) {
  const e = (d: number, o: Parameters<typeof enter>[2] = {}) => enter(frame, start + d, o).style;
  // V2 — focus progressif : un seul bloc net, le reste recule.
  const f = (key: string) => {
    if (!focus) return {};
    const level = focus.level(frame);
    const w = focus.weight(key, frame);
    return { ...dim(level * (1 - w)), ...lift(level * w) };
  };
  const weekend = [...WEEKEND_HOME, ...WEEKEND_AWAY];
  const stats = [
    { label: "Cette journée", value: weekend.length, icon: <CalendarDays />, hint: `dont ${WEEKEND_HOME.length} à domicile`, tone: "accent" as const },
    { label: "À venir", value: 64, icon: <CalendarRange />, hint: "matchs restants cette saison", tone: "neutral" as const },
    { label: "Anomalies", value: 2, icon: <AlertTriangle />, hint: "à examiner", tone: "warning" as const },
    { label: "Dérogations FBI", value: 1, icon: <CalendarClock />, hint: "en attente de votre réponse", tone: "warning" as const },
  ];

  return (
    <PageContainer width="wide" className="gap-10">
      {focus ? <style>{shellDimCss(focus.level(frame))}</style> : null}
      <header className="flex flex-col gap-2" style={f("header")}>
        <p className="type-eyebrow first-letter:uppercase" style={e(0, { y: 10 })}>
          samedi 10 octobre
        </p>
        <h1 className="type-display text-foreground" style={e(3, { y: 34, blur: 10 })}>
          Bonjour Julien<span className="text-accent-text">.</span>
        </h1>
        <p className="max-w-2xl text-[15px] text-muted" style={e(7, { y: 12 })}>
          Voici l&apos;essentiel de <span className="font-medium text-foreground">{CLUB.name}</span> pour la saison en cours.
        </p>
      </header>

      <section aria-label="Indicateurs" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} style={{ ...e(12 + i * 4, { y: 30, scale: 0.97 }), ...f(`stat${i}`) }}>
            <StatCard className="h-full" label={s.label} value={count(frame, start + 14 + i * 4, s.value)} icon={s.icon} hint={s.hint} href="#" tone={s.tone} />
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col gap-4">
          <div style={{ ...e(30), ...f("resultsHeader") }}>
            <SectionHeader
              title="Derniers résultats"
              action={
                <ButtonLink href="#" variant="ghost" size="sm" iconRight={<ArrowRight />}>
                  Tout voir
                </ButtonLink>
              }
            />
          </div>
          <ul className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
            {RESULTS.map((match, i) => (
              <li key={match.id} style={{ ...e(34 + i * 4, { y: 26 }), ...f(`result${i}`) }}>
                <MatchCard match={match} href="#" club={CARD_CLUB} />
              </li>
            ))}
          </ul>
        </section>

        <aside className="flex flex-col gap-4" style={f("aside")}>
          <div style={e(38, { y: 26 })}>
            <DashboardRequestsCard requests={DEROGATION_REQUESTS} manager href={`${BASE}/derogations`} />
          </div>
          <div style={e(44)}>
            <SectionHeader title="Accès rapides" />
          </div>
          <nav aria-label="Accès rapides" className="flex flex-col gap-2.5">
            {[
              { icon: <CalendarDays />, title: "Matchs", description: "Calendrier, résultats et composition, synchronisés automatiquement." },
              { icon: <Users />, title: "Joueurs", description: "Fiche par licencié : historique des matchs et statistiques." },
              { icon: <ClipboardList />, title: "Tables de marque", description: "Marqueur, chronométreur, délégué de club : à attribuer pour chaque match à domicile." },
            ].map((q, i) => (
              <div key={q.title} style={e(48 + i * 4, { y: 18 })}>
                <QuickLink href="#" icon={q.icon} title={q.title} description={q.description} />
              </div>
            ))}
          </nav>
        </aside>
      </div>
    </PageContainer>
  );
}

/** Repères (coordonnées scène, mesurés) pour la caméra. */
export const DASH = { stats: { x: 1092, y: 316 }, stat0: { x: 620, y: 316 }, result0: { x: 678, y: 570 } };

/**
 * Scène 03 (V2) : construction, puis 1) « Cette journée » — les matchs du
 * week-end —, 2) un résultat (score de basket), puis retour au plan large.
 */
export const DASH_BEATS = { focusIn: 348, toResult: 418, focusOut: 486 } as const;
export const DASH_FOCUS: DashboardFocus = {
  level: (frame) => dimWindow(frame, DASH_BEATS.focusIn, DASH_BEATS.focusOut, 14),
  weight: (key, frame) => {
    const toResult = tween(frame, [DASH_BEATS.toResult - 6, DASH_BEATS.toResult + 8], [0, 1], theme.ease.inOut);
    if (key === "stat0") return 1 - toResult;
    if (key === "result0") return toResult;
    return 0;
  },
};
