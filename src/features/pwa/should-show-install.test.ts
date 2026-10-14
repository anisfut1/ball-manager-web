import { describe, expect, it } from "vitest";
import { shouldShowInstall } from "./should-show-install";

const CODE = "SENTINELLE_CODE_0123456789abcdef";
const base = { os: "android", standalone: false, appStoreId: null } as const;

describe("shouldShowInstall — pages de connexion", () => {
  it.each([
    "/public/sc-sete-basket/auth/app",
    "/public/sc-sete-basket/connexion",
    "/public/sc-sete-basket/connexion/code",
    `/public/sc-sete-basket/connexion/code/${CODE}`,
  ])("masqué sur %s", (pathname) => {
    expect(shouldShowInstall({ ...base, pathname })).toBe(false);
    expect(shouldShowInstall({ ...base, os: "ios", pathname })).toBe(false);
  });

  it("pas de faux positif : un slug ou un segment qui contient le mot reste affiché", () => {
    expect(shouldShowInstall({ ...base, pathname: "/public/connexion-club/accueil" })).toBe(true);
    expect(shouldShowInstall({ ...base, pathname: "/public/auth-club/matchs" })).toBe(true);
    expect(shouldShowInstall({ ...base, pathname: "/public/sc-sete-basket/matchs/connexion" })).toBe(true);
  });
});

describe("shouldShowInstall — conditions inchangées ailleurs", () => {
  const pages = ["/public/sc-sete-basket/accueil", "/public/sc-sete-basket/matchs"];

  it.each(pages)("Android : affiché sur %s", (pathname) => {
    expect(shouldShowInstall({ ...base, pathname })).toBe(true);
  });
  it.each(pages)("iOS sans appStoreId : affiché sur %s", (pathname) => {
    expect(shouldShowInstall({ ...base, os: "ios", pathname })).toBe(true);
  });
  it.each(pages)("iOS avec appStoreId : masqué sur %s", (pathname) => {
    expect(shouldShowInstall({ ...base, os: "ios", appStoreId: "1234567890", pathname })).toBe(false);
  });
  it.each(pages)("desktop : masqué sur %s", (pathname) => {
    expect(shouldShowInstall({ ...base, os: "other", pathname })).toBe(false);
  });
  it.each(pages)("standalone : masqué sur %s", (pathname) => {
    expect(shouldShowInstall({ ...base, standalone: true, pathname })).toBe(false);
  });
  it("appStoreId sans effet sur Android", () => {
    expect(shouldShowInstall({ ...base, appStoreId: "1234567890", pathname: pages[0] })).toBe(true);
  });
});
