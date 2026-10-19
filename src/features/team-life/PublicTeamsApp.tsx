"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Megaphone, Shirt } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { LicensedAccessGate } from "@/features/licensed-access/LicensedAccessGate";
import { usePublicIdentity } from "@/features/public/PublicIdentityProvider";
import { getPublicHome } from "@/lib/api/publicHome";
import { getDeviceTokens } from "@/lib/publicToken";

interface MyTeam {
  id: string;
  name: string;
  coach: boolean;
  /** Prénoms concernés sur l'appareil (« Lina, Hugo ») quand il y a plusieurs personnes. */
  who: string[];
}

/** Équipes des personnes de l'appareil, équipes coachées d'abord. Une seule → page de l'équipe directement. */
export function collectTeams(homes: { licencie: { firstName: string }; teams: { id: string; name: string; relation: string }[] }[]): MyTeam[] {
  const byId = new Map<string, MyTeam>();
  for (const home of homes) {
    for (const t of home.teams) {
      const current = byId.get(t.id) ?? { id: t.id, name: t.name, coach: false, who: [] };
      if (t.relation === "COACH") current.coach = true;
      if (!current.who.includes(home.licencie.firstName)) current.who.push(home.licencie.firstName);
      byId.set(t.id, current);
    }
  }
  return [...byId.values()].sort((a, b) => Number(b.coach) - Number(a.coach) || a.name.localeCompare(b.name, "fr", { numeric: true }));
}

/** Onglet « Équipe » de la barre du bas (retour du club, 2026-10-10). */
export function PublicTeamsApp({ clubSlug, clubName }: { clubSlug: string; clubName: string }) {
  const { identity } = usePublicIdentity();
  const router = useRouter();
  const token = identity?.token;
  const [state, setState] = useState<{ teams: MyTeam[] | null; error: string | null }>({ teams: null, error: null });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const tokens = [...new Set([token, ...getDeviceTokens(clubSlug)])];
    // Un lien invalide de l'appareil n'empêche pas d'afficher les autres équipes.
    Promise.allSettled(tokens.map((t) => getPublicHome(clubSlug, t))).then((results) => {
      if (cancelled) return;
      const homes = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      if (!homes.length) return setState({ teams: null, error: "Impossible de charger tes équipes." });
      const teams = collectTeams(homes);
      if (teams.length === 1) router.replace(`/public/${clubSlug}/equipes/${teams[0]!.id}`);
      setState({ teams, error: null });
    });
    return () => {
      cancelled = true;
    };
  }, [clubSlug, router, token]);

  if (identity === undefined) return <ListSkeleton rows={4} />;
  if (identity === null) return <LicensedAccessGate module="team" />;
  if (state.error) return <ErrorState title="Équipes indisponibles" description={state.error} />;
  if (!state.teams || state.teams.length === 1) return <ListSkeleton rows={4} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={clubName} title="Mes équipes" description="Prochain match, entraînements et effectif." />
      {state.teams.length === 0 ? (
        <EmptyState title="Aucune équipe" description="Aucune équipe n'est encore associée à ton profil. Préviens le club." />
      ) : (
        <ul className="flex flex-col gap-2">
          {state.teams.map((t) => (
            <li key={t.id}>
              <Link href={`/public/${clubSlug}/equipes/${t.id}`} className="flex min-h-14 items-center gap-3 rounded-[14px] border border-border bg-surface-raised px-4 py-3 shadow-1 transition-colors hover:bg-surface-muted [&_svg]:size-4">
                {t.coach ? <Megaphone aria-hidden className="text-info" /> : <Shirt aria-hidden className="text-accent-text" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-foreground">{t.name}</span>
                  <span className="type-meta block truncate">{t.coach ? "Tu coaches cette équipe" : t.who.join(", ")}</span>
                </span>
                <ChevronRight aria-hidden className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
