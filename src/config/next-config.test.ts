import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

/** Garde-fou de la configuration Next (W2, audit sécurité 2026-11). */
describe("next.config", () => {
  it("ne divulgue pas la technologie : poweredByHeader désactivé (pas d'en-tête X-Powered-By: Next.js)", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("pose les en-têtes de sécurité sur toutes les routes", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const all = rules.find((r) => r.source === "/(.*)");
    const keys = (all?.headers ?? []).map((h) => h.key);
    expect(keys).toEqual(expect.arrayContaining(["X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "Content-Security-Policy"]));
  });
});
