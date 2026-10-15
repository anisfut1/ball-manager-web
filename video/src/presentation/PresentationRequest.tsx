import { ArrowRight, CheckCircle2, Hand, MapPin, UserRound, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MatchHeadline, RequestStatusBadge } from "@/features/derogation-requests/parts";
import { formatShortDateTime } from "@/features/derogation-requests/labels";
import { CHOSEN_SLOT, COACH, DEROG_MATCH, TZ } from "../data/demo";

/**
 * VERSION VIDÉO de l'en-tête de RequestThread (vue coordinateur) : le match
 * (MatchHeadline réel), le statut (RequestStatusBadge réel), l'ancien et le
 * nouveau créneau en grand, et l'action. La conversation, la demande FBI et
 * les mentions sont retirées du rendu — pas du produit.
 */
export function PresentationRequest({ status, busy }: { status: "REQUESTED" | "IN_PROGRESS"; busy: boolean }) {
  return (
    <Card variant="glow" className="flex flex-col gap-5 p-6">
      <MatchHeadline match={DEROG_MATCH} timezone={TZ} trailing={<RequestStatusBadge status={status} />} />
      <div className="flex items-center gap-4 rounded-[var(--radius-md)] border border-border bg-surface px-5 py-4">
        <span className="type-numeric text-[19px] text-muted line-through decoration-subtle/70">{formatShortDateTime(DEROG_MATCH.matchDatetime, TZ)}</span>
        <ArrowRight aria-hidden className="size-5 text-subtle" />
        <span className="type-numeric text-[24px] font-semibold text-foreground">{formatShortDateTime(CHOSEN_SLOT.startAt, TZ)}</span>
      </div>
      <p className="type-meta flex items-center gap-4 text-[15px]">
        <span className="inline-flex items-center gap-1.5">
          <MapPin aria-hidden className="size-4" />
          {CHOSEN_SLOT.venueName}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <UserRound aria-hidden className="size-4" />
          {COACH.displayName}
        </span>
      </p>
      <div className="flex items-center gap-2 border-t border-border pt-4">
        {status === "REQUESTED" ? (
          <>
            <Button variant="primary" size="lg" icon={<Hand />} loading={busy} data-take>
              Je m&apos;en occupe
            </Button>
            <Button variant="outline" size="lg" icon={<XCircle />}>
              Ce n&apos;est pas possible
            </Button>
          </>
        ) : (
          <Button variant="success" size="lg" icon={<CheckCircle2 />}>
            Marquer comme traitée
          </Button>
        )}
      </div>
    </Card>
  );
}
