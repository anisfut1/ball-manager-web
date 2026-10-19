import { CalendarClock, CalendarRange, ClipboardList, House, Shirt, Smartphone, Timer, type LucideIcon } from "lucide-react";
import type { PublicLinkTarget } from "@/lib/api/publicTables";

/**
 * Espaces réservés aux licenciés : une seule porte d'entrée
 * (`LicensedAccessGate`), chaque module n'apporte que son contexte — titre,
 * phrase métier, icône et page de retour du lien envoyé par email.
 * Aucune logique d'accès ici (le serveur reste seul juge des droits).
 */
export type LicensedAccessModuleId = "home" | "team" | "planning" | "trainings" | "tables" | "derogations" | "app";

export interface LicensedAccessModule {
  title: string;
  /** Phrase métier, courte : la recherche doit rester visible sans défiler sur mobile. */
  description: string;
  icon: LucideIcon;
  /** Page ouverte par le lien reçu par email. */
  returnTo: PublicLinkTarget;
  /** Public restreint, affiché en pastille (« Réservé aux coachs »…). */
  audience?: string;
}

export const licensedAccessModules: Record<LicensedAccessModuleId, LicensedAccessModule> = {
  home: {
    title: "Mon espace",
    description: "Ton équipe, tes prochains matchs et tes tables de marque au même endroit.",
    icon: House,
    returnTo: "accueil",
  },
  team: {
    title: "Mon équipe",
    description: "Le prochain match, les entraînements et l'effectif de ton équipe.",
    icon: Shirt,
    returnTo: "accueil",
  },
  planning: {
    title: "Planning",
    description: "Les matchs et entraînements de ton équipe — ou de tes enfants — semaine par semaine.",
    icon: CalendarRange,
    returnTo: "accueil",
  },
  trainings: {
    title: "Entraînements",
    description: "Planifie les entraînements de ton équipe et vois qui vient.",
    icon: Timer,
    returnTo: "accueil",
    audience: "Réservé aux coachs",
  },
  tables: {
    title: "Tables de marque",
    description: "Positionne-toi sur les rencontres à domicile et retrouve tes affectations.",
    icon: ClipboardList,
    returnTo: "tables",
  },
  derogations: {
    title: "Dérogations",
    description: "Consulte et suis les demandes de dérogation liées aux rencontres de tes équipes.",
    icon: CalendarClock,
    returnTo: "derogations",
    audience: "Coachs, coordinateur et administrateurs",
  },
  app: {
    title: "Application Ball Manager",
    description: "Ton lien arrivera par email : ouvert sur ce téléphone, il connecte directement l'application.",
    icon: Smartphone,
    returnTo: "accueil",
  },
};
