# Limitations and Production Roadmap

This is the most useful document for answering:

> “What would you improve if you had more time?”

The strongest answer is not to pretend the current project is production-ready. Identify the failure modes and show how you would systematically fix them.

---

## 1. Retrieval has no relevance threshold

### Current behavior

```sql
ORDER BY embedding <=> query
LIMIT 5
```

This always asks for the nearest chunks.

Even an unrelated question can therefore retrieve five Berkshire passages.

### Risk

```text
Out-of-domain question
    -> weak but non-empty retrieval
    -> context.isEmpty = false
    -> LLM is called
```

The prompt may still cause refusal, but refusal is not deterministic.

### Improvement

Add a minimum similarity threshold and/or reranking:

```text
vector search
   -> similarity filter
   -> reranker
   -> confidence decision
```

Return a deterministic refusal when no chunk passes the relevance threshold.

---

## 2. No retrieval evaluation harness

The repository contains manual test scripts, but not a benchmark dataset with expected relevant documents/chunks.

### Production approach

Create a retrieval evaluation set:

```text
question
expected year(s)
expected passage(s)
answerability
```

Measure metrics such as:

- Recall@K
- Precision@K
- MRR / ranking quality
- answer faithfulness
- citation correctness
- refusal accuracy

This is how you would tune chunk size, overlap, K, thresholds, and reranking.

---

## 3. Character-based chunking

### Problem

Fixed character windows can split sentences and ignore document structure.

### Upgrade options

Start with:

```text
paragraph/sentence-aware recursive chunking
```

Then consider:

```text
section-aware or semantic chunking
```

Preserve structured metadata such as year, page, heading, and paragraph range.

---

## 4. No page-level citations

Current provenance identifies source filenames but not exact pages.

### Improvement

Change ingestion output from:

```text
raw document text
```

to page-aware records:

```text
page 1 text
page 2 text
...
```

Store:

```text
document_id
year
page_number
chunk_index
content
embedding
```

Then return structured citations with the answer.

---

## 5. `sources` are built but not returned

`RAGContext` contains:

```ts
sources: string[]
```

but `answerQuestion()` returns only a string.

### Better API contract

```ts
{
  answer: string,
  sources: [
    { document: "2007.pdf", page: 6, chunkId: "..." }
  ]
}
```

This makes citations a deterministic application feature rather than relying on the model to reproduce source names correctly.

---

## 6. Sequential embedding ingestion

Current ingestion calls the embedding API once per chunk in a sequential loop.

### Risks

- slow ingestion,
- many network round trips,
- inefficient API usage.

### Improvement

Batch multiple chunk strings in one embeddings request, with controlled concurrency and retry/backoff.

---

## 7. Re-ingestion can duplicate data

The table has no uniqueness constraint such as:

```text
(document_id, chunk_index)
```

and ingestion always performs `INSERT`.

### Improvement

Use deterministic chunk identity and idempotent ingestion:

```sql
UNIQUE(document_id, chunk_index, content_hash)
```

or delete/replace all chunks for a document version transactionally.

---

## 8. No transaction per document

If one chunk insert fails halfway through a document, earlier chunks remain stored.

### Improvement

Use a transaction around each document or a versioned ingestion job.

```text
BEGIN
  insert all chunks
COMMIT
```

On failure:

```text
ROLLBACK
```

---

## 9. No vector index

The schema creates a vector column but not an HNSW/IVFFlat index.

For the current corpus this may be fine, but larger corpora would need indexed nearest-neighbor retrieval.

Example architectural direction:

```text
HNSW cosine index
 +
metadata filters
```

Index selection should be based on dataset size, latency targets, recall requirements, and ingestion/update behavior.

---

## 10. No hybrid retrieval

Pure semantic vector search can miss exact terms, unusual numbers, proper nouns, or phrases.

A stronger financial-document search system could combine:

```text
BM25 / PostgreSQL full-text search
              +
       vector similarity
              |
              v
          reranking
```

Hybrid retrieval is particularly useful for financial documents containing precise terminology and numeric references.

---

## 11. Query does not retrieve `document_id` or `chunk_index`

The database stores them, but `search.ts` only returns:

```text
id
content
metadata
similarity
```

Returning the structural fields would make debugging, traceability, and citation generation easier.

---

## 12. Agent and RAG paths are disconnected

Current state:

```text
Mastra ragAgent + Memory          [separate]

Mastra ragWorkflow
   -> custom answerQuestion RAG   [active pipeline]
```

### Consequence

Agent memory and the custom retrieval pipeline do not participate in the same request path.

### Improvement options

Choose one clear architecture.

**Option A — workflow-centric**

```text
API -> workflow -> retrieval -> generation -> response
```

Remove the unused RAG agent if it provides no value.

**Option B — agent-centric**

Expose retrieval as a Mastra tool and let the agent call it:

```text
Agent
  -> retrieval tool
  -> pgvector
  -> evidence
  -> grounded response
```

For strict document QA, workflow-centric orchestration can be easier to make deterministic.

---

## 13. Memory is currently in-memory

`LibSQLStore` uses:

```text
url: ":memory:"
```

and `ragAgent` uses `new Memory()`.

Anything relying on in-process memory will not survive a restart unless durable storage is configured.

---

## 14. No automated unit/integration test suite

`package.json` currently has:

```text
"test": "echo \"Error: no test specified\" && exit 1"
```

There are manual executable test files, but no actual automated regression suite.

### Minimum production test layers

```text
Unit
- chunker
- context builder
- prompt builder
- threshold logic

Integration
- pgvector retrieval
- ingestion idempotency
- OpenAI client adapters (mocked)

Evaluation
- retrieval quality dataset
- grounded-answer / refusal behavior
```

---

## 15. Operational concerns not yet implemented

A production version should also address:

- structured request tracing,
- embedding/generation latency metrics,
- token and cost tracking,
- retry policies and rate limiting,
- secrets management,
- database migration tooling,
- API authentication/authorization if exposed publicly,
- input length limits,
- request timeouts,
- model/provider failure handling,
- corpus/version auditability.

---

# Prioritized roadmap

If asked what you would do next, use this order:

```text
1. Retrieval evaluation dataset
2. Similarity threshold + deterministic refusal
3. Page/year metadata + structured citations
4. Idempotent/batched ingestion
5. Better chunking
6. Hybrid retrieval + reranking if evaluation proves necessary
7. HNSW index when corpus/latency requires it
8. Unify agent/workflow architecture
9. Automated tests + observability
10. Production API/deployment hardening
```

The important engineering principle is **measure retrieval quality before adding more sophisticated retrieval components**.
