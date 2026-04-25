import { z } from "zod";

export const CitationSchema = z.object({
  id: z.string().describe("Stable source id from the corpus (e.g. 'labor-code-art-83')."),
  lawName: z.string().describe("Official law or issuance name, e.g. 'Labor Code of the Philippines'."),
  section: z.string().describe("Article, section, or rule reference, e.g. 'Article 83'."),
  title: z.string().describe("Short section title."),
  url: z.string().url().optional().nullable(),
  updatedAt: z.string().optional().nullable().describe("ISO date of last corpus update."),
  quote: z
    .string()
    .optional()
    .nullable()
    .describe("Short quoted or paraphrased portion supporting the point (<=280 chars)."),
});
export type Citation = z.infer<typeof CitationSchema>;

export const ChecklistItemSchema = z.object({
  step: z.string().describe("A single actionable step in the Philippine context."),
  priority: z.enum(["urgent", "recommended", "optional"]).default("recommended"),
  detail: z.string().optional().nullable().describe("Optional clarification of how to do the step."),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const EscalationSchema = z.object({
  required: z.boolean().describe("True if this case is high-risk and needs escalation."),
  agencies: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url().optional().nullable(),
        note: z.string().optional().nullable(),
      }),
    )
    .default([]),
  note: z.string().optional().nullable(),
});
export type Escalation = z.infer<typeof EscalationSchema>;

/**
 * User language detected from the conversation anchor turn.
 *   "en"      → pure English
 *   "tl"      → pure Tagalog / Filipino
 *   "taglish" → code-switched English + Tagalog (common in PH conversation)
 */
export const LanguageSchema = z.enum(["en", "tl", "taglish"]);
export type Language = z.infer<typeof LanguageSchema>;

export const TriageSchema = z.object({
  mode: z.enum(["clarify", "answer"]),
  clarifyingQuestions: z.array(z.string()).default([]),
  reformulatedQuery: z
    .string()
    .describe(
      "A concise restatement of the labor concern used for retrieval. ALWAYS in English — keyword search against an English legal corpus.",
    ),
  riskLevel: z.enum(["low", "moderate", "high"]).default("low"),
  isOnTopic: z
    .boolean()
    .describe("True if the concern falls within Philippine labor rights scope."),
  language: LanguageSchema.default("en").describe(
    'Language the user wrote in. "en" for English, "tl" for pure Tagalog/Filipino, "taglish" for code-switched.',
  ),
});
export type Triage = z.infer<typeof TriageSchema>;

export const FinalAnswerSchema = z.object({
  summary: z
    .string()
    .describe(
      "Explanation grounded strictly in the retrieved context, written in the SAME language the user used. <=180 words.",
    ),
  assumptions: z
    .array(z.string())
    .default([])
    .describe("Assumptions made when facts were partial."),
  citations: z
    .array(CitationSchema)
    .describe(
      "Citations supporting every factual legal claim. MUST be non-empty for a real answer; MUST be empty for the no-basis response.",
    ),
  checklist: z
    .array(ChecklistItemSchema)
    .describe(
      "Practical Philippine next steps. At least 3 items for real answers; empty for no-basis responses.",
    ),
  escalation: EscalationSchema,
  confidence: z.enum(["low", "medium", "high"]),
  disclaimer: z.string(),
});
export type FinalAnswer = z.infer<typeof FinalAnswerSchema>;

export type WebSource = {
  title: string;
  url: string;
};

export type AgentResponse =
  | {
      kind: "clarify";
      questions: string[];
      note?: string;
      riskLevel: "low" | "moderate" | "high";
    }
  | {
      kind: "answer";
      answer: FinalAnswer;
      retrieved: Citation[];
      webSources: WebSource[];
    }
  | {
      kind: "no-basis";
      message: string;
      retrieved: Citation[];
    }
  | {
      kind: "off-topic";
      message: string;
    }
  | {
      kind: "error";
      message: string;
    };

export type ChatTurn =
  | { role: "user"; content: string; id: string }
  | { role: "assistant"; content: AgentResponse; id: string };

export const NO_BASIS_SENTENCE =
  "I cannot find a reliable legal basis for this in the current sources.";

export const DEFAULT_DISCLAIMER =
  "Sandigan provides informational guidance only and is not a substitute for legal advice. For case-specific counsel, consult a lawyer or contact an accredited legal aid organization.";
