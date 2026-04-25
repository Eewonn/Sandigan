import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { Document } from "langchain/document";
import { LEGAL_CORPUS, type LegalSource } from "./legal-corpus";

export type RetrievedSource = LegalSource & { score: number };

// Built once at module load, reused for every query (cold-start cost: ~1 HF call per corpus entry).
// When you're ready to scale, swap MemoryVectorStore for PGVectorStore — see TODO.md.
let store: MemoryVectorStore | null = null;

async function getStore(): Promise<MemoryVectorStore> {
  if (store) return store;

  const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: "sentence-transformers/all-MiniLM-L6-v2",
  });

  const docs = LEGAL_CORPUS.map(
    (s) =>
      new Document({
        // Combine the fields the model should match against.
        // Tags and title are weighted by position (earlier = more signal).
        pageContent: `${s.title}. ${s.tags.join(", ")}. ${s.section}. ${s.text}`,
        metadata: { id: s.id },
      }),
  );

  store = await MemoryVectorStore.fromDocuments(docs, embeddings);
  return store;
}

export async function retrieve(query: string, topK = 5): Promise<RetrievedSource[]> {
  const s = await getStore();
  // Returns [Document, score] pairs; score is cosine distance (lower = more similar).
  const results = await s.similaritySearchWithScore(query, topK);

  return results
    .map(([doc, distance]) => {
      const source = LEGAL_CORPUS.find((e) => e.id === doc.metadata.id);
      if (!source) return null;
      return { ...source, score: 1 - distance }; // convert distance → similarity
    })
    .filter((r): r is RetrievedSource => r !== null);
}

export function buildContextBlock(sources: RetrievedSource[]): string {
  if (sources.length === 0) return "(no sources retrieved)";
  return sources
    .map(
      (s, i) =>
        `[[${i + 1}]] id=${s.id}\nLaw: ${s.lawName}\nSection: ${s.section}\nTitle: ${s.title}\nURL: ${s.url ?? "n/a"}\nUpdatedAt: ${s.updatedAt}\nText: ${s.text}`,
    )
    .join("\n\n---\n\n");
}

// Used by guardrails to validate cited IDs without re-running retrieval.
export function getSourceById(id: string): LegalSource | undefined {
  return LEGAL_CORPUS.find((s) => s.id === id);
}
