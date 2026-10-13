import Link from "next/link";
import { ClipboardList, Download, FileText, Flag, Info, Scale, Table2, UserRound, Users } from "lucide-react";
import { Card, CardDivider, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataList } from "@/components/ui/DataList";
import { EmptyState } from "@/components/ui/States";
import { Notice } from "@/components/ui/Notice";
import { TeamLogo } from "@/components/ui/Logo";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/Table";
import { buttonClasses } from "@/components/ui/Button";
import type { MatchDetailsDto, MatchDocumentDto } from "@/lib/api/matches";
import { DOCUMENT_TYPE_LABELS, EMARQUE_STATUS, MATCH_STATUS_LABELS, REFEREE_ROLE_LABELS, TABLE_OFFICIAL_ROLE_LABELS, formatSecondsPlayed, personName } from "./labels";
import type { ScoreboardTeam } from "./Scoreboard";
import { PlayerStatCards } from "./PlayerStatCards";

export function InformationsPanel({ match, home, away }: { match: MatchDetailsDto; home: ScoreboardTeam; away: ScoreboardTeam }) {
  return (
    <Card>
      <CardHeader icon={<Info />} title="Informations" />
      <CardDivider />
      <DataList
        items={[
          { label: "Rencontre", value: `N° ${match.numero ?? "?"}` },
          { label: "Journée", value: match.journee ?? "—" },
          { label: "Lieu", value: match.venueLabel ?? "À confirmer" },
          { label: "Score", value: match.scoreHome !== null && match.scoreAway !== null ? `${home.name} ${match.scoreHome} - ${match.scoreAway} ${away.name}` : "Non disponible" },
          { label: "Statut", value: MATCH_STATUS_LABELS[match.status] ?? match.status },
        ]}
      />
    </Card>
  );
}

function TeamPanelHeader({ team, side }: { team: ScoreboardTeam; side: "home" | "away" }) {
  return (
    <div className="flex items-center gap-3">
      <TeamLogo name={team.logoName} src={team.logoUrl} size="md" accent={team.isClub} />
      <div className="text-reflow flex-1">
        <h3 className="type-card text-foreground">{team.name}</h3>
        <p className="type-meta">{side === "home" ? "Domicile" : "Extérieur"}</p>
      </div>
    </div>
  );
}

export function CompositionPanel({ match, home, away }: { match: MatchDetailsDto; home: ScoreboardTeam; away: ScoreboardTeam }) {
  const { participants, coaches } = match;

  if (participants.length === 0 && coaches.length === 0) {
    return <EmptyState icon={<Users />} title="Composition pas encore disponible" description="Document e-Marque non importé pour ce match." />;
  }

  const bySide = { home: participants.filter((p) => p.teamSide === "home"), away: participants.filter((p) => p.teamSide === "away") };
  const coachesBySide = { home: coaches.filter((c) => c.teamSide === "home"), away: coaches.filter((c) => c.teamSide === "away") };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {(["home", "away"] as const).map((side) => (
        <Card key={side}>
          <TeamPanelHeader team={side === "home" ? home : away} side={side} />
          <CardDivider />
          <ul className="flex flex-col">
            {bySide[side].map((p) => (
              <li key={p.id} className="flex min-h-11 items-center gap-3 border-b border-border py-1.5 last:border-b-0">
                <span className="type-numeric inline-flex h-8 min-w-8 items-center justify-center rounded-[9px] border border-border bg-surface px-1.5 text-sm font-medium text-foreground">{p.jerseyNumber ?? "?"}</span>
                <span className="text-reflow flex-1 text-sm text-foreground">{personName(p)}</span>
                <span className="flex shrink-0 gap-1">
                  {p.isCaptain ? (
                    <StatusBadge tone="accent" size="sm" dot={false}>
                      <span aria-hidden>C</span>
                      <span className="sr-only">Capitaine</span>
                    </StatusBadge>
                  ) : null}
                  {p.isStarter ? (
                    <StatusBadge tone="neutral" size="sm">
                      Titulaire
                    </StatusBadge>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          {coachesBySide[side].length > 0 ? (
            <div className="mt-3 flex flex-col gap-1.5 rounded-[var(--radius-md)] bg-surface px-3 py-2.5">
              {coachesBySide[side].map((c, index) => (
                <p key={`coach-${index}`} className="flex items-center gap-2 text-sm text-muted">
                  <UserRound aria-hidden className="size-4 text-subtle" />
                  <span>
                    {c.role === "principal" ? "Entraîneur" : "Entraîneur adjoint"} : <span className="text-foreground">{personName(c)}</span>
                  </span>
                </p>
              ))}
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function StatsTable({ team, rows, playerBasePath }: { team: ScoreboardTeam; rows: MatchDetailsDto["stats"]; playerBasePath?: string }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <TeamLogo name={team.logoName} src={team.logoUrl} size="sm" accent={team.isClub} />
        <h3 className="type-card text-foreground">{team.name}</h3>
      </div>
      <PlayerStatCards rows={rows} accent={team.isClub} playerBasePath={playerBasePath} />
      <details className="group [&_summary::-webkit-details-marker]:hidden">
        <summary className="type-meta flex cursor-pointer list-none items-center gap-1.5 hover:text-foreground">
          <Table2 aria-hidden className="size-3.5" />
          Tableau détaillé
        </summary>
        <div className="mt-3">
      <Table caption={`Statistiques — ${team.name}`}>
        <THead>
          <tr>
            <Th className="sticky left-0 z-10 bg-surface">Joueur</Th>
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
          {rows.map((row) => (
            <Tr key={row.participantId}>
              <Td className="sticky left-0 z-10 min-w-[180px] bg-surface-raised">
                <span className="flex items-center gap-2.5">
                  <span className="type-numeric w-6 shrink-0 text-right text-muted">{row.jerseyNumber ?? "?"}</span>
                  {/* Vers la fiche joueur (docs/LICENCIES.md côté ball-manager-back) — uniquement dans l'espace club et si ce participant a déjà un licencié rattaché. */}
                  {playerBasePath && row.licencieId ? (
                    <Link href={`${playerBasePath}/${row.licencieId}`} className="font-medium text-foreground underline-offset-4 hover:text-accent-text hover:underline">
                      {personName(row)}
                    </Link>
                  ) : (
                    <span>{personName(row)}</span>
                  )}
                </span>
              </Td>
              <Td align="right" numeric>
                {formatSecondsPlayed(row.secondsPlayed)}
              </Td>
              <Td align="right" numeric className="font-semibold">
                {row.points ?? "—"}
              </Td>
              <Td align="right" numeric>
                {row.threePointsMade ?? "—"}
              </Td>
              <Td align="right" numeric>
                {row.twoPointsInteriorMade ?? "—"}
              </Td>
              <Td align="right" numeric>
                {row.twoPointsExteriorMade ?? "—"}
              </Td>
              <Td align="right" numeric>
                {row.freeThrowsMade ?? "—"}
              </Td>
              <Td align="right" numeric>
                {row.foulsCommitted ?? "—"}
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
        </div>
      </details>
    </section>
  );
}

export function StatsPanel({ match, home, away, playerBasePath }: { match: MatchDetailsDto; home: ScoreboardTeam; away: ScoreboardTeam; playerBasePath?: string }) {
  const { stats } = match;
  if (stats.length === 0) {
    // Lecture retenue par les contrôles (total des points ≠ score officiel...) : jamais publiée en l'état.
    if (match.emarque.status === "needs_review" || match.emarque.status === "error") {
      return <EmptyState icon={<ClipboardList />} title="Statistiques en cours de vérification" description="La feuille e-Marque a été lue mais n'a pas passé les contrôles de cohérence : elles seront publiées une fois vérifiées." />;
    }
    if (match.emarque.status === "not_available") {
      return <EmptyState icon={<ClipboardList />} title="Pas de feuille e-Marque" description="Aucune feuille e-Marque n'a été publiée sur FBI pour ce match." />;
    }
    return <EmptyState icon={<ClipboardList />} title="Statistiques pas encore disponibles" description="Elles apparaîtront automatiquement dès que la feuille e-Marque du match sera publiée sur FBI et lue." />;
  }
  const bySide = { home: stats.filter((row) => row.teamSide === "home"), away: stats.filter((row) => row.teamSide === "away") };
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-8">
        <StatsTable team={home} rows={bySide.home} playerBasePath={playerBasePath} />
        <StatsTable team={away} rows={bySide.away} playerBasePath={playerBasePath} />
      </div>
      <p className="type-meta">« — » signifie une donnée non lue avec certitude sur le document, jamais une valeur nulle supposée.</p>
    </div>
  );
}

export function OfficialsPanel({ match }: { match: MatchDetailsDto }) {
  const { officials, tableOfficials } = match;
  if (officials.length === 0 && tableOfficials.length === 0) {
    return <EmptyState icon={<Flag />} title="Officiels pas encore disponibles" description="Ils sont lus sur la feuille e-Marque une fois celle-ci importée." />;
  }
  const lists = [
    { title: "Arbitres", icon: <Scale />, rows: officials.map((o) => ({ role: REFEREE_ROLE_LABELS[o.role] ?? o.role, name: personName(o) })) },
    { title: "Officiels de table (OTM)", icon: <ClipboardList />, rows: tableOfficials.map((o) => ({ role: TABLE_OFFICIAL_ROLE_LABELS[o.role] ?? o.role, name: personName(o) })) },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {lists.map((list) => (
        <Card key={list.title}>
          <CardHeader icon={list.icon} title={list.title} />
          <CardDivider />
          {list.rows.length === 0 ? (
            <p className="type-meta">Non disponible</p>
          ) : (
            <ul className="flex flex-col">
              {list.rows.map((row, index) => (
                <li key={index} className="flex min-h-11 flex-col justify-center border-b border-border py-2 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="type-meta">{row.role}</span>
                  <span className="text-sm font-medium text-foreground">{row.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}

/**
 * Vue e-Marque. Téléchargement du document original : uniquement pour un
 * club_admin ET si l'API a fourni une URL signée (`downloadUrl`) — la vue
 * publique ne reçoit jamais d'action.
 */
export function EmarquePanel({ match, documents, mode, isAdmin }: { match: MatchDetailsDto; documents: MatchDocumentDto[]; mode: "club" | "public"; isAdmin: boolean }) {
  const status = EMARQUE_STATUS[match.emarque.status] ?? { label: match.emarque.status, tone: "neutral" as const };
  const warnings = match.emarque.qualityWarningCount;

  return (
    <Card>
      <CardHeader icon={<FileText />} title="e-Marque" description="Feuille de match numérique récupérée depuis FBI." actions={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>} />
      <CardDivider />
      <DataList
        columns={3}
        items={[
          { label: "Statut", value: status.label },
          { label: "Source", value: match.emarque.source ?? "—" },
          { label: "Dernière récupération", value: match.emarque.lastRetrievedAt ? new Date(match.emarque.lastRetrievedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "—" },
        ]}
      />

      {warnings !== null && warnings > 0 ? (
        <Notice tone="warning" className="mt-5">
          {mode === "club" && isAdmin
            ? `Import réussi avec ${warnings} avertissement(s) — vérification recommandée.`
            : "Certaines informations de ce match sont en cours de vérification par un administrateur."}
        </Notice>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        <p className="type-eyebrow">Documents</p>
        {documents.length > 0 ? (
          <>
            <ul className="flex flex-col gap-2">
              {documents.map((doc) => (
                <li key={doc.id} className="flex min-h-14 items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2">
                  <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-[9px] border border-border bg-surface-raised text-muted">
                    <FileText className="size-4" />
                  </span>
                  <span className="text-reflow flex-1 text-sm font-medium text-foreground">{DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}</span>
                  {mode === "club" && isAdmin && doc.downloadUrl ? (
                    <a href={doc.downloadUrl} rel="noopener noreferrer" className={buttonClasses({ variant: "secondary", size: "sm" })}>
                      <Download aria-hidden />
                      Télécharger
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
            {mode === "public" ? (
              <p className="type-meta">Le document original n&apos;est téléchargeable que depuis l&apos;espace du club (compte administrateur).</p>
            ) : !isAdmin ? (
              <p className="type-meta">Seul un administrateur du club peut télécharger le document original.</p>
            ) : null}
          </>
        ) : (
          <p className="type-meta rounded-[var(--radius-md)] border border-dashed border-border-strong px-4 py-4">
            Aucun document e-Marque récupéré pour l&apos;instant — ce n&apos;est pas une erreur, la récupération automatique réessaiera régulièrement une fois le match terminé.
          </p>
        )}
      </div>
    </Card>
  );
}
