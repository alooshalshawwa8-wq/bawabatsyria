import type { AiProviderConfig } from "./ai-provider-registry.ts";

export type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

export type GeminiResult =
  | { ok: true; answer: string }
  | { ok: false; status: number; kind: "quota" | "transient" | "provider" | "empty" | "timeout" };

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
    return { ok: false, status: 0, kind: timedOut ? "timeout" : "transient" };
  }

  if (!response.ok) {
    if (response.status === 429) return { ok: false, status: 429, kind: "quota" };
    if (response.status >= 500) return { ok: false, status: response.status, kind: "transient" };
    return { ok: false, status: response.status, kind: "provider" };
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

  if (!answer) return { ok: false, status: response.status, kind: "empty" };
  return { ok: true, answer };
}
