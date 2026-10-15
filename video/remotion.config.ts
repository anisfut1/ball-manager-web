import path from "node:path";
import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

/**
 * Le film importe les VRAIS composants de l'application (../src) :
 * - `@/…` pointe sur ../src (même alias que tsconfig/vitest de l'app) ;
 * - les rares API Next.js utilisées par ces composants (Link, Image,
 *   useRouter/usePathname) sont remplacées par des shims inertes ;
 * - react / react-dom / lucide-react sont forcés sur l'unique copie de
 *   video/node_modules (sinon ../src résoudrait une seconde copie → hooks cassés).
 */
const here = process.cwd();
const nm = (p: string) => path.join(here, "node_modules", p);

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setConcurrency(4);
Config.setChromiumOpenGlRenderer("swangle");
Config.setBrowserExecutable("/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell");

Config.overrideWebpackConfig((current) => {
  const withTw = enableTailwind(current);
  return {
    ...withTw,
    resolve: {
      ...withTw.resolve,
      modules: [nm(""), "node_modules"],
      alias: {
        ...(withTw.resolve?.alias as Record<string, string>),
        "next/link": path.join(here, "src/shims/next-link.tsx"),
        "next/image": path.join(here, "src/shims/next-image.tsx"),
        "next/navigation": path.join(here, "src/shims/next-navigation.ts"),
        // Le client HTTP réel lit l'env Supabase/API au chargement : seul `ApiError` est utile aux composants.
        "@/server/actions/auth$": path.join(here, "src/shims/server-actions-auth.ts"),
        "@/lib/api/client$": path.join(here, "src/shims/api-client.ts"),
        "@/config/env.public$": path.join(here, "src/shims/env-public.ts"),
        "@": path.join(here, "../src"),
        react: nm("react"),
        "react-dom": nm("react-dom"),
        "lucide-react": nm("lucide-react"),
      },
    },
  };
});
