import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { SessionUser } from "./session";
import { requireUser } from "./session";
import { api } from "@/lib/api/server";
import { ApiError } from "@/lib/api/client";
import type { PlatformClubDto } from "@/lib/api/platform";

/**
 * platform_admin : opérateur de la plateforme SaaS, jamais un rôle de club
 * (voir docs/MULTI_TENANCY.md). §24/§28 de la demande : ce module ne lit
 * plus JAMAIS `platform_admins` directement dans Supabase (table métier) —
 * le statut est déterminé par ball-manager-back lui-même, qui applique la
 * même RPC `is_platform_admin()` que la RLS (voir docs/AUTH.md côté
 * backend) : un 403 sur `/v1/platform/*` signifie "pas platform_admin".
 *
 * `cache()` (portée = une requête serveur) évite un second appel réseau
 * quand la page /platform/clubs relit ensuite la même liste.
 */
const getPlatformClubsCached = cache(async (): Promise<PlatformClubDto[]> => api.platform.listClubs());

export async function isPlatformAdmin(): Promise<boolean> {
  try {
    await getPlatformClubsCached();
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.isForbidden) return false;
    throw error;
  }
}

/** Variante stricte pour les routes /platform/* : redirige si l'utilisateur n'est pas platform_admin. */
export async function requirePlatformAdmin(): Promise<SessionUser> {
  const user = await requireUser();

  if (!(await isPlatformAdmin())) {
    redirect("/");
  }

  return user;
}

/** GET /v1/platform/clubs, avec le même bénéfice de dédoublonnage par requête que ci-dessus. */
export async function getPlatformClubs(): Promise<PlatformClubDto[]> {
  return getPlatformClubsCached();
}
