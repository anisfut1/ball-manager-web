"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireClubAdminContext } from "@/lib/tenancy/club-context";
import { api } from "@/lib/api/server";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import { logError } from "@/lib/logger";
import { isValidTimezone } from "@/lib/timezone";

export interface ClubSettingsActionResult {
  success: boolean;
  message: string;
}

/**
 * Met à jour le branding léger du club (§17/§42 du brief SaaS) : nom,
 * nom court, fuseau horaire. Passe par `PATCH /v1/clubs/:clubId`
 * (`api.clubs.update`) : ce frontend n'écrit plus jamais dans la base
 * (LOT-04). Le droit d'écriture est porté par ball-manager-back ; le
 * `requireClubAdminContext` ci-dessous n'est que la première barrière (UX).
 *
 * Le fuseau reste validé ICI en plus du back (D-1) : le comportement du
 * `PATCH` face à un fuseau invalide n'est pas confirmé (Q-014), et un fuseau
 * inconnu ferait lever un `RangeError` Intl sur les pages Tables/Dérogations.
 */
export async function updateClubSettingsAction(clubSlug: string, _prevState: ClubSettingsActionResult, formData: FormData): Promise<ClubSettingsActionResult> {
  const club = await requireClubAdminContext(clubSlug);

  const name = String(formData.get("name") ?? "").trim();
  const shortName = String(formData.get("short_name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();

  if (!name) {
    return { success: false, message: "Le nom du club est requis." };
  }

  if (timezone && !isValidTimezone(timezone)) {
    return { success: false, message: "Fuseau horaire invalide (ex : Europe/Paris)." };
  }

  try {
    await api.clubs.update(club.id, { name, shortName: shortName || null, timezone: timezone || "Europe/Paris" });
  } catch (error) {
    unstable_rethrow(error); // redirection /login sur 401 : ne jamais l'avaler
    if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
      return { success: false, message: error.message };
    }
    if (error instanceof ApiError && error.isForbidden) {
      return { success: false, message: "Tu n'as pas les droits pour modifier ces réglages." };
    }
    if (error instanceof ApiUnreachableError) {
      return { success: false, message: "Service temporairement indisponible. Réessaie." };
    }
    logError("Mise à jour des réglages du club échouée", error, { clubSlug });
    return { success: false, message: "Enregistrement impossible. Réessaie." };
  }

  revalidatePath(`/c/${clubSlug}/admin/settings`);
  revalidatePath(`/c/${clubSlug}`);
  return { success: true, message: "Réglages enregistrés." };
}
