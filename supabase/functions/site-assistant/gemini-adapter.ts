import type { AiProviderConfig } from "./ai-provider-registry.ts";

export type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

export type GeminiResult =
  | { ok: true; answer: string; latencyMs: number; usage: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | null }
  | { ok: false; status: number; kind: "quota" | "transient" | "provider" | "empty" | "timeout"; latencyMs: number };

/**
 * Isolated Gemini transport adapter.
 * Accepts only server-resolved configuration; never accepts a URL or key from
 * browser-controlled request data. Provider response bodies are not logged.
 */
export async function generateWithGemini(
  provider: AiProviderConfig,
  contents: GeminiContent[],
  systemInstruction: string,
  fetcher: typeof fetch = fetch,
): Promise<GeminiResult> {
  const startedAt = performance.now();
  const elapsed = () => Math.max(0, Math.round(performance.now() - startedAt));
  let response: Response;
  try {
    response = await fetcher(provider.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": provider.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { temperature: 0.65, maxOutputTokens: 850 },
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return { ok: false, status: 0, kind: timedOut ? "timeout" : "transient", latencyMs: elapsed() };
  }

  if (!response.ok) {
    if (response.status === 429) return { ok: false, status: 429, kind: "quota", latencyMs: elapsed() };
    if (response.status >= 500) return { ok: false, status: response.status, kind: "transient", latencyMs: elapsed() };
    return { ok: false, status: response.status, kind: "provider", latencyMs: elapsed() };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { ok: false, status: response.status, kind: "provider" };
  }

  const answer = (data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  })?.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("").trim();

  if (!answer) return { ok: false, status: response.status, kind: "empty", latencyMs: elapsed() };
  const usageMetadata = (data as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } }).usageMetadata;
  return {
    ok: true,
    answer,
    latencyMs: elapsed(),
    usage: usageMetadata ? {
      promptTokenCount: usageMetadata.promptTokenCount,
      candidatesTokenCount: usageMetadata.candidatesTokenCount,
      totalTokenCount: usageMetadata.totalTokenCount,
    } : null,
  };
}
