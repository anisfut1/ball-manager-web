import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Caractérisation (LOT-01 / TRT-002) : combien d'appels Supabase Auth une
 * navigation serveur déclenche-t-elle ? Le scénario reproduit le rendu du
 * tableau de bord d'un club_admin (layout + page, voir
 * src/app/c/[clubSlug]/dashboard/page.tsx:61-73 et layout.tsx:21) : un
 * `requireUser()` puis 7 appels `api.*`. Le proxy (src/proxy.ts) tourne dans
 * un autre runtime et n'est pas simulé ici (voir docs/migration/08-metriques.md).
 */

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

// `cache()` de React n'a d'effet que dans un rendu serveur : on le remplace
// par une mémoïsation dont la portée est « une requête » (vidée par newRequest()).
const memos = vi.hoisted(() => [] as Map<string, unknown>[]);
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <A extends unknown[], R>(fn: (...args: A) => R) => {
      const store = new Map<string, unknown>();
      memos.push(store);
      return (...args: A): R => {
        const key = JSON.stringify(args);
        if (!store.has(key)) store.set(key, fn(...args));
        return store.get(key) as R;
      };
    },
  };
});

const calls = vi.hoisted(() => ({ getUser: 0, getSession: 0, getClaims: 0 }));
const SESSION = vi.hoisted(() => ({ access_token: "jeton-test" }));
const USER = vi.hoisted(() => ({ id: "user-1", email: "coach@example.test" }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => {
        calls.getUser += 1;
        return { data: { user: USER }, error: null };
      }),
      getSession: vi.fn(async () => {
        calls.getSession += 1;
        return { data: { session: SESSION }, error: null };
      }),
      getClaims: vi.fn(async () => {
        calls.getClaims += 1;
        return { data: { claims: { sub: USER.id, email: USER.email } }, error: null };
      }),
    },
  })),
}));

const mockApiFetch = vi.fn();
vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return { ...actual, apiFetch: (...args: unknown[]) => mockApiFetch(...args) };
});

import { requireUser } from "@/lib/auth/session";
import { api } from "./server";

function newRequest() {
  for (const store of memos) store.clear();
  calls.getUser = calls.getSession = calls.getClaims = 0;
}

async function renderAdminDashboard() {
  await requireUser();
  await api.clubs.list();
  await api.me();
  await Promise.all([
    api.matches.list("club-1", { from: "2026-08-01T00:00:00.000Z" }),
    api.issues.list("club-1"),
    api.derogations.list("club-1"),
    api.derogationRequests.context("club-1"),
    api.derogationRequests.list("club-1", { limit: 200 }),
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApiFetch.mockResolvedValue({ clubs: [], matches: [], issues: [], derogations: [], requests: [], teams: [] });
  newRequest();
});

describe("appels Supabase Auth par navigation serveur", () => {
  it("scénario tableau de bord admin : nombre d'appels réseau Auth", async () => {
    await renderAdminDashboard();

    // AVANT LOT-01 (mesuré sur le code d'origine) : 1 (requireUser) + 7 (un par api.*) = 8 getUser().
    // APRÈS : une seule résolution par requête, sans getUser() direct (getClaims() ne fait au
    // pire qu'UN appel réseau, en retombant lui-même sur getUser() pour des clés symétriques).
    expect(calls.getClaims).toBe(1);
    expect(calls.getSession).toBe(1);
    expect(calls.getUser).toBe(0);
  });

  it("transmet bien le jeton d'accès à ball-manager-back sur chaque appel", async () => {
    await renderAdminDashboard();

    expect(mockApiFetch).toHaveBeenCalledTimes(7);
    for (const [, init] of mockApiFetch.mock.calls) {
      expect(init).toMatchObject({ accessToken: "jeton-test" });
    }
  });

  it("une nouvelle requête re-vérifie l'authentification (aucun cache entre requêtes)", async () => {
    await api.clubs.list();
    newRequest();
    expect(calls.getClaims).toBe(0);

    await api.clubs.list();
    expect(calls.getClaims).toBe(1);
  });

  it("JWT refusé par getClaims (expiré, signature invalide) : aucun jeton transmis et requireUser redirige", async () => {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const refused = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: SESSION } }),
        getClaims: async () => ({ data: null, error: { message: "Invalid JWT signature" } }),
      },
    } as never;
    vi.mocked(createServerSupabaseClient).mockResolvedValue(refused);

    await api.clubs.list();
    expect(mockApiFetch.mock.calls[0]![1]).toMatchObject({ accessToken: null });

    newRequest();
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("sans session valide : le jeton est null (jamais un jeton périmé)", async () => {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce({
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null } }),
        getClaims: async () => ({ data: null, error: { message: "no session" } }),
      },
    } as never);

    await api.clubs.list();

    expect(mockApiFetch.mock.calls[0]![1]).toMatchObject({ accessToken: null });
  });
});
