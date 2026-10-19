"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Lock, LogOut, Plus } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, IconMedallion } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { derogationClient, type DerogationSource } from "@/features/derogation-requests/client";
import { RequestSections } from "@/features/derogation-requests/RequestList";
import { NO_COORDINATOR_MESSAGE } from "@/features/derogation-requests/RequestWizard";
import type { DerogationContextDto, DerogationRequestSummaryDto } from "@/lib/api/derogationRequests";
import { DerogationsList } from "@/features/admin/DerogationsList";
import { LicensedAccessGate } from "@/features/licensed-access/LicensedAccessGate";
import { usePublicIdentity, type PublicIdentity } from "@/features/public/PublicIdentityProvider";
import { listPublicDerogations, respondPublicDerogation } from "@/lib/api/publicTables";
import type { DerogationListItemDto } from "@/lib/api/derogations";
import { ApiError } from "@/lib/api/client";

/**
 * Onglet Dérogations de l'espace public (retour du club, 2026-10-01 :
 * "s'il clique sur dérogation, ça va lui demander de se co si token pas
 * reconnu") :
 *  - aucun lien reconnu → identification (lien personnel par email) ;
 *  - lien reconnu mais licencié sans rôle → accès réservé ;
 *  - coach / coordinateur (rôles posés depuis /joueurs) → demandes internes ;
 *  - administrateur du club ou coordinateur → demandes internes + dérogations
 *    officielles FBI (liste, accepter / refuser ; création depuis la fiche
 *    match) — retour du club, 2026-10-02 : « le coordinateur doit avoir les
 *    mêmes droits qu'un admin général sur les dérogations ».
 * Le serveur revérifie le rôle à chaque lecture (403 sinon) : l'indicateur
 * `isClubAdmin` ne sert ici qu'à choisir l'écran.
 */
export function PublicDerogationsApp({ clubSlug, clubName }: { clubSlug: string; clubName: string }) {
  const { identity, forget } = usePublicIdentity();

  if (identity === undefined) return <ListSkeleton rows={4} />;

  if (identity === null) {
    return (
      <LicensedAccessGate module="derogations" />
    );
  }

  if (!hasDerogationAccess(identity)) return <RestrictedAccess identity={identity} onForget={forget} />;

  return (
    <div className="flex flex-col gap-10">
      <PublicRequestsHome clubSlug={clubSlug} clubName={clubName} identity={identity} onForget={forget} />
      {canManageOfficialDerogations(identity) ? <AdminDerogations clubSlug={clubSlug} identity={identity} /> : null}
    </div>
  );
}

/** Dérogations officielles FBI : admin du club ou coordinateur (`derogationRequests.canManage`). Le serveur revérifie. */
export function canManageOfficialDerogations(identity: PublicIdentity): boolean {
  return identity.isClubAdmin || identity.derogationRequests.canManage;
}

export function hasDerogationAccess(identity: PublicIdentity): boolean {
  return identity.isClubAdmin || identity.derogationRequests.canCreate || identity.derogationRequests.canManage;
}

/**
 * Demandes de dérogation INTERNES (coach → coordinateur) depuis l'espace
 * public — retour du club, 2026-10-01 : coachs et coordinateur désignés
 * depuis /joueurs, sans compte. Mêmes écrans que l'espace club.
 */
function PublicRequestsHome({ clubSlug, clubName, identity, onForget }: { clubSlug: string; clubName: string; identity: PublicIdentity; onForget: () => void }) {
  const source = useMemo<DerogationSource>(() => ({ kind: "public", clubSlug, token: identity.token }), [clubSlug, identity.token]);
  const [data, setData] = useState<{ context: DerogationContextDto; requests: DerogationRequestSummaryDto[] } | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const base = `/public/${clubSlug}/derogations`;

  useEffect(() => {
    let cancelled = false;
    const client = derogationClient(source);
    Promise.all([client.context(), client.list({ limit: 200 })])
      .then(([context, list]) => {
        if (!cancelled) setData({ context, requests: list.requests });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error("Impossible de charger les demandes."));
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (error instanceof ApiError && error.isUnauthorized) {
    return <ErrorState title="Lien personnel expiré" description="Ton lien a été remplacé ou révoqué. Demande un nouveau lien depuis cet onglet." action={<Button onClick={onForget}>Demander un nouveau lien</Button>} />;
  }
  if (error instanceof ApiError && error.isForbidden) return <RestrictedAccess identity={identity} onForget={onForget} />;

  const manager = data?.context.canManage ?? identity.derogationRequests.canManage;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={clubName}
        title="Dérogations"
        description={
          manager
            ? "Les demandes de changement de date envoyées par les coachs. Tu t'occupes des démarches officielles, la conversation garde la trace de tout."
            : "Demande au coordinateur de déplacer un match, puis suis sa réponse ici."
        }
        actions={
          identity.derogationRequests.canCreate ? (
            <ButtonLink href={`${base}/nouvelle`} variant="primary" icon={<Plus />}>
              Nouvelle demande
            </ButtonLink>
          ) : null
        }
      />
      {error ? (
        <ErrorState title="Impossible de charger les demandes" description={error.message} />
      ) : data === null ? (
        <ListSkeleton rows={4} />
      ) : (
        <>
          {!data.context.coordinatorsConfigured ? <Notice tone="warning">{NO_COORDINATOR_MESSAGE}</Notice> : null}
          {data.requests.length === 0 ? (
            <EmptyState
              icon={<CalendarClock />}
              title="Aucune demande de dérogation"
              description={manager ? "Les demandes des coachs apparaîtront ici dès leur envoi." : "Besoin de déplacer un match ? Choisis le match, la date et le créneau : le coordinateur reçoit ta demande."}
            />
          ) : (
            <RequestSections
              requests={data.requests}
              manager={manager}
              timezone={data.context.timezone}
              basePath={base}
              source={source}
              onDeleted={(id) => setData((current) => (current ? { ...current, requests: current.requests.filter((r) => r.id !== id) } : current))}
            />
          )}
        </>
      )}
    </div>
  );
}

function RestrictedAccess({ identity, onForget }: { identity: PublicIdentity; onForget: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col py-4">
      <Card>
        <div className="flex flex-col items-start gap-4">
          <IconMedallion tone="neutral" size="lg">
            <Lock />
          </IconMedallion>
          <div className="text-reflow">
            <h1 className="type-title text-foreground">Accès réservé</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Les dérogations sont réservées aux coachs, au coordinateur et aux administrateurs du club. Tu es reconnu·e comme{" "}
              <span className="font-medium text-foreground">
                {identity.licencie.firstName} {identity.licencie.lastName}
              </span>
              , qui n&apos;a aucun de ces rôles. Un administrateur peut te l&apos;attribuer depuis la liste des joueurs.
            </p>
          </div>
          <Button variant="ghost" icon={<LogOut />} onClick={onForget}>
            Ce n&apos;est pas moi
          </Button>
        </div>
      </Card>
    </div>
  );
}

function AdminDerogations({ clubSlug, identity }: { clubSlug: string; identity: PublicIdentity }) {
  const [derogations, setDerogations] = useState<DerogationListItemDto[] | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPublicDerogations(clubSlug, identity.token)
      .then((result) => {
        if (!cancelled) setDerogations(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error("Impossible de charger les dérogations."));
      });
    return () => {
      cancelled = true;
    };
  }, [clubSlug, identity.token]);

  // Rôle retiré ou lien révoqué entre-temps : le serveur fait foi (le bloc des demandes internes gère déjà le lien expiré).
  if (error instanceof ApiError && (error.isForbidden || error.isUnauthorized)) return null;

  return (
    <section aria-labelledby="fbi-title" className="flex flex-col gap-4">
      <SectionHeader
        id="fbi-title"
        title="Dérogations officielles (FBI)"
        description="Dérogations FBI connues pour le club : accepte ou refuse celles qui attendent une réponse. Pour en créer une, ouvre le match concerné (onglet Matchs) → « Créer une dérogation »."
      />
      {error ? (
        <ErrorState title="Impossible de charger les dérogations" description={error.message} />
      ) : derogations === null ? (
        <ListSkeleton rows={4} />
      ) : (
        <DerogationsList derogations={derogations} matchBasePath={`/public/${clubSlug}/matchs`} respond={(derogationId, body) => respondPublicDerogation(clubSlug, identity.token, derogationId, body)} />
      )}
    </section>
  );
}
