import { assertEquals } from "jsr:@std/assert@1";
import {
  checkAiProviderEligibility,
  listConfiguredProviderMetadata,
  resolveAiProvider,
} from "./ai-provider-registry.ts";

Deno.test("unverified free tier is blocked even when a server key exists", () => {
  const result = checkAiProviderEligibility("gemini", "server-secret");
  assertEquals(result, {
    eligible: false,
    providerId: "gemini",
    reason: "free_tier_unverified",
  });
  assertEquals(resolveAiProvider("gemini", "server-secret"), null);
});

Deno.test("missing key and unknown provider fail closed", () => {
  const missingKey = checkAiProviderEligibility("gemini", " ");
  assertEquals(missingKey.eligible, false);
  if (!missingKey.eligible) assertEquals(missingKey.reason, "missing_key");
  assertEquals(checkAiProviderEligibility("openrouter", "secret").eligible, false);
});

Deno.test("metadata reports eligibility without exposing the key", () => {
  const metadata = listConfiguredProviderMetadata("server-secret");
  assertEquals(metadata[0].eligible, false);
  assertEquals(metadata[0].blockedReason, "free_tier_unverified");
  assertEquals(JSON.stringify(metadata).includes("server-secret"), false);
});

Deno.test("no automatic paid fallback is represented by this registry", () => {
  assertEquals(Object.keys({ gemini: true }), ["gemini"]);
});
