import { beforeEach, describe, expect, it, vi } from "vitest";

// Même approche que club-context.test.ts : redirect() plante hors du
// runtime Next.js réel, on le fait lever une erreur reconnaissable pour
// distinguer "redirect() appelé" d'un simple throw normal.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const mockGetServerAccessToken = vi.fn();
vi.mock("./auth.server", () => ({
  getServerAccessToken: () => mockGetServerAccessToken(),
}));

const mockApiFetch = vi.fn();
vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return { ...actual, apiFetch: (...args: unknown[]) => mockApiFetch(...args) };
});

import { redirect } from "next/navigation";
import { api } from "./server";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerAccessToken.mockResolvedValue("un-jeton");
});

/**
 * Régression production (2026-09-25) : un 401 ball-manager-back ("Jeton
 * invalide ou expiré") remontait BRUT depuis un Server Component jusqu'au
 * error boundary de Next.js ("Une erreur est survenue") — serverFetcher
 * n'avait aucune gestion du 401, contrairement à browserFetcher qui
 * redirige déjà proprement vers /login.
 */
describe("api (serverFetcher)", () => {
  it("redirige vers /login sur un 401, ne laisse jamais l'ApiError brute remonter jusqu'au composant appelant", async () => {
    const { ApiError } = await import("./client");
    mockApiFetch.mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "Jeton invalide ou expiré."));

    await expect(api.clubs.list()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("laisse passer une erreur non-401 sans jamais rediriger", async () => {
    const { ApiError } = await import("./client");
    mockApiFetch.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Erreur serveur"));

    await expect(api.clubs.list()).rejects.toThrow("Erreur serveur");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("renvoie le résultat normalement quand l'appel réussit", async () => {
    mockApiFetch.mockResolvedValue({ clubs: [] });

    await expect(api.clubs.list()).resolves.toEqual([]);
    expect(redirect).not.toHaveBeenCalled();
  });
});
