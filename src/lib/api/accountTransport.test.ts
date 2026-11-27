import { afterEach, describe, expect, it, vi } from "vitest";

/** Compte : `as:<licencieId>` voyage en JWT + X-BM-As, jamais en lien personnel. */
const getAccountAccessToken = vi.fn<() => Promise<string | null>>();
vi.mock("@/lib/account/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/account/client")>();
  return { ...actual, getAccountAccessToken: () => getAccountAccessToken() };
});

const { publicFetch } = await import("./publicTokenTransport");

afterEach(() => {
  vi.unstubAllGlobals();
  getAccountAccessToken.mockReset();
});

describe("publicFetch avec un compte", () => {
  it("envoie Authorization et X-BM-As, sans X-Personal-Link-Token", async () => {
    getAccountAccessToken.mockResolvedValue("jwt-abc");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await publicFetch("/v1/public/clubs/club-a/me", "as:lic-1");
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer jwt-abc");
    expect(headers.get("x-bm-as")).toBe("lic-1");
    expect(headers.get("x-personal-link-token")).toBeNull();
  });

  it("session expirée : erreur 401 sans appel réseau", async () => {
    getAccountAccessToken.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(publicFetch("/v1/public/clubs/club-a/me", "as:lic-1")).rejects.toMatchObject({ status: 401, code: "SESSION_EXPIRED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
