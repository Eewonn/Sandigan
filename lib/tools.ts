/**
 * AI SDK tools for Sandigan's enrichment stage.
 *
 * - searchLaborInfo: Tavily web search for live wage data and DOLE advisories
 * - calculateSeparationPay: deterministic separation pay calculator (Labor Code)
 * - calculate13thMonth: deterministic 13th month pay calculator (PD 851)
 */

import { tool } from "ai";
import { z } from "zod";

// ─── Tavily search ────────────────────────────────────────────────────────────

type TavilyResult = { title: string; url: string; content: string };

async function tavilySearch(query: string, maxResults = 5): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY not configured");

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_domains: [
        "dole.gov.ph",
        "nwpc.dole.gov.ph",
        "nlrc.dole.gov.ph",
        "officialgazette.gov.ph",
        "bwc.dole.gov.ph",
      ],
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`Tavily responded ${res.status}`);

  const data = (await res.json()) as { results?: TavilyResult[] };
  return data.results ?? [];
}

// ─── Tool: searchLaborInfo ────────────────────────────────────────────────────

export const searchLaborInfo = tool({
  description:
    "Search the web for current Philippine labor information: minimum wage rates, " +
    "recent DOLE advisories, new wage orders, or updated agency procedures. " +
    "Use when the query involves wages, recent legal changes, or current agency rates.",
  inputSchema: z.object({
    query: z.string().describe(
      "English search query, e.g. 'current minimum wage NCR Philippines 2025', " +
      "'DOLE Department Order remote work 2024', 'SSS contribution rate 2025'",
    ),
  }),
  execute: async ({ query }) => {
    try {
      const results = await tavilySearch(query, 5);
      return {
        results: results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })),
        note: "Cite the URL when using these results in the answer.",
      };
    } catch {
      return {
        results: [] as { title: string; url: string; snippet: string }[],
        note: "Web search unavailable. Rely on the retrieved corpus and direct workers to nwpc.dole.gov.ph.",
      };
    }
  },
});

// ─── Tool: calculateSeparationPay ─────────────────────────────────────────────

const SEPARATION_TYPES = [
  "authorized_cause_retrenchment",
  "authorized_cause_redundancy",
  "authorized_cause_closure",
  "authorized_cause_disease",
  "illegal_dismissal_lieu_of_reinstatement",
] as const;

export const calculateSeparationPay = tool({
  description:
    "Calculate separation pay owed to a Filipino worker based on years of service, " +
    "monthly salary, and type of termination. Use when the worker asks what separation pay they are owed.",
  inputSchema: z.object({
    yearsOfService: z.number().positive().describe("Total years served, including fractions (e.g. 2.5)."),
    monthlySalary: z.number().positive().describe("Latest basic monthly salary in Philippine pesos."),
    terminationType: z
      .enum(SEPARATION_TYPES)
      .describe(
        "authorized_cause_retrenchment/closure/disease = ½ month/year (Art. 298–299), " +
        "authorized_cause_redundancy = 1 month/year (Art. 298), " +
        "illegal_dismissal_lieu_of_reinstatement = 1 month/year (Art. 294).",
      ),
  }),
  execute: async ({ yearsOfService, monthlySalary, terminationType }) => {
    const years = Math.ceil(yearsOfService);
    const ratePerYear = terminationType === "authorized_cause_redundancy" ||
      terminationType === "illegal_dismissal_lieu_of_reinstatement" ? 1 : 0.5;

    const legalBasis =
      terminationType === "illegal_dismissal_lieu_of_reinstatement"
        ? "Article 294, Labor Code"
        : terminationType === "authorized_cause_disease"
        ? "Article 299, Labor Code"
        : "Article 298, Labor Code";

    const computed = ratePerYear * years * monthlySalary;
    const amount = Math.max(computed, monthlySalary); // minimum: 1 month salary

    return {
      yearsOfService: years,
      monthlySalary,
      terminationType,
      formula: `${ratePerYear === 0.5 ? "½" : "1"} month × ${years} yr${years !== 1 ? "s" : ""} = ₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
      amount,
      legalBasis,
      note: "Minimum is 1 month salary regardless of years served. Check CBA or contract for higher rates.",
    };
  },
});

// ─── Tool: calculate13thMonth ─────────────────────────────────────────────────

export const calculate13thMonth = tool({
  description:
    "Calculate 13th month pay owed under Presidential Decree 851. " +
    "Use when the worker asks how much 13th month pay they should receive.",
  inputSchema: z.object({
    basicMonthlySalary: z
      .number()
      .positive()
      .describe("Basic monthly salary in Philippine pesos (exclude overtime, allowances, bonuses)."),
    monthsWorked: z
      .number()
      .min(0.5)
      .max(12)
      .describe("Months actually worked in the calendar year (0.5–12)."),
  }),
  execute: async ({ basicMonthlySalary, monthsWorked }) => {
    const months = Math.min(monthsWorked, 12);
    const amount = (basicMonthlySalary * months) / 12;

    return {
      basicMonthlySalary,
      monthsWorked: months,
      formula: `₱${basicMonthlySalary.toLocaleString("en-PH")} × ${months} ÷ 12 = ₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
      amount,
      legalBasis: "Presidential Decree 851 (13th Month Pay Law)",
      deadline: "Payable on or before December 24.",
      note: "Based on basic salary only — excludes overtime, allowances, commissions, and other bonuses.",
    };
  },
});
