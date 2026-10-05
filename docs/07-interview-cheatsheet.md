# Interview Cheatsheet

## Project in one line

**RAG research assistant over Berkshire Hathaway shareholder letters using TypeScript, OpenAI, PostgreSQL/pgvector, and Mastra.**

## Corpus

```text
48 shareholder-letter PDFs
1977-2024
```

## Pipeline

```text
PDF
 -> extract text
 -> chunks (800 chars, 100 overlap)
 -> text-embedding-3-small (1536 dims)
 -> PostgreSQL + pgvector

Question
 -> same embedding model
 -> cosine-distance search
 -> top 5 chunks
 -> context <= 4000 chars
 -> grounded prompt
 -> GPT-4o-mini, temperature 0
 -> answer
```

## Main code path

```text
ragWorkflow
 -> answerQuestion
 -> prepareRagContext
 -> retrieveRelevantChunks
 -> embedQuery
 -> searchSimilarChunks
 -> buildContext
 -> buildPrompt
 -> generateAnswer
```

## What I built

```text
PDF ingestion
chunking
embeddings
pgvector schema/search
query retrieval
context construction
prompt grounding
LLM generation
Mastra workflow orchestration
```

## Strong architecture sentence

> I kept the RAG business logic framework-independent and used Mastra mainly for orchestration, so retrieval and generation strategies can be tested or replaced independently.

## Why RAG?

```text
Need factual grounding in a document corpus
+ source-aware evidence
+ easier corpus updates
```

Not primarily a fine-tuning problem.

## Why pgvector?

```text
Postgres already stores text/metadata
+ vectors in same database
+ SQL
+ low infra complexity for this corpus
```

## Biggest current weakness

```text
No similarity threshold.
```

Nearest-neighbor search returns something even for unrelated queries.

Current `context.isEmpty` is therefore not enough for robust refusal.

## Next improvement

```text
Evaluation dataset
 -> threshold tuning
 -> deterministic refusal
 -> page-level citations
 -> idempotent/batched ingestion
```

## Other limitations

```text
character-based chunking
no page-level metadata
no ANN vector index
no hybrid search/reranker
sequential embedding calls
re-ingestion can duplicate rows
no automated test/eval suite
agent memory not connected to active custom RAG path
```

## Agent vs workflow

```text
ACTIVE RAG PATH:
ragWorkflow -> answerQuestion -> GPT-4o-mini

SEPARATE AGENT:
ragAgent -> GPT-4o + Memory
```

Do not claim the agent currently performs retrieval.

## Retrieval SQL concept

```text
<=>                  = cosine distance
1 - (<=>)            = similarity-like score
ORDER BY distance    = nearest vectors first
LIMIT 5              = top-K retrieval
```

## If asked “How do you prevent hallucinations?”

> Context grounding + strict prompt + temperature 0 help, but they are not sufficient guarantees. I would add evaluation-calibrated relevance thresholds and deterministic refusal before generation.

## If asked “What metrics did you achieve?”

> I did not build a formal retrieval/answer benchmark in this version, so I would not invent an accuracy metric. The repo demonstrates the complete pipeline over 48 source PDFs; evaluation is the next engineering step.

## Production architecture

```text
question
 -> validate
 -> retrieve
 -> relevance gate
 -> rerank (if justified)
 -> token-aware context
 -> generate
 -> structured citations
 -> verify / trace
 -> response
```
