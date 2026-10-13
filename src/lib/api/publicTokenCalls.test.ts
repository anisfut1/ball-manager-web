import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicHome } from "./publicHome";
import { checkPublicDerogationSlot, createPublicDerogationRequest, getPublicDerogationAvailability, listPublicDerogationRequests } from "./publicDerogationRequests";
import {
  createPublicDerogation,
  deletePublicTableAssignment,
  getPublicMe,
  getPublicTableSuggestions,
  listPublicDerogations,
  listPublicTableAssignments,
  putPublicTableAssignment,
  respondPublicDerogation,
  setPublicRefereeStatus,
} from "./publicTables";

// Sans espace : `encodeURIComponent` (%20) et `URLSearchParams` (+) divergent sur " ", sans effet pour le serveur.
const T = "jeton-factice/+&=";
const ENC = encodeURIComponent(T);
const S = "sete";
const P = `/v1/public/clubs/${S}`;

const calls: Array<{ url: URL; init: RequestInit }> = [];

beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: URL, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

type Case = [string, () => Promise<unknown>, string, string];
// [libellé, appel, chemin attendu, query attendue SANS le jeton]
const cases: Case[] = [
  ["getPublicMe", () => getPublicMe(S, T), `${P}/me`, ""],
  ["listPublicDerogations", () => listPublicDerogations(S, T), `${P}/derogations`, ""],
  ["listPublicTableAssignments", () => listPublicTableAssignments(S, T, { from: "2026-01-01", to: "2026-02-01" }), `${P}/table-assignments`, "from=2026-01-01&to=2026-02-01"],
  ["putPublicTableAssignment", () => putPublicTableAssignment(S, T, "m1", "SCORER"), `${P}/matches/m1/table-assignments/SCORER`, ""],
  ["getPublicTableSuggestions", () => getPublicTableSuggestions(S, T, "m1", "SCORER"), `${P}/matches/m1/table-suggestions`, "role=SCORER"],
  ["setPublicRefereeStatus", () => setPublicRefereeStatus(S, T, "m1", true), `${P}/matches/m1/referee-status`, ""],
  ["deletePublicTableAssignment", () => deletePublicTableAssignment(S, T, "m1", "SCORER"), `${P}/matches/m1/table-assignments/SCORER`, ""],
  ["respondPublicDerogation", () => respondPublicDerogation(S, T, "d1", {} as never), `${P}/derogations/d1/respond`, ""],
  ["createPublicDerogation", () => createPublicDerogation(S, T, "m1", {} as never), `${P}/matches/m1/derogation/create`, ""],
  ["getPublicHome", () => getPublicHome(S, T), `${P}/home`, ""],
  ["listPublicDerogationRequests", () => listPublicDerogationRequests(S, T), `${P}/derogation-requests`, ""],
  ["createPublicDerogationRequest", () => createPublicDerogationRequest(S, T, {} as never), `${P}/derogation-requests`, ""],
  ["getPublicDerogationAvailability", () => getPublicDerogationAvailability(S, T, "m1", "2026-03-01"), `${P}/derogation-requests/availability`, "matchId=m1&date=2026-03-01"],
  ["checkPublicDerogationSlot", () => checkPublicDerogationSlot(S, T, "m1", "2026-03-01T10:00:00Z", null), `${P}/derogation-requests/slot-check`, "matchId=m1&startAt=2026-03-01T10%3A00%3A00Z"],
];

describe("caractérisation — transport actuel du jeton : query string, aucun en-tête (défaut)", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_PUBLIC_TOKEN_HEADER", ""));

  it.each(cases)("%s", async (_name, call, path, rest) => {
    await call();
    const { url, init } = calls[0];
    expect(url.pathname).toBe(path);
    expect(url.search).toBe(`?token=${ENC}${rest ? `&${rest}` : ""}`);
    expect(new Headers(init.headers).has("X-Personal-Link-Token")).toBe(false);
  });
});

describe("transport par en-tête (drapeau NEXT_PUBLIC_PUBLIC_TOKEN_HEADER=1)", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_PUBLIC_TOKEN_HEADER", "1"));

  it.each(cases)("%s : jeton en en-tête, jamais dans l'URL", async (_name, call, path, rest) => {
    await call();
    const { url, init } = calls[0];
    expect(url.pathname).toBe(path);
    expect(url.search).toBe(rest ? `?${rest}` : "");
    expect(url.href).not.toContain(ENC);
    expect(new Headers(init.headers).get("X-Personal-Link-Token")).toBe(T);
  });

  it("n'attache pas Authorization (réservé au JWT Supabase)", async () => {
    await getPublicMe(S, T);
    expect(new Headers(calls[0].init.headers).has("Authorization")).toBe(false);
  });
});

describe("drapeau : seule la valeur \"1\" active l'en-tête", () => {
  it.each(["", "0", "true", "off"])("valeur %j : reste en query", async (value) => {
    vi.stubEnv("NEXT_PUBLIC_PUBLIC_TOKEN_HEADER", value);
    await getPublicMe(S, T);
    expect(calls[0].url.search).toBe(`?token=${ENC}`);
  });
});
