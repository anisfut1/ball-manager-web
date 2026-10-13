"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

/** Jeton d'accès Supabase courant, pour un appel ball-manager-back depuis un Client Component (§7 de la demande). */
export async function getBrowserAccessToken(): Promise<string | null> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/** Rafraîchit la session Supabase et renvoie le nouveau jeton — utilisé UNE fois après un 401 (§42 de la demande : jamais de boucle de retry). */
export async function refreshBrowserAccessToken(): Promise<string | null> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.refreshSession();
  return session?.access_token ?? null;
}
