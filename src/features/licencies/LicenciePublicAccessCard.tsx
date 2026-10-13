"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Eye, Link2, Mail, RotateCcw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardDivider, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Checkbox, FormMessage, Input } from "@/components/ui/Field";
import { useConfirm } from "@/components/ui/Dialog";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import type { PublicAccessEntryDto } from "@/lib/api/tables";
import type { TeamDto } from "@/lib/api/clubs";

function formatDate(value: string | null): string | null {
  return value ? new Date(value).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" }) : null;
}

/**
 * Lien personnel sans compte, vu depuis la fiche du licencié (retour du
 * club, 2026-10-01 : "le lien indiqué dans tables devra aussi être associé
 * à la licence du joueur dans /joueurs"). Mêmes données et même action que
 * Tables → Accès publics (club_admin uniquement), rattachées ici à la fiche.
 */
export function LicenciePublicAccessCard({
  clubId,
  clubSlug,
  licencieId,
  licencieName,
  licencieEmail,
  publicAdmin,
  publicCoach,
  publicCoordinator,
  coachedTeamIds,
  teams,
  entry,
}: {
  clubId: string;
  clubSlug: string;
  licencieId: string;
  licencieName: string;
  licencieEmail: string | null;
  publicAdmin: boolean;
  publicCoach: boolean;
  publicCoordinator: boolean;
  coachedTeamIds: string[];
  teams: TeamDto[];
  entry: PublicAccessEntryDto | null;
}) {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  // Rôles de l'espace public sans compte (retour du club, 2026-10-01) : admin, puis coach / coordinateur des dérogations.
  const [flags, setFlags] = useState({ publicAdmin, publicCoach, publicCoordinator });
  const [savingFlag, setSavingFlag] = useState<keyof typeof flags | null>(null);

  async function toggleFlag(flag: keyof typeof flags, next: boolean) {
    setFlags((f) => ({ ...f, [flag]: next }));
    setSavingFlag(flag);
    setError(null);
    try {
      await browserApi.licencies.updateProfile(clubId, licencieId, { [flag]: next });
      router.refresh();
    } catch (err) {
      setFlags((f) => ({ ...f, [flag]: !next }));
      setError(err instanceof ApiError ? err.message : "Modification du rôle impossible.");
    } finally {
      setSavingFlag(null);
    }
  }

  // Équipes coachées (retour du club, 2026-10-01) : son accueil public affiche l'agenda de ces équipes.
  const [coached, setCoached] = useState<string[]>(coachedTeamIds);
  const [savingTeams, setSavingTeams] = useState(false);

  async function toggleCoachedTeam(teamId: string, on: boolean) {
    const previous = coached;
    const next = on ? [...coached, teamId] : coached.filter((id) => id !== teamId);
    setCoached(next);
    setSavingTeams(true);
    setError(null);
    try {
      await browserApi.licencies.updateProfile(clubId, licencieId, { coachedTeamIds: next });
      router.refresh();
    } catch (err) {
      setCoached(previous);
      setError(err instanceof ApiError ? err.message : "Modification des équipes impossible.");
    } finally {
      setSavingTeams(false);
    }
  }

  const claimed = entry?.claimed === true;
  const since = formatDate(entry?.claimedAt ?? null);
  // Adresse à laquelle partira le prochain lien : celle de la fiche en priorité, sinon celle du lien actif (même règle que ball-manager-back).
  const sendTo = licencieEmail ?? entry?.email ?? null;

  async function reset() {
    const ok = await confirm({
      title: "Réinitialiser le lien personnel ?",
      description: `Le lien actuel de ${licencieName} cessera immédiatement de fonctionner. Ses affectations aux tables restent en place ; il pourra redemander un lien, envoyé à l'email de sa fiche.`,
      confirmLabel: "Réinitialiser",
      destructive: true,
    });
    if (!ok) return;

    setResetting(true);
    setError(null);
    try {
      await browserApi.tables.resetPublicAccess(clubId, licencieId);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Réinitialisation impossible.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <Card>
      <CardHeader
        icon={<Link2 />}
        title="Lien personnel"
        description="Accès sans compte à l'espace public (Tables, et Dérogations pour les admins, coachs et coordinateurs), envoyé par email."
        actions={
          claimed ? (
            <StatusBadge tone="success" size="sm">
              Actif
            </StatusBadge>
          ) : (
            <StatusBadge tone="neutral" size="sm">
              Pas encore inscrit
            </StatusBadge>
          )
        }
      />
      <CardDivider />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 text-sm text-foreground">
          {claimed ? <p>{since ? `Lien actif depuis le ${since}.` : "Lien actif."}</p> : <p>Aucun lien actif. Il peut le demander depuis la page de connexion de l&apos;espace public.</p>}
          <p className="flex items-center gap-2 text-muted">
            <Mail aria-hidden className="size-4 shrink-0 text-subtle" />
            {sendTo ? (
              <span className="min-w-0 truncate">
                Envoi à <span className="font-medium text-foreground">{sendTo}</span>
              </span>
            ) : (
              <span>Aucun email connu — il le saisira à sa première demande.</span>
            )}
          </p>
          <p className="type-meta">
            Lien de connexion : <span className="type-numeric">/public/{clubSlug}/connexion</span>
          </p>
        </div>
        {/* Retour du club, 2026-10-01 : rôles de l'espace public sans compte — aucun droit dans l'espace connecté. */}
        <div className="flex flex-col">
          <Checkbox
            label="Profil admin"
            description="Accès aux dérogations (dont le statut officiel FBI, en lecture) depuis l'espace public, avec son lien personnel."
            checked={flags.publicAdmin}
            disabled={savingFlag !== null}
            onChange={(e) => toggleFlag("publicAdmin", e.target.checked)}
          />
          <Checkbox
            label="Coach"
            description="Peut demander une dérogation pour les matchs à venir du club. Ses équipes servent à son agenda d'accueil."
            checked={flags.publicCoach}
            disabled={savingFlag !== null}
            onChange={(e) => toggleFlag("publicCoach", e.target.checked)}
          />
          {flags.publicCoach ? (
            <fieldset className="mb-2 ml-8 flex flex-col rounded-[var(--radius-md)] border border-border px-3 py-2">
              <legend className="px-1 text-[12.5px] font-medium text-muted">Équipes coachées — son agenda sur l&apos;accueil</legend>
              {teams.length === 0 ? <p className="type-meta py-1">Aucune équipe créée pour le club.</p> : null}
              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {teams.map((t) => (
                  <Checkbox key={t.id} label={t.name} checked={coached.includes(t.id)} disabled={savingTeams} onChange={(e) => toggleCoachedTeam(t.id, e.target.checked)} />
                ))}
              </div>
            </fieldset>
          ) : null}
          <Checkbox
            label="Coordinateur"
            description="Reçoit et traite les demandes de dérogation des coachs."
            checked={flags.publicCoordinator}
            disabled={savingFlag !== null}
            onChange={(e) => toggleFlag("publicCoordinator", e.target.checked)}
          />
        </div>
        {error ? <FormMessage tone="danger">{error}</FormMessage> : null}
        <PersonalLinkReveal clubId={clubId} licencieId={licencieId} licencieName={licencieName} email={sendTo} wasClaimed={claimed} onIssued={() => router.refresh()} />
        {claimed ? (
          <Button variant="ghost" size="sm" loading={resetting} onClick={reset} icon={<RotateCcw />} className="self-start">
            Réinitialiser le lien
          </Button>
        ) : null}
      </div>
      {confirmDialog}
    </Card>
  );
}

/**
 * Retour du club, 2026-10-01 : « l'admin doit avoir accès au lien unique par
 * joueur au cas où il a besoin de l'envoyer ». Le lien ACTIF est réaffiché
 * tel quel (toujours valable pour le joueur) ; s'il n'y en a pas, un lien est
 * créé à ce moment-là. Jamais affiché sans clic explicite de l'admin.
 */
function PersonalLinkReveal({
  clubId,
  licencieId,
  licencieName,
  email,
  wasClaimed,
  onIssued,
}: {
  clubId: string;
  licencieId: string;
  licencieName: string;
  email: string | null;
  wasClaimed: boolean;
  onIssued: () => void;
}) {
  const [link, setLink] = useState<{ url: string; created: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setLoading(true);
    setError(null);
    try {
      const result = await browserApi.tables.personalLink(clubId, licencieId);
      setLink({ url: result.link, created: result.created });
      if (result.created) onIssued();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'afficher le lien pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Copie impossible : sélectionne le lien et copie-le manuellement.");
    }
  }

  async function share() {
    if (!link) return;
    const text = `Ton lien personnel pour l'espace du club : ${link.url}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Lien personnel", text, url: link.url });
        return;
      } catch {
        // Partage annulé : rien à faire.
        return;
      }
    }
    if (email) window.location.href = `mailto:${email}?subject=${encodeURIComponent("Ton lien personnel")}&body=${encodeURIComponent(text)}`;
    else void copy();
  }

  if (!link) {
    return (
      <div className="flex flex-col gap-1.5">
        <Button variant="secondary" size="sm" icon={<Eye />} loading={loading} onClick={reveal} className="self-start">
          Afficher le lien
        </Button>
        {error ? <FormMessage tone="danger">{error}</FormMessage> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-surface p-3">
      <p className="text-[13px] font-medium text-foreground">Lien personnel de {licencieName}</p>
      <Input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} aria-label={`Lien personnel de ${licencieName}`} className="type-numeric text-[12.5px]" />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" icon={<Copy />} onClick={copy}>
          {copied ? "Copié !" : "Copier"}
        </Button>
        <Button variant="secondary" size="sm" icon={<Share2 />} onClick={share}>
          Envoyer
        </Button>
      </div>
      <p className="type-meta">
        {link.created
          ? wasClaimed
            ? "Un nouveau lien vient d'être créé : l'ancien ne fonctionne plus."
            : "Lien créé. Il donne accès à son espace sans mot de passe : ne l'envoie qu'à cette personne."
          : "C'est le lien actuel, toujours valable. Il donne accès à son espace sans mot de passe : ne l'envoie qu'à cette personne."}
      </p>
      {error ? <FormMessage tone="danger">{error}</FormMessage> : null}
    </div>
  );
}
