import type { EmailOtpType } from "@supabase/supabase-js";
import { ArrowRight } from "lucide-react";
import { PLATFORM_NAME } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { AccountLayout } from "@/features/account/AccountLayout";
import { WelcomeForm } from "@/features/account/WelcomeForm";

const TYPES: readonly EmailOtpType[] = ["invite", "magiclink", "recovery", "email", "signup"];

/** Uniquement un chemin interne (jamais `//autre-site` ni une URL absolue). */
function safeNext(value: string | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

/**
 * Arrivée depuis un email Ball Manager (invitation ou mot de passe oublié,
 * voir ball-manager-back `src/auth/account-invites.ts`) : la personne choisit
 * son mot de passe et entre directement dans son espace.
 */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : null;
  const type = typeof params.type === "string" && (TYPES as readonly string[]).includes(params.type) ? (params.type as EmailOtpType) : null;
  const next = safeNext(typeof params.next === "string" ? params.next : undefined);

  if (!tokenHash || !type) {
    return (
      <AccountLayout eyebrow={PLATFORM_NAME} title="Lien incomplet" lead="Ce lien ne contient pas toutes les informations nécessaires. Ouvre-le directement depuis l'email, ou demande-en un nouveau.">
        <ButtonLink href="/mot-de-passe-oublie" variant="primary" size="lg" iconRight={<ArrowRight />} className="w-full">
          Recevoir un nouveau lien
        </ButtonLink>
      </AccountLayout>
    );
  }

  const recovery = type === "recovery";
  return (
    <AccountLayout
      eyebrow={recovery ? "Mot de passe oublié" : `Bienvenue sur ${PLATFORM_NAME}`}
      title={
        recovery ? (
          <>
            Nouveau mot de passe<span className="text-accent-text">.</span>
          </>
        ) : (
          <>
            Bienvenue<span className="text-accent-text">.</span>
          </>
        )
      }
      lead={recovery ? "Choisis ton nouveau mot de passe. Tu seras connecté·e directement." : "Dernière étape : choisis ton mot de passe. Ensuite, tu te connectes simplement avec ton email."}
    >
      <WelcomeForm tokenHash={tokenHash} type={type} next={next} submitLabel={recovery ? "Enregistrer et me connecter" : "Créer mon accès"} />
    </AccountLayout>
  );
}
