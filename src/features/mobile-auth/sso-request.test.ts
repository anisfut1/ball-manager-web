import { describe, expect, it } from "vitest";
import { appleAppSiteAssociation, UNIVERSAL_LINK_COMPONENTS } from "@/config/ios-app";
import { callbackUrl, parseSsoRequest } from "./sso-request";

const ok = { code_challenge: "a".repeat(43), code_challenge_method: "S256", state: "s".repeat(24), redirect_uri: "fr.ballmanager.app://auth/callback" };

describe("connexion de l'app depuis Safari : paramètres", () => {
  it("demande valide ; destination interne au club seulement", () => {
    expect(parseSsoRequest({ ...ok, redirect_path: "/public/sete/matchs/1" }, "sete")).toEqual({ codeChallenge: ok.code_challenge, state: ok.state, redirectPath: "/public/sete/matchs/1" });
    expect(parseSsoRequest({ ...ok, redirect_path: "/public/autre/matchs/1" }, "sete")?.redirectPath).toBeNull();
    expect(parseSsoRequest({ ...ok, redirect_path: "https://evil.example" }, "sete")?.redirectPath).toBeNull();
  });
  it("refuse PKCE plain, un rappel étranger, un state absent", () => {
    expect(parseSsoRequest({ ...ok, code_challenge_method: "plain" }, "sete")).toBeNull();
    expect(parseSsoRequest({ ...ok, redirect_uri: "https://evil.example/cb" }, "sete")).toBeNull();
    expect(parseSsoRequest({ ...ok, state: undefined }, "sete")).toBeNull();
  });
  it("rappel vers l'app uniquement", () => {
    expect(callbackUrl({ code: "c1", state: "s1" })).toBe("fr.ballmanager.app://auth/callback?code=c1&state=s1");
  });
});

describe("apple-app-site-association", () => {
  it("Team ID + Bundle ID réels ; espace club et session web exclus", () => {
    const aasa = appleAppSiteAssociation("YFZ72KY47V", "fr.ballmanager.app")!;
    expect(aasa.applinks.details[0]!.appIDs).toEqual(["YFZ72KY47V.fr.ballmanager.app"]);
    const paths = UNIVERSAL_LINK_COMPONENTS.map((c) => c["/"]);
    expect(paths).toContain("/public/*");
    expect(paths.some((p) => p.startsWith("/c/"))).toBe(false);
    expect(UNIVERSAL_LINK_COMPONENTS.find((c) => c["/"] === "/public/*/auth/*")?.exclude).toBe(true);
    // Les exclusions doivent précéder la règle générale (Apple applique la première qui correspond).
    expect(paths.indexOf("/public/*/session")).toBeLessThan(paths.indexOf("/public/*"));
  });
  it("Team ID invalide : pas de fichier", () => {
    expect(appleAppSiteAssociation("FAUX")).toBeNull();
  });
});
