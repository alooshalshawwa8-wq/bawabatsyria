import { assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import { listConfiguredProviderMetadata, resolveAiProvider } from "./ai-provider-registry.ts";

Deno.test("only the approved Gemini provider can be resolved", () => {
  assertNotEquals(resolveAiProvider("gemini", "server-secret"), null);
  assertEquals(resolveAiProvider("openrouter", "server-secret"), null);
  assertEquals(resolveAiProvider("groq", "server-secret"), null);
  assertEquals(resolveAiProvider("cloudflare", "server-secret"), null);
  assertEquals(resolveAiProvider("https://attacker.example", "server-secret"), null);
  assertEquals(resolveAiProvider("gemini", ""), null);
});

Deno.test("registry metadata never exposes provider credentials", () => {
  const metadata = listConfiguredProviderMetadata("super-secret-value");
  assertEquals(metadata.length, 1);
  assertEquals(metadata[0].id, "gemini");
  assertEquals(metadata[0].pricingStatus, "free-tier-unverified");
  assertEquals("apiKey" in metadata[0], false);
  assertEquals(listConfiguredProviderMetadata("").length, 0);
});
