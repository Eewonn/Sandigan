/**
 * Server-side strings and language helpers.
 *
 * Language detection is left to the triage model — it returns a `language`
 * field in TriageSchema. This file handles:
 *
 *   1. English error/UI strings shown server-side.
 *   2. A language instruction injected into the answer prompt so the model
 *      writes in the same language the user used.
 */

export const COPY = {
  emptyInput: "Please enter a labor-rights question to get started.",
  offTopic:
    "Sandigan focuses on Philippine labor rights (wages, hours, leaves, termination, harassment, benefits). For other legal concerns, please consult a qualified lawyer or the Public Attorney's Office.",
  clarifyNote: "Tell me a bit more so I can ground the answer properly.",
  noBasis:
    "I cannot find a reliable legal basis for this in the current sources.",
  errorQuota:
    "Sandigan's daily free-tier quota is exhausted. Please try again tomorrow.",
  errorOverloaded:
    "Sandigan's AI providers are under heavy load right now. Please try again in a minute.",
  errorAccess:
    "Sandigan's AI provider credentials look misconfigured. Please check server logs.",
  errorSchemaAnswer:
    "Sandigan couldn't produce a properly-structured answer. Please try rephrasing.",
  errorSchemaTriage:
    "Sandigan had trouble understanding that. Please try rephrasing.",
  errorUnknownAnswer:
    "Sandigan couldn't produce a grounded answer just now. Please try again.",
  errorUnknownTriage:
    "Sandigan had trouble understanding that. Please try rephrasing.",
  disclaimer:
    "Sandigan provides informational guidance only and is not a substitute for legal advice. For case-specific counsel, consult a lawyer or contact an accredited legal aid organization.",
};

/**
 * Injected at the top of the answer prompt so the model writes the response
 * in the same language as the user — English, Tagalog, or Taglish.
 * Legal terms of art stay in their original form regardless of language.
 */
export function languageInstruction(detectedLanguage: string): string {
  return (
    `Write your ENTIRE response (summary, assumptions, checklist, escalation note, disclaimer) ` +
    `in the same language the user wrote in: ${detectedLanguage}. ` +
    `Keep all legal terms of art ("Article 297", "Labor Code", "DOLE", "NLRC", "SENA", "PAO") ` +
    `in their original English form regardless of language.`
  );
}
