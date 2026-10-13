import { NextResponse } from "next/server";
import { appleAppSiteAssociation } from "@/config/ios-app";

/**
 * Fichier `apple-app-site-association` (Universal Links de l'app iOS), servi
 * à `/.well-known/apple-app-site-association` par une réécriture INTERNE
 * (next.config.ts) : HTTPS, JSON, aucune redirection — exigences d'Apple.
 */
export const dynamic = "force-static";

export function GET(): NextResponse {
  const body = appleAppSiteAssociation();
  if (!body) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 404 });
  return NextResponse.json(body, { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } });
}
