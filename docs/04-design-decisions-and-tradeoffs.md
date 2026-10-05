# Design Decisions and Trade-offs

Use this document for “why did you choose X?” interview questions.

## 1. Why RAG instead of fine-tuning?

### Decision

Use retrieval over shareholder letters at runtime.

### Reasoning

The primary problem is **knowledge grounding**, not teaching the model a new style or behavior.

RAG makes the source corpus explicit and replaceable:

```text
new / changed documents
       |
       v
re-ingest corpus
       |
       v
knowledge available to retrieval
```

Fine-tuning would be a weaker fit for frequently changing factual source material because facts become encoded into model weights and source attribution becomes harder.

### Trade-off

RAG quality depends heavily on parsing, chunking, embeddings, retrieval, and context construction. It introduces more runtime components than a plain model call.

---

## 2. Why PostgreSQL + pgvector?

### Decision

Store text, metadata, and embeddings in PostgreSQL.

### Benefits

- One persistence technology for both structured metadata and vectors.
- Familiar SQL querying.
- JSONB available for flexible metadata.
- Good fit for a modest corpus such as annual shareholder letters.
- Easier operational footprint than adding a standalone vector database immediately.

### Trade-off

At large vector counts or specialized retrieval workloads, a dedicated vector engine or carefully indexed pgvector deployment may offer better operational/scaling characteristics.

---

## 3. Why use the same embedding function for documents and questions?

Both must be represented in the same semantic vector space.

```text
chunk text --\
             > same embedding model -> comparable vectors
query text --/
```

Using different incompatible models would make vector distance meaningless.

---

## 4. Why chunk documents?

Whole shareholder letters contain many unrelated topics. A single vector for an entire letter would represent a broad average meaning.

Chunking improves retrieval granularity:

```text
whole document vector
    -> “this letter discusses many things”

chunk vectors
    -> insurance float
    -> acquisition philosophy
    -> accounting
    -> capital allocation
```

### Current settings

```text
800 characters
100 characters overlap
```

These are heuristics, not measured optimum values.

---

## 5. Why overlap chunks?

Without overlap:

```text
chunk A: "Berkshire's insurance float is..."
                         | hard boundary
chunk B: "...valuable because..."
```

The complete thought may not exist in either chunk.

Overlap increases continuity at boundaries but also increases:

- number of embeddings,
- storage,
- ingestion cost,
- duplicate information during retrieval.

---

## 6. Why top-K retrieval?

A question usually needs a small evidence set, not the entire corpus.

The implementation uses:

```text
K = 5
```

Too small a K can miss necessary evidence. Too large a K can introduce irrelevant passages and consume context budget.

A production system would tune K using retrieval evaluation rather than treating 5 as universally correct.

---

## 7. Why a bounded context?

The builder stops at approximately 4000 characters.

Benefits:

- controls LLM input size,
- controls cost,
- reduces distraction from weakly relevant chunks.

Trade-off: because chunks are added in retrieval order and the loop simply stops at the limit, a long early chunk may prevent later useful evidence from being included.

A more mature system could use token-aware packing and relevance-aware selection.

---

## 8. Why temperature 0?

The task is evidence-grounded QA rather than creative writing.

Lower temperature reduces answer variation and makes regression testing easier.

It does **not** guarantee factual correctness; grounding and retrieval quality still matter.

---

## 9. Why separate retrieval and generation modules?

Current separation:

```text
ingestion -> retrieval -> context -> prompt -> generation
```

Benefits:

- easier unit testing,
- easier replacement of one strategy,
- easier debugging when answer quality is poor,
- less framework coupling.

For example, you can replace cosine retrieval with hybrid retrieval without rewriting the answer-generation code.

---

## 10. Why use a workflow?

The workflow provides an explicit execution graph and typed step boundaries.

Today there are only two steps, but the architecture can grow into:

```text
validate input
   -> classify question
   -> retrieve
   -> rerank
   -> evaluate retrieval confidence
   -> generate
   -> verify citations
   -> return structured answer
```

### Trade-off

For only two trivial steps, a workflow framework is more abstraction than strictly necessary. It becomes more valuable as orchestration complexity grows.

---

## 11. Why keep retrieval business logic outside the workflow definition?

The workflow calls `answerQuestion()` rather than embedding SQL and OpenAI calls directly into workflow steps.

This keeps framework-specific orchestration separate from domain logic.

That improves portability and testability:

```text
Mastra workflow
      |
      v
application service: answerQuestion
      |
      v
RAG modules
```

If the orchestration framework changed, most of the retrieval pipeline could remain intact.

---

## 12. Why JSONB metadata?

Metadata requirements tend to evolve.

Today:

```json
{
  "source": "2024.pdf",
  "ingested_at": "..."
}
```

Later it could add:

```json
{
  "year": 2024,
  "page": 8,
  "section": "Insurance",
  "parser_version": "v2"
}
```

JSONB gives flexibility without a schema migration for every optional field.

The trade-off is weaker structure and validation compared with dedicated relational columns.
