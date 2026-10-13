"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { EmptyState } from "@/components/ui/States";
import { Switch } from "@/components/ui/Switch";
import { Toast } from "@/components/ui/Toast";
import { browserApi } from "@/lib/api/browserClient";
import { ApiError } from "@/lib/api/client";
import type { ClubVenueAdminDto } from "@/lib/api/members";

/** Gymnases actifs = proposés dans le planning des demandes de dérogation. Tout passe par ball-manager-back. */
export function VenuesManager({ clubId, clubSlug, initialVenues }: { clubId: string; clubSlug: string; initialVenues: ClubVenueAdminDto[] }) {
  const [venues, setVenues] = useState(initialVenues);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function toggleVenue(venue: ClubVenueAdminDto, active: boolean) {
    setError(null);
    try {
      const updated = await browserApi.members.updateVenue(clubId, venue.id, { active });
      setVenues((list) => list.map((v) => (v.id === updated.id ? updated : v)));
      setToast(`${updated.name} : ${updated.active ? "proposé" : "masqué"} dans le planning des dérogations.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Modification impossible pour le moment.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {toast ? <Toast message={toast} /> : null}
      {error ? (
        <Notice tone="danger" live>
          {error}
        </Notice>
      ) : null}
      {venues.length === 0 ? (
        <EmptyState compact icon={<MapPin />} title="Aucun gymnase" description="Les gymnases apparaîtront après la synchronisation FFBB des matchs à domicile." />
      ) : (
        <Card className="flex flex-col divide-y divide-border py-1">
          {venues.map((v) => (
            <div key={v.id} className="py-1.5">
              <Switch checked={v.active} onChange={(next) => toggleVenue(v, next)} label={v.name} description={v.address ?? (v.active ? "Proposé dans le planning" : "Masqué du planning")} />
            </div>
          ))}
        </Card>
      )}
      <p className="type-meta">
        Coachs et coordinateur se désignent depuis la{" "}
        <Link href={`/c/${clubSlug}/joueurs`} className="font-medium text-accent-text underline-offset-2 hover:underline">
          liste des joueurs
        </Link>
        .
      </p>
    </div>
  );
}
