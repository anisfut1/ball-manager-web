// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDeviceToken, setStoredPublicToken } from "@/lib/publicToken";
import { ActionCenter, useActionCenter } from "./ActionCenter";

function Home() {
  const state = useActionCenter("sete", "lien-lina");
  return <ActionCenter clubSlug="sete" timezone="Europe/Paris" {...state} onAddPerson={() => undefined} />;
}

const actionCenter = vi.fn();
const respond = vi.fn();
const respondAvailability = vi.fn();
const respondConvocation = vi.fn();
const markLaundrySeen = vi.fn();
vi.mock("@/lib/api/teamLife", () => ({
  publicTeamLife: {
    actionCenter: (...a: unknown[]) => actionCenter(...a),
    respond: (...a: unknown[]) => respond(...a),
    respondAvailability: (...a: unknown[]) => respondAvailability(...a),
    respondConvocation: (...a: unknown[]) => respondConvocation(...a),
    markLaundrySeen: (...a: unknown[]) => markLaundrySeen(...a),
  },
}));

const training = (id: string, teamId: string, startsAt: string) => ({
  id,
  seriesId: "s",
  team: { id: teamId, name: teamId === "u15" ? "U15 (F)" : "U11 (M)" },
  startsAt,
  endsAt: startsAt.replace("T17:00", "T18:30"),
  location: { clubVenueId: null, label: "Gymnase test", address: null },
  status: "scheduled",
  cancelReason: null,
  isModified: false,
  counts: null,
  canManage: false,
});

const DTO = {
  people: [
    { tokenIndex: 0, licencieId: "lina", firstName: "Lina", lastName: "M", team: { id: "u15", name: "U15 (F)" }, coachTeams: [] },
    { tokenIndex: 1, licencieId: "tom", firstName: "Tom", lastName: "M", team: { id: "u11", name: "U11 (M)" }, coachTeams: [] },
  ],
  canAddRelative: true,
  invalidTokenIndexes: [],
  actions: [
    { type: "TRAINING_RESPONSE", licencieId: "lina", firstName: "Lina", training: training("t1", "u15", "2099-10-13T17:00:00.000Z"), currentResponse: null },
    { type: "TRAINING_RESPONSE", licencieId: "tom", firstName: "Tom", training: training("t2", "u11", "2099-10-14T17:00:00.000Z"), currentResponse: null },
  ],
  upcoming: [],
};

beforeEach(() => {
  window.localStorage.clear();
  actionCenter.mockReset().mockResolvedValue(DTO);
  respond.mockReset();
  // Deux enfants sur ce téléphone : Lina (lien actif) et Tom.
  addDeviceToken("sete", "lien-tom");
  addDeviceToken("sete", "lien-lina");
  setStoredPublicToken("sete", "lien-lina");
});
afterEach(cleanup);

describe("Home « À faire »", () => {
  it("fusionne les liens de l'appareil et répond avec le lien de l'enfant concerné", async () => {
    respond.mockResolvedValue({});
    render(<Home />);
    expect(await screen.findByText(/Tom — entraînement/)).toBeTruthy();
    expect(actionCenter).toHaveBeenCalledWith("sete", ["lien-lina", "lien-tom"]);

    const tomGroup = screen.getByRole("group", { name: "Réponse pour Tom" });
    fireEvent.click(tomGroup.querySelector("button")!); // Présent·e
    expect(tomGroup.querySelector("button")!.getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => expect(respond).toHaveBeenCalledWith("sete", "lien-tom", "t2", "PRESENT"));
  });

  it("échec : la réponse revient en arrière avec un message", async () => {
    respond.mockRejectedValue(new Error("réseau"));
    render(<Home />);
    const group = await screen.findByRole("group", { name: "Réponse pour Lina" });
    fireEvent.click(group.querySelectorAll("button")[1]!); // Absent·e
    expect(await screen.findByText("Impossible d'enregistrer la réponse.")).toBeTruthy();
    expect(group.querySelectorAll("button")[1]!.getAttribute("aria-pressed")).toBe("false");
  });

  it("rien à répondre : « Tout est à jour »", async () => {
    actionCenter.mockResolvedValue({ ...DTO, actions: [] });
    render(<Home />);
    expect(await screen.findByText("Tout est à jour")).toBeTruthy();
  });

  it("« Ajouter un enfant » seulement quand c'est plausible (homonyme au club)", async () => {
    actionCenter.mockResolvedValue({ ...DTO, canAddRelative: false });
    render(<Home />);
    await screen.findByText(/Lina — entraînement/);
    expect(screen.queryByRole("button", { name: "Ajouter un enfant" })).toBeNull();
  });
});

const MATCH = { id: "m1", team: { id: "u11", name: "U11 (M)" }, startsAt: "2099-10-17T14:00:00.000Z", isHome: false, opponent: "Agde", venueName: "Gymnase Agde Basket", venueAddress: "12 rue du Sport, Agde", status: "scheduled" };

describe("Home « À faire » — matchs (Lot 2)", () => {
  it("disponibilité de Tom avec SON lien ; convocation de Lina : rendez-vous, lieu du match, confirmation en un clic", async () => {
    respondAvailability.mockResolvedValue({});
    respondConvocation.mockResolvedValue({});
    actionCenter.mockResolvedValue({
      ...DTO,
      actions: [
        { type: "MATCH_AVAILABILITY", licencieId: "tom", firstName: "Tom", match: MATCH, currentResponse: null },
        {
          type: "CONVOCATION_RESPONSE",
          licencieId: "lina",
          firstName: "Lina",
          match: { ...MATCH, team: { id: "u15", name: "U15 (F)" } },
          convocation: {
            revision: 1,
            meetingAt: "2099-10-17T12:15:00.000Z",
            meetingPoint: "Parking Maurice Clavel",
            coachMessage: "Tenue complète.",
            matchSnapshot: { startsAt: MATCH.startsAt, isHome: false, opponent: "Agde", venueName: "Gymnase Agde Basket", venueAddress: "12 rue du Sport, Agde", teamName: "U15 (F)" },
            message: "Bonjour,\n\nConvocation pour Lina avec les U15 (F).",
          },
          currentResponse: "PENDING",
          matchClosed: false,
        },
      ],
    });
    render(<Home />);
    expect(await screen.findByText("Tom est disponible pour ce match ?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Disponible$/ }));
    await waitFor(() => expect(respondAvailability).toHaveBeenCalledWith("sete", "lien-tom", "m1", "AVAILABLE"));

    expect(screen.getByText("Parking Maurice Clavel")).toBeTruthy();
    expect(screen.getByText("Lieu du match")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Lina ne pourra pas venir/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Je confirme/ }));
    await waitFor(() => expect(respondConvocation).toHaveBeenCalledWith("sete", "lien-lina", "m1", "CONFIRMED"));
  });

  it("match annulé : la convocation reste visible, sans bouton de confirmation", async () => {
    actionCenter.mockResolvedValue({
      ...DTO,
      actions: [
        {
          type: "CONVOCATION_RESPONSE",
          licencieId: "lina",
          firstName: "Lina",
          match: { ...MATCH, status: "cancelled" },
          convocation: { revision: 1, meetingAt: null, meetingPoint: "Parking", coachMessage: null, matchSnapshot: { startsAt: MATCH.startsAt, isHome: false, opponent: "Agde", venueName: "G", venueAddress: null, teamName: "U15 (F)" }, message: "Bonjour," },
          currentResponse: "PENDING",
          matchClosed: true,
        },
      ],
    });
    render(<Home />);
    expect(await screen.findByText("Match annulé ou indisponible")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Je confirme/ })).toBeNull();
  });
});

describe("Home « À faire » — coach : tables de marque (retour du club, 2026-10-10)", () => {
  const coachMatch = (id: string, filled: number) => ({
    type: "COACH_MATCH",
    coachLicencieId: "lina",
    match: { ...MATCH, id, isHome: true, opponent: `Adversaire ${id}` },
    stage: "CONVOCATION_SENT",
    availabilityCounts: null,
    convocationCounts: { convoked: 10, confirmed: 10, declined: 0, pending: 0 },
    matchChanged: false,
    tables: { filled, total: 4 },
    laundryAssigned: true,
  });

  it("table incomplète = à faire (1/4) ; table complète et convocation envoyée = « Fait », en dernier", async () => {
    actionCenter.mockResolvedValue({ ...DTO, actions: [coachMatch("m-full", 4), coachMatch("m-todo", 1)] });
    render(<Home />);
    expect(await screen.findByText("Table de marque", { selector: "p" }).catch(() => screen.findAllByText("Table de marque"))).toBeTruthy();
    expect(screen.getByText(/1\/4/)).toBeTruthy();
    const items = screen.getAllByRole("listitem");
    // La table incomplète reste à faire (pas de « Fait ») et passe avant les éléments faits.
    expect(items[0]?.textContent).not.toContain("Fait");
    expect(items[items.length - 1]?.textContent).toContain("Fait");
    expect(screen.queryByText("Tout est à jour")).toBeNull();
  });
});

describe("Home « À faire » — maillots (Lot 3)", () => {
  it("la famille désignée voit « Vous êtes en charge du lavage » ; « J'ai vu » avec SON lien → « Fait »", async () => {
    markLaundrySeen.mockResolvedValue({});
    actionCenter.mockResolvedValue({ ...DTO, actions: [{ type: "LAUNDRY_DUTY", licencieId: "tom", firstName: "Tom", match: MATCH, seenAt: null }] });
    render(<Home />);
    expect(await screen.findByText("Vous êtes en charge du lavage des maillots après le match.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /J'ai vu/ }));
    await waitFor(() => expect(markLaundrySeen).toHaveBeenCalledWith("sete", "lien-tom", "m1"));
    expect(await screen.findByText("Fait")).toBeTruthy();
  });
});

describe("Page d'un match (lien de convocation, app iOS)", () => {
  function MatchPage({ matchId }: { matchId: string }) {
    const state = useActionCenter("sete", "lien-lina");
    return <ActionCenter clubSlug="sete" timezone="Europe/Paris" {...state} matchId={matchId} />;
  }

  it("seulement ce que la famille a à faire pour CE match ; rien pour un autre match", async () => {
    actionCenter.mockResolvedValue({
      ...DTO,
      actions: [
        { type: "MATCH_AVAILABILITY", licencieId: "tom", firstName: "Tom", match: MATCH, currentResponse: null },
        { type: "MATCH_AVAILABILITY", licencieId: "tom", firstName: "Tom", match: { ...MATCH, id: "m2" }, currentResponse: null },
      ],
    });
    render(<MatchPage matchId="m1" />);
    expect(await screen.findByText("Pour ce match")).toBeTruthy();
    expect(screen.getAllByText("Tom est disponible pour ce match ?")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Ajouter un enfant/ })).toBeNull();
    cleanup();
    actionCenter.mockResolvedValue({ ...DTO, actions: [] });
    const { container } = render(<MatchPage matchId="m1" />);
    await waitFor(() => expect(actionCenter).toHaveBeenCalled());
    expect(container.querySelector("#convocation")).toBeNull();
  });
});
