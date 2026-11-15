import { assertEquals } from "jsr:@std/assert@1";
import { GEMINI_QUOTA_POLICY, normalizeAiUsageEvent } from "./ai-usage-contract.ts";

Deno.test("usage contract normalizes provider token counts without inventing cost", () => {
  const event = normalizeAiUsageEvent({
    providerId: "gemini",
    modelId: "gemini-3.5-flash-lite",
    task: "conversation",
    status: "success",
    latencyMs: 123.6,
    usage: { promptTokenCount: 11, candidatesTokenCount: 7, totalTokenCount: 18 },
    observedAt: "2026-11-15T00:00:00.000Z",
  });
  assertEquals(event.inputTokens, 11);
  assertEquals(event.outputTokens, 7);
  assertEquals(event.totalTokens, 18);
  assertEquals(event.latencyMs, 124);
  assertEquals(event.costUsd, null);
});

Deno.test("missing or invalid provider usage stays unknown", () => {
  const event = normalizeAiUsageEvent({
    providerId: "gemini", modelId: "model", task: "analysis",
    status: "failed", latencyMs: -5,
    usage: { promptTokenCount: -1, candidatesTokenCount: "7" },
    observedAt: "2026-11-15T00:00:00.000Z",
  });
  assertEquals(event.inputTokens, null);
  assertEquals(event.outputTokens, null);
  assertEquals(event.totalTokens, null);
  assertEquals(event.latencyMs, 0);
  assertEquals(event.costUsd, null);
});

Deno.test("free-only policy explicitly forbids paid fallback", () => {
  assertEquals(GEMINI_QUOTA_POLICY.freeOnly, true);
  assertEquals(GEMINI_QUOTA_POLICY.allowPaidFallback, false);
  assertEquals(GEMINI_QUOTA_POLICY.dailyRequestLimit, 30);
  assertEquals(GEMINI_QUOTA_POLICY.minuteRequestLimit, 5);
});
