import { CalendarClock, Plus, UsersRound } from "lucide-react";
import { requireAnyClubRoleContext } from "@/lib/tenancy/club-context";
import { DEROGATION_REQUEST_ROLES, isClubAdmin } from "@/lib/permissions/roles";
import { api } from "@/lib/api/server";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PageContainer, PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { RequestSections } from "@/features/derogation-requests/RequestList";
import { NO_COORDINATOR_MESSAGE } from "@/features/derogation-requests/RequestWizard";

/**
 * Dérogations internes (retour du club, 2026-10-01) : le coach demande, le
 * coordinateur traite. Inbox du coordinateur ou suivi du coach selon les
 * droits renvoyés par ball-manager-back (`context.canManage`). Distinct des
 * dérogations officielles FBI (/admin/derogations).
 */
export default async function DerogationRequestsPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const club = await requireAnyClubRoleContext(clubSlug, DEROGATION_REQUEST_ROLES);
  const [context, list] = await Promise.all([api.derogationRequests.context(club.id), api.derogationRequests.list(club.id, { limit: 200 })]);
  const base = `/c/${clubSlug}/derogations`;
  const manager = context.canManage;

  return (
    <PageContainer width="wide" className="gap-6">
      <PageHeader
        eyebrow={club.name}
        title="Dérogations"
        description={
          manager
            ? "Les demandes de changement de date envoyées par les coachs. Tu t'occupes des démarches officielles, la conversation garde la trace de tout."
            : "Demande au coordinateur de déplacer un match de ton équipe, puis suis sa réponse ici."
        }
        actions={
          context.canCreate ? (
            <ButtonLink href={`${base}/nouvelle`} variant="primary" icon={<Plus />}>
              Nouvelle demande
            </ButtonLink>
          ) : null
        }
      />

      {!context.coordinatorsConfigured ? (
        <Notice
          tone="warning"
          action={
            isClubAdmin(club.roles) ? (
              <ButtonLink href={`/c/${clubSlug}/joueurs`} size="sm" variant="secondary" icon={<UsersRound />}>
                Désigner un coordinateur
              </ButtonLink>
            ) : undefined
          }
        >
          {NO_COORDINATOR_MESSAGE}
        </Notice>
      ) : null}

      {list.requests.length === 0 ? (
        <EmptyState
          icon={<CalendarClock />}
          title="Aucune demande de dérogation"
          description={manager ? "Les demandes des coachs apparaîtront ici dès leur envoi." : "Besoin de déplacer un match ? Choisis le match, la date et le créneau : le coordinateur reçoit ta demande."}
          action={
            context.canCreate ? (
              <ButtonLink href={`${base}/nouvelle`} variant="primary" icon={<Plus />}>
                Nouvelle demande
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <RequestSections requests={list.requests} manager={manager} timezone={context.timezone} basePath={base} source={{ kind: "club", clubId: club.id }} />
      )}
    </PageContainer>
  );
}
