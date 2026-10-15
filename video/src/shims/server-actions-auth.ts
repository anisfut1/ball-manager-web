/** Shim de `@/server/actions/auth` (Server Actions Supabase) : inertes dans la vidéo. */
export async function signOutAction(): Promise<void> {}
export async function signInAction(): Promise<{ ok: true }> {
  return { ok: true };
}
