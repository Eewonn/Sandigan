import { DEFAULT_DISCLAIMER, type Citation, type FinalAnswer } from "./types";
import { getSourceById } from "./retrieval";

const MAX_QUOTE_LEN = 280;

/**
 * Strip any citation the model invented that doesn't resolve to a real corpus
 * entry. Also re-injects canonical metadata (URL, section number) so the model
 * can never hallucinate those fields.
 */
export function sanitizeCitations(modelCitations: Citation[]): Citation[] {
  const seen = new Set<string>();
  const valid: Citation[] = [];

  for (const c of modelCitations ?? []) {
    if (!c?.id || seen.has(c.id)) continue;

    const canonical = getSourceById(c.id);
    if (!canonical) continue; // model made up an id that doesn't exist

    valid.push({
      id: canonical.id,
      lawName: canonical.lawName,
      section: canonical.section,
      title: canonical.title,
      url: canonical.url ?? null,
      updatedAt: canonical.updatedAt,
      // Keep the model's quote but cap length and strip whitespace.
      quote:
        typeof c.quote === "string" && c.quote.trim().length > 0
          ? c.quote.trim().slice(0, MAX_QUOTE_LEN)
          : null,
    });

    seen.add(c.id);
  }

  return valid;
}

/**
 * Final policy check before the answer reaches the user.
 * Returns null if the answer is missing citations or checklist steps —
 * the agent treats null as a no-basis response.
 */
export function enforceAnswerPolicy(
  raw: FinalAnswer,
): FinalAnswer | null {
  const citations = sanitizeCitations(raw.citations ?? []);
  if (citations.length === 0) return null;

  const checklist = (raw.checklist ?? []).filter(
    (item) => typeof item.step === "string" && item.step.trim().length > 0,
  );
  if (checklist.length === 0) return null;

  const summary = (raw.summary ?? "").trim();
  if (summary.length === 0) return null;

  return {
    summary,
    assumptions: raw.assumptions ?? [],
    citations,
    checklist,
    escalation: raw.escalation ?? { required: false, agencies: [], note: null },
    confidence: raw.confidence ?? "medium",
    disclaimer:
      raw.disclaimer?.trim().length > 0 ? raw.disclaimer : DEFAULT_DISCLAIMER,
  };
}
