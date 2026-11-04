import type { components } from "@/lib/api/generated/schema";

type LicencieDto = components["schemas"]["LicencieDto"];

/**
 * Numéro de licence : « masqué » n'est pas « non renseigné » (W4, audit sécurité 2026-11).
 *
 * Le back met `licenseNumber` à `null` pour un lecteur sans droit sur la fiche et pose alors
 * `sensitiveHidden: true` (le masquage dépend de chaque fiche : coach de l'équipe, fiche
 * personnelle… le rôle seul ne le dit pas). Un back plus ancien n'envoie pas le champ : on se
 * comporte comme avant (`null` = non renseigné).
 */
export type LicenceNumberFields = Pick<LicencieDto, "licenseNumber" | "sensitiveHidden">;

export function licenceNumberLabel(licencie: LicenceNumberFields, style: "badge" | "inline"): string {
  if (licencie.licenseNumber) return licencie.licenseNumber;
  if (licencie.sensitiveHidden === true) return style === "badge" ? "Numéro de licence masqué" : "Licence masquée";
  return style === "badge" ? "Numéro de licence non renseigné" : "Licence —";
}

/** Nom, prénom ou numéro VISIBLE : une fiche masquée ne se trouve jamais par un numéro qu'on ne lit pas. */
export function matchesLicencieQuery(licencie: Pick<LicencieDto, "firstName" | "lastName"> & LicenceNumberFields, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${licencie.lastName} ${licencie.firstName} ${licencie.licenseNumber ?? ""}`.toLowerCase().includes(q);
}

/** « n° de licence » n'est proposé que s'il existe au moins un numéro visible dans la liste. */
export function licenceSearchPlaceholder(licencies: readonly LicenceNumberFields[]): string {
  return licencies.some((l) => Boolean(l.licenseNumber)) ? "Nom ou n° de licence" : "Nom";
}

/** Au moins une fiche a son numéro masqué pour ce lecteur. */
export function hasHiddenLicence(licencies: readonly LicenceNumberFields[]): boolean {
  return licencies.some((l) => l.sensitiveHidden === true);
}
