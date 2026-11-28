"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, LogIn, MailCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { PasswordField } from "@/features/account/PasswordField";
import { ApiError } from "@/lib/api/errors";
import { requestPasswordReset, resendSignUpCode, signIn, signUp, verifySignUp } from "@/lib/api/accounts";
import { storeAccountSession } from "@/lib/account/client";

export type AccountAuthMode = "sign-in" | "sign-up";
type Step = AccountAuthMode | "code" | "forgot" | "forgot-sent";

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError && err.status < 500 ? err.message : fallback;
}

/**
 * Connexion ou création de compte (email + mot de passe), même parcours que
 * l'app iOS. Création : un code à 6 chiffres arrive par email. Après succès,
 * la session est gardée sur ce navigateur puis `onAuthenticated` est appelé.
 */
export function AccountAuthForm({ clubSlug, initialMode = "sign-up", onAuthenticated, intro }: { clubSlug: string; initialMode?: AccountAuthMode; onAuthenticated: () => void | Promise<void>; intro?: string }) {
  const [step, setStep] = useState<Step>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function go(next: Step) {
    setError(null);
    setInfo(null);
    setStep(next);
  }

  async function finish(session: Awaited<ReturnType<typeof signIn>>) {
    await storeAccountSession(clubSlug, session, { notify: false });
    await onAuthenticated();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (step === "sign-in") {
        try {
          await finish(await signIn(email.trim(), password));
        } catch (err) {
          if (err instanceof ApiError && err.code === "EMAIL_NOT_CONFIRMED") {
            await resendSignUpCode(email.trim(), clubSlug).catch(() => undefined);
            setStep("code");
            setInfo("Ton adresse n'est pas encore vérifiée : on vient de t'envoyer un code.");
            return;
          }
          throw err;
        }
      } else if (step === "sign-up") {
        await signUp(email.trim(), password, clubSlug);
        setStep("code");
      } else if (step === "code") {
        await finish(await verifySignUp(email.trim(), code.trim(), password));
      } else if (step === "forgot") {
        await requestPasswordReset(email.trim(), clubSlug);
        setStep("forgot-sent");
      }
    } catch (err) {
      setError(messageOf(err, "Impossible pour le moment. Réessaie dans un instant."));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    await resendSignUpCode(email.trim(), clubSlug).catch(() => undefined);
    setInfo("Nouveau code envoyé. Pense à regarder dans les indésirables.");
  }

  if (step === "forgot-sent") {
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="info" title="Regarde tes emails">
          Si un compte existe pour {email.trim()}, tu as reçu un lien pour choisir un nouveau mot de passe.
        </Notice>
        <Button variant="secondary" onClick={() => go("sign-in")} icon={<ArrowLeft />}>
          Revenir à la connexion
        </Button>
      </div>
    );
  }

  const emailField = (
    <Field label="Adresse email" required>
      {(props) => <Input {...props} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@exemple.fr" className="h-12" disabled={step === "code"} />}
    </Field>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {step === "sign-in" || step === "sign-up" ? (
        <div role="tablist" aria-label="Compte" className="grid grid-cols-2 gap-1 rounded-[12px] bg-surface-muted p-1">
          {(["sign-up", "sign-in"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={step === mode}
              onClick={() => go(mode)}
              className={step === mode ? "rounded-[9px] bg-surface-raised px-3 py-2 text-[14px] font-semibold text-foreground shadow-1" : "rounded-[9px] px-3 py-2 text-[14px] font-medium text-muted hover:text-foreground"}
            >
              {mode === "sign-up" ? "Créer un compte" : "J'ai déjà un compte"}
            </button>
          ))}
        </div>
      ) : null}

      {intro && (step === "sign-in" || step === "sign-up") ? <p className="text-[14px] leading-relaxed text-muted">{intro}</p> : null}

      {step === "code" ? (
        <>
          <p className="text-[15px] leading-relaxed text-muted">
            On a envoyé un code à 6 chiffres à <span className="font-semibold text-foreground">{email.trim()}</span>. Saisis-le pour terminer.
          </p>
          <Field label="Code reçu par email" required>
            {(props) => (
              <Input
                {...props}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="h-12 text-center font-mono text-[20px] tracking-[0.4em]"
                autoFocus
              />
            )}
          </Field>
        </>
      ) : step === "forgot" ? (
        <>
          <p className="text-[15px] leading-relaxed text-muted">Indique ton adresse : on t&apos;envoie un lien pour choisir un nouveau mot de passe.</p>
          {emailField}
        </>
      ) : (
        <>
          {emailField}
          <PasswordField
            label="Mot de passe"
            name="password"
            value={password}
            onChange={setPassword}
            autoComplete={step === "sign-up" ? "new-password" : "current-password"}
            hint={step === "sign-up" ? "8 caractères minimum." : undefined}
          />
        </>
      )}

      {info ? (
        <Notice tone="info" live>
          {info}
        </Notice>
      ) : null}
      {error ? (
        <Notice tone="danger" live>
          {error}
        </Notice>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={busy}
        className="w-full"
        disabled={step === "code" ? code.length !== 6 : step === "forgot" ? !email.trim() : !email.trim() || !password}
        icon={step === "sign-in" ? <LogIn /> : step === "sign-up" ? <UserPlus /> : <MailCheck />}
      >
        {step === "sign-in" ? "Se connecter" : step === "sign-up" ? "Créer mon compte" : step === "code" ? "Valider le code" : "Envoyer le lien"}
      </Button>

      {step === "sign-in" ? (
        <button type="button" onClick={() => go("forgot")} className="self-center text-[13px] font-medium text-muted underline-offset-4 hover:text-foreground hover:underline">
          Mot de passe oublié ?
        </button>
      ) : null}
      {step === "code" ? (
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => go("sign-up")} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-foreground">
            <ArrowLeft aria-hidden className="size-3.5" />
            Changer d&apos;adresse
          </button>
          <button type="button" onClick={() => void resend()} className="text-[13px] font-medium text-muted underline-offset-4 hover:text-foreground hover:underline">
            Renvoyer le code
          </button>
        </div>
      ) : null}
      {step === "forgot" ? (
        <button type="button" onClick={() => go("sign-in")} className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-muted hover:text-foreground">
          <ArrowLeft aria-hidden className="size-3.5" />
          Revenir à la connexion
        </button>
      ) : null}
    </form>
  );
}
