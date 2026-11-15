import { assertEquals } from "jsr:@std/assert@1";
import { resolveAiProvider } from "./ai-provider-registry.ts";
import { generateWithGemini } from "./gemini-adapter.ts";

const provider = resolveAiProvider("gemini", "test-secret")!;

Deno.test("Gemini adapter sends only the resolved server configuration", async () => {
  let seenUrl = "";
  let seenKey = "";
  let seenBody: Record<string, unknown> = {};
  const fakeFetch: typeof fetch = async (input, init) => {
    seenUrl = String(input);
    seenKey = new Headers(init?.headers).get("x-goog-api-key") ?? "";
    seenBody = JSON.parse(String(init?.body));
    return Response.json({
      candidates: [{ content: { parts: [{ text: "مرحبا" }, { text: " بك" }] } }],
      usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 3, totalTokenCount: 11 },
    });
  };
  const result = await generateWithGemini(
    provider,
    [{ role: "user", parts: [{ text: "اختبار" }] }],
    "تعليمات اختبار",
    fakeFetch,
  );
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.answer, "مرحبا بك");
    assertEquals(result.usage, { promptTokenCount: 8, candidatesTokenCount: 3, totalTokenCount: 11 });
    assertEquals(result.latencyMs >= 0, true);
  }
  assertEquals(seenUrl, provider.endpoint);
  assertEquals(seenKey, "test-secret");
  assertEquals((seenBody.contents as unknown[]).length, 1);
  assertEquals((seenBody.systemInstruction as { parts: { text: string }[] }).parts[0].text, "تعليمات اختبار");
});

Deno.test("Gemini quota errors are classified without reading provider error payloads", async () => {
  const fakeFetch: typeof fetch = async () => new Response("private provider detail", { status: 429 });
  const result = await generateWithGemini(provider, [{ role: "user", parts: [{ text: "x" }] }], "system", fakeFetch);
  assertEquals(result.ok, false);
  if (!result.ok) { assertEquals(result.status, 429); assertEquals(result.kind, "quota"); }
});

Deno.test("Gemini server errors are classified as transient", async () => {
  const fakeFetch: typeof fetch = async () => new Response("provider detail", { status: 503 });
  const result = await generateWithGemini(provider, [{ role: "user", parts: [{ text: "x" }] }], "system", fakeFetch);
  assertEquals(result.ok, false);
  if (!result.ok) { assertEquals(result.status, 503); assertEquals(result.kind, "transient"); }
});

Deno.test("malformed successful responses do not become empty assistant messages", async () => {
  const fakeFetch: typeof fetch = async () => Response.json({ candidates: [] });
  const result = await generateWithGemini(provider, [{ role: "user", parts: [{ text: "x" }] }], "system", fakeFetch);
  assertEquals(result.ok, false);
  if (!result.ok) { assertEquals(result.status, 200); assertEquals(result.kind, "empty"); }
});

Deno.test("Gemini adapter distinguishes a request timeout", async () => {
  const fakeFetch: typeof fetch = async () => {
    throw new DOMException("deadline exceeded", "TimeoutError");
  };
  const result = await generateWithGemini(provider, [{ role: "user", parts: [{ text: "x" }] }], "system", fakeFetch);
  assertEquals(result.ok, false);
  if (!result.ok) { assertEquals(result.status, 0); assertEquals(result.kind, "timeout"); }
});

Deno.test("Gemini adapter treats network failures as transient", async () => {
  const fakeFetch: typeof fetch = async () => {
    throw new TypeError("network unavailable");
  };
  const result = await generateWithGemini(provider, [{ role: "user", parts: [{ text: "x" }] }], "system", fakeFetch);
  assertEquals(result.ok, false);
  if (!result.ok) { assertEquals(result.status, 0); assertEquals(result.kind, "transient"); }
});
