import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/config/env.public";
import { PUBLIC_PATHS } from "@/config/site";

/**
 * Protège l'application par défaut : toute route est privée sauf celles
 * listées dans `PUBLIC_PATHS`. Ce choix (liste blanche courte plutôt que
 * liste noire des routes protégées) évite d'oublier de protéger un futur
 * module (matchs, dérogations, tables...) ajouté dans les phases suivantes.
 *
 * Rafraîchit aussi le cookie de session Supabase sur chaque requête, comme
 * recommandé par @supabase/ssr pour Next.js App Router.
 *
 * Note : ce fichier suit la convention `proxy.ts` (anciennement
 * `middleware.ts`, renommée à partir de Next.js 16).
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims() : vérifie l'expiration et la signature du JWT (localement
  // avec des clés asymétriques ; sinon retombe sur getUser()) et rafraîchit
  // la session si besoin. Voir ADR-001.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf les assets statiques Next.js et les fichiers
     * publics (les endpoints internes vivent dans ball-manager-back).
     */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js$|offline\\.html$|manifest\\.webmanifest$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
