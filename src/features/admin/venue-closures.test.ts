import { describe, expect, it } from "vitest";
import { closureDates } from "./VenueClosuresManager";

describe("closureDates", () => {
  it("un jour : jour de la semaine et date ; une période : du … au …", () => {
    expect(closureDates("2026-11-07", "2026-11-07")).toBe("samedi 7 novembre");
    expect(closureDates("2026-12-21", "2027-01-03")).toBe("du 21 décembre au 3 janvier");
  });
});
