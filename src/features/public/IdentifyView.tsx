"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Hourglass, Mail, MailCheck, Search, Send, UserRound, UserX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, IconMedallion } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { PersonAvatar } from "@/components/ui/Avatar";
import { cn } from "@/components/ui/cn";
import { requestPersonalLink, searchPublicLicencies, sendAccessRequest, type PublicLicencieMatch, type PublicLinkTarget } from "@/lib/api/publicTables";
import { ApiError } from "@/lib/api/client";

type Step =
  | { kind: "pick" }
  | { kind: "confirm"; licencie: PublicLicencieMatch; needsEmail: boolean }
  | { kind: "sent"; licencie: PublicLicencieMatch; maskedEmail: string }
  | { kind: "pending"; licencie: PublicLicencieMatch; email: string }
  | { kind: "not-found" }
  | { kind: "request-sent" };

type Feedback = { tone: "danger" | "warning" | "info"; message: string } | null;

const displayName = (l: PublicLicencieMatch) => `${l.firstName} ${l.lastInitial}.`;

/** Prénom + nom : au moins 2 mots d'au moins 2 lettres (même règle que l'API). */
function looksLikeFullName(value: string): boolean {
  return value.split(/[\s\-']+/).filter((w) => w.replace(/[^\p{L}]/gu, "").length >= 2).length >= 2;
}

/**
 * Identification de l'espace public sans compte (retour du club,
 * 2026-10-01 : "il va chercher son nom, il va mettre son mail... un bouton
 * qui renvoie vers son lien avec token"). Le lien personnel n'est JAMAIS
 * affiché ici : il part uniquement par email (ball-manager-back, Resend).
 * Un nom déjà inscrit reste sélectionnable — c'est le « lien perdu ? » :
 * le nouveau lien repart à l'adresse déjà enregistrée, jamais ailleurs.
 *
 * Recherche (retour du club, 2026-10-08) : la personne tape son prénom ET
 * son nom, dans n'importe quel ordre, fautes tolérées ; l'API propose au plus
 * 5 fiches (prénom + initiale), jamais la liste du club. Introuvable :
 * « Prévenir le club » envoie une demande aux administrateurs.
 */
export function IdentifyView({
  clubSlug,
  clubName,
  returnTo,
  title,
  description,
  notice,
  header,
  searchFirst = false,
}: {
  clubSlug: string;
  clubName: string;
  returnTo: PublicLinkTarget;
  title?: string;
  description?: ReactNode;
  notice?: ReactNode;
  /** Remplace l'en-tête de page par défaut (page de connexion). */
  header?: ReactNode;
  searchFirst?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PublicLicencieMatch[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [requestEmail, setRequestEmail] = useState("");
  const [requestMessage, setRequestMessage] = useState("");

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    setSearchError(null);
    if (!looksLikeFullName(search)) {
      setSearchError("Tape ton prénom et ton nom, par exemple « Léa Martin ».");
      return;
    }
    setSearching(true);
    try {
      setResults(await searchPublicLicencies(clubSlug, search.trim()));
    } catch (err) {
      setResults(null);
      setSearchError(err instanceof ApiError ? err.message : "La recherche n'a pas pu aboutir. Réessaie dans un instant.");
    } finally {
      setSearching(false);
    }
  }

  async function submitAccessRequest(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      await sendAccessRequest(clubSlug, { fullName: search.trim(), email: requestEmail.trim(), message: requestMessage.trim() || undefined });
      setStep({ kind: "request-sent" });
    } catch (err) {
      setFeedback({ tone: "danger", message: err instanceof ApiError ? err.message : "La demande n'a pas pu partir. Réessaie dans un instant." });
    } finally {
      setSending(false);
    }
  }

  function choose(licencie: PublicLicencieMatch) {
    setFeedback(null);
    setEmail("");
    setStep({ kind: "confirm", licencie, needsEmail: false });
  }

  function backToList() {
    setFeedback(null);
    setStep({ kind: "pick" });
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (step.kind !== "confirm") return;
    setSending(true);
    setFeedback(null);
    try {
      const result = await requestPersonalLink(clubSlug, step.licencie.id, { email: step.needsEmail ? email.trim() : null, returnTo });
      // Fiche sans adresse connue : l'administrateur du club valide avant tout envoi (R-018, retour du club 2026-10-08).
      if (result.pendingApproval || !result.maskedEmail) setStep({ kind: "pending", licencie: step.licencie, email: email.trim() });
      else setStep({ kind: "sent", licencie: step.licencie, maskedEmail: result.maskedEmail });
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_REQUIRED") {
        // Aucune adresse connue pour ce nom : on la demande, sans considérer cela comme une erreur.
        if (step.needsEmail) setFeedback({ tone: "danger", message: err.message });
        setStep({ ...step, needsEmail: true });
      } else if (err instanceof ApiError && err.code === "LINK_RECENTLY_SENT") {
        setFeedback({ tone: "info", message: err.message });
      } else if (err instanceof ApiError && err.code === "EMAIL_NOT_CONFIGURED") {
        setFeedback({ tone: "warning", message: err.message });
      } else {
        setFeedback({ tone: "danger", message: err instanceof ApiError ? err.message : "Impossible d'envoyer le lien pour le moment. Réessaie dans quelques minutes." });
      }
    } finally {
      setSending(false);
    }
  }

  if (step.kind === "sent") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5 py-4">
        <Card variant="glow">
          <div className="flex flex-col items-start gap-4">
            <IconMedallion tone="success" size="lg">
              <MailCheck />
            </IconMedallion>
            <div className="text-reflow">
              <h1 className="type-title text-foreground">Lien envoyé, {step.licencie.firstName} !</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                Un email vient de partir à <span className="type-numeric font-medium text-foreground">{step.maskedEmail}</span>. Ouvre-le et appuie sur <span className="font-medium text-foreground">« Ouvrir l&apos;espace du club »</span> : tu seras reconnu·e automatiquement sur cet appareil.
              </p>
              <div className="mt-4 rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--warning)_24%,transparent)] bg-warning-soft p-3 text-[13.5px] leading-relaxed text-foreground">
                <p className="font-medium">Pas reçu ? Regarde dans tes indésirables (spams).</p>
                <p className="mt-1 text-muted">
                  S&apos;il y est, ouvre-le et appuie sur <span className="font-medium text-foreground">« Ce n&apos;est pas un spam »</span> : les prochains arriveront directement dans ta boîte de réception.
                </p>
              </div>
              <p className="type-meta mt-3">Chaque nouvelle demande remplace l&apos;ancien lien.</p>
            </div>
            <Button variant="ghost" icon={<ArrowLeft />} onClick={backToList}>
              Ce n&apos;est pas moi
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step.kind === "pending") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5 py-4">
        <Card variant="glow">
          <div className="flex flex-col items-start gap-4">
            <IconMedallion tone="info" size="lg">
              <Hourglass />
            </IconMedallion>
            <div className="text-reflow">
              <h1 className="type-title text-foreground">Demande transmise, {step.licencie.firstName}</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                Cette adresse est différente de celle enregistrée sur ta fiche. Pour protéger ton profil, l&apos;administrateur de {clubName} vérifie que <span className="font-medium text-foreground">{step.email}</span> est bien la tienne.
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">Dès qu&apos;il valide, ton lien personnel arrive par email. Rien d&apos;autre à faire d&apos;ici là.</p>
              <p className="type-meta mt-3">Sans réponse sous 14 jours, la demande expire : contacte directement le club.</p>
            </div>
            <Button variant="ghost" icon={<ArrowLeft />} onClick={backToList}>
              Revenir à la recherche
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step.kind === "confirm") {
    const { licencie, needsEmail } = step;
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 py-4">
        <Button variant="ghost" size="sm" icon={<ArrowLeft />} onClick={backToList} className="self-start">
          Changer de nom
        </Button>
        <Card variant="glow">
          <form onSubmit={send} className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <PersonAvatar name={displayName(licencie)} />
              <div className="text-reflow flex-1">
                <p className="type-eyebrow">{clubName}</p>
                <p className="type-title text-foreground">{displayName(licencie)}</p>
              </div>
            </div>

            {needsEmail ? (
              <Field label="Ton adresse email" required hint="Ton lien personnel y sera envoyé. Elle est enregistrée sur ta fiche licencié." error={feedback?.tone === "danger" ? feedback.message : undefined}>
                {(props) => <Input {...props} type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@exemple.fr" />}
              </Field>
            ) : (
              <p className="text-[15px] leading-relaxed text-muted">
                On t&apos;envoie ton lien personnel par email : il suffit de cliquer dessus pour accéder à ton espace, sans mot de passe. Si tu avais déjà un lien, le nouveau part à l&apos;adresse déjà enregistrée et remplace l&apos;ancien.
              </p>
            )}

            {feedback && !(needsEmail && feedback.tone === "danger") ? (
              <Notice tone={feedback.tone} live>
                {feedback.message}
              </Notice>
            ) : null}

            <Button type="submit" variant="primary" size="lg" loading={sending} disabled={needsEmail && !email.trim()} icon={<Mail />}>
              {needsEmail ? "Envoyer mon lien" : "Recevoir mon lien par email"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (step.kind === "request-sent") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5 py-4">
        <Card variant="glow">
          <div className="flex flex-col items-start gap-4">
            <IconMedallion tone="success" size="lg">
              <Send />
            </IconMedallion>
            <div className="text-reflow">
              <h1 className="type-title text-foreground">Demande envoyée</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                L&apos;administrateur de {clubName} a reçu ta demande. Il va vérifier ta fiche et te répondra à <span className="font-medium text-foreground">{requestEmail.trim()}</span>.
              </p>
            </div>
            <Button variant="ghost" icon={<ArrowLeft />} onClick={backToList}>
              Revenir à la recherche
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step.kind === "not-found") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 py-4">
        <Button variant="ghost" size="sm" icon={<ArrowLeft />} onClick={backToList} className="self-start">
          Revenir à la recherche
        </Button>
        <Card variant="glow">
          <form onSubmit={submitAccessRequest} className="flex flex-col gap-5">
            <div className="text-reflow">
              <p className="type-eyebrow">{clubName}</p>
              <h1 className="type-title mt-1 text-foreground">Prévenir le club</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                L&apos;administrateur reçoit ta demande par email, ajoute ou corrige ta fiche, puis te répond.
              </p>
            </div>
            <Field label="Ton prénom et ton nom" required>
              {(props) => <Input {...props} value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="name" />}
            </Field>
            <Field label="Ton adresse email" required hint="Pour que le club puisse te répondre.">
              {(props) => <Input {...props} type="email" inputMode="email" autoComplete="email" value={requestEmail} onChange={(e) => setRequestEmail(e.target.value)} placeholder="prenom.nom@exemple.fr" />}
            </Field>
            <Field label="Message" optional hint="Ton équipe, ta catégorie… tout ce qui aide le club à te retrouver.">
              {(props) => <Textarea {...props} rows={3} maxLength={500} value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} />}
            </Field>
            {feedback ? (
              <Notice tone={feedback.tone} live>
                {feedback.message}
              </Notice>
            ) : null}
            <Button type="submit" variant="primary" size="lg" loading={sending} disabled={!looksLikeFullName(search) || !requestEmail.trim()} icon={<Send />}>
              Envoyer la demande
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header ?? <PageHeader eyebrow={clubName} title={title ?? ""} description={description} />}

      {notice}

      <form onSubmit={runSearch} className="flex flex-col gap-3">
        <label htmlFor="identify-search" className="text-sm font-medium text-foreground">
          Ton prénom et ton nom
        </label>
        <div className="flex gap-2">
          <span className="relative block flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input
              id="identify-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSearchError(null);
              }}
              placeholder="ex. Léa Martin"
              className={cn("pl-10", searchFirst && "h-12 text-base")}
              autoComplete="name"
              autoFocus={searchFirst}
            />
          </span>
          <Button type="submit" variant="primary" loading={searching} className={cn(searchFirst && "h-12")}>
            Chercher
          </Button>
        </div>
        <p className="type-meta px-1">Dans n&apos;importe quel ordre ; une petite faute de frappe n&apos;est pas grave.</p>
        {searchError ? (
          <Notice tone="warning" live>
            {searchError}
          </Notice>
        ) : null}
      </form>

      {results !== null ? (
        results.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">{results.length > 1 ? "Est-ce l'un de ces noms ?" : "Est-ce toi ?"}</p>
            <ul className="grid grid-cols-1 gap-2">
              {results.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => choose(l)}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface-raised px-3 py-2 text-left text-sm shadow-1",
                      "transition-[border-color,box-shadow,background-color] duration-150 hover:border-border-strong focus-visible:border-accent",
                    )}
                  >
                    <PersonAvatar name={displayName(l)} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">{displayName(l)}</span>
                    <span className="text-[13px] font-medium text-accent-text">C&apos;est moi</span>
                    <UserRound aria-hidden className="size-4 text-subtle" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setStep({ kind: "not-found" })} className="self-start px-1 text-[13px] font-medium text-muted underline-offset-4 hover:text-foreground hover:underline">
              Ce n&apos;est aucun de ces noms
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-surface-raised p-4 shadow-1">
            <span className="flex items-center gap-2 text-[15px] font-medium text-foreground">
              <UserX aria-hidden className="size-4 text-muted" />
              On ne te trouve pas dans la liste de {clubName}.
            </span>
            <p className="type-meta">Vérifie l&apos;orthographe ou essaie ton nom de licence. Sinon, préviens le club : il ajoutera ta fiche.</p>
            <Button variant="secondary" icon={<Send />} onClick={() => setStep({ kind: "not-found" })}>
              Prévenir le club
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}
