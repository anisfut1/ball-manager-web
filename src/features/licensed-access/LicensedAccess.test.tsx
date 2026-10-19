// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { LicensedSearchCard } from "./LicensedSearchCard";
import { LicensedAccessGate } from "./LicensedAccessGate";

const search = vi.fn();
const requestLink = vi.fn();
vi.mock("@/lib/api/publicTables", () => ({
  searchPublicLicencies: (...args: unknown[]) => search(...args),
  requestPersonalLink: (...args: unknown[]) => requestLink(...args),
  sendAccessRequest: vi.fn(),
}));
vi.mock("@/features/public/PublicIdentityProvider", () => ({
  usePublicIdentity: () => ({ clubSlug: "club-demo", club: { name: "Club Démo", logoUrl: null } }),
}));

const lea = { id: "11111111-1111-4111-8111-111111111111", firstName: "Léa", lastInitial: "M" };

function typeAndSearch(value: string) {
  fireEvent.change(screen.getByLabelText("Ton prénom et ton nom"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: /Rechercher/ }));
}

beforeEach(() => {
  search.mockReset();
  requestLink.mockReset();
});
afterEach(cleanup);

describe("LicensedSearchCard", () => {
  it("demande prénom ET nom avant d'interroger le serveur", () => {
    render(<LicensedSearchCard clubSlug="club-demo" clubName="Club Démo" returnTo="tables" />);
    typeAndSearch("Léa");
    expect(search).not.toHaveBeenCalled();
    expect(screen.getByText(/Tape ton prénom et ton nom/)).toBeTruthy();
  });

  it("trouve le licencié puis envoie le lien vers le module d'origine (adresse masquée)", async () => {
    search.mockResolvedValue([lea]);
    requestLink.mockResolvedValue({ maskedEmail: "l•••@gmail.com", pendingApproval: false });
    render(<LicensedSearchCard clubSlug="club-demo" clubName="Club Démo" returnTo="tables" />);
    typeAndSearch("martin léa");
    expect(search).toHaveBeenCalledWith("club-demo", "martin léa");
    fireEvent.click(await screen.findByRole("button", { name: /Léa M\..*C'est moi/ }));
    fireEvent.click(screen.getByRole("button", { name: /Recevoir mon lien sécurisé/ }));
    expect(await screen.findByText("C'est envoyé, Léa !")).toBeTruthy();
    expect(requestLink).toHaveBeenCalledWith("club-demo", lea.id, { email: null, returnTo: "tables" });
    expect(screen.getByText("l•••@gmail.com")).toBeTruthy();
  });

  it("aucun résultat : état dédié, sans message technique", async () => {
    search.mockResolvedValue([]);
    render(<LicensedSearchCard clubSlug="club-demo" clubName="Club Démo" returnTo="accueil" />);
    typeAndSearch("Personne Inconnue");
    expect(await screen.findByText("Aucun licencié trouvé")).toBeTruthy();
  });

  it("panne serveur : message neutre et « Réessayer » relance la recherche", async () => {
    search.mockRejectedValueOnce(new ApiError(500, "INTERNAL", "stack trace interne")).mockResolvedValueOnce([lea]);
    render(<LicensedSearchCard clubSlug="club-demo" clubName="Club Démo" returnTo="accueil" />);
    typeAndSearch("Léa Martin");
    expect(await screen.findByText("Impossible d'effectuer la recherche pour le moment.")).toBeTruthy();
    expect(screen.queryByText("stack trace interne")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Réessayer/ }));
    expect(await screen.findByRole("button", { name: /Léa M\./ })).toBeTruthy();
  });
});

describe("LicensedAccessGate", () => {
  it.each([
    ["tables", "Tables de marque"],
    ["team", "Mon équipe"],
    ["derogations", "Dérogations"],
  ] as const)("module %s : accès réservé, club et titre du module", (module, title) => {
    render(<LicensedAccessGate module={module} />);
    expect(screen.getByText("Accès réservé aux licenciés")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeTruthy();
    expect(screen.getAllByText("Club Démo").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Ton prénom et ton nom")).toBeTruthy();
  });
});
