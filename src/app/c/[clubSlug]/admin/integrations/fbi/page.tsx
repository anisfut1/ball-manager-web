import { CalendarClock, CalendarSearch, FileDown, KeyRound, Loader2, PlugZap, RefreshCw, ScanText } from "lucide-react";
import { requireClubAdminContext } from "@/lib/tenancy/club-context";
import { api } from "@/lib/api/server";
import { Card, CardDivider, CardHeader } from "@/components/ui/Card";
import { PageContainer, PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { Notice } from "@/components/ui/Notice";
import { FbiCredentialsForm } from "@/features/admin/FbiCredentialsForm";
import { TestFbiConnectionButton } from "@/features/admin/TestFbiConnectionButton";
import { ProcessFbiJobsButton } from "@/features/admin/ProcessFbiJobsButton";
import { ParseFbiDocumentsButton } from "@/features/admin/ParseFbiDocumentsButton";
import { ReconcileFbiScheduleButton } from "@/features/admin/ReconcileFbiScheduleButton";
import { CheckAllDerogationsButton } from "@/features/admin/CheckAllDerogationsButton";

/**
 * §20/§21 de la demande. Le formulaire et le bouton de test appellent
 * ball-manager-back directement (Client Components, voir
 * src/features/admin/{FbiCredentialsForm,TestFbiConnectionButton}.tsx).
 *
 * BACKEND_API_GAP (voir docs/MIGRATION_TO_API.md) : la bascule de la
 * récupération automatique e-Marque n'est pas exposée ici — le statut
 * reste affiché en LECTURE (`integrations.fbi.autoImportEmarque`), aucune
 * commande factice n'est proposée.
 */
/** Libellé lisible par type de job FBI — voir `FbiActiveJobDto` côté ball-manager-back. */
const FBI_JOB_TYPE_LABELS: Record<string, string> = {
  test_connection: "Test de connexion FBI",
  discover_emarque: "Téléchargement d'un document e-Marque",
  reconcile_schedule: "Vérification du calendrier",
  check_derogation: "Vérification d'une dérogation",
  check_all_derogations: "Vérification de toutes les dérogations",
};

function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

function Step({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="type-numeric flex size-8 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-sm font-medium text-accent-text">{index}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
        <p className="type-card text-foreground">{title}</p>
        {children}
      </div>
    </div>
  );
}

export default async function FbiIntegrationPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const club = await requireClubAdminContext(clubSlug);

  const integrations = await api.integrations.get(club.id);
  const activeJob = integrations.fbi.activeJob;
  const configured = integrations.fbi.configured;

  return (
    <PageContainer width="default">
      <PageHeader
        back={{ href: `/c/${clubSlug}/admin/integrations`, label: "Intégrations" }}
        eyebrow="Intégration optionnelle"
        title="FBI"
        description={`Identifiants FBI propres à ${club.name}. Jamais partagés avec un autre club de la plateforme. FBI enrichit le calendrier FFBB déjà en place — ${club.name} fonctionne normalement sans FBI.`}
        meta={
          configured ? (
            integrations.fbi.connected ? (
              <StatusBadge tone="success">Connecté</StatusBadge>
            ) : (
              <StatusBadge tone="danger">En erreur</StatusBadge>
            )
          ) : (
            <StatusBadge tone="neutral">Non configuré</StatusBadge>
          )
        }
      />

      {/*
       * Retour du club, 2026-09-29 : "il me faut un truc pour savoir quand
       * ya un truc en cours" — une seule session FBI active à la fois par
       * club (voir claim_next_fbi_job côté ball-manager-back). Rendu côté
       * serveur (page non auto-rafraîchie) : recharge la page pour une mise
       * à jour, pas de polling client ici.
       */}
      {activeJob ? (
        <Notice tone="info" icon={<Loader2 className="animate-spin" />} title={`En cours : ${FBI_JOB_TYPE_LABELS[activeJob.type] ?? activeJob.type} — depuis ${minutesSince(activeJob.startedAt)} min`}>
          Une seule connexion FBI à la fois pour ce club : les autres actions (téléchargement e-Marque, dérogations, calendrier) attendent que celle-ci se termine. Recharge la page pour actualiser.
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader icon={<KeyRound />} title="Identifiant / mot de passe" description={integrations.fbi.username ? `Identifiant enregistré : ${integrations.fbi.username}` : undefined} />
          <CardDivider />
          <FbiCredentialsForm clubId={club.id} />
        </Card>
        <Card>
          <CardHeader icon={<PlugZap />} title="Test de connexion" description="Vérifie que les identifiants enregistrés fonctionnent." />
          <CardDivider />
          <TestFbiConnectionButton clubId={club.id} />
        </Card>
      </div>

      {configured ? (
        <Card>
          <CardHeader icon={<FileDown />} title="Documents e-Marque en attente" />
          <p className="mt-3 text-sm leading-relaxed text-muted">
            « Connecté » prouve juste que l&apos;identifiant/mot de passe FBI fonctionnent — ça ne récupère rien tout seul. La récupération se fait en deux étapes, chacune en tâche de fond : d&apos;abord le téléchargement des documents (feuille de match, résumé), puis leur traitement (OCR/PDF) pour en extraire composition, statistiques et officiels. Ces deux boutons les font avancer maintenant plutôt que d&apos;attendre la prochaine synchronisation automatique.
          </p>
          <CardDivider />
          <div className="flex flex-col gap-6">
            <Step index={1} title="Télécharger">
              <ProcessFbiJobsButton clubId={club.id} />
            </Step>
            <Step index={2} title="Traiter les documents téléchargés">
              <ParseFbiDocumentsButton clubId={club.id} />
            </Step>
          </div>
        </Card>
      ) : null}

      {configured ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader icon={<CalendarSearch />} title="Vérification du calendrier" />
            <p className="mt-3 text-sm leading-relaxed text-muted">
              FFBB reste la seule source du calendrier — FBI est utilisé ici uniquement pour VÉRIFIER ce calendrier et détecter d&apos;éventuelles anomalies (écart de date/heure, rencontre visible d&apos;un seul côté), jamais pour le remplacer. Les anomalies détectées apparaissent sur la page Anomalies.
            </p>
            <CardDivider />
            <ReconcileFbiScheduleButton clubId={club.id} />
          </Card>
          <Card>
            <CardHeader icon={<CalendarClock />} title="Dérogations" />
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Une seule connexion FBI vérifie toutes les demandes d&apos;un coup plutôt que match par match — état, dates, motif et réponse de l&apos;adversaire apparaissent ensuite sur la page Dérogations. Pour une demande précise, tu peux aussi ouvrir son match et cliquer « Vérifier sur FBI ».
            </p>
            <CardDivider />
            <CheckAllDerogationsButton clubId={club.id} />
          </Card>
        </div>
      ) : null}

      {configured ? (
        <Card variant="muted">
          <CardHeader
            icon={<RefreshCw />}
            title="Récupération automatique e-Marque"
            actions={integrations.fbi.autoImportEmarque ? <StatusBadge tone="success">Activée</StatusBadge> : <StatusBadge tone="neutral">Désactivée</StatusBadge>}
          />
          <p className="mt-3 text-sm text-muted">
            {integrations.fbi.autoImportEmarque
              ? "Les feuilles de match, compositions, OTM et statistiques disponibles sont récupérées automatiquement pour chaque match joué."
              : "Désactivée pour l'instant."}
          </p>
          <p className="type-meta mt-2 flex items-center gap-1.5">
            <ScanText aria-hidden className="size-3.5 text-subtle" />
            Le changement de ce réglage depuis cette page n&apos;est pas encore disponible — contacte l&apos;équipe technique pour le modifier.
          </p>
        </Card>
      ) : null}
    </PageContainer>
  );
}
