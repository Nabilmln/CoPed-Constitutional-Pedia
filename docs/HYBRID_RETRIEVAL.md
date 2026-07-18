# Phase 5 — Hybrid Retrieval

Phase 5 retrieves relevant UUD 1945 passages from Neon using a lightweight
custom TypeScript pipeline:

1. embed the question with Gemini using `RETRIEVAL_QUERY`;
2. retrieve vector candidates by cosine similarity in pgvector;
3. parse explicit `Pasal` and `ayat` references;
4. add exact-reference candidates;
5. rerank using vector similarity, lexical overlap, and reference boosts;
6. apply the configured threshold and return the top results.

No LangChain, Python service, Elasticsearch, or extra vector database is used.

## Configuration

```env
RAG_MATCH_COUNT=5
RAG_SIMILARITY_THRESHOLD=0.3
```

The retrieval service accepts per-request overrides, but values remain bounded
to avoid excessive database work.

## Evaluation

Run the committed UUD baseline:

```powershell
cd frontend
npm run test:retrieval
npm run evaluate:retrieval
```

The live evaluation uses `tests/fixtures/uud-rag-baseline.json` and reports:

- article recall at 5;
- keyword recall at 5;
- top article and hybrid score for each case.

Out-of-domain and prompt-injection cases are included for visibility, but their
rejection belongs to the domain guard and answer pipeline in Phase 6.

## Server usage

```ts
const context = await retrieveUudContext({
  query: "Apa isi Pasal 27 ayat 1 UUD 1945?",
  matchCount: 5,
  similarityThreshold: 0.3,
});
```

Each result contains citation-friendly fields:

- `articleNumber`;
- `paragraphNumber`;
- `chapter`;
- `content`;
- cosine `similarity`;
- `lexicalScore`;
- `referenceMatch`;
- final hybrid `score`.

Only active documents with `status = ready` and non-null embeddings can be
retrieved.
