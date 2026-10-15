import type { InstallOs } from "@/lib/pwa/platform";

/** Sections de `/public/{slug}/…` où l'invite d'installation est masquée : connexion de l'app et connexion par lien/code. */
const HIDDEN_SECTIONS = new Set(["auth", "connexion"]);

/**
 * Faut-il proposer « Ajouter à l'écran d'accueil » ? Fonction PURE (testée sans DOM).
 * - jamais déjà installée (standalone) ni hors mobile (os « other » = desktop) ;
 * - sur iPhone, jamais si l'app publiée est proposée par la Smart App Banner ;
 * - jamais sur les pages de connexion (`/public/{slug}/auth/…`, `/public/{slug}/connexion…`),
 *   repérées par le SEGMENT exact après le slug (pas de simple recherche de sous-chaîne).
 */
export function shouldShowInstall({ os, standalone, appStoreId, pathname }: { os: InstallOs; standalone: boolean; appStoreId: string | null; pathname: string }): boolean {
  if (standalone || os === "other") return false;
  if (os === "ios" && appStoreId) return false;
  const [root, , section] = pathname.split("/").filter(Boolean);
  return !(root === "public" && section !== undefined && HIDDEN_SECTIONS.has(section));
}
