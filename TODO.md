# TODO

## Scaling / Infrastructure

- [ ] **pgvector migration** — swap `MemoryVectorStore` in `lib/retrieval.ts` for a
  `PGVectorStore` (LangChain has a built-in adapter). Add corpus entries as rows,
  run once to embed. Needed when corpus grows beyond ~200 entries or when you want
  persistent embeddings across cold starts.
  - LangChain docs: https://js.langchain.com/docs/integrations/vectorstores/pgvector
  - Add `POSTGRES_URL` to env vars when ready.

## Corpus

- [ ] Expand corpus to cover all Philippine labor laws (currently 42 entries)

## Features

- [ ] Vercel deployment — `vercel deploy --prod`, set `GROQ_API_KEY`, `HUGGINGFACE_API_KEY`,
  and `SERPAPI_API_KEY` in the Vercel dashboard environment variables.
- [ ] Analytics — track clarify/answer/no-basis rates
