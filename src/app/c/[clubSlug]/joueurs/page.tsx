import { Users } from "lucide-react";
import { requireClubContext } from "@/lib/tenancy/club-context";
import { api } from "@/lib/api/server";
import { isClubAdmin } from "@/lib/permissions/roles";
import { PageContainer, PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/Badge";
import { LicenceImportPanel } from "@/features/licencies/LicenceImportPanel";
import { ClaimRequestsPanel } from "@/features/tables/ClaimRequestsPanel";
import { RosterBoard } from "@/features/licencies/RosterBoard";
import { AddPersonButton } from "@/features/licencies/AddPersonButton";

/**
 * Roster du club, sectorisé par équipe (demande du club, voir
 * docs/TEAMS.md côté ball-manager-back) — point d'entrée vers chaque fiche
 * individuelle. Affiche TOUTES les équipes (même sans licencié rattaché,
 * ex. une catégorie encore en brassage sans effectif connu) pour que
 * l'admin voie la structure complète du club, pas seulement les équipes
 * déjà peuplées.
 *
 * `club_admin` : licenciés à jour depuis FBI (automatique chaque jour, ou
 * fichier Excel déposé — retour du club, 2026-10-08) + glisser-déposer
 * pour réaffecter un licencié d'une équipe à l'autre (demande du club,
 * 2026-09-28 : "ajoute les tous stp... Fais moi un truc ou jpeux glisser
 * les cartes pr les mettre d'une equipe a lautre").
 */
export default async function JoueursPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const club = await requireClubContext(clubSlug);
  const isAdmin = isClubAdmin(club.roles);
  const [licencies, teams, importStatus, claimRequests] = await Promise.all([
    api.licencies.list(club.id),
    api.clubs.teams(club.id),
    // Écran admin seulement ; un échec n'empêche jamais d'afficher la liste.
    isAdmin ? api.licencies.importStatus(club.id).catch(() => null) : Promise.resolve(null),
    // Demandes de lien vers une nouvelle adresse : visibles ici (liste des joueurs) et dans Tables de marque → Accès publics.
    isAdmin ? api.tables.claimRequests(club.id).catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <PageContainer width="wide">
      <PageHeader
        eyebrow="Effectif"
        title="Joueurs"
        description="Licenciés du club, regroupés par équipe. Chaque fiche retrace les matchs et statistiques lus sur les feuilles e-Marque."
        actions={isAdmin ? <AddPersonButton clubId={club.id} teams={teams} /> : null}
        meta={
          licencies.length > 0 ? (
            <>
              <StatusBadge tone="neutral" icon={<Users />}>
                {licencies.length} licencié{licencies.length > 1 ? "s" : ""}
              </StatusBadge>
              <StatusBadge tone="neutral">
                {teams.length} équipe{teams.length > 1 ? "s" : ""}
              </StatusBadge>
            </>
          ) : null
        }
      />
      {isAdmin ? <ClaimRequestsPanel clubId={club.id} requests={claimRequests} /> : null}
      {isAdmin ? <LicenceImportPanel clubId={club.id} clubSlug={clubSlug} initialStatus={importStatus} /> : null}
      {licencies.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="Aucun licencié pour l'instant"
          description="Les licencié·e·s du club sont créé·e·s automatiquement à partir des documents e-Marque importés (numéro de licence lu sur une feuille de match), ou peuvent être ajouté·e·s manuellement par un·e administrateur·rice."
        />
      ) : (
        <RosterBoard clubId={club.id} clubSlug={clubSlug} licencies={licencies} teams={teams} isAdmin={isAdmin} />
      )}
    </PageContainer>
  );
}
