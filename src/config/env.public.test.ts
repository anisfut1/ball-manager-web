import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "./env.public";

describe("parsePublicEnv", () => {
  it("accepte des valeurs valides", () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://xxxx.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_CLUB_MANAGER_API_URL: "https://api.example.com",
    });

    expect(env).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://xxxx.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_CLUB_MANAGER_API_URL: "https://api.example.com",
    });
  });

  it("accepte une URL localhost pour ball-manager-back (développement)", () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://xxxx.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_CLUB_MANAGER_API_URL: "http://localhost:3001",
    });

    expect(env.NEXT_PUBLIC_CLUB_MANAGER_API_URL).toBe("http://localhost:3001");
  });

  it("rejette une URL Supabase invalide", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "pas-une-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        NEXT_PUBLIC_CLUB_MANAGER_API_URL: "https://api.example.com",
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("rejette une clé anonyme manquante", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://xxxx.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        NEXT_PUBLIC_CLUB_MANAGER_API_URL: "https://api.example.com",
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("rejette une URL ball-manager-back manquante ou invalide", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://xxxx.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        NEXT_PUBLIC_CLUB_MANAGER_API_URL: "pas-une-url",
      }),
    ).toThrow(/NEXT_PUBLIC_CLUB_MANAGER_API_URL/);
  });

  it("rejette un environnement totalement vide", () => {
    expect(() => parsePublicEnv({})).toThrow();
  });
});
