import type { Metadata } from "next";
import { LegalPage, supportEmail } from "@/features/legal/LegalPage";

export const metadata: Metadata = { title: "Confidentialité — Ball Manager", description: "Données traitées par Ball Manager (site et app iPhone), et vos droits." };

/**
 * Politique de confidentialité : décrit UNIQUEMENT ce que fait le code
 * (données, durées, sous-traitants techniques). À faire relire avant la
 * publication sur l'App Store (docs/MOBILE_WEB_SUPPORT.md).
 */
export default function PrivacyPage() {
  const email = supportEmail();
  return (
    <LegalPage title="Confidentialité" updated="octobre 2026">
      <p>
        Ball Manager aide les clubs de basket à organiser la vie de leurs équipes : matchs, entraînements, convocations, tables de marque et dérogations. Le site et l&apos;app iPhone utilisent les mêmes données, gérées par ton club.
      </p>

      <h2>Les données utilisées</h2>
      <ul>
        <li>Fiche licencié fournie par le club : nom, prénom, date de naissance, numéro de licence, équipe, et si le club les a saisis, email, téléphone et photo.</li>
        <li>Tes réponses : disponibilités, réponses aux convocations, présences aux entraînements, messages des demandes de dérogation.</li>
        <li>Résultats et statistiques des matchs, issus de la FFBB (calendrier, feuilles de marque).</li>
        <li>Données techniques de l&apos;app : une session de connexion par iPhone, la version de l&apos;app, et si tu les actives, le jeton de notifications fourni par Apple.</li>
      </ul>

      <h2>Pas de suivi publicitaire</h2>
      <p>Aucune publicité, aucun outil de mesure d&apos;audience, aucun suivi entre applications ou sites. Les données ne sont ni vendues ni partagées à des fins commerciales.</p>

      <h2>Connexion sans mot de passe</h2>
      <p>
        L&apos;accès se fait par un lien personnel envoyé par email par le club. Dans l&apos;app, ce lien est échangé contre une session propre à l&apos;iPhone, rangée dans le trousseau d&apos;Apple ; seule une empreinte de cette session est conservée par Ball Manager. Elle expire après 180 jours sans utilisation, et la déconnexion la supprime aussitôt.
      </p>

      <h2>Notifications</h2>
      <p>
        Les notifications sont facultatives et demandées seulement après ta connexion. Leur texte reste court et ne contient aucun nom. Tu peux les couper dans l&apos;app (Mon compte) ou dans les Réglages de l&apos;iPhone ; la déconnexion les arrête aussi.
      </p>

      <h2>Mineurs</h2>
      <p>
        Beaucoup de licenciés sont mineurs. Le parent ou le joueur n&apos;accède qu&apos;à sa propre fiche et à celles de ses enfants, prouvées par leur lien personnel. Les noms des joueurs apparaissent dans l&apos;espace du club (équipes, matchs, statistiques) ; l&apos;email, le téléphone et la date de naissance ne sont jamais montrés aux autres familles.
      </p>

      <h2>Hébergement et prestataires techniques</h2>
      <ul>
        <li>Base de données : Supabase (Union européenne).</li>
        <li>Site et API : Vercel.</li>
        <li>Emails : Resend.</li>
        <li>Notifications iPhone : service de notifications d&apos;Apple (APNs).</li>
      </ul>

      <h2>Tes droits</h2>
      <p>
        Tu peux demander l&apos;accès, la correction ou la suppression de tes données. Le club garde ce qu&apos;il doit conserver pour la fédération (licence, feuilles de match officielles).{" "}
        {email ? (
          <>
            Écris à <a className="font-medium text-accent-text underline" href={`mailto:${email}`}>{email}</a> ou contacte directement ton club.
          </>
        ) : (
          <>Contacte directement ton club.</>
        )}
      </p>
    </LegalPage>
  );
}
