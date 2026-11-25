import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/config/env.public";
import type { Database } from "@/types/database";

/**
 * Client Supabase pour Server Components, Server Actions et Route Handlers.
 * Soumis aux politiques RLS de l'utilisateur connecté (clé anonyme + cookies
 * de session), jamais à la service role.
 *
 * Note : dans un Server Component pur (rendu), les cookies ne peuvent pas être
 * réécrits — Next.js l'interdit et lève une erreur si on essaie. On l'ignore
 * volontairement ici : le rafraîchissement de session est de toute façon geré
 * par `src/proxy.ts` sur chaque requête.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Appelé depuis un Server Component (pas une Server Action / un
          // Route Handler) : écriture impossible et sans conséquence ici,
          // voir la note ci-dessus.
        }
      },
    },
  });
}
