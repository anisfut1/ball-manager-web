// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { LicensedSearchCard } from "./LicensedSearchCard";
import { LicensedAccessGate } from "./LicensedAccessGate";

const search = vi.fn();
vi.mock("@/lib/api/publicTables", () => ({
  searchPublicLicencies: (...args: unknown[]) => search(...args),
  sendAccessRequest: vi.fn(),
}));
let linkExpired = false;
let account: { id: string; email: string; people: unknown[] } | null = null;
const refresh = vi.fn();
vi.mock("@/features/public/PublicIdentityProvider", () => ({
  usePublicIdentity: () => ({ clubSlug: "club-demo", club: { name: "Club Démo", logoUrl: null }, linkExpired, account, refresh }),
}));
const signUp = vi.fn();
const verify = vi.fn();
const linkLicencie = vi.fn();
vi.mock("@/lib/api/accounts", () => ({
  signUp: (...args: unknown[]) => signUp(...args),
  verifySignUp: (...args: unknown[]) => verify(...args),
  signIn: vi.fn(),
  resendSignUpCode: vi.fn(),
  requestPasswordReset: vi.fn(),
  linkLicencie: (...args: unknown[]) => linkLicencie(...args),
}));
vi.mock("@/lib/account/client", () => ({
  storeAccountSession: vi.fn(async () => undefined),
  getAccountAccessToken: vi.fn(async () => "jwt-test"),
}));

const lea = { id: "11111111-1111-4111-8111-111111111111", firstName: "Léa", lastInitial: "M" };

function typeAndSearch(value: string) {
  fireEvent.change(screen.getByLabelText("Ton prénom et ton nom"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: /Rechercher/ }));
}

beforeEach(() => {
  linkExpired = false;
  account = null;
  refresh.mockReset();
  signUp.mockReset();
  verify.mockReset();
  linkLicencie.mockReset();
  search.mockReset();
});
afterEach(cleanup);

describe("LicensedSearchCard", () => {
  it("demande prénom ET nom avant d'interroger le serveur", () => {
    render(<LicensedSearchCard clubSlug="club-demo" clubName="Club Démo" returnTo="tables" />);
    typeAndSearch("Léa");
    expect(search).not.toHaveBeenCalled();
    expect(screen.getByText(/Tape ton prénom et ton nom/)).toBeTruthy();
  });

  it("trouve le licencié, crée le compte (code par email) puis le rattache", async () => {
    search.mockResolvedValue([lea]);
    signUp.mockResolvedValue({ sent: true });
    verify.mockResolvedValue({ accessToken: "jwt", refreshToken: "r", expiresAt: "2030-01-01T00:00:00Z", user: { id: "u1", email: "parent@example.test" } });
    linkLicencie.mockResolvedValue({ status: "active", account: { id: "u1", email: "parent@example.test", people: [] } });
    render(<LicensedSearchCard clubSlug="club-demo" clubName="Club Démo" returnTo="tables" />);
    typeAndSearch("martin léa");
    expect(search).toHaveBeenCalledWith("club-demo", "martin léa");
    fireEvent.click(await screen.findByRole("button", { name: /Léa M\..*C'est moi/ }));
    fireEvent.change(screen.getByLabelText(/Adresse email/), { target: { value: "parent@example.test" } });
    fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: "motdepasse1" } });
    fireEvent.click(screen.getByRole("button", { name: /Créer mon compte/ }));
    fireEvent.change(await screen.findByLabelText(/Code reçu par email/), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /Valider le code/ }));
    await vi.waitFor(() => expect(linkLicencie).toHaveBeenCalledWith("club-demo", "jwt-test", { licencieId: lea.id }));
    expect(signUp).toHaveBeenCalledWith("parent@example.test", "motdepasse1", "club-demo");
    expect(verify).toHaveBeenCalledWith("parent@example.test", "123456", "motdepasse1");
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("compte déjà connecté, adresse inconnue du club : demande en attente de validation", async () => {
    account = { id: "u1", email: "pere@example.test", people: [] };
    search.mockResolvedValue([lea]);
    linkLicencie.mockResolvedValue({ status: "pending", account: { ...account, people: [] } });
    render(<LicensedSearchCard clubSlug="club-demo" clubName="Club Démo" returnTo="accueil" />);
    typeAndSearch("Léa Martin");
    fireEvent.click(await screen.findByRole("button", { name: /Léa M\./ }));
    fireEvent.click(screen.getByRole("button", { name: /Ajouter Léa à mon compte/ }));
    expect(await screen.findByText("Demande transmise au club")).toBeTruthy();
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

describe("LicensedAccessGate — lien expiré", () => {
  it("affiche « Ton lien a expiré » (alerte) quand le lien a expiré", () => {
    linkExpired = true;
    render(<LicensedAccessGate module="home" />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Ton lien a expiré");
    expect(screen.getByLabelText("Ton prénom et ton nom")).toBeTruthy();
  });

  it("aucune alerte pour un visiteur sans lien", () => {
    render(<LicensedAccessGate module="home" />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
