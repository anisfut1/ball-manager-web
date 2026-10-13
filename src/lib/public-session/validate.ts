import { getPublicMe } from "@/lib/api/publicTables";

/** Vrai si ball-manager-back reconnaît ce jeton pour ce club (même appel que le front : `GET .../me`). */
export async function publicTokenValid(clubSlug: string, token: string): Promise<boolean> {
  try {
    await getPublicMe(clubSlug, token);
    return true;
  } catch {
    return false;
  }
}
