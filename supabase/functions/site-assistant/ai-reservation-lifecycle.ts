/**
 * Pure lifecycle rules for a future durable AI quota ledger.
 * Persistence and atomicity belong in a database transaction/RPC, not here.
 */
export type AiReservationState = "reserved" | "settled" | "released" | "rejected";

export interface AiReservation {
  requestId: string;
  providerId: string;
  modelId: string;
  state: AiReservationState;
  reservedAt: string;
  settledAt: string | null;
  providerAttempted: boolean;
}

export type ReservationTransition =
  | { ok: true; reservation: AiReservation }
  | { ok: false; reason: "unknown_request" | "already_final" | "invalid_transition" };

export function markProviderAttempted(
  reservation: AiReservation,
): ReservationTransition {
  if (reservation.state !== "reserved") {
    return { ok: false, reason: "already_final" };
  }
  return {
    ok: true,
    reservation: { ...reservation, providerAttempted: true },
  };
}

export function settleReservation(
  reservation: AiReservation,
  settledAt: string,
): ReservationTransition {
  if (reservation.state !== "reserved") {
    return { ok: false, reason: "already_final" };
  }
  return {
    ok: true,
    reservation: { ...reservation, state: "settled", settledAt },
  };
}

export function releaseReservation(
  reservation: AiReservation,
  settledAt: string,
): ReservationTransition {
  if (reservation.state !== "reserved") {
    return { ok: false, reason: "already_final" };
  }
  if (reservation.providerAttempted) {
    return { ok: false, reason: "invalid_transition" };
  }
  return {
    ok: true,
    reservation: { ...reservation, state: "released", settledAt },
  };
}

/**
 * Idempotency key contract: one stable request ID per logical assistant call.
 * A DB unique constraint on (provider_id, request_id) must enforce this across
 * concurrent workers; this pure helper only validates the key shape.
 */
export function isValidAiRequestId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(value);
}
