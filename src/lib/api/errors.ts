import type { components } from "./generated/schema";

type ErrorEnvelope = components["schemas"]["ErrorEnvelope"];

/**
 * Erreur typée pour toute réponse ball-manager-back non 2xx, ou pour un
 * échec réseau/parsing (§7/§46 de la demande : 401/403/404/422/429/5xx
 * traités de façon centralisée par le code appelant via `status`/`code`).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  /** `error.details` de l'enveloppe (ex. `requestId` d'une demande déjà active, conflits de créneau). */
  readonly details: Record<string, unknown> | null;

  constructor(status: number, code: string, message: string, details: Record<string, unknown> | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/** Levée quand ball-manager-back est injoignable (réseau coupé, DNS, timeout...) — jamais confondue avec une erreur applicative (§44 de la demande). */
export class ApiUnreachableError extends Error {
  constructor(cause: unknown) {
    super("Service temporairement indisponible.");
    this.name = "ApiUnreachableError";
    this.cause = cause;
  }
}

export async function toApiError(response: Response): Promise<ApiError> {
  let body: ErrorEnvelope | null = null;

  try {
    body = (await response.json()) as ErrorEnvelope;
  } catch {
    // Réponse non-JSON (ex: gateway en panne) : pas d'échec silencieux, on
    // retombe sur un message générique plutôt que de propager l'erreur de
    // parsing brute.
  }

  return new ApiError(response.status, body?.error.code ?? "UNKNOWN_ERROR", body?.error.message ?? `Erreur HTTP ${response.status}`, (body?.error.details as Record<string, unknown> | undefined) ?? null);
}
