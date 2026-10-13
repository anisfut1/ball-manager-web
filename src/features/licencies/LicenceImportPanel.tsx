"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, FileSpreadsheet, RefreshCw, Upload, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, IconMedallion } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { cn } from "@/components/ui/cn";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import type { LicenceImportStatusDto, LicenceSyncResultDto } from "@/lib/api/licencies";

const POLL_MS = 4000;
const ACTIVE = new Set(["pending", "claimed", "running"]);
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const timeFormat = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
const dayKey = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });

/** « aujourd'hui à 06:12 », « hier à 18:40 », « le 3 oct. à 09:05 ». */
function whenLabel(iso: string): string {
  const date = new Date(iso);
  const today = dayKey.format(new Date());
  const yesterday = dayKey.format(new Date(Date.now() - 86_400_000));
  const day = dayKey.format(date);
  const prefix = day === today ? "aujourd'hui" : day === yesterday ? "hier" : `le ${dayFormat.format(date)}`;
  return `${prefix} à ${timeFormat.format(date)}`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Résultat en mots simples : « 9 nouveaux joueurs ajoutés, 1 fiche mise à jour, 180 déjà à jour ». */
function summary(result: LicenceSyncResultDto): string {
  const parts: string[] = [];
  if (result.inserted > 0) parts.push(`${plural(result.inserted, "nouveau joueur ajouté", "nouveaux joueurs ajoutés")}`);
  if (result.updated > 0) parts.push(`${plural(result.updated, "fiche mise à jour", "fiches mises à jour")}`);
  if (result.reactivated > 0) parts.push(`${plural(result.reactivated, "joueur de retour", "joueurs de retour")}`);
  if (result.unchanged > 0) parts.push(`${result.unchanged} déjà à jour`);
  return parts.length > 0 ? `${parts.join(", ")}.` : "Rien à changer.";
}

type Feedback = { tone: "success" | "info" | "warning" | "danger"; title: string; text?: string } | null;

/**
 * Licenciés à jour depuis FBI, sans rien de technique (retour du club,
 * 2026-10-08 : « c'est une galère de le faire manuellement, faut être
 * technique, faut que tout soit pour les nuls »). Remplace le copier-coller
 * depuis Excel :
 * - automatique chaque jour quand les identifiants FBI sont enregistrés,
 *   avec un bouton « Mettre à jour depuis FBI » pour ne pas attendre ;
 * - sinon (ou en secours) : on dépose le fichier Excel FBI tel quel.
 * Rien n'est jamais supprimé ; les noms, emails, équipes et rôles déjà
 * saisis ne sont jamais modifiés (voir ball-manager-back docs/LICENCIES.md).
 */
export function LicenceImportPanel({ clubId, clubSlug, initialStatus }: { clubId: string; clubSlug: string; initialStatus: LicenceImportStatusDto | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<LicenceImportStatusDto | null>(initialStatus);
  const [requesting, setRequesting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showHelp, setShowHelp] = useState(!initialStatus?.fbiConfigured);
  const watchedJob = useRef<string | null>(initialStatus?.job && ACTIVE.has(initialStatus.job.status) ? initialStatus.job.id : null);
  const fileInput = useRef<HTMLInputElement>(null);

  const jobActive = Boolean(status?.job && ACTIVE.has(status.job.status));
  const fbiConfigured = Boolean(status?.fbiConfigured);

  const refreshStatus = useCallback(async () => {
    const next = await browserApi.licencies.importStatus(clubId).catch(() => null);
    if (!next) return;
    setStatus(next);
    const job = next.job;
    if (watchedJob.current && job?.id === watchedJob.current && !ACTIVE.has(job.status)) {
      watchedJob.current = null;
      if (job.status === "succeeded" && next.lastRun) {
        setFeedback({ tone: "success", title: "Licenciés à jour depuis FBI", text: summary(next.lastRun) });
        router.refresh();
      } else {
        setFeedback({ tone: "danger", title: "La mise à jour depuis FBI n'a pas abouti", text: `${job.error ?? "Erreur inconnue."} Tu peux réessayer plus tard, ou déposer le fichier Excel ci-dessous.` });
      }
    }
  }, [clubId, router]);

  useEffect(() => {
    if (!jobActive) return;
    const timer = setInterval(() => void refreshStatus(), POLL_MS);
    return () => clearInterval(timer);
  }, [jobActive, refreshStatus]);

  async function updateFromFbi() {
    setRequesting(true);
    setFeedback(null);
    try {
      const { jobId } = await browserApi.licencies.requestFbiImport(clubId);
      watchedJob.current = jobId;
      await refreshStatus();
    } catch (error) {
      setFeedback({ tone: "danger", title: "Demande impossible", text: error instanceof ApiError ? error.message : "Réessaie dans un instant." });
    } finally {
      setRequesting(false);
    }
  }

  async function uploadFile(file: File) {
    if (!/\.xlsx$/i.test(file.name) && file.type !== XLSX_TYPE) {
      setFeedback({ tone: "danger", title: "Ce n'est pas le bon fichier", text: "Dépose le fichier Excel (.xlsx) téléchargé depuis FBI avec le bouton Excel." });
      return;
    }
    setUploading(true);
    setFeedback(null);
    try {
      const result = await browserApi.licencies.importFile(clubId, file);
      setFeedback({ tone: "success", title: "Licenciés à jour", text: summary(result) });
      await refreshStatus();
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "danger", title: "Import impossible", text: error instanceof ApiError ? error.message : "Le fichier n'a pas pu être envoyé. Réessaie dans un instant." });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  const lastRun = status?.lastRun ?? null;
  const notInExport = lastRun?.notInExport ?? 0;
  // Tentative ratée, nouvel essai programmé : on le dit plutôt qu'un « en cours » sans fin.
  const retrying = jobActive && status?.job?.status === "pending" && (status.job.attempts ?? 0) > 0 && Boolean(status.job.error);
  const nextAttempt = status?.job?.nextAttemptAt ? timeFormat.format(new Date(status.job.nextAttemptAt)) : null;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-3">
        <IconMedallion tone={jobActive ? "info" : lastRun ? "success" : "accent"}>{jobActive ? <RefreshCw className="animate-spin" /> : <FileSpreadsheet />}</IconMedallion>
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-[15px] font-semibold text-foreground">Licenciés FBI</p>
          <p className="type-meta mt-0.5">
            {jobActive
              ? retrying
                ? `Nouvel essai${nextAttempt ? ` vers ${nextAttempt}` : " bientôt"}`
                : "Mise à jour en cours dans FBI…"
              : lastRun
                ? `Mis à jour ${whenLabel(lastRun.at)} · ${plural(lastRun.total, "licence validée", "licences validées")}`
                : "Jamais mis à jour depuis FBI"}
            {fbiConfigured && !jobActive ? " · automatique chaque jour" : ""}
          </p>
        </div>
        {fbiConfigured ? (
          <Button variant="primary" size="sm" icon={<RefreshCw />} loading={requesting} disabled={jobActive || uploading} onClick={updateFromFbi} className="ml-auto">
            {jobActive ? (retrying ? "Nouvel essai prévu" : "En cours…") : "Mettre à jour depuis FBI"}
          </Button>
        ) : null}
      </div>

      {jobActive && retrying ? (
        <Notice tone="warning" title={`FBI n'a pas répondu, nouvel essai automatique${nextAttempt ? ` vers ${nextAttempt}` : ""}`} live>
          {status?.job?.error} Rien à faire de ton côté. Si c&apos;est urgent, dépose le fichier Excel ci-dessous.
        </Notice>
      ) : jobActive ? (
        <Notice tone="info" title="Récupération des licences validées dans FBI" live>
          Ça prend en général quelques minutes. Tu peux quitter cette page : la liste des joueurs se mettra à jour toute seule.
        </Notice>
      ) : null}

      {feedback ? (
        <Notice tone={feedback.tone} title={feedback.title} live>
          {feedback.text}
        </Notice>
      ) : null}

      {!feedback && !jobActive && notInExport > 0 ? (
        <Notice tone="warning" title={`${plural(notInExport, "joueur n'est", "joueurs ne sont")} plus dans les licences validées`}>
          Rien n&apos;a été supprimé. Si {notInExport > 1 ? "ils ont" : "il a"} quitté le club, retire-{notInExport > 1 ? "les" : "le"} depuis {notInExport > 1 ? "leur" : "sa"} fiche.
        </Notice>
      ) : null}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-dashed px-4 py-3 text-sm transition-colors",
          dragging ? "border-accent bg-accent-soft" : "border-border hover:border-accent hover:bg-accent-soft/50",
          uploading && "pointer-events-none opacity-70",
        )}
      >
        <Upload className="size-4 shrink-0 text-accent-text" aria-hidden />
        <span className="min-w-0 flex-1 basis-48 text-muted">
          <span className="font-medium text-foreground">{uploading ? "Import en cours…" : fbiConfigured ? "Ou dépose le fichier Excel de FBI" : "Dépose ici le fichier Excel de FBI"}</span>
          {uploading ? null : <span className="block text-[13px]">Glisse-le ici ou clique pour le choisir. Les joueurs déjà connus ne sont jamais dupliqués.</span>}
        </span>
        <input ref={fileInput} type="file" accept={`.xlsx,${XLSX_TYPE}`} className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.[0] && void uploadFile(e.target.files[0])} />
      </label>

      <div>
        <button type="button" onClick={() => setShowHelp((v) => !v)} className="inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-foreground" aria-expanded={showHelp}>
          <ChevronDown className={cn("size-4 transition-transform", showHelp && "rotate-180")} aria-hidden />
          Comment obtenir le fichier dans FBI ?
        </button>
        {showHelp ? (
          <ol className="mt-3 flex flex-col gap-2 text-sm text-muted">
            {[
              <>
                Dans FBI, menu <strong className="text-foreground">Licences → Gestion des licences</strong>.
              </>,
              <>
                Mets <strong className="text-foreground">Validation</strong> sur <strong className="text-foreground">Validé</strong>, puis clique sur <strong className="text-foreground">RECHERCHER</strong>.
              </>,
              <>
                Clique sur l&apos;icône <strong className="text-foreground">Excel</strong> du tableau, puis dépose le fichier téléchargé ci-dessus.
              </>,
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="type-numeric inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs text-accent-text">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ) : null}
        {!fbiConfigured ? (
          <p className="mt-3 text-[13px] text-muted">
            <Zap className="mr-1 inline size-3.5 align-[-2px] text-accent-text" aria-hidden />
            Pour que ce soit automatique chaque jour,{" "}
            <Link href={`/c/${clubSlug}/admin/integrations/fbi`} className="font-medium text-accent-text underline underline-offset-4">
              enregistre les identifiants FBI du club
            </Link>
            .
          </p>
        ) : null}
      </div>
    </Card>
  );
}
