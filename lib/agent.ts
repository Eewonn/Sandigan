import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";
import {
  TriageSchema,
  FinalAnswerSchema,
  type AgentResponse,
  type ChatTurn,
  NO_BASIS_SENTENCE,
} from "./types";
import { retrieve, buildContextBlock } from "./retrieval";
import { enforceAnswerPolicy } from "./guardrails";
import { languageInstruction, COPY } from "./i18n";
import { runEnrichment } from "./enrichment";

// ─── Config ───────────────────────────────────────────────────────────────────

const TRIAGE_MODEL = process.env.SANDIGAN_MODEL_TRIAGE ?? "llama-3.3-70b-versatile";
const ANSWER_MODEL = process.env.SANDIGAN_MODEL_ANSWER ?? "llama-3.3-70b-versatile";

const groqModel = (id: string) =>
  createGroq({ apiKey: process.env.GROQ_API_KEY })(id);

// ─── Error handling ───────────────────────────────────────────────────────────

function getErrorMessage(err: unknown, stage: "triage" | "answer"): string {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes("rate limit") || msg.includes("quota") || msg.includes("429"))
    return COPY.errorQuota;
  if (msg.includes("overload") || msg.includes("503") || msg.includes("502"))
    return COPY.errorOverloaded;
  if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized"))
    return COPY.errorAccess;
  if (msg.includes("zod") || msg.includes("parse") || msg.includes("schema"))
    return stage === "triage" ? COPY.errorSchemaTriage : COPY.errorSchemaAnswer;
  return stage === "triage" ? COPY.errorUnknownTriage : COPY.errorUnknownAnswer;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats recent chat history into a short text block for prompt injection. */
function conversationContext(history: ChatTurn[]): string {
  return history
    .slice(-6)
    .map((t) => {
      if (t.role === "user") return `User: ${t.content}`;
      const r = t.content;
      if (r.kind === "answer") return `Assistant: ${r.answer.summary}`;
      if (r.kind === "clarify") return `Assistant (clarifying): ${r.questions.join(" / ")}`;
      return null;
    })
    .filter(Boolean)
    .join("\n");
}

/** Maps a RetrievedSource to a plain Citation (without score). */
function toCitation(r: Awaited<ReturnType<typeof retrieve>>[number]) {
  return {
    id: r.id,
    lawName: r.lawName,
    section: r.section,
    title: r.title,
    url: r.url ?? null,
    updatedAt: r.updatedAt,
    quote: null,
  };
}

// ─── Stage 1: Triage ──────────────────────────────────────────────────────────

async function triage(message: string, history: ChatTurn[]) {
  const ctx = conversationContext(history);
  const { object } = await generateObject({
    model: groqModel(TRIAGE_MODEL),
    schema: TriageSchema,
    system: `You are Sandigan's triage assistant for Philippine labor rights.

Decide:
1. Is this on-topic? (wages, hours, leaves, termination, harassment, benefits, DOLE processes)
   Off-topic: criminal law, family law, civil disputes, immigration, taxes.
2. Do you need clarification, or can you answer? Prefer "answer" unless critical facts are missing.
3. Write a concise English reformulation of the query (used for semantic corpus search).
4. Detect the user's language: en, tl, or taglish.
5. Set riskLevel: high = illegal dismissal, long unpaid wages, or NLRC filing urgently needed.`,
    prompt: ctx ? `${ctx}\n\nNew message: ${message}` : message,
  });
  return object;
}

// ─── Stage 2: Retrieve + Answer ───────────────────────────────────────────────

async function answer(
  message: string,
  triageResult: z.infer<typeof TriageSchema>,
  history: ChatTurn[],
): Promise<AgentResponse> {
  const retrieved = await retrieve(triageResult.reformulatedQuery);
  if (retrieved.length === 0) {
    return { kind: "no-basis", message: NO_BASIS_SENTENCE, retrieved: [] };
  }

  const { text: enrichText, webSources } = await runEnrichment(message, triageResult.reformulatedQuery);
  const ctx = conversationContext(history);

  const enrichmentSection = enrichText
    ? `\n\nLIVE DATA (wages, calculations — treat as current; cite sources mentioned):\n${enrichText}`
    : "";

  const { object: raw } = await generateObject({
    model: groqModel(ANSWER_MODEL),
    schema: FinalAnswerSchema,
    system: `${languageInstruction(triageResult.language)}

You are Sandigan, a Philippine labor-rights assistant.
- Answer ONLY from the retrieved corpus. Do not invent legal articles.
- Cite only IDs that appear in the corpus block below.
- Every factual claim needs a citation.
- Provide at least 3 practical next steps relevant to the Philippines.
- Keep the summary ≤180 words.`,
    prompt:
      `${ctx ? `${ctx}\n\n` : ""}User concern: ${message}\n\n` +
      `RETRIEVED CORPUS:\n${buildContextBlock(retrieved)}${enrichmentSection}`,
  });

  const validated = enforceAnswerPolicy(raw);
  if (!validated) {
    return {
      kind: "no-basis",
      message: NO_BASIS_SENTENCE,
      retrieved: retrieved.map(toCitation),
    };
  }

  return {
    kind: "answer",
    answer: validated,
    retrieved: retrieved.map(toCitation),
    webSources,
  };
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function runAgent(
  message: string,
  history: ChatTurn[],
): Promise<AgentResponse> {
  if (!message.trim()) {
    return { kind: "error", message: COPY.emptyInput };
  }

  let triageResult: z.infer<typeof TriageSchema>;
  try {
    triageResult = await triage(message, history);
  } catch (err) {
    return { kind: "error", message: getErrorMessage(err, "triage") };
  }

  if (!triageResult.isOnTopic) {
    return { kind: "off-topic", message: COPY.offTopic };
  }

  if (triageResult.mode === "clarify") {
    return {
      kind: "clarify",
      questions: triageResult.clarifyingQuestions,
      note: COPY.clarifyNote,
      riskLevel: triageResult.riskLevel,
    };
  }

  try {
    return await answer(message, triageResult, history);
  } catch (err) {
    return { kind: "error", message: getErrorMessage(err, "answer") };
  }
}
