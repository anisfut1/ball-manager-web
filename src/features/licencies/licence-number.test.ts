import { describe, expect, it } from "vitest";
import type { components } from "@/lib/api/generated/schema";
import { hasHiddenLicence, licenceNumberLabel, licenceSearchPlaceholder, matchesLicencieQuery } from "./licence-number";

type Licencie = Pick<components["schemas"]["LicencieDto"], "firstName" | "lastName" | "licenseNumber" | "sensitiveHidden">;

const visible: Licencie = { firstName: "Camille", lastName: "DURAND", licenseNumber: "VT123456" };
const missing: Licencie = { firstName: "Léa", lastName: "MARTIN", licenseNumber: null };
const hidden: Licencie = { firstName: "Hugo", lastName: "BERNARD", licenseNumber: null, sensitiveHidden: true };

describe("licenceNumberLabel — masqué ≠ non renseigné (W4)", () => {
  it("affiche le numéro quand il est visible", () => {
    expect(licenceNumberLabel(visible, "badge")).toBe("VT123456");
    expect(licenceNumberLabel(visible, "inline")).toBe("VT123456");
  });

  it("« non renseigné » seulement quand la fiche est visible et sans numéro", () => {
    expect(licenceNumberLabel(missing, "badge")).toBe("Numéro de licence non renseigné");
    expect(licenceNumberLabel(missing, "inline")).toBe("Licence —");
  });

  it("« masqué » (jamais « non renseigné ») quand l'API signale la fiche masquée", () => {
    expect(licenceNumberLabel(hidden, "badge")).toBe("Numéro de licence masqué");
    expect(licenceNumberLabel(hidden, "inline")).toBe("Licence masquée");
    expect(licenceNumberLabel(hidden, "badge")).not.toMatch(/non renseigné/);
  });

  it("un back plus ancien (sans le champ) se comporte comme avant", () => {
    expect(licenceNumberLabel({ licenseNumber: null }, "badge")).toBe("Numéro de licence non renseigné");
  });

  it("sensitiveHidden: false est traité comme visible", () => {
    expect(licenceNumberLabel({ licenseNumber: null, sensitiveHidden: false }, "inline")).toBe("Licence —");
  });
});

describe("matchesLicencieQuery", () => {
  it("cherche dans le nom, le prénom et le numéro visible", () => {
    expect(matchesLicencieQuery(visible, "durand")).toBe(true);
    expect(matchesLicencieQuery(visible, "camille")).toBe(true);
    expect(matchesLicencieQuery(visible, "vt1234")).toBe(true);
    expect(matchesLicencieQuery(visible, "autre")).toBe(false);
  });

  it("requête vide : tout le monde", () => {
    expect(matchesLicencieQuery(hidden, "")).toBe(true);
  });

  it("une fiche masquée se trouve par son nom, jamais par un numéro", () => {
    expect(matchesLicencieQuery(hidden, "bernard")).toBe(true);
    expect(matchesLicencieQuery(hidden, "vt123456")).toBe(false);
  });

  it("insensible à la casse et aux espaces autour", () => {
    expect(matchesLicencieQuery(visible, "  VT123456 ")).toBe(true);
  });
});

describe("recherche : placeholder et indice", () => {
  it("propose le numéro quand au moins un numéro est visible", () => {
    expect(licenceSearchPlaceholder([hidden, visible])).toBe("Nom ou n° de licence");
  });

  it("propose le nom seul quand aucun numéro n'est visible (tout masqué ou aucun numéro)", () => {
    expect(licenceSearchPlaceholder([hidden, hidden])).toBe("Nom");
    expect(licenceSearchPlaceholder([missing])).toBe("Nom");
    expect(licenceSearchPlaceholder([])).toBe("Nom");
  });

  it("signale la présence de fiches masquées", () => {
    expect(hasHiddenLicence([visible, hidden])).toBe(true);
    expect(hasHiddenLicence([visible, missing])).toBe(false);
    expect(hasHiddenLicence([])).toBe(false);
  });
});
