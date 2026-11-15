import { resolveAiProvider, type AiProviderConfig } from "./ai-provider-registry.ts";

/**
 * Internal task taxonomy. Browser input never supplies a provider or model.
 * These are text-only task classes supported by the currently configured model.
 */
export type AiTask =
  | "conversation"
  | "summarization"
  | "classification"
  | "coding"
  | "analysis";

export interface AiRoute {
  readonly task: AiTask;
  readonly provider: AiProviderConfig;
}

const SUPPORTED_TASKS: ReadonlySet<string> = new Set([
  "conversation",
  "summarization",
  "classification",
  "coding",
  "analysis",
]);

/**
 * Deliberately single-provider for now. A task route is not a promise of a
 * specialized model: it applies a trusted task class to the same verified
 * server-side provider until additional providers are independently approved.
 */
export function resolveAiRoute(task: unknown, apiKey: string): AiRoute | null {
  if (typeof task !== "string" || !SUPPORTED_TASKS.has(task)) return null;
  const provider = resolveAiProvider("gemini", apiKey);
  if (!provider) return null;
  return { task: task as AiTask, provider };
}
