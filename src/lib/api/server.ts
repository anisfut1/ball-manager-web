import "server-only";
import { redirect } from "next/navigation";
import { apiFetch, ApiError, type ApiRequestInit } from "./client";
import { getServerAccessToken } from "./auth.server";
import { createApi } from "./factory";

/**
 * Utilisé par les Server Components / Server Actions (§8 de la demande) :
 * `import { api } from "@/lib/api/server"`. Le jeton d'accès est lu depuis
 * la session Supabase serveur à CHAQUE appel (jamais mis en cache entre
 * requêtes, cohérent avec `cache: "no-store"` de src/lib/api/client.ts).
 *
 * Sur un 401 : redirige franchement vers /login plutôt que de laisser
 * l'`ApiError` brute remonter jusqu'au error boundary de Next.js — constaté
 * en production : "Jeton invalide ou expiré" (backend) faisait planter la
 * page entière ("Une erreur est survenue") au lieu d'une reconnexion
 * propre. Le proxy (`src/proxy.ts`) rafraîchit déjà le cookie de session à
 * chaque requête, mais une session réellement expirée (jeton de
 * rafraîchissement révoqué/expiré) n'a rien à rafraîchir — le seul signal
 * fiable de ce cas précis est le 401 renvoyé par ball-manager-back lui-même
 * (§ `browserFetcher`, même philosophie côté Client Components : jamais de
 * crash, toujours une redirection nette).
 */
async function serverFetcher<T>(path: string, init: Omit<ApiRequestInit, "accessToken"> = {}): Promise<T> {
  const accessToken = await getServerAccessToken();

  try {
    return await apiFetch<T>(path, { ...init, accessToken });
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) {
      redirect("/login");
    }
    throw error;
  }
}

export const api = createApi(serverFetcher);
