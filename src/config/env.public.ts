import { z } from "zod";

/**
 * Variables d'environnement sûres à lire depuis un bundle navigateur.
 * Next.js les inline au build : elles DOIVENT commencer par `NEXT_PUBLIC_`.
 *
 * Ce module ne doit jamais importer `server-only` ni référencer un secret :
 * il est utilisé aussi bien par des Server Components que par des
 * Client Components (ex: `lib/supabase/browser.ts`).
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: "NEXT_PUBLIC_SUPABASE_URL doit être une URL valide (ex: https://xxxx.supabase.co)",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: "NEXT_PUBLIC_SUPABASE_ANON_KEY est requis",
  }),
  /**
   * URL du backend ball-manager-back (jamais d'URL en dur dans le code, voir
   * src/lib/api/config.ts). En développement, http://localhost:3001 (le
   * port par défaut de `npm run dev` dans ball-manager-back) est une valeur
   * valide.
   */
  NEXT_PUBLIC_CLUB_MANAGER_API_URL: z.string().url({
    message: "NEXT_PUBLIC_CLUB_MANAGER_API_URL doit être une URL valide (ex: https://api.example.com ou http://localhost:3001)",
  }),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Fonction pure (source explicite plutôt que `process.env` lu en dur) pour
 * rester facilement testable — voir env.public.test.ts.
 *
 * Le paramètre par défaut référence chaque `process.env.NEXT_PUBLIC_X`
 * INDIVIDUELLEMENT, jamais l'objet `process.env` entier : Next.js n'inline
 * une variable dans le bundle NAVIGATEUR que s'il voit ce motif littéral
 * exact dans le code — lire `process.env` une fois puis accéder aux clés
 * via une variable intermédiaire (`source.NEXT_PUBLIC_X`) casse cette
 * détection statique. Le bundle client remplace alors l'objet `process.env`
 * entier par `{}` (jamais exposé tel quel côté navigateur, pour ne pas
 * fuiter tout l'environnement serveur), et `source` devenait vide — crash
 * constaté en production sur toute page avec un Client Component import),
 * `TriggerFfbbSyncButton`/`/admin/intégrations` — jamais côté Server
 * Component, où `process.env` est le vrai environnement d'exécution, pas
 * un bundle inliné (d'où le "ça marche partout sauf là").
 */
export function parsePublicEnv(source?: Partial<Record<string, string | undefined>>): PublicEnv {
  const env = source ?? {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_CLUB_MANAGER_API_URL: process.env.NEXT_PUBLIC_CLUB_MANAGER_API_URL,
  };

  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_CLUB_MANAGER_API_URL: env.NEXT_PUBLIC_CLUB_MANAGER_API_URL,
  });

  if (!result.success) {
    const details = result.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(
      `Variables d'environnement publiques invalides ou manquantes.\n${details}\n` +
        "Vérifie ton fichier .env.local (voir .env.example).",
    );
  }

  return result.data;
}

export const publicEnv = parsePublicEnv();
