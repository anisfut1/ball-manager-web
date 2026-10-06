import { ArrowRight, Check, Inbox, MessageSquareText, Plus, Send } from "lucide-react";
import { PageContainer, PageHeader, BackButton } from "@/components/ui/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { Toast } from "@/components/ui/Toast";
import { MatchHeadline } from "@/features/derogation-requests/parts";
import { Footer, Stepper, SummaryItem } from "@/features/derogation-requests/RequestWizard";
import { VenuePlanning } from "@/features/derogation-requests/VenuePlanning";
import { RequestThread } from "@/features/derogation-requests/RequestThread";
import { RequestSections } from "@/features/derogation-requests/RequestList";
import { formatDayLongCapitalized, formatShortDateTime, formatTime } from "@/features/derogation-requests/labels";
import { AVAILABILITY, BASE, CHOSEN_SLOT, CLUB, COACH, DEROG_MATCH, INBOX, TZ, VENUES, derogationRequest } from "../data/demo";
import { ProductShell } from "../components/ProductShell";
import { PresentationRequest } from "../presentation/PresentationRequest";
import { shellDimCss } from "../presentation/focus";
import { TablesPage } from "./S05Tables";
import { MobileViewport } from "../components/MobileViewport";
import { PHONE, PhoneFrame, Tap } from "../components/PhoneFrame";
import { MaskLine } from "../components/Caption";
import { enter, springAt, tween } from "../lib/motion";
import { T } from "../compositions/timeline";
import { theme } from "../theme";

const D = T.derog.start;

/** Minutage interne (frames globales). */
export const DG = {
  /** L'app desktop (scène) est remplacée, au pixel près, par le même écran dans le viewport qui va se transformer. */
  swap: D + 6,
  morphFrom: D + 8,
  morphTo: D + 52,
  coachIn: D + 56,
  slotTap: D + 116,
  continueTap: D + 142,
  summary: D + 148,
  typeFrom: D + 158,
  typeTo: D + 192,
  sendTap: D + 208,
  sent: D + 214,
  handoff: D + 248,
  inboxArrive: D + 278,
  openTap: D + 310,
  thread: D + 316,
  takeTap: D + 358,
  taken: D + 362,
  captionOut: T.derog.end - 32,
} as const;

const noop = () => undefined;
const SOURCE = { kind: "club" as const, clubId: "film" };
const MESSAGE = "Castelnau est d'accord pour dimanche matin, le gymnase est libre. Merci !";

/* ── Écrans mobiles du coach (composants réels, viewport 390 px) ────────── */

function WizardSlot({ frame }: { frame: number }) {
  const selected = frame >= DG.slotTap ? CHOSEN_SLOT : null;
  return (
    <PageContainer width="wide" className="gap-6">
      <PageHeader back={{ href: "#", label: "Dérogations" }} eyebrow={CLUB.name} title="Demander une dérogation" description="Choisis le match, la nouvelle date et un créneau libre : le coordinateur du club reçoit ta demande." />
      <div className="flex flex-col gap-5">
        <Stepper step={2} onStep={noop} />
        <Card padded={false} className="px-4 py-3">
          <MatchHeadline match={DEROG_MATCH} timezone={TZ} />
        </Card>
        <section className="flex flex-col gap-3">
          <h2 className="type-section text-foreground">{formatDayLongCapitalized("2026-10-11T12:00:00Z", "UTC")} — quel créneau ?</h2>
          <p className="type-meta">
            Plage du club ce jour-là : <span className="type-numeric font-medium text-foreground">09:00</span> → <span className="type-numeric font-medium text-foreground">18:00</span> (début du match) · durée prise en compte : 2 h.
          </p>
          <VenuePlanning availability={AVAILABILITY} selected={selected} onSelect={noop} localTime={(iso) => formatTime(iso, TZ)} />
          <Footer onBack={noop} backLabel="Changer de date">
            <Button variant="primary" iconRight={<ArrowRight />} disabled={!selected}>
              {selected ? `Continuer avec ${selected.localStart}` : "Choisis un créneau"}
            </Button>
          </Footer>
        </section>
      </div>
    </PageContainer>
  );
}

function WizardSummary({ frame }: { frame: number }) {
  const typed = MESSAGE.slice(0, Math.round(tween(frame, [DG.typeFrom, DG.typeTo], [0, MESSAGE.length], theme.ease.soft)));
  return (
    <PageContainer width="wide" className="gap-6">
      <PageHeader back={{ href: "#", label: "Dérogations" }} eyebrow={CLUB.name} title="Demander une dérogation" />
      <div className="flex flex-col gap-5">
        <Stepper step={3} onStep={noop} />
        <Card padded={false} className="px-4 py-3">
          <MatchHeadline match={DEROG_MATCH} timezone={TZ} />
        </Card>
        <section className="flex flex-col gap-4">
          <h2 className="type-section text-foreground">Résumé de la demande</h2>
          <Card className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SummaryItem label="Date actuelle">{formatShortDateTime(DEROG_MATCH.matchDatetime, TZ)}</SummaryItem>
              <SummaryItem label="Nouveau créneau demandé" strong>
                {formatDayLongCapitalized(CHOSEN_SLOT.startAt, TZ)} · {CHOSEN_SLOT.localStart} → {CHOSEN_SLOT.localEnd}
              </SummaryItem>
              <SummaryItem label="Gymnase">{CHOSEN_SLOT.venueName}</SummaryItem>
              <SummaryItem label="Demande formulée par">{COACH.displayName}</SummaryItem>
            </dl>
          </Card>
          <Field label="Message au coordinateur" optional hint="Ex. : la salle est libre ce jour-là, l'adversaire est d'accord…">
            {(props) => <Textarea {...props} rows={3} value={typed} onChange={noop} />}
          </Field>
          <Notice tone="neutral" icon={<MessageSquareText />}>
            La demande part au coordinateur du club, qui s&apos;occupe des démarches officielles. Le calendrier officiel n&apos;est pas modifié automatiquement.
          </Notice>
          <Footer onBack={noop} backLabel="Changer de créneau">
            <Button variant="primary" size="lg" icon={<Send />} loading={frame >= DG.sendTap && frame < DG.sent}>
              Envoyer la demande
            </Button>
          </Footer>
        </section>
      </div>
    </PageContainer>
  );
}

function CoachThread({ frame }: { frame: number }) {
  const status = frame >= DG.taken + 6 ? "IN_PROGRESS" : "REQUESTED";
  return (
    <PageContainer className="gap-5">
      <BackButton href="#" label="Dérogations" />
      {/* key = statut : l'état initial du vrai RequestThread suit la demande. */}
      <RequestThread key={status} source={SOURCE} initial={derogationRequest("coach", status)} timezone={TZ} venues={VENUES} justSent={false} />
      {frame >= DG.sent && frame < DG.handoff + 10 ? (
        <div style={{ opacity: 1 - tween(frame, [DG.handoff, DG.handoff + 10], [0, 1]) }}>
          <Toast message="Demande envoyée au coordinateur." />
        </div>
      ) : null}
      {frame >= DG.taken + 6 && frame < DG.taken + 60 ? <Toast tone="info" message="Julien Navarro s'occupe de ta demande." /> : null}
    </PageContainer>
  );
}

/** Défilement réel du document mobile, par écran. */
function phoneScroll(frame: number): number {
  if (frame < DG.coachIn) return 0;
  if (frame < DG.summary) return tween(frame, [DG.coachIn + 14, DG.coachIn + 50], [0, 470], theme.ease.inOut);
  if (frame < DG.sent) return tween(frame, [DG.summary + 4, DG.typeFrom + 8], [0, 250], theme.ease.inOut);
  return 0;
}

function DeviceScreen({ frame, width, height }: { frame: number; width: number; height: number }) {
  const screen = frame < DG.coachIn ? "desktop" : frame < DG.summary ? "slot" : frame < DG.sent ? "summary" : "thread";
  const swapIn = (at: number) => (frame >= at ? enter(frame, at, { y: 14, blur: 4, scale: 1 }).style : undefined);
  // Un seul viewport (même iframe) du début à la fin : seul son contenu change.
  return (
    <MobileViewport width={width} height={height} scrollY={phoneScroll(frame)}>
      {screen === "desktop" ? (
        // Le MÊME écran que la scène 05 (club_admin, Tables de marque) : en rétrécissant, l'app se réorganise d'elle-même.
        <ProductShell flow pathname="/tables">
          <TablesPage frame={frame} start={T.tables.start} />
        </ProductShell>
      ) : (
      <ProductShell flow roles={["coach"]} user={COACH} pathname={screen === "thread" ? "/derogations/demande" : "/derogations/nouvelle"}>
        {screen === "slot" ? (
          <div style={swapIn(DG.coachIn)}>
            <WizardSlot frame={frame} />
          </div>
        ) : null}
        {screen === "summary" ? (
          <div style={swapIn(DG.summary)}>
            <WizardSummary frame={frame} />
          </div>
        ) : null}
        {screen === "thread" ? (
          <div style={swapIn(DG.sent)}>
            <CoachThread frame={frame} />
          </div>
        ) : null}
      </ProductShell>
      )}
    </MobileViewport>
  );
}

/** Cadrages successifs DANS le téléphone : le créneau, le bouton, le statut. Coordonnées du viewport mobile. */
const ZOOM_KEYS: Array<[number, { w: number; s: number; vx: number; vy: number; sx: number; sy: number }]> = [
  [DG.coachIn + 14, { w: 0, s: 2.1, vx: 195, vy: 330, sx: 1320, sy: 560 }],
  [DG.coachIn + 36, { w: 1, s: 2.1, vx: 195, vy: 330, sx: 1320, sy: 560 }],
  [DG.continueTap - 14, { w: 1, s: 2.1, vx: 195, vy: 330, sx: 1320, sy: 560 }],
  [DG.continueTap - 2, { w: 1, s: 2.1, vx: 250, vy: 690, sx: 1320, sy: 600 }],
  [DG.summary + 6, { w: 1, s: 2.1, vx: 250, vy: 690, sx: 1320, sy: 600 }],
  [DG.summary + 22, { w: 1, s: 1.75, vx: 195, vy: 300, sx: 1320, sy: 520 }],
  [DG.sendTap - 14, { w: 1, s: 1.75, vx: 195, vy: 300, sx: 1320, sy: 520 }],
  [DG.sendTap - 2, { w: 1, s: 2.1, vx: 250, vy: 690, sx: 1320, sy: 600 }],
  [DG.sent + 4, { w: 1, s: 2.1, vx: 250, vy: 690, sx: 1320, sy: 600 }],
  [DG.sent + 16, { w: 1, s: 2.2, vx: 195, vy: 165, sx: 1320, sy: 500 }],
  [DG.handoff - 4, { w: 1, s: 2.2, vx: 195, vy: 165, sx: 1320, sy: 500 }],
  [DG.handoff + 18, { w: 0, s: 2.2, vx: 195, vy: 165, sx: 1320, sy: 500 }],
];

function phoneZoom(frame: number) {
  const first = ZOOM_KEYS[0];
  if (frame <= first[0]) return first[1];
  for (let i = 0; i < ZOOM_KEYS.length - 1; i += 1) {
    const [f0, a] = ZOOM_KEYS[i];
    const [f1, b] = ZOOM_KEYS[i + 1];
    if (frame <= f1) {
      const t = tween(frame, [f0, f1], [0, 1], theme.ease.inOut);
      return { w: a.w + (b.w - a.w) * t, s: a.s + (b.s - a.s) * t, vx: a.vx + (b.vx - a.vx) * t, vy: a.vy + (b.vy - a.vy) * t, sx: a.sx + (b.sx - a.sx) * t, sy: a.sy + (b.sy - a.sy) * t };
    }
  }
  return ZOOM_KEYS[ZOOM_KEYS.length - 1][1];
}

/**
 * L'app desktop DEVIENT le téléphone : la fenêtre rétrécit réellement de
 * 1920 à 390 px de large — l'app traverse ses breakpoints (la Sidebar
 * disparaît, la topbar et la barre du bas mobiles apparaissent, les cartes
 * s'empilent) — puis le boîtier se referme autour. C'est le responsive réel
 * du produit, pas un effet. Le téléphone se range ensuite à gauche quand
 * le coordinateur prend le relais.
 */
export function S05bPhone({ frame }: { frame: number }) {
  if (frame < DG.swap || frame > T.derog.end + 2) return null;
  const m = tween(frame, [DG.morphFrom, DG.morphTo], [0, 1], theme.ease.inOut);
  const shell = tween(frame, [DG.morphFrom + 24, DG.morphTo + 4], [0, 1], theme.ease.out);
  const aside = tween(frame, [DG.handoff, DG.handoff + 26], [0, 1], theme.ease.inOut);
  const leave = tween(frame, [T.derog.end - 12, T.derog.end], [0, 1], theme.ease.in);
  const vpW = 1920 + (PHONE.screenW - 1920) * m;
  const vpH = 1080 + (PHONE.screenH - PHONE.status - 1080) * m;
  // V2 : le téléphone est le HÉROS — centré, plus grand ; puis il se range à gauche, en retrait.
  const freeScale = 0.86 + (1.1 - 0.86) * m + (0.68 - 1.1) * aside;
  const freeCx = 960 + (250 - 960) * aside;
  const freeCy = 540 + (600 - 540) * aside;
  // Taps dans le viewport mobile (repères mesurés sur le rendu réel, voir README).
  const taps = [
    { at: DG.slotTap, x: 190, y: 326 },
    { at: DG.continueTap, x: 292, y: 706 },
    { at: DG.sendTap, x: 284, y: 706 },
  ];
  const geo = { screenW: vpW, screenH: vpH + PHONE.status * shell, bezel: PHONE.bezel * shell, status: PHONE.status * shell, radius: 35 + (50 - 35) * m, chrome: shell };
  const fw = geo.screenW + geo.bezel * 2;
  const fh = geo.screenH + geo.bezel * 2;
  // Zoom DANS le téléphone : un point du viewport mobile (vx, vy) est amené en (sx, sy) à l'écran.
  const z = phoneZoom(frame);
  const zoomLeft = z.sx - (geo.bezel + z.vx) * z.s;
  const zoomTop = z.sy - (geo.bezel + geo.status + z.vy) * z.s;
  const freeLeft = freeCx - (fw * freeScale) / 2;
  const freeTop = freeCy - (fh * freeScale) / 2;
  const scale = freeScale + (z.s - freeScale) * z.w;
  const left = freeLeft + (zoomLeft - freeLeft) * z.w;
  const top = freeTop + (zoomTop - freeTop) * z.w;
  const w = fw * scale;
  const h = fh * scale;
  // Quand le coordinateur a la parole, le téléphone recule ; il revient au premier plan à la validation.
  const recede = tween(frame, [DG.handoff + 20, DG.handoff + 40], [0, 1], theme.ease.inOut) * (1 - tween(frame, [DG.taken + 2, DG.taken + 16], [0, 1], theme.ease.inOut));
  return (
    <div style={{ position: "absolute", left, top, width: w, height: h, opacity: (1 - leave) * (1 - 0.45 * recede), filter: recede > 0.01 ? `saturate(${1 - 0.7 * recede}) blur(${recede * 1.5}px)` : undefined }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        <PhoneFrame geometry={geo} overlay={taps.map((t) => <Tap key={t.at} frame={frame} {...t} />)}>
          <DeviceScreen frame={frame} width={vpW} height={vpH} />
        </PhoneFrame>
      </div>
    </div>
  );
}

/* ── Écrans desktop du coordinateur (dans le shell persistant) ────────── */

export function DerogationsInboxPage({ frame }: { frame: number }) {
  const e = (d: number) => enter(frame, DG.handoff + 10 + d, { y: 16 }).style;
  const arrived = frame >= DG.inboxArrive;
  const requests = arrived ? INBOX : INBOX.slice(1);
  const fresh = springAt(frame, DG.inboxArrive, theme.spring.ui);
  return (
    <PageContainer width="wide" className="gap-6">
      <style>{shellDimCss(0.8)}</style>
      <style>{`[data-inbox] section:first-child li:first-child { opacity: ${Math.min(1, fresh * 1.4)}; transform: translate3d(0, ${(1 - fresh) * -26}px, 0) scale(${0.97 + 0.03 * fresh}); filter: blur(${(1 - Math.min(1, fresh)) * 6}px); }
[data-inbox] section:not(:first-child), [data-inbox] header, [data-inbox-head] { opacity: 0.32; filter: blur(1.6px) saturate(0.3); }
[data-inbox] section:first-child li:first-child > a { box-shadow: var(--shadow-2), 0 0 0 ${arrived ? 1.5 : 0}px color-mix(in oklab, var(--club-accent) ${Math.round(tween(frame, [DG.inboxArrive + 10, DG.inboxArrive + 50], [55, 0]))}%, transparent); }`}</style>
      <div style={e(0)} data-inbox-head>
        <PageHeader
          eyebrow={CLUB.name}
          title="Dérogations"
          actions={
            <ButtonLink href="#" variant="primary" icon={<Plus />}>
              Nouvelle demande
            </ButtonLink>
          }
        />
      </div>
      <div data-inbox style={e(6)}>
        <RequestSections requests={requests} manager timezone={TZ} basePath={`${BASE}/derogations`} />
      </div>
    </PageContainer>
  );
}

export function DerogationThreadPage({ frame }: { frame: number }) {
  const status = frame >= DG.taken ? "IN_PROGRESS" : "REQUESTED";
  return (
    <PageContainer className="gap-5">
      <style>{shellDimCss(0.8)}</style>
      <div style={enter(frame, DG.thread, { y: 12 }).style}>
        <BackButton href="#" label="Dérogations" />
      </div>
      <div style={enter(frame, DG.thread + 3, { y: 18 }).style} data-request>
        <PresentationRequest status={status} busy={frame >= DG.takeTap && frame < DG.taken} />
      </div>
      {frame >= DG.taken + 2 && frame < T.derog.end ? <Toast message="Tu t'occupes de cette demande." /> : null}
    </PageContainer>
  );
}

/* ── Habillage écran ──────────────────────────────────────────────────── */

export function S05bOverlay({ frame }: { frame: number }) {
  if (frame < D || frame > T.derog.end + 4) return null;
  const mobileOut = DG.coachIn + 6;
  const coachOut = DG.handoff - 6;
  return (
    <>
      {/* Un message à la fois, autour du téléphone héros. */}
      <div style={{ position: "absolute", left: 120, top: 410, display: "flex", flexDirection: "column", gap: 6 }}>
        <MaskLine frame={frame} at={D + 34} out={mobileOut} size={88}>
          Le même outil.
        </MaskLine>
        <MaskLine frame={frame} at={D + 40} out={mobileOut + 2} size={88} color={theme.colors.accent}>
          Dans la poche.
        </MaskLine>
      </div>
      <div style={{ position: "absolute", left: 120, top: 430 }}>
        <MaskLine frame={frame} at={DG.coachIn + 30} out={coachOut} size={80}>
          Le coach demande.
        </MaskLine>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 46, display: "flex", justifyContent: "center" }}>
        <MaskLine frame={frame} at={DG.handoff + 22} out={DG.captionOut} size={72}>
          Le coordinateur <span style={{ color: theme.colors.accent }}>valide.</span>
        </MaskLine>
      </div>
      <WorkflowChips frame={frame} />
      <Handoff frame={frame} />
    </>
  );
}

/** Jalons du workflow, lisibles sans lire les écrans : COACH → COORDINATEUR. */
function WorkflowChips({ frame }: { frame: number }) {
  const taken = frame >= DG.taken;
  const coach = {
    at: DG.sent + 6,
    label: "Coach",
    status: taken ? "Prise en charge" : "Demande envoyée",
    ok: true,
    // Sous la phrase pendant la demande, puis au-dessus du téléphone rangé à gauche.
    x: 120 + (250 - 120) * tween(frame, [DG.handoff, DG.handoff + 26], [0, 1], theme.ease.inOut),
    y: 560 + (196 - 560) * tween(frame, [DG.handoff, DG.handoff + 26], [0, 1], theme.ease.inOut),
    anchor: tween(frame, [DG.handoff, DG.handoff + 26], [0, 1], theme.ease.inOut),
  };
  const coord = { at: DG.inboxArrive, label: "Coordinateur", status: taken ? "Prise en charge" : "Demande reçue", ok: taken, x: 1190, y: 196, anchor: 1 };
  return (
    <>
      {[coach, coord].map((c) => {
        const p = springAt(frame, c.at, theme.spring.ui);
        if (p <= 0.01) return null;
        const pulse = springAt(frame, DG.taken, theme.spring.ui);
        return (
          <div
            key={c.label}
            style={{
              position: "absolute",
              left: c.x,
              top: c.y,
              transform: `translate(${-50 * c.anchor}%, -50%) scale(${(0.9 + 0.1 * p) * (taken ? 0.96 + 0.04 * pulse : 1)})`,
              opacity: Math.min(1, p * 1.5) * (1 - tween(frame, [T.derog.end - 14, T.derog.end - 4], [0, 1])),
              display: "flex",
              alignItems: "center",
              gap: 10,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ height: 50, display: "inline-flex", alignItems: "center", padding: "0 20px", borderRadius: 99, background: theme.colors.ink, color: "#fff", fontFamily: theme.fonts.display, fontStretch: theme.headline.stretch, fontWeight: 700, fontSize: 21, letterSpacing: "0.12em", textTransform: "uppercase" }}>{c.label}</span>
            <span style={{ height: 50, display: "inline-flex", alignItems: "center", gap: 9, padding: "0 20px", borderRadius: 99, background: c.ok ? "var(--success-soft)" : "var(--club-accent-softer)", color: c.ok ? "var(--success)" : "var(--club-accent-text)", border: "1px solid", borderColor: c.ok ? "color-mix(in oklab, var(--success) 25%, transparent)" : "var(--club-accent-border)", fontFamily: theme.fonts.sans, fontWeight: 600, fontSize: 21 }}>
              {c.ok ? <Check size={21} /> : <Inbox size={21} />}
              {c.status}
            </span>
          </div>
        );
      })}
    </>
  );
}

/** Le lien entre les deux appareils : la demande quitte le téléphone et arrive dans la boîte du coordinateur. */
function Handoff({ frame }: { frame: number }) {
  const t = tween(frame, [DG.inboxArrive - 22, DG.inboxArrive], [0, 1], theme.ease.inOut);
  if (t <= 0 || t >= 1) return null;
  const from = { x: 250, y: 600 };
  const to = { x: 1069, y: 516 };
  const x = from.x + (to.x - from.x) * t;
  const y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 120;
  return (
    <div style={{ position: "absolute", left: x - 70, top: y - 18, opacity: Math.min(1, t * 5) * Math.min(1, (1 - t) * 5), display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 14px", borderRadius: 99, background: "var(--surface-raised)", border: "1px solid var(--club-accent-border)", boxShadow: "var(--shadow-3)", fontFamily: theme.fonts.sans, fontSize: 14, fontWeight: 550, color: theme.colors.ink, whiteSpace: "nowrap" }}>
      <Send size={14} color={theme.colors.accent} />
      U17 M · dim. 11:00
    </div>
  );
}
