import type { Metadata } from "next";
import { LegalPage, supportEmail } from "@/features/legal/LegalPage";

export const metadata: Metadata = { title: "Aide — Ball Manager", description: "Se connecter, recevoir son lien, notifications : les réponses aux questions fréquentes." };

export default function SupportPage() {
  const email = supportEmail();
  return (
    <LegalPage title="Aide" updated="octobre 2026">
      <h2>Comment me connecter ?</h2>
      <p>
        Choisis ton club, puis « Recevoir un lien de connexion » : retrouve ton nom (ou celui de ton enfant), et le lien arrive à l&apos;adresse connue du club. Ouvre-le sur l&apos;iPhone : l&apos;app s&apos;ouvre directement, connectée. Si tu es déjà connecté sur le site dans Safari, « Continuer avec Ball Manager » suffit.
      </p>

      <h2>Je n&apos;ai pas reçu le lien</h2>
      <p>Regarde dans les courriers indésirables. Si ton adresse a changé, demande au club de la mettre à jour : le lien n&apos;est jamais envoyé à une autre adresse sans son accord.</p>

      <h2>J&apos;ai plusieurs enfants au club</h2>
      <p>Dans l&apos;app : Mon compte → « Ajouter un enfant ». Chaque enfant est ajouté avec son propre lien.</p>

      <h2>Les notifications n&apos;arrivent pas</h2>
      <p>Vérifie Mon compte → Notifications dans l&apos;app, puis Réglages de l&apos;iPhone → Notifications → Ball Manager. Les notifications d&apos;un club s&apos;arrêtent si tu t&apos;en déconnectes.</p>

      <h2>Me déconnecter, ou arrêter</h2>
      <p>Mon compte → « Se déconnecter » efface la session de l&apos;iPhone et arrête les notifications. Supprimer l&apos;app a le même effet. Pour la suppression de tes données, voir la page Confidentialité.</p>

      <h2>Contact</h2>
      <p>
        {email ? (
          <>
            Écris à <a className="font-medium text-accent-text underline" href={`mailto:${email}`}>{email}</a>. Pour une question sur l&apos;équipe ou un match, contacte ton club.
          </>
        ) : (
          <>Pour toute question, contacte ton club.</>
        )}
      </p>
    </LegalPage>
  );
}
