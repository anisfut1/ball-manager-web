import "server-only";
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { api } from "@/lib/api/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { ShellUser } from "./types";

/**
 * Identité affichée dans le shell : `GET /v1/me` (displayName +
 * isPlatformAdmin, résolus par ball-manager-back). Repli sur l'email de la
 * session si l'appel échoue — le shell ne doit jamais faire tomber la page.
 */
export const getShellIdentity = cache(async (): Promise<{ user: ShellUser; isPlatformAdmin: boolean }> => {
  try {
    const me = await api.me();
    return {
      user: { displayName: me.displayName?.trim() || me.email || "Utilisateur", email: me.email },
      isPlatformAdmin: me.isPlatformAdmin,
    };
  } catch (error) {
    unstable_rethrow(error); // redirection /login sur 401 : ne jamais l'avaler
    const user = await getCurrentUser();
    return { user: { displayName: user?.email ?? "Utilisateur", email: user?.email ?? null }, isPlatformAdmin: false };
  }
});
