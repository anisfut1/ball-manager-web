import { beforeEach, describe, expect, it, vi } from "vitest";

// getClubContext/listUserClubs (les fonctions testées ici) n'appellent pas
// notFound()/redirect() elles-mêmes, mais requireClubContext/
// requireClubAdminContext (aussi testées ici) le font — sans ce mock,
// next/navigation plante en dehors du runtime Next.js réel. On les fait
// lever une erreur reconnaissable plutôt que de renvoyer `undefined`, pour
// pouvoir distinguer "notFound() appelé" de "redirect() appelé" dans les
// assertions.
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const mockRequireUser = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  requireUser: () => mockRequireUser(),
}));

const mockListClubs = vi.fn();
vi.mock("@/lib/api/server", () => ({
  api: { clubs: { list: () => mockListClubs() } },
}));

import { getClubContext, requireClubContext, requireClubAdminContext, listUserClubs } from "./club-context";
import type { ClubDto } from "@/lib/api/clubs";

const CLUB_A: ClubDto = {
  id: "club-a-id",
  slug: "club-a",
  name: "Club A Basket",
  shortName: null,
  logoUrl: null,
  accentColor: null,
  timezone: "Europe/Paris",
  status: "active",
  ffbbClubCode: "OCC0034008",
  roles: ["club_admin"],
};

const CLUB_B: ClubDto = { ...CLUB_A, id: "club-b-id", slug: "club-b", name: "Club B Basket", roles: ["joueur"] };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "user-a" });
  // Reproduit exactement le contrat de GET /v1/clubs (§11 de la demande) :
  // seuls les clubs dont l'utilisateur est membre actif, jamais une requête
  // Supabase directe sur `clubs`/`club_memberships` (§28 de la demande).
  mockListClubs.mockResolvedValue([CLUB_A, CLUB_B]);
});

describe("getClubContext", () => {
  it("appelle requireUser() avant tout appel à ball-manager-back (barrière avant l'API)", async () => {
    await getClubContext("club-a");
    expect(mockRequireUser).toHaveBeenCalled();
  });

  it("résout le club correspondant au slug depuis la réponse de GET /v1/clubs", async () => {
    const club = await getClubContext("club-a");
    expect(club?.id).toBe("club-a-id");
    expect(club?.roles).toEqual(["club_admin"]);
  });

  it("renvoie null si le slug ne correspond à aucun club renvoyé par l'API — jamais de distinction 'club inexistant' / 'pas membre' (isolation cross-tenant, §58 du brief SaaS)", async () => {
    const club = await getClubContext("club-inconnu");
    expect(club).toBeNull();
  });

  it("renvoie null pour le club d'un autre club (non renvoyé par GET /v1/clubs pour cet utilisateur)", async () => {
    mockListClubs.mockResolvedValue([CLUB_A]); // seul club-a est renvoyé pour cet utilisateur
    const club = await getClubContext("club-b");
    expect(club).toBeNull();
  });
});

describe("requireClubContext", () => {
  it("lève notFound() si le club n'existe pas / n'est pas accessible", async () => {
    await expect(requireClubContext("inconnu")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renvoie le club s'il existe", async () => {
    const club = await requireClubContext("club-a");
    expect(club.slug).toBe("club-a");
  });
});

describe("requireClubAdminContext", () => {
  it("redirige vers le dashboard du club si l'utilisateur n'est pas club_admin DE CE CLUB", async () => {
    await expect(requireClubAdminContext("club-b")).rejects.toThrow("NEXT_REDIRECT:/c/club-b/dashboard");
  });

  it("renvoie le club si l'utilisateur est club_admin de ce club", async () => {
    const club = await requireClubAdminContext("club-a");
    expect(club.slug).toBe("club-a");
  });

  it("ne confond jamais club_admin d'un club avec club_admin d'un autre", async () => {
    // user-a est club_admin sur club-a mais seulement joueur sur club-b —
    // jamais un rôle qui "fuit" d'un club à l'autre (§58 du brief SaaS).
    await expect(requireClubAdminContext("club-b")).rejects.toThrow("NEXT_REDIRECT:/c/club-b/dashboard");
    await expect(requireClubAdminContext("club-a")).resolves.toMatchObject({ slug: "club-a" });
  });
});

describe("listUserClubs", () => {
  it("renvoie tous les clubs accessibles à l'utilisateur, avec leurs rôles respectifs", async () => {
    const clubs = await listUserClubs();
    expect(clubs.map((c) => c.slug)).toEqual(["club-a", "club-b"]);
    expect(clubs.find((c) => c.slug === "club-b")?.roles).toEqual(["joueur"]);
  });

  it("renvoie un tableau vide si l'API ne renvoie aucun club", async () => {
    mockListClubs.mockResolvedValue([]);
    const clubs = await listUserClubs();
    expect(clubs).toEqual([]);
  });
});
