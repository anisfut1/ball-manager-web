import { ArrowRight, MessageSquareText, Plus, Send } from "lucide-react";
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
import { AVAILABILITY, BASE, CHOSEN_SLOT, CLUB, COACH, DEROG_CONTEXT, DEROG_MATCH, INBOX, TZ, VENUES, derogationRequest } from "../data/demo";
import { ProductShell } from "../components/ProductShell";
import { MobileViewport } from "../components/MobileViewport";
import { PHONE, PhoneFrame, Tap } from "../components/PhoneFrame";
import { Eyebrow, MaskLine } from "../components/Caption";
import { enter, springAt, tween } from "../lib/motion";
import { T } from "../compositions/timeline";
import { theme } from "../theme";

const D = T.derog.start;

/** Minutage interne (frames globales). */
export const DG = {
  phoneIn: D,
  slotTap: D + 74,
  continueTap: D + 100,
  summary: D + 106,
  typeFrom: D + 116,
  typeTo: D + 150,
  sendTap: D + 166,
  sent: D + 172,
  handoff: D + 206,
  inboxArrive: D + 236,
  openTap: D + 268,
  thread: D + 274,
  takeTap: D + 316,
  taken: D + 320,
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
  if (frame < DG.summary) return tween(frame, [D + 24, D + 62], [0, 470], theme.ease.inOut);
  if (frame < DG.sent) return tween(frame, [DG.summary + 4, DG.typeFrom + 8], [0, 250], theme.ease.inOut);
  return tween(frame, [DG.taken + 8, DG.taken + 30], [0, 160], theme.ease.inOut);
}

function CoachScreen({ frame }: { frame: number }) {
  const screen = frame < DG.summary ? "slot" : frame < DG.sent ? "summary" : "thread";
  const swapIn = (at: number) => (frame >= at ? enter(frame, at, { y: 14, blur: 4, scale: 1 }).style : undefined);
  return (
    <MobileViewport width={PHONE.screenW} height={PHONE.screenH - PHONE.status} scrollY={phoneScroll(frame)}>
      <ProductShell flow roles={["coach"]} user={COACH} pathname={screen === "thread" ? "/derogations/demande" : "/derogations/nouvelle"}>
        {screen === "slot" ? <WizardSlot frame={frame} /> : null}
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
    </MobileViewport>
  );
}

/** Le téléphone du coach : entre au centre, puis se range à gauche quand le coordinateur prend le relais. */
export function S05bPhone({ frame }: { frame: number }) {
  if (frame < DG.phoneIn - 2 || frame > T.derog.end + 2) return null;
  const rise = springAt(frame, DG.phoneIn, theme.spring.smooth);
  const aside = tween(frame, [DG.handoff, DG.handoff + 26], [0, 1], theme.ease.inOut);
  const leave = tween(frame, [T.derog.end - 12, T.derog.end], [0, 1], theme.ease.in);
  const scale = 1.08 - 0.2 * aside;
  const x = 1180 + (210 - 1180) * aside;
  const y = 540 + (1 - rise) * 700;
  const w = (PHONE.screenW + PHONE.bezel * 2) * scale;
  const h = (PHONE.screenH + PHONE.bezel * 2) * scale;
  // Taps dans le viewport mobile (repères mesurés sur le rendu réel, voir README).
  const taps = [
    { at: DG.slotTap, x: 190, y: 326 },
    { at: DG.continueTap, x: 292, y: 706 },
    { at: DG.sendTap, x: 284, y: 706 },
  ];
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: 1 - leave }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        <PhoneFrame overlay={taps.map((t) => <Tap key={t.at} frame={frame} {...t} />)}>
          <CoachScreen frame={frame} />
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
      <style>{`[data-inbox] section:first-child li:first-child { opacity: ${Math.min(1, fresh * 1.4)}; transform: translate3d(0, ${(1 - fresh) * -26}px, 0) scale(${0.97 + 0.03 * fresh}); filter: blur(${(1 - Math.min(1, fresh)) * 6}px); }
[data-inbox] section:first-child li:first-child > a { box-shadow: var(--shadow-2), 0 0 0 ${arrived ? 1.5 : 0}px color-mix(in oklab, var(--club-accent) ${Math.round(tween(frame, [DG.inboxArrive + 10, DG.inboxArrive + 50], [55, 0]))}%, transparent); }`}</style>
      <div style={e(0)}>
        <PageHeader
          eyebrow={CLUB.name}
          title="Dérogations"
          description="Les demandes de changement de date envoyées par les coachs. Tu t'occupes des démarches officielles, la conversation garde la trace de tout."
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
      <div style={enter(frame, DG.thread, { y: 12 }).style}>
        <BackButton href="#" label="Dérogations" />
      </div>
      <div style={enter(frame, DG.thread + 3, { y: 18 }).style}>
        <RequestThread key={status} source={SOURCE} initial={derogationRequest("coordinator", status)} timezone={TZ} venues={VENUES} justSent={false} />
      </div>
      {frame >= DG.taken + 2 && frame < T.derog.end ? <Toast message="Tu t'occupes de cette demande." /> : null}
    </PageContainer>
  );
}

/* ── Habillage écran ──────────────────────────────────────────────────── */

export function S05bOverlay({ frame }: { frame: number }) {
  if (frame < D || frame > T.derog.end + 4) return null;
  const firstOut = DG.handoff - 6;
  return (
    <>
      <div style={{ position: "absolute", left: 120, top: 330 }}>
        <Eyebrow frame={frame} at={D + 8} out={firstOut}>
          Dérogations · sur mobile
        </Eyebrow>
        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 6 }}>
          <MaskLine frame={frame} at={D + 12} out={firstOut} size={100}>
            Le coach demande,
          </MaskLine>
          <MaskLine frame={frame} at={D + 20} out={firstOut + 2} size={100} color={theme.colors.muted}>
            où qu&apos;il soit.
          </MaskLine>
        </div>
        <div style={{ marginTop: 34, maxWidth: 560, fontFamily: theme.fonts.sans, fontSize: 24, lineHeight: 1.45, color: theme.colors.muted, ...enter(frame, D + 30, { y: 12 }).style, opacity: (enter(frame, D + 30).style.opacity as number) * (1 - tween(frame, [firstOut, firstOut + 8], [0, 1])) }}>
          Le planning des gymnases en direct : les créneaux libres, les matchs déjà programmés, les demandes en cours.
        </div>
      </div>
      <div style={{ position: "absolute", left: 470, right: 0, top: 70, display: "flex", justifyContent: "center", gap: 28 }}>
        <MaskLine frame={frame} at={DG.handoff + 18} out={DG.captionOut} size={72}>
          Le coordinateur
        </MaskLine>
        <MaskLine frame={frame} at={DG.handoff + 26} out={DG.captionOut + 2} size={72} color={theme.colors.accent}>
          s&apos;en occupe.
        </MaskLine>
      </div>
      <Handoff frame={frame} />
    </>
  );
}

/** Le lien entre les deux appareils : la demande quitte le téléphone et arrive dans la boîte du coordinateur. */
function Handoff({ frame }: { frame: number }) {
  const t = tween(frame, [DG.inboxArrive - 22, DG.inboxArrive], [0, 1], theme.ease.inOut);
  if (t <= 0 || t >= 1) return null;
  const from = { x: 330, y: 470 };
  const to = { x: 900, y: 560 };
  const x = from.x + (to.x - from.x) * t;
  const y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 120;
  return (
    <div style={{ position: "absolute", left: x - 70, top: y - 18, opacity: Math.min(1, t * 5) * Math.min(1, (1 - t) * 5), display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 14px", borderRadius: 99, background: "var(--surface-raised)", border: "1px solid var(--club-accent-border)", boxShadow: "var(--shadow-3)", fontFamily: theme.fonts.sans, fontSize: 14, fontWeight: 550, color: theme.colors.ink, whiteSpace: "nowrap" }}>
      <Send size={14} color={theme.colors.accent} />
      U17 M · dim. 11:00
    </div>
  );
}
