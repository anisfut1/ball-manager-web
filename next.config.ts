import type { NextConfig } from "next";
import { securityHeaders } from "./src/config/security-headers";

const nextConfig: NextConfig = {
  // @napi-rs/canvas expédie un binding natif (.node) que le bundler de Next.js
  // ne sait pas empaqueter ("non-ecmascript placeable asset") ; tesseract.js
  // charge son worker dynamiquement de façon similaire. On les exclut du
  // bundling et on les laisse chargés via require() Node natif au runtime
  // (présents normalement dans node_modules côté serveur/Vercel).
  serverExternalPackages: ["@napi-rs/canvas", "tesseract.js"],

  // Navigation (retour du club, 2026-10-08 : « l'appli est lente pour passer
  // d'une page à l'autre ») : une page déjà vue reste dans le cache du
  // navigateur 30 s — revenir dessus est instantané. Chaque action qui
  // modifie des données appelle `router.refresh()`, qui vide ce cache.
  experimental: {
    staleTimes: { dynamic: 30 },
  },

  // Le modèle de langue Tesseract (fra.traineddata) n'est référencé qu'à
  // l'exécution (fs.readFileSync par tesseract.js), pas via un `import` —
  // sans cette déclaration, Next.js ne l'inclurait pas dans le bundle de
  // la fonction serverless qui traite les documents e-Marque. Voir
  // src/server/emarque/extractors/pdf-raster-ocr-extractor.ts.
  outputFileTracingIncludes: {
    "/api/internal/discover-emarque": ["./src/server/emarque/ocr-data/**/*"],
  },

  // LOT-14 : en-têtes de sécurité ; la CSP est en Report-Only UNIQUEMENT
  // (src/config/security-headers.ts, docs/migration/12-csp-report-only.md).
  // App iOS : fichier AASA à l'URL exigée par Apple, sans redirection (réécriture interne).
  async rewrites() {
    return [{ source: "/.well-known/apple-app-site-association", destination: "/api/aasa" }];
  },

  async headers() {
    return [
      // PWA : le Service Worker et le manifeste ne doivent jamais rester en cache HTTP (sinon une mise à jour n'arrive pas).
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }, { key: "Content-Type", value: "text/javascript; charset=utf-8" }] },
      { source: "/offline.html", headers: [{ key: "Cache-Control", value: "no-cache" }] },
      {
        source: "/(.*)",
        headers: securityHeaders({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          apiUrl: process.env.NEXT_PUBLIC_CLUB_MANAGER_API_URL,
          isDev: process.env.NODE_ENV === "development",
        }),
      },
    ];
  },
};

export default nextConfig;
