import { publicFetch } from "./publicTokenTransport";
import type { PushSubscriptionPayload } from "@/lib/push/client";

/**
 * CONTRAT PROPOSÉ pour ball-manager-back (Web Push, voir docs/PWA_PUSH.md) —
 * ces endpoints n'existent pas encore : aucun composant n'appelle ces fonctions
 * tant que `pushEnabled()` est faux. Authentification = jeton personnel du
 * licencié (même transport que le reste de l'espace public) ; l'abonnement est
 * rattaché au licencié ET au club.
 */
export type PushTopic = "convocations" | "match-changes" | "training-changes" | "match-reminders" | "club-news";

export interface PushDeviceDto {
  id: string;
  deviceLabel: string;
  createdAt: string;
  lastSeenAt: string | null;
  topics: PushTopic[];
}

const base = (clubSlug: string) => `/v1/public/clubs/${encodeURIComponent(clubSlug)}/push-subscriptions`;

export const publicPush = {
  list: (clubSlug: string, token: string) => publicFetch<{ devices: PushDeviceDto[] }>(base(clubSlug), token),
  register: (clubSlug: string, token: string, subscription: PushSubscriptionPayload, topics: PushTopic[]) =>
    publicFetch<PushDeviceDto>(base(clubSlug), token, { method: "POST", body: { ...subscription, topics } }),
  remove: (clubSlug: string, token: string, deviceId: string) => publicFetch<void>(`${base(clubSlug)}/${encodeURIComponent(deviceId)}`, token, { method: "DELETE" }),
};
