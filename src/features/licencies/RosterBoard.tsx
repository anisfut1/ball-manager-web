"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import type { LicencieDto } from "@/lib/api/licencies";
import type { TeamDto } from "@/lib/api/clubs";
import { CalendarCog, GripVertical, Megaphone, Search, ShieldCheck, Shirt, Trash2, UserX, Wand2 } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Button, IconButton } from "@/components/ui/Button";
import { FormMessage, Input, Select } from "@/components/ui/Field";
import { StatusBadge } from "@/components/ui/Badge";
import { Notice } from "@/components/ui/Notice";
import { PersonAvatar } from "@/components/ui/Avatar";

type PublicRoleFlag = "publicAdmin" | "publicCoach" | "publicCoordinator";

/** Rôles posés depuis /joueurs pour l'espace public sans compte (lien personnel). */
const PUBLIC_ROLE_FLAGS: { flag: PublicRoleFlag; label: string; short: string; hint: string; icon: typeof ShieldCheck }[] = [
  { flag: "publicAdmin", label: "admin", short: "Admin", hint: "accès aux dérogations FBI", icon: ShieldCheck },
  { flag: "publicCoach", label: "coach", short: "Coach", hint: "demande des dérogations", icon: Megaphone },
  { flag: "publicCoordinator", label: "coordinateur", short: "Coordinateur", hint: "traite les demandes de dérogation", icon: CalendarCog },
];

interface Bucket {
  teamId: string | null;
  title: string;
  licencies: LicencieDto[];
}

function bucketsFor(licencies: LicencieDto[], teams: TeamDto[]): Bucket[] {
  const byTeamId = new Map<string, LicencieDto[]>();
  const withoutTeam: LicencieDto[] = [];
  for (const l of licencies) {
    if (!l.teamId) {
      withoutTeam.push(l);
      continue;
    }
    const bucket = byTeamId.get(l.teamId) ?? [];
    bucket.push(l);
    byTeamId.set(l.teamId, bucket);
  }

  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));
  const buckets: Bucket[] = sortedTeams.map((t) => ({ teamId: t.id, title: t.name, licencies: byTeamId.get(t.id) ?? [] }));
  buckets.push({ teamId: null, title: "Sans équipe", licencies: withoutTeam });
  return buckets;
}

/** "Sans équipe" — même valeur conventionnelle que `bucketsFor`/`assignTeam` : jamais une chaîne vide ambiguë avec un id réel. */
const NO_TEAM_VALUE = "__no_team__";

function LicencieCard({
  clubSlug,
  licencie,
  teams,
  isAdmin,
  onAssignTeam,
  onToggleFlag,
  isConfirmingDelete,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  clubSlug: string;
  licencie: LicencieDto;
  teams: TeamDto[];
  isAdmin: boolean;
  onAssignTeam: (teamId: string | null) => void;
  onToggleFlag: (flag: PublicRoleFlag) => void;
  isConfirmingDelete: boolean;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const name = `${licencie.lastName} ${licencie.firstName}`;
  const coachedNames = licencie.coachedTeamIds.map((id) => teams.find((t) => t.id === id)?.name).filter((n): n is string => Boolean(n));
  return (
    <div className="group flex flex-col gap-2 px-3 py-2.5 transition-colors duration-150 hover:bg-surface sm:flex-row sm:items-center sm:gap-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {isAdmin ? <GripVertical aria-hidden className="hidden size-4 shrink-0 text-subtle opacity-60 group-hover:opacity-100 sm:block" /> : null}
        <Link href={`/c/${clubSlug}/joueurs/${licencie.id}`} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md">
          <PersonAvatar name={name} src={licencie.photoUrl} />
          <span className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">{name}</span>
              {!licencie.active ? (
                <StatusBadge tone="neutral" size="sm">
                  Inactif·ve
                </StatusBadge>
              ) : null}
            </span>
            {/* Catégorie/sexe FFBB — repère pour choisir la bonne équipe (un club a souvent plusieurs équipes par catégorie, ex. SM1/SM2/SF). */}
            <span className="type-meta truncate">
              {PUBLIC_ROLE_FLAGS.filter((f) => licencie[f.flag]).map((f) => (
                <span key={f.flag} className="font-medium text-accent-text">
                  <f.icon aria-hidden className="inline size-3.5 align-[-2px]" /> {f.short}
                  {f.flag === "publicCoach" && coachedNames.length ? ` (${coachedNames.join(", ")})` : ""} ·{" "}
                </span>
              ))}
              <span className="type-numeric">{licencie.licenseNumber ?? "Licence —"}</span>
              {licencie.categoryLabel || licencie.sexe ? ` · ${[licencie.categoryLabel, licencie.sexe].filter(Boolean).join(" · ")}` : ""}
            </span>
          </span>
        </Link>
      </div>
      {isAdmin ? (
        <div className="flex shrink-0 items-center gap-1 pl-12 sm:pl-0">
          {isConfirmingDelete ? (
            <span className="flex items-center gap-1.5" role="group" aria-label={`Confirmer la suppression de ${name}`}>
              <Button variant="danger" size="sm" onClick={onConfirmDelete}>
                Confirmer
              </Button>
              <Button variant="secondary" size="sm" onClick={onCancelDelete}>
                Annuler
              </Button>
            </span>
          ) : (
            <>
              <span className="w-44 sm:w-36 2xl:w-44">
                <Select
                  aria-label={`Équipe de ${name}`}
                  value={licencie.teamId ?? NO_TEAM_VALUE}
                  onChange={(e) => onAssignTeam(e.target.value === NO_TEAM_VALUE ? null : e.target.value)}
                  className="h-9 text-[13px] sm:h-9 sm:text-[13px]"
                >
                  <option value={NO_TEAM_VALUE}>Sans équipe</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </span>
              {/*
                Rôles de l'espace public sans compte, posés ici (retour du club, 2026-10-01) :
                « mettre un profil admin et qu'il ait accès aux dérogs », puis « comme on a fait
                pour l'admin, on le fait pour les coachs et coordinateurs » — sans équipe à préciser.
              */}
              {PUBLIC_ROLE_FLAGS.map((f) => (
                <IconButton
                  key={f.flag}
                  label={licencie[f.flag] ? `Retirer le rôle ${f.label} de ${name}` : `Donner le rôle ${f.label} à ${name} (${f.hint})`}
                  aria-pressed={licencie[f.flag]}
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleFlag(f.flag)}
                  className={cn(licencie[f.flag] && "bg-accent-soft text-accent-text hover:bg-accent-soft hover:text-accent-text")}
                >
                  <f.icon />
                </IconButton>
              ))}
              <IconButton label="Supprimer ce licencié" variant="danger-ghost" size="sm" onClick={onRequestDelete}>
                <Trash2 />
              </IconButton>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * "Fais moi un truc ou jpeux glisser les cartes pr les mettre d'une equipe
 * a lautre" (demande du club, 2026-09-28) — glisser-déposer natif (HTML5
 * drag & drop, aucune dépendance ajoutée) entre les sections par équipe.
 * `isAdmin` uniquement (même verrou que `PATCH .../profile` côté API,
 * appelé ici pour CHAQUE déplacement — teamId est admin-only en écriture,
 * voir docs/LICENCIES.md côté ball-manager-back).
 *
 * Optimiste : la carte change de section IMMÉDIATEMENT au dépôt, annulé
 * (retour à l'état précédent) si l'appel API échoue — jamais un
 * déplacement visuel qui resterait affiché alors qu'il n'a pas été
 * réellement enregistré.
 */
export function RosterBoard({
  clubId,
  clubSlug,
  licencies,
  teams,
  isAdmin,
}: {
  clubId: string;
  clubSlug: string;
  licencies: LicencieDto[];
  teams: TeamDto[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(licencies);
  // Resynchronise l'état local sur les props fraîches après un
  // `router.refresh()` (déplacement ou répartition automatique) — mise à
  // jour PENDANT le rendu (jamais dans un Effect, voir la doc React
  // "Adjusting state when a prop changes") : sans ça, `items` resterait
  // figé sur le snapshot initial du montage.
  const [prevLicencies, setPrevLicencies] = useState(licencies);
  if (licencies !== prevLicencies) {
    setPrevLicencies(licencies);
    setItems(licencies);
  }
  const [isPending, startTransition] = useTransition();
  const [dragLicencieId, setDragLicencieId] = useState<string | null>(null);
  const [dragOverTeamId, setDragOverTeamId] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [autoAssignStatus, setAutoAssignStatus] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  function handleAutoAssign() {
    setError(null);
    setAutoAssignStatus(null);
    startTransition(async () => {
      try {
        const result = await browserApi.licencies.autoAssignTeams(clubId);
        setAutoAssignStatus(
          result.total === 0
            ? "Aucun·e licencié·e sans équipe avec une catégorie connue."
            : `${result.assigned} licencié·e·s affecté·e·s automatiquement sur ${result.total} sans équipe${result.skipped > 0 ? ` (${result.skipped} restent sans équipe correspondante, à traiter à la main)` : ""}.`,
        );
        router.refresh();
      } catch (e) {
        setAutoAssignStatus(e instanceof ApiError ? e.message : "Répartition automatique impossible.");
      }
    });
  }

  /**
   * Partagée par le glisser-déposer ET le sélecteur d'équipe par ligne
   * (demande du club, 2026-09-28 : "met moi un esepce de selecteur pour
   * changer les gens dequipes ce sera bcp plus simple" — plus fiable que le
   * glisser-déposer, notamment au clavier/tactile). Optimiste : la carte
   * change de section IMMÉDIATEMENT, annulé si l'appel API échoue.
   */
  function assignTeam(licencieId: string, teamId: string | null) {
    const licencie = items.find((l) => l.id === licencieId);
    if (!licencie || licencie.teamId === teamId) return;

    const previous = items;
    setError(null);
    setItems(items.map((l) => (l.id === licencieId ? { ...l, teamId } : l)));

    startTransition(async () => {
      try {
        await browserApi.licencies.updateProfile(clubId, licencieId, { teamId });
        router.refresh();
      } catch (e) {
        setItems(previous);
        setError(e instanceof ApiError ? e.message : "Déplacement impossible.");
      }
    });
  }

  /**
   * Rôles de l'espace public sans compte (retour du club, 2026-10-01) :
   * Admin (dérogations FBI en lecture), Coach (demande des dérogations),
   * Coordinateur (traite les demandes). Optimiste, annulé si l'API échoue.
   */
  function toggleFlag(licencieId: string, flag: PublicRoleFlag) {
    const licencie = items.find((l) => l.id === licencieId);
    if (!licencie) return;
    const next = !licencie[flag];
    const previous = items;
    setError(null);
    setItems(items.map((l) => (l.id === licencieId ? { ...l, [flag]: next } : l)));

    startTransition(async () => {
      try {
        await browserApi.licencies.updateProfile(clubId, licencieId, { [flag]: next });
        router.refresh();
      } catch (e) {
        setItems(previous);
        setError(e instanceof ApiError ? e.message : "Modification du rôle impossible.");
      }
    });
  }

  /**
   * "faut aussi un bouton pour supprimer un licencié" (demande du club,
   * 2026-09-28) — suppression DÉFINITIVE (voir docs/LICENCIES.md côté
   * ball-manager-back : sûre sans condition, jamais de perte d'historique
   * de match). Confirmation obligatoire (voir `LicencieCard`) avant cet
   * appel, jamais un clic unique irréversible.
   */
  function handleDelete(licencieId: string) {
    setConfirmingDeleteId(null);
    const previous = items;
    setError(null);
    setItems(items.filter((l) => l.id !== licencieId));

    startTransition(async () => {
      try {
        await browserApi.licencies.remove(clubId, licencieId);
        router.refresh();
      } catch (e) {
        setItems(previous);
        setError(e instanceof ApiError ? e.message : "Suppression impossible.");
      }
    });
  }

  function handleDrop(teamId: string | null) {
    setDragOverTeamId(undefined);
    if (!isAdmin || !dragLicencieId) return;
    const licencieId = dragLicencieId;
    setDragLicencieId(null);
    assignTeam(licencieId, teamId);
  }

  const buckets = bucketsFor(items, teams);
  const unassignedCount = buckets.find((b) => b.teamId === null)?.licencies.length ?? 0;
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  const q = query.trim().toLowerCase();
  const visible = (list: LicencieDto[]) =>
    q ? list.filter((l) => `${l.lastName} ${l.firstName} ${l.licenseNumber ?? ""}`.toLowerCase().includes(q)) : list;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Rechercher un licencié</span>
          <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom ou n° de licence" className="pl-10" />
        </label>
        {isAdmin && unassignedCount > 0 ? (
          <Button variant="secondary" onClick={handleAutoAssign} loading={isPending} icon={<Wand2 />}>
            {isPending ? "Répartition en cours…" : "Répartir automatiquement par catégorie"}
          </Button>
        ) : null}
      </div>
      {autoAssignStatus ? <Notice tone="info" live>{autoAssignStatus}</Notice> : null}
      {error ? <FormMessage tone="danger">{error}</FormMessage> : null}
      {isAdmin ? (
        <p className="type-meta -mt-2">
          <span className="hidden sm:inline">Glissez une carte d&apos;une équipe à l&apos;autre, ou utilisez le sélecteur d&apos;équipe de chaque ligne. </span>
          Rôles de l&apos;espace public (avec son lien personnel, sans compte) :{" "}
          <ShieldCheck aria-hidden className="inline size-3.5 align-[-2px] text-accent-text" /> Admin ·{" "}
          <Megaphone aria-hidden className="inline size-3.5 align-[-2px] text-accent-text" /> Coach (demande des dérogations) ·{" "}
          <CalendarCog aria-hidden className="inline size-3.5 align-[-2px] text-accent-text" /> Coordinateur (traite les demandes).
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        {buckets.map((bucket) => {
          const rows = visible(bucket.licencies);
          if (q && rows.length === 0) return null;
          const isOver = dragOverTeamId === bucket.teamId;
          return (
            <section
              key={bucket.teamId ?? "no-team"}
              aria-label={bucket.title}
              onDragOver={
                isAdmin
                  ? (e) => {
                      e.preventDefault();
                      setDragOverTeamId(bucket.teamId);
                    }
                  : undefined
              }
              onDragLeave={isAdmin ? () => setDragOverTeamId((current) => (current === bucket.teamId ? undefined : current)) : undefined}
              onDrop={isAdmin ? () => handleDrop(bucket.teamId) : undefined}
              data-glow={isOver || undefined}
              className="surface-card overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h2 className="type-card flex items-center gap-2 text-foreground">
                  {bucket.teamId ? <Shirt aria-hidden className="size-4 text-accent-text" /> : <UserX aria-hidden className="size-4 text-subtle" />}
                  {bucket.title}
                </h2>
                <span className="type-numeric rounded-full bg-surface-muted px-2 text-xs leading-6 text-muted">{bucket.licencies.length}</span>
              </div>
              {rows.length === 0 ? (
                <p className={`type-meta m-3 rounded-[var(--radius-md)] border border-dashed px-4 py-5 text-center ${isOver ? "border-accent bg-accent-softer" : "border-border-strong"}`}>
                  {isAdmin ? "Glisse une carte ici pour l'ajouter à cette équipe." : "Aucun·e licencié·e rattaché·e à cette équipe pour l'instant."}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {rows.map((licencie) => (
                    <li
                      key={licencie.id}
                      draggable={isAdmin}
                      onDragStart={isAdmin ? () => setDragLicencieId(licencie.id) : undefined}
                      onDragEnd={isAdmin ? () => setDragLicencieId(null) : undefined}
                      className={isAdmin ? "cursor-grab active:cursor-grabbing" : undefined}
                    >
                      <LicencieCard
                        clubSlug={clubSlug}
                        licencie={licencie}
                        teams={sortedTeams}
                        isAdmin={isAdmin}
                        onAssignTeam={(teamId) => assignTeam(licencie.id, teamId)}
                        onToggleFlag={(flag) => toggleFlag(licencie.id, flag)}
                        isConfirmingDelete={confirmingDeleteId === licencie.id}
                        onRequestDelete={() => setConfirmingDeleteId(licencie.id)}
                        onConfirmDelete={() => handleDelete(licencie.id)}
                        onCancelDelete={() => setConfirmingDeleteId(null)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
