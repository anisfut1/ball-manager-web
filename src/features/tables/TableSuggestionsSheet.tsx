"use client";

import { useEffect, useMemo, useState } from "react";
import { Clipboard, Clock, MapPin, Navigation, Search, Sparkles, UserRound } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { PersonAvatar } from "@/components/ui/Avatar";
import { cn } from "@/components/ui/cn";
import { ApiError } from "@/lib/api/client";
import type { SuggestionReasonCode, TableAssignmentRole, TableAssignmentResultDto, TableSuggestionCandidateDto, TableSuggestionsDto, TableUnavailableCandidateDto, UnavailableReasonCode } from "@/lib/api/tables";
import { TABLE_ROLE_LABELS, chooseRolePanelTitle } from "./role-labels";
import type { TablesClient } from "./tables-client";

const REASON_ICON: Record<SuggestionReasonCode, typeof Clock> = {
  NEXT_HOME_MATCH: Clock,
  PREVIOUS_HOME_MATCH: Clock,
  SAME_VENUE: MapPin,
  SEASON_DUTY_COUNT: Clipboard,
};

const UNAVAILABLE_ICON: Record<UnavailableReasonCode, typeof Navigation> = {
  MATCH_CONFLICT: Navigation,
  TABLE_ASSIGNMENT_CONFLICT: Clipboard,
  ALREADY_ASSIGNED_ON_MATCH: UserRound,
};

function matchesSearch(query: string, name: string, teams: { name: string }[]): boolean {
  if (!query.trim()) return true;
  const haystack = `${name} ${teams.map((t) => t.name).join(" ")}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

export function CandidateRow({ candidate, onChoose, choosing }: { candidate: TableSuggestionCandidateDto; onChoose: () => void; choosing: boolean }) {
  const name = `${candidate.licencie.firstName} ${candidate.licencie.lastName}`;
  const recommended = candidate.eligibility === "RECOMMENDED";
  return (
    <li className={cn("flex flex-col gap-3 rounded-[var(--radius-md)] border bg-surface-raised p-3 shadow-1", recommended ? "border-accent-border" : "border-border")}>
      <div className="flex items-start gap-3">
        <PersonAvatar name={name} src={candidate.licencie.photoUrl} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          {candidate.teams.length > 0 ? <span className="type-meta truncate text-xs">{candidate.teams.map((t) => t.name).join(", ")}</span> : null}
        </div>
        <StatusBadge tone={recommended ? "success" : "neutral"} size="sm">
          {recommended ? "Recommandé" : "Potentiellement disponible"}
        </StatusBadge>
      </div>

      {candidate.reasons.length > 0 ? (
        <ul className="flex flex-col gap-1 pl-12">
          {candidate.reasons.map((reason) => {
            const Icon = REASON_ICON[reason.code];
            return (
              <li key={reason.code} className="flex items-center gap-1.5 text-xs text-muted">
                <Icon className="size-3.5 shrink-0 text-subtle" aria-hidden />
                {reason.label}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="flex items-center justify-between gap-2 pl-12">
        {candidate.isCurrentHolder ? (
          <span className="flex items-center gap-1 text-xs font-medium text-accent-text">
            <Sparkles className="size-3.5" aria-hidden />
            Affecté actuellement
          </span>
        ) : (
          <span />
        )}
        <Button variant={recommended ? "primary" : "secondary"} size="sm" onClick={onChoose} disabled={candidate.isCurrentHolder} loading={choosing}>
          {candidate.isCurrentHolder ? "Déjà affecté" : "Choisir"}
        </Button>
      </div>
    </li>
  );
}

/**
 * Indisponible : seul « son équipe joue sur ce créneau » peut être passé
 * outre (retour du club, 2026-10-09 : « en tant que coach je peux pas mettre
 * quelqu'un qui joue en même temps » — il peut ne pas jouer ce match), avec
 * une confirmation. Déjà sur ce match ou sur une autre table au même moment :
 * toujours bloqué.
 */
export function UnavailableRow({ candidate, onForce, choosing }: { candidate: TableUnavailableCandidateDto; onForce: () => void; choosing: boolean }) {
  const name = `${candidate.licencie.firstName} ${candidate.licencie.lastName}`;
  const Icon = UNAVAILABLE_ICON[candidate.reasonCode];
  const [confirming, setConfirming] = useState(false);
  const canForce = candidate.reasonCode === "MATCH_CONFLICT";
  return (
    <li className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-surface p-3">
      <div className="flex items-start gap-3">
        <PersonAvatar name={name} src={candidate.licencie.photoUrl} size="sm" className="opacity-60" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-muted">{name}</span>
          {candidate.teams.length > 0 ? <span className="type-meta truncate text-xs">{candidate.teams.map((t) => t.name).join(", ")}</span> : null}
        </div>
        <StatusBadge tone="danger" size="sm">
          Indisponible
        </StatusBadge>
      </div>
      <span className="flex items-center gap-1.5 pl-12 text-xs text-muted">
        <Icon className="size-3.5 shrink-0 text-subtle" aria-hidden />
        {candidate.reason}
      </span>
      {canForce ? (
        <div className="flex flex-wrap items-center gap-2 pl-12">
          {confirming ? (
            <>
              <span className="text-xs text-foreground">Il ne joue pas ce match ? Le désigner quand même :</span>
              <Button variant="primary" size="sm" loading={choosing} onClick={onForce}>
                Confirmer
              </Button>
              <Button variant="ghost" size="sm" disabled={choosing} onClick={() => setConfirming(false)}>
                Annuler
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setConfirming(true)}>
              Choisir quand même
            </Button>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function SectionTitle({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <h3 className="type-eyebrow flex items-center gap-2">
      {children}
      <span className="type-numeric rounded-full bg-surface-muted px-1.5 text-[11px] normal-case leading-5 tracking-normal text-muted">{count}</span>
    </h3>
  );
}

/**
 * Panneau "Choisir un marqueur/chronométreur/délégué de club" (§70-§78 de
 * la demande). Charge les suggestions à l'ouverture (STRICTEMENT en
 * lecture, §39 — ne crée jamais rien tant que "Choisir" n'est pas cliqué),
 * les sépare en 3 sections jamais mélangées (§43), et ne transforme une
 * suggestion en affectation réelle que via `PUT`, sur clic explicite.
 *
 * Aucun bouton ne peut remplir plusieurs postes à la fois — un seul appel
 * PUT par clic, pour le rôle affiché par ce panneau (§67 : jamais
 * "Affecter automatiquement" / "Remplir les tables").
 */
export function TableSuggestionsSheet({
  client,
  matchId,
  role,
  open,
  onClose,
  onAssigned,
}: {
  client: TablesClient;
  matchId: string;
  role: TableAssignmentRole;
  open: boolean;
  onClose: () => void;
  onAssigned: (result: TableAssignmentResultDto) => void;
}) {
  const [data, setData] = useState<TableSuggestionsDto | null>(null);
  // `true` dès le montage (jamais mis à `true` depuis l'effet lui-même,
  // interdit par react-hooks/set-state-in-effect) : `TableMatchCard` ne
  // monte ce composant QUE quand un poste est ouvert (voir plus bas), donc
  // le montage EST le début du chargement.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [choosingId, setChoosingId] = useState<string | null>(null);

  /**
   * `TableMatchCard` ne monte ce composant QUE quand un poste est ouvert
   * (`{openRole ? <TableSuggestionsSheet ... /> : null}`) et le démonte à
   * la fermeture : chaque ouverture est donc déjà un montage frais (état
   * initial `data: null`/`search: ""` via `useState`), jamais besoin de
   * réinitialiser manuellement dans l'effet — un seul chargement au
   * montage, jamais réexécuté tant que `role`/`matchId` ne changent pas.
   */
  useEffect(() => {
    let cancelled = false;
    client
      .suggestions(matchId, role)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Impossible de charger les suggestions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, matchId, role]);

  const filtered = useMemo(() => {
    if (!data) return null;
    return {
      recommended: data.recommended.filter((c) => matchesSearch(search, `${c.licencie.firstName} ${c.licencie.lastName}`, c.teams)),
      available: data.available.filter((c) => matchesSearch(search, `${c.licencie.firstName} ${c.licencie.lastName}`, c.teams)),
      unavailable: data.unavailable.filter((c) => matchesSearch(search, `${c.licencie.firstName} ${c.licencie.lastName}`, c.teams)),
    };
  }, [data, search]);

  async function choose(licencieId: string, options?: { ignoreMatchConflict?: boolean }) {
    setChoosingId(licencieId);
    setError(null);
    try {
      const result = await client.assign(matchId, role, licencieId, options);
      onAssigned(result);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && (err.code === "TABLE_ASSIGNMENT_CONFLICT" || err.code === "ALREADY_ASSIGNED_ON_MATCH" || err.status === 409)) {
        setError(`${err.message} — les suggestions ci-dessous ont été actualisées.`);
        setLoading(true);
        client
          .suggestions(matchId, role)
          .then(setData)
          .catch(() => undefined)
          .finally(() => setLoading(false));
      } else {
        setError(err instanceof ApiError ? err.message : "Affectation impossible.");
      }
    } finally {
      setChoosingId(null);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={chooseRolePanelTitle(role)}
      description={`Aucune suggestion n'est affectée automatiquement — ${TABLE_ROLE_LABELS[role].toLowerCase()} choisi uniquement sur clic « Choisir ».`}
    >
      <div className="flex flex-col gap-5">
        <label className="relative block">
          <span className="sr-only">Rechercher un nom, une équipe</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un nom, une équipe…" className="pl-10" />
        </label>

        {error ? <Notice tone="danger" live>{error}</Notice> : null}

        {loading ? (
          <div role="status" aria-live="polite" className="flex flex-col gap-2">
            <span className="sr-only">Chargement des suggestions…</span>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border p-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered ? (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2.5">
              <SectionTitle count={filtered.recommended.length}>Recommandés</SectionTitle>
              {filtered.recommended.length === 0 ? (
                <p className="type-meta">Aucun candidat recommandé pour ce poste.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {filtered.recommended.map((c) => (
                    <CandidateRow key={c.licencie.id} candidate={c} onChoose={() => choose(c.licencie.id)} choosing={choosingId === c.licencie.id} />
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-2.5">
              <SectionTitle count={filtered.available.length}>Potentiellement disponibles</SectionTitle>
              {filtered.available.length === 0 ? (
                <p className="type-meta">Aucun autre candidat sans conflit connu.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {filtered.available.map((c) => (
                    <CandidateRow key={c.licencie.id} candidate={c} onChoose={() => choose(c.licencie.id)} choosing={choosingId === c.licencie.id} />
                  ))}
                </ul>
              )}
            </section>

            {filtered.unavailable.length > 0 ? (
              <section className="flex flex-col gap-2.5">
                <SectionTitle count={filtered.unavailable.length}>Indisponibles</SectionTitle>
                <ul className="flex flex-col gap-2">
                  {filtered.unavailable.map((c) => (
                    <UnavailableRow key={c.licencie.id} candidate={c} onForce={() => choose(c.licencie.id, { ignoreMatchConflict: true })} choosing={choosingId === c.licencie.id} />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
