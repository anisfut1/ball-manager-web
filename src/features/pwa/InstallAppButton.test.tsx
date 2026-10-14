// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InstallEnvironment } from "@/lib/pwa/platform";
import { InstallAppButton } from "./InstallAppButton";

let pathname = "/public/sc-sete-basket/accueil";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/config/ios-app", () => ({ appStoreId: () => null }));
const env: InstallEnvironment = { os: "android", browser: "chrome", inAppBrowser: null, standalone: false };
vi.mock("@/lib/pwa/platform", async (orig) => ({ ...(await orig<typeof import("@/lib/pwa/platform")>()), readInstallEnvironment: () => env }));

afterEach(() => {
  cleanup();
  pathname = "/public/sc-sete-basket/accueil";
});

describe("InstallAppButton", () => {
  it("n'affiche rien sur /connexion ni sur /auth/app", () => {
    for (const p of ["/public/sc-sete-basket/connexion", "/public/sc-sete-basket/auth/app"]) {
      pathname = p;
      const { container, unmount } = render(<InstallAppButton />);
      expect(container.querySelector("button")).toBeNull();
      unmount();
    }
  });
});
