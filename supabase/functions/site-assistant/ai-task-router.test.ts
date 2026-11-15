import { assertEquals } from "jsr:@std/assert@1";
import { resolveAiRoute } from "./ai-task-router.ts";

Deno.test("all task routes remain blocked until free-tier eligibility is verified", () => {
  for (const task of ["conversation", "summarization", "classification", "coding", "analysis"]) {
    assertEquals(resolveAiRoute(task, "test-secret"), null);
  }
});

Deno.test("unknown and multimodal task classes fail closed", () => {
  for (const task of ["image-generation", "audio", "vision", "deep-research", "provider", ""]) {
    assertEquals(resolveAiRoute(task, "test-secret"), null);
  }
});

Deno.test("task routing never resolves without a server-side key", () => {
  assertEquals(resolveAiRoute("analysis", ""), null);
  assertEquals(resolveAiRoute("coding", "   "), null);
});

Deno.test("browser-like object input cannot select a provider or model", () => {
  assertEquals(resolveAiRoute({ provider: "openrouter", model: "paid-model" }, "test-secret"), null);
});
