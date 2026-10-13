import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, Mail, Phone, UserRound } from "lucide-react";
import { requireClubContext } from "@/lib/tenancy/club-context";
import { api } from "@/lib/api/server";
import { ApiError } from "@/lib/api/client";
import { isClubAdmin } from "@/lib/permissions/roles";
import { Card, CardDivider, CardHeader } from "@/components/ui/Card";
import { PageContainer, BackButton, SectionHeader } from "@/components/ui/PageHeader";
import { PersonAvatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/Table";
import { LicencieProfileEditForm } from "@/features/licencies/LicencieProfileEditForm";
import { LicenciePublicAccessCard } from "@/features/licencies/LicenciePublicAccessCard";
import { MATCH_STATUS_LABELS, formatSecondsPlayed } from "@/features/matches/detail/labels";
import type { LicencieMatchDto } from "@/lib/api/licencies";
import type { TeamDto } from "@/lib/api/clubs";

function formatMatchDate(value: string | null): string {
  if (!value) return "Date à confirmer";
  return new Date(value).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "short", year: "numeric" });
}

/** "fiche joueur" (demande du club) : identité + tous ses matchs + ses statistiques par match, voir docs/LICENCIES.md côté ball-manager-back. */
export default async function LicencieProfilePage({ params }: { params: Promise<{ clubSlug: string; licencieId: string }> }) {
  const { clubSlug, licencieId } = await params;
  const club = await requireClubContext(clubSlug);

  let profile;
  try {
    profile = await api.licencies.get(club.id, licencieId);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const { licencie, matches, isSelf } = profile;
  const editMode: "admin" | "self" | null = isClubAdmin(club.roles) ? "admin" : isSelf ? "self" : null;
  const admin = isClubAdmin(club.roles);
  // Lien personnel sans compte (retour du club, 2026-10-01) : même source que Tables → Accès publics, club_admin uniquement.
  const [teams, publicAccess]: [TeamDto[], Awaited<ReturnType<typeof api.tables.listPublicAccess>> | null] = await Promise.all([
    api.clubs.teams(club.id),
    admin ? api.tables.listPublicAccess(club.id) : Promise.resolve(null),
  ]);
  const publicAccessEntry = publicAccess?.find((e) => e.licencie.id === licencie.id) ?? null;
  const currentTeamName = teams.find((t) => t.id === licencie.teamId)?.name ?? null;
  const name = `${licencie.lastName} ${licencie.firstName}`;

  return (
    <PageContainer width="default">
      <BackButton href={`/c/${clubSlug}/joueurs`} label="Retour aux licenciés" />

      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <PersonAvatar name={name} src={licencie.photoUrl} size="xl" />
        <div className="text-reflow flex flex-col gap-2">
          <p className="type-eyebrow">{currentTeamName ?? "Sans équipe"}</p>
          <h1 className="type-title text-foreground">{name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="neutral">
              <span className="type-numeric">{licencie.licenseNumber ?? "Numéro de licence non renseigné"}</span>
            </StatusBadge>
            {!licencie.active ? <StatusBadge tone="warning">Inactif·ve</StatusBadge> : <StatusBadge tone="success">Actif·ve</StatusBadge>}
            {isSelf ? <StatusBadge tone="accent">Votre fiche</StatusBadge> : null}
          </div>
        </div>
      </header>

      {editMode ? (
        <Card>
          <CardHeader icon={<UserRound />} title="Profil" description={editMode === "admin" ? "Identité, équipe et coordonnées." : "Vos coordonnées et votre photo."} />
          <CardDivider />
          <LicencieProfileEditForm clubId={club.id} licencie={licencie} mode={editMode} teams={editMode === "admin" ? teams : []} />
        </Card>
      ) : licencie.email || licencie.phone ? (
        <Card>
          <CardHeader icon={<UserRound />} title="Contact" />
          <CardDivider />
          <div className="flex flex-col gap-2 text-sm text-foreground sm:flex-row sm:gap-6">
            <span className="flex items-center gap-2">
              <Mail aria-hidden className="size-4 text-subtle" />
              {licencie.email ?? "—"}
            </span>
            {licencie.phone ? (
              <span className="flex items-center gap-2">
                <Phone aria-hidden className="size-4 text-subtle" />
                {licencie.phone}
              </span>
            ) : null}
          </div>
        </Card>
      ) : null}

      {admin ? (
        <LicenciePublicAccessCard
          clubId={club.id}
          clubSlug={clubSlug}
          licencieId={licencie.id}
          licencieName={`${licencie.firstName} ${licencie.lastName}`}
          licencieEmail={licencie.email}
          publicAdmin={licencie.publicAdmin}
          publicCoach={licencie.publicCoach}
          publicCoordinator={licencie.publicCoordinator}
          coachedTeamIds={licencie.coachedTeamIds}
          teams={teams}
          entry={publicAccessEntry}
        />
      ) : null}

      <section className="flex flex-col gap-4">
        <SectionHeader icon={<BarChart3 />} title={`Matchs (${matches.length})`} description="Statistiques lues sur chaque feuille e-Marque." />
        {matches.length === 0 ? (
          <EmptyState icon={<BarChart3 />} title="Aucun match pour l'instant" description="Aucun match trouvé pour ce·tte licencié·e pour l'instant." compact />
        ) : (
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
              {matches.map((m: LicencieMatchDto) => (
                <Tr key={m.matchId}>
                  <Td className="sticky left-0 z-10 min-w-[180px] bg-surface-raised">
                    <Link href={`/c/${clubSlug}/matchs/${m.matchId}`} className="font-medium text-foreground underline-offset-4 hover:text-accent-text hover:underline">
                      {m.isHome === false ? `@ ${m.opponentName ?? "?"}` : (m.opponentName ?? "?")}
                    </Link>
                    <span className="type-meta block">{MATCH_STATUS_LABELS[m.status] ?? m.status}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{formatMatchDate(m.matchDatetime)}</Td>
                  <Td align="right" numeric className="whitespace-nowrap">
                    #{m.jerseyNumber ?? "?"}
                    {m.isCaptain ? " (C)" : ""}
                  </Td>
                  <Td align="right" numeric>
                    {formatSecondsPlayed(m.stats?.secondsPlayed ?? null)}
                  </Td>
                  <Td align="right" numeric className="font-semibold">
                    {m.stats?.points ?? "—"}
                  </Td>
                  <Td align="right" numeric>
                    {m.stats?.threePointsMade ?? "—"}
                  </Td>
                  <Td align="right" numeric>
                    {m.stats?.twoPointsInteriorMade ?? "—"}
                  </Td>
                  <Td align="right" numeric>
                    {m.stats?.twoPointsExteriorMade ?? "—"}
                  </Td>
                  <Td align="right" numeric>
                    {m.stats?.freeThrowsMade ?? "—"}
                  </Td>
                  <Td align="right" numeric>
                    {m.stats?.foulsCommitted ?? "—"}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </section>
    </PageContainer>
  );
}
