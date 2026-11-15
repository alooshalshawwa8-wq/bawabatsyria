import { assertEquals } from "jsr:@std/assert@1";
import {
  isValidAiRequestId,
  markProviderAttempted,
  releaseReservation,
  settleReservation,
} from "./ai-reservation-lifecycle.ts";

const initial = {
  requestId: "req-20261115-000001",
  providerId: "gemini",
  modelId: "gemini-3.5-flash-lite",
  state: "reserved" as const,
  reservedAt: "2026-11-15T10:00:00.000Z",
  settledAt: null,
  providerAttempted: false,
};

Deno.test("pre-provider validation failure can release a reservation", () => {
  const result = releaseReservation(initial, "2026-11-15T10:00:01.000Z");
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.reservation.state, "released");
});

Deno.test("reservation cannot be released after provider attempt", () => {
  const attempted = markProviderAttempted(initial);
  if (!attempted.ok) throw new Error("expected attempt transition");
  const result = releaseReservation(attempted.reservation, "2026-11-15T10:00:02.000Z");
  assertEquals(result, { ok: false, reason: "invalid_transition" });
});

Deno.test("settlement is final and cannot be repeated", () => {
  const first = settleReservation(initial, "2026-11-15T10:00:03.000Z");
  if (!first.ok) throw new Error("expected settlement");
  const second = settleReservation(first.reservation, "2026-11-15T10:00:04.000Z");
  assertEquals(second, { ok: false, reason: "already_final" });
});

Deno.test("request ID must be stable and bounded", () => {
  assertEquals(isValidAiRequestId("req-20261115-000001"), true);
  assertEquals(isValidAiRequestId("short"), false);
  assertEquals(isValidAiRequestId("contains spaces"), false);
});
