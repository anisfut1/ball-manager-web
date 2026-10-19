"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Mail, RotateCcw, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { PersonAvatar } from "@/components/ui/Avatar";
import { cn } from "@/components/ui/cn";
import { ApiError } from "@/lib/api/client";
import { requestPersonalLink, searchPublicLicencies, sendAccessRequest, type PublicLicencieMatch, type PublicLinkTarget } from "@/lib/api/publicTables";
import { LicensedLinkPending, LicensedLinkSent, LicensedRequestSent } from "./LicensedAccessSuccess";
import { LicensedNoResult, LicensedResultsSkeleton, LicensedSearchResults, licencieDisplayName } from "./LicensedSearchResults";

type Step =
  | { kind: "search" }
  | { kind: "confirm"; licencie: PublicLicencieMatch; needsEmail: boolean }
  | { kind: "sent"; licencie: PublicLicencieMatch; maskedEmail: string }
  | { kind: "pending"; licencie: PublicLicencieMatch; email: string }
  | { kind: "request" }
  | { kind: "request-sent" };

type Feedback = { tone: "danger" | "warning" | "info"; message: string } | null;

/** Prénom + nom : au moins 2 mots d'au moins 2 lettres (même règle que l'API). */
export function looksLikeFullName(value: string): boolean {
  return value.split(/[\s\-']+/).filter((w) => w.replace(/[^\p{L}]/gu, "").length >= 2).length >= 2;
}

/** Erreur de recherche lisible : les refus explicites du serveur (4xx) restent, le reste devient un message neutre. */
function searchErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status >= 400 && err.status < 500) return err.message;
  return "Impossible d'effectuer la recherche pour le moment.";
}

/**
 * Cœur de l'accès licencié (même parcours pour tous les modules) : prénom +
 * nom, dans n'importe quel ordre et fautes tolérées (côté API, au plus 5
 * fiches prénom + initiale) → « C'est moi » → lien personnel envoyé par
 * email à l'adresse connue du club. Le lien n'est JAMAIS affiché ici.
 * Introuvable : « Prévenir le club » écrit aux administrateurs.
 *
 * `variant="bare"` : sans carte, pour une feuille (« Ajouter un enfant »).
 */
export function LicensedSearchCard({ clubSlug, clubName, returnTo, variant = "card", autoFocus = true }: { clubSlug: string; clubName: string; returnTo: PublicLinkTarget; variant?: "card" | "bare"; autoFocus?: boolean }) {
  const inputId = useId();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PublicLicencieMatch[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>({ kind: "search" });
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [requestEmail, setRequestEmail] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const outcomeRef = useRef<HTMLDivElement>(null);

  // Résultat, confirmation ou envoi : ramené à l'écran (sur mobile il tombe sous le pli).
  useEffect(() => {
    if (results === null && step.kind === "search") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    outcomeRef.current?.scrollIntoView?.({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [results, step.kind]);

  async function runSearch(event?: FormEvent) {
    event?.preventDefault();
    setHint(null);
    setSearchError(null);
    if (!looksLikeFullName(search)) {
      setHint("Tape ton prénom et ton nom, par exemple « Léa Martin ».");
      return;
    }
    setSearching(true);
    try {
      setResults(await searchPublicLicencies(clubSlug, search.trim()));
    } catch (err) {
      setResults(null);
      setSearchError(searchErrorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  function backToSearch() {
    setFeedback(null);
    setStep({ kind: "search" });
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
        setFeedback({ tone: "danger", message: err instanceof ApiError && err.status < 500 ? err.message : "Impossible d'envoyer le lien pour le moment. Réessaie dans quelques minutes." });
      }
    } finally {
      setSending(false);
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
      setFeedback({ tone: "danger", message: err instanceof ApiError && err.status < 500 ? err.message : "La demande n'a pas pu partir. Réessaie dans un instant." });
    } finally {
      setSending(false);
    }
  }

  let body;
  if (step.kind === "sent") {
    body = <LicensedLinkSent firstName={step.licencie.firstName} maskedEmail={step.maskedEmail} onBack={backToSearch} />;
  } else if (step.kind === "pending") {
    body = <LicensedLinkPending firstName={step.licencie.firstName} email={step.email} clubName={clubName} onBack={backToSearch} />;
  } else if (step.kind === "request-sent") {
    body = <LicensedRequestSent email={requestEmail.trim()} clubName={clubName} onBack={backToSearch} />;
  } else if (step.kind === "confirm") {
    const { licencie, needsEmail } = step;
    body = (
      <form onSubmit={send} className="licensed-rise flex flex-col gap-5">
        <button type="button" onClick={backToSearch} className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-muted hover:text-foreground">
          <ArrowLeft aria-hidden className="size-3.5" />
          Changer de nom
        </button>
        <div className="flex items-center gap-3 rounded-[14px] border border-accent-border bg-accent-softer px-3.5 py-3">
          <PersonAvatar name={licencieDisplayName(licencie)} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-semibold text-foreground">{licencieDisplayName(licencie)}</p>
            <p className="text-[13px] text-muted">{clubName}</p>
          </div>
        </div>
        {needsEmail ? (
          <Field label="Ton adresse email" required hint="Ton lien y sera envoyé après vérification par le club." error={feedback?.tone === "danger" ? feedback.message : undefined}>
            {(props) => <Input {...props} type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@exemple.fr" className="h-12" />}
          </Field>
        ) : (
          <p className="text-[15px] leading-relaxed text-muted">
            On t&apos;envoie un lien sécurisé à l&apos;adresse enregistrée auprès du club. Un clic suffit, sans mot de passe.
          </p>
        )}
        {feedback && !(needsEmail && feedback.tone === "danger") ? (
          <Notice tone={feedback.tone} live>
            {feedback.message}
          </Notice>
        ) : null}
        <Button type="submit" variant="primary" size="lg" loading={sending} disabled={needsEmail && !email.trim()} icon={<Mail />} className="w-full">
          {needsEmail ? "Envoyer mon lien" : "Recevoir mon lien sécurisé"}
        </Button>
      </form>
    );
  } else if (step.kind === "request") {
    body = (
      <form onSubmit={submitAccessRequest} className="licensed-rise flex flex-col gap-4">
        <button type="button" onClick={backToSearch} className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-muted hover:text-foreground">
          <ArrowLeft aria-hidden className="size-3.5" />
          Revenir à la recherche
        </button>
        <div>
          <h2 className="text-[19px] font-semibold text-foreground">Prévenir le club</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">L&apos;administrateur reçoit ta demande, ajoute ou corrige ta fiche, puis te répond.</p>
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
        <Button type="submit" variant="primary" size="lg" loading={sending} disabled={!looksLikeFullName(search) || !requestEmail.trim()} icon={<Send />} className="w-full">
          Envoyer la demande
        </Button>
      </form>
    );
  } else {
    body = (
      <div className="flex flex-col gap-4">
        <form onSubmit={runSearch} className="flex flex-col gap-3" role="search">
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-accent-text">Retrouve ton espace</p>
            <label htmlFor={inputId} className="mt-1 block text-[17px] font-semibold text-foreground">
              Ton prénom et ton nom
            </label>
          </div>
          <span className="licensed-search relative block">
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-subtle transition-colors" />
            <Input
              id={inputId}
              type="search"
              enterKeyHint="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHint(null);
              }}
              placeholder="Ex. Léa Martin"
              autoComplete="name"
              autoCapitalize="words"
              spellCheck={false}
              autoFocus={autoFocus}
              aria-describedby={`${inputId}-help`}
              aria-invalid={hint ? true : undefined}
              className="h-14 rounded-[14px] pl-11 text-[16px] sm:h-14 sm:text-[16px]"
            />
          </span>
          <Button type="submit" variant="primary" size="lg" loading={searching} icon={searching ? undefined : <ArrowRight />} className="h-12 w-full flex-row-reverse rounded-[14px]">
            Rechercher
          </Button>
          <p id={`${inputId}-help`} className={cn("px-1 text-[13px] leading-snug", hint ? "font-medium text-warning" : "text-muted")} aria-live="polite">
            {hint ?? "Prénom et nom, dans n'importe quel ordre — une petite faute n'est pas grave."}
          </p>
        </form>

        {searching ? <LicensedResultsSkeleton /> : null}

        {!searching && searchError ? (
          <div role="alert" className="licensed-rise flex flex-col items-center gap-3 rounded-[14px] border border-border bg-surface/80 px-4 py-4 text-center">
            <p className="text-[14px] font-medium text-foreground">{searchError}</p>
            <Button variant="secondary" size="sm" icon={<RotateCcw />} onClick={() => void runSearch()}>
              Réessayer
            </Button>
          </div>
        ) : null}

        {!searching && !searchError && results !== null ? (
          results.length > 0 ? (
            <LicensedSearchResults
              results={results}
              onChoose={(licencie) => {
                setFeedback(null);
                setEmail("");
                setStep({ kind: "confirm", licencie, needsEmail: false });
              }}
              onNotFound={() => setStep({ kind: "request" })}
            />
          ) : (
            <LicensedNoResult onNotFound={() => setStep({ kind: "request" })} />
          )
        ) : null}
      </div>
    );
  }

  if (variant === "bare") return <div ref={outcomeRef} className="flex scroll-mt-24 flex-col gap-4">{body}</div>;
  return (
    <div ref={outcomeRef} className="licensed-card relative w-full scroll-mt-24 scroll-mb-28 rounded-[24px] border border-border bg-surface-raised/92 p-5 shadow-[var(--shadow-inset-highlight),var(--shadow-3)] backdrop-blur-xl sm:p-7">
      {body}
    </div>
  );
}
