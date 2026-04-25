/**
 * Enrichment stage — runs between retrieval and the answer step.
 *
 * Uses a small Groq call with tools so the model can decide whether to:
 *   - Search Tavily for live wage data or recent DOLE advisories
 *   - Calculate separation pay or 13th month pay from the user's figures
 *
 * Silently degrades to empty output on any error so the main pipeline always continues.
 */

import { createGroq } from "@ai-sdk/groq";
import { generateText, stepCountIs } from "ai";
import type { WebSource } from "./types";
import { searchLaborInfo, calculateSeparationPay, calculate13thMonth } from "./tools";

const ENRICHMENT_MODEL =
  process.env.SANDIGAN_MODEL_ENRICHMENT ??
  process.env.SANDIGAN_MODEL_ANSWER ??
  "llama-3.3-70b-versatile";

export type EnrichmentResult = { text: string; webSources: WebSource[] };

export async function runEnrichment(
  userQuery: string,
  reformulatedQuery: string,
): Promise<EnrichmentResult> {
  try {
    const result = await generateText({
      model: createGroq({ apiKey: process.env.GROQ_API_KEY })(ENRICHMENT_MODEL),
      system: `You are the data-enrichment layer of Sandigan, a Philippine labor rights navigator.

Call 0–2 tools if doing so would meaningfully improve the answer. Otherwise output an empty string.

- searchLaborInfo: current minimum wages, recent DOLE advisories, new wage orders, updated SSS/PhilHealth rates.
- calculateSeparationPay: when the worker was terminated and their salary and years of service are in the question.
- calculate13thMonth: when the worker mentions their salary and asks about 13th month pay.

After any tool calls, write a concise English note (2–3 sentences) with the fetched or computed values and their source.
If no tool is relevant, output nothing.`,
      prompt: `Worker's question: "${userQuery}"\nReformulated query: "${reformulatedQuery}"`,
      tools: { searchLaborInfo, calculateSeparationPay, calculate13thMonth },
      stopWhen: stepCountIs(2),
      maxRetries: 0,
    });

    // Extract web URLs from Tavily tool results for the UI to cite
    const webSources: WebSource[] = [];
    const seen = new Set<string>();

    for (const step of result.steps) {
      for (const tr of step.toolResults) {
        const out = tr.output as Record<string, unknown>;
        if (Array.isArray(out?.results)) {
          for (const r of out.results as { title?: string; url?: string }[]) {
            if (r.url && r.title && !seen.has(r.url)) {
              seen.add(r.url);
              webSources.push({ title: r.title, url: r.url });
            }
          }
        }
      }
    }

    return { text: result.text.trim(), webSources };
  } catch {
    // Enrichment is optional — any failure is non-fatal
    return { text: "", webSources: [] };
  }
}
