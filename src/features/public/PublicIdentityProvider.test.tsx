// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { resetConsumedPublicToken } from "@/lib/publicToken";
import { PublicIdentityProvider, usePublicIdentity } from "./PublicIdentityProvider";

const getPublicMe = vi.fn();
vi.mock("@/lib/api/publicTables", () => ({ getPublicMe: (...args: unknown[]) => getPublicMe(...args) }));

const T = "jeton-factice-0002";
const PATH = "/public/sete/matchs";

function Probe() {
  const { identity, linkExpired } = usePublicIdentity();
  return (
    <>
      <p data-testid="state">{identity === undefined ? "loading" : identity === null ? "none" : identity.licencie.firstName}</p>
      <p data-testid="expired">{linkExpired ? "expired" : "ok"}</p>
    </>
  );
}

function mount() {
  return render(
    <StrictMode>
      <PublicIdentityProvider clubSlug="sete" club={{ name: "Sète", logoUrl: null }}>
        <Probe />
      </PublicIdentityProvider>
    </StrictMode>,
  );
}

beforeEach(() => {
  getPublicMe.mockReset();
  window.localStorage.clear();
  window.history.replaceState(null, "", PATH);
});
afterEach(() => {
  cleanup();
  resetConsumedPublicToken();
});

describe("PublicIdentityProvider — double montage StrictMode (jsdom)", () => {
  it("jeton en fragment : identité résolue malgré le double effet, URL nettoyée, un seul jeton validé", async () => {
    window.history.replaceState(null, "", `${PATH}#token=${T}`);
    getPublicMe.mockResolvedValue({ licencie: { id: "l1", firstName: "Camille", lastName: "Test" }, isClubAdmin: false, derogationRequests: { canCreate: false, canManage: false }, tables: { canManage: false } });

    mount();

    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("Camille"));
    expect(window.location.href).not.toContain(T);
    expect(window.location.hash).toBe("");
    expect(getPublicMe.mock.calls.every((c) => c[0] === "sete" && c[1] === T)).toBe(true);
    expect(window.localStorage.getItem("scsb:public-token:sete")).toBe(T);
  });

  it("jeton invalide : URL nettoyée quand même, jeton non conservé, identité absente", async () => {
    window.history.replaceState(null, "", `${PATH}?token=${T}`);
    getPublicMe.mockRejectedValue(new Error("401"));

    mount();

    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("none"));
    expect(window.location.href).not.toContain(T);
    expect(window.localStorage.getItem("scsb:public-token:sete")).toBeNull();
  });
});

describe("PublicIdentityProvider — session persistante (cookie HttpOnly côté serveur)", () => {
  const ME = { licencie: { id: "l1", firstName: "Camille", lastName: "Test" }, isClubAdmin: false, derogationRequests: { canCreate: false, canManage: false }, tables: { canManage: false } };
  const calls: Array<{ method: string; body?: string }> = [];
  let sessionTokens: string[];

  beforeEach(() => {
    calls.length = 0;
    sessionTokens = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const method = init?.method ?? "GET";
        calls.push({ method, body: init?.body as string | undefined });
        if (method === "POST") sessionTokens = (JSON.parse(init!.body as string) as { tokens: string[] }).tokens;
        return new Response(JSON.stringify({ tokens: sessionTokens }), { status: 200 });
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lien de l'email : session enregistrée côté serveur, aucun jeton dans le localStorage", async () => {
    window.history.replaceState(null, "", `${PATH}?token=${T}`);
    getPublicMe.mockResolvedValue(ME);
    mount();
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("Camille"));
    expect(calls.some((c) => c.method === "POST" && c.body?.includes(T))).toBe(true);
    expect(window.localStorage.getItem("scsb:public-token:sete")).toBeNull();
    expect(window.localStorage.getItem("scsb:public-tokens:sete")).toBeNull();
    expect(window.location.href).not.toContain(T);
  });

  it("retour SANS token : reconnu grâce à la session serveur", async () => {
    sessionTokens = [T];
    getPublicMe.mockResolvedValue(ME);
    mount();
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("Camille"));
    expect(getPublicMe).toHaveBeenCalledWith("sete", T);
  });

  it("migration : un jeton déjà dans le localStorage passe dans la session puis disparaît du localStorage", async () => {
    window.localStorage.setItem("scsb:public-token:sete", T);
    getPublicMe.mockResolvedValue(ME);
    mount();
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("Camille"));
    await waitFor(() => expect(window.localStorage.getItem("scsb:public-token:sete")).toBeNull());
    expect(sessionTokens).toContain(T);
  });

  it("jeton de session révoqué : identité absente et jeton retiré de la session (DELETE)", async () => {
    sessionTokens = [T];
    getPublicMe.mockRejectedValue(new Error("401"));
    mount();
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("none"));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.body?.includes(T))).toBe(true));
  });

  it("session serveur indisponible (503) : repli sur le localStorage d'avant", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    window.history.replaceState(null, "", `${PATH}?token=${T}`);
    getPublicMe.mockResolvedValue(ME);
    mount();
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("Camille"));
    expect(window.localStorage.getItem("scsb:public-token:sete")).toBe(T);
  });
});

describe("PublicIdentityProvider — lien personnel expiré (7 jours)", () => {
  it("PERSONAL_LINK_EXPIRED : pas d'identité, linkExpired levé, jeton oublié, URL nettoyée", async () => {
    window.history.replaceState(null, "", `${PATH}#token=${T}`);
    getPublicMe.mockRejectedValue(new ApiError(401, "PERSONAL_LINK_EXPIRED", "Lien personnel expiré"));

    mount();

    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("none"));
    expect(screen.getByTestId("expired").textContent).toBe("expired");
    expect(window.location.href).not.toContain(T);
    expect(window.localStorage.getItem("scsb:public-token:sete")).toBeNull();
  });

  it("jeton simplement invalide : linkExpired reste faux", async () => {
    window.history.replaceState(null, "", `${PATH}#token=${T}`);
    getPublicMe.mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "invalide"));

    mount();

    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("none"));
    expect(screen.getByTestId("expired").textContent).toBe("ok");
  });

  it("un autre lien valable passe avant : pas d'avertissement d'expiration", async () => {
    window.localStorage.setItem("scsb:public-tokens:sete", JSON.stringify(["vieux-jeton-0001", T]));
    getPublicMe.mockImplementation(async (_slug: string, token: string) => {
      if (token === T) return { licencie: { id: "l1", firstName: "Camille", lastName: "Test" }, isClubAdmin: false, derogationRequests: { canCreate: false, canManage: false }, tables: { canManage: false } };
      throw new ApiError(401, "PERSONAL_LINK_EXPIRED", "expiré");
    });

    mount();

    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("Camille"));
    expect(screen.getByTestId("expired").textContent).toBe("ok");
  });
});
