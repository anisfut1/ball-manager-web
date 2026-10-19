// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppSignInApp } from "./AppSignInApp";

let identity: unknown = null;
vi.mock("@/features/public/PublicIdentityProvider", () => ({ usePublicIdentity: () => ({ identity }) }));
vi.mock("@/features/licensed-access/LicensedAccessGate", () => ({ LicensedAccessGate: () => <p>panneau-connexion</p> }));
vi.mock("@/lib/publicToken", () => ({ getDeviceTokens: () => [] }));

const MESSAGE = "Ouvre le lien reçu par e-mail sur ce téléphone : l'application se connectera toute seule.";
const request = { codeChallenge: "c", state: "s", redirectPath: null };

afterEach(cleanup);

describe("AppSignInApp", () => {
  it("non identifié : message au-dessus du panneau de connexion", () => {
    identity = null;
    render(<AppSignInApp clubSlug="sc-sete-basket" clubName="SC Sète" request={request} />);
    const message = screen.getByText(MESSAGE);
    const panel = screen.getByText("panneau-connexion");
    expect(message.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("déjà connecté : pas de message, « Continuer » présent", () => {
    identity = { token: "t", licencie: { firstName: "Ada", lastName: "Lovelace" } };
    render(<AppSignInApp clubSlug="sc-sete-basket" clubName="SC Sète" request={request} />);
    expect(screen.queryByText(MESSAGE)).toBeNull();
    expect(screen.getByRole("button", { name: /Continuer/ })).toBeTruthy();
  });
});
