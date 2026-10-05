# RAG Pipeline Deep Dive

## 1. Why RAG is used here

A normal LLM request would look like:

```text
Question -> LLM -> Answer
```

That makes the model rely on training knowledge and can produce ungrounded answers.

This project changes the path to:

```text
Question
  -> retrieve relevant shareholder-letter text
  -> give that evidence to the LLM
  -> generate answer from evidence
```

This is the core RAG pattern:

```text
Retrieve -> Augment -> Generate
```

---

# Part A — Ingestion

## 2. PDF extraction

`ingest.ts` scans the configured folder and accepts `.pdf` and `.txt` files.

For PDFs:

```ts
const buffer = fs.readFileSync(filePath);
const uint8Array = new Uint8Array(
  buffer.buffer,
  buffer.byteOffset,
  buffer.byteLength
);

const pdfParse = new PDFParse(uint8Array);
const data = await pdfParse.getText();
return data.text;
```

### Why extract text first?

Embedding models operate on text input. The PDF file itself contains layout/encoding structures that are not useful to vector search until converted into textual content.

### Current trade-off

The parser extracts text but does not preserve robust page-level provenance. This means the final system can identify a source PDF but cannot reliably cite the exact page from the current schema.

---

## 3. Chunking

The implementation uses a sliding character window:

```ts
chunkSize = 800
 overlap  = 100
```

Visualization:

```text
Document text
|---------------- chunk 1: chars 0-799 ----------------|
                                           |---------------- chunk 2 ----------------|
                                           ^ 100-char overlap
```

More precisely, each next chunk starts at:

```text
next_start = previous_end - overlap
```

So with the defaults:

```text
chunk 1: 0..799
chunk 2: 700..1499
chunk 3: 1400..2199
...
```

### Why chunk at all?

Embedding an entire annual letter as one vector would compress many unrelated topics into one representation. Smaller chunks improve retrieval granularity.

### Why overlap?

A fact may cross a chunk boundary. Overlap duplicates a small amount of neighboring text so boundary information has a better chance of remaining intact in at least one chunk.

### Current limitation

The chunker is **character-based**, not token-, sentence-, paragraph-, or semantic-aware. It can therefore split a sentence or financial explanation in the middle.

---

## 4. Embeddings

Each chunk is converted into a vector using:

```text
model: text-embedding-3-small
vector size: 1536
```

Conceptually:

```text
"Buffett discusses insurance float..."
              |
              v
Embedding model
              |
              v
[0.013, -0.028, 0.004, ... 1536 values]
```

The important property is that semantically similar text tends to occupy nearby regions in embedding space.

For example, a user query such as:

```text
How does Buffett think about insurance float?
```

can retrieve a passage discussing insurance float even if the passage is not an exact keyword match.

---

## 5. Storage in pgvector

Every chunk stores both the raw text and embedding.

```text
+--------------------------------------+
| document_chunks                      |
+--------------------------------------+
| id                                   |
| document_id                          |
| chunk_index                          |
| content                              |
| embedding VECTOR(1536)               |
| metadata JSONB                       |
| created_at                           |
+--------------------------------------+
```

Why PostgreSQL + pgvector instead of a separate vector database?

For this project scale, it keeps relational metadata and vectors in the same system and avoids introducing another infrastructure component.

---

# Part B — Retrieval

## 6. Query embedding

The question is embedded with the **same embedding model** used for document chunks.

```text
Question -> text-embedding-3-small -> query vector
```

Using the same vector space is essential. Comparing vectors from unrelated embedding models would not produce meaningful distances.

---

## 7. Vector similarity search

The SQL query is:

```sql
SELECT
  id,
  content,
  metadata,
  1 - (embedding <=> $1::vector) AS similarity
FROM document_chunks
ORDER BY embedding <=> $1::vector
LIMIT $2;
```

`<=>` is pgvector's cosine-distance operator.

The query performs two related calculations:

```text
distance   = embedding <=> query_vector
similarity = 1 - distance
```

Retrieval is ordered by smallest distance:

```text
closest vector
    |
    v
most semantically similar chunk
```

Default retrieval count:

```text
topK = 5
```

### Complexity intuition

Without an approximate-nearest-neighbor index, the database may need to compare the query vector against many stored vectors. This is acceptable for a small corpus but does not scale as efficiently as indexed ANN retrieval.

The current schema does not create an HNSW or IVFFlat index.

---

## 8. Context construction

Retrieved chunks are not sent to the model without bounds.

`contextBuilder.ts` caps total context at:

```text
MAX_CONTEXT_CHARS = 4000
```

Each chunk is formatted as:

```text
[Source: 1998.pdf]
<retrieved chunk text>
```

Source filenames are deduplicated with a `Set`.

### Why cap the context?

Sending every retrieved passage would:

- increase token cost,
- increase latency,
- add irrelevant evidence,
- make it harder for the model to focus.

### Current limitation

The bound is measured in **characters**, while model limits and billing are based on **tokens**. Character count is only an approximation.

---

# Part C — Grounded generation

## 9. Prompt construction

The prompt explicitly tells the model:

```text
- Answer using ONLY the provided context.
- If the answer is not present in the context, say that there is not enough information.
- Do NOT add external knowledge.
- Do NOT speculate.
```

This is a hallucination-control mechanism.

The final prompt has this shape:

```text
System-style rules

Context:
[Source: ...]
...

Question:
...

Answer:
```

---

## 10. Generation settings

The answer path uses:

```text
model       = gpt-4o-mini
temperature = 0
max_tokens  = 300
```

### Why temperature 0?

For document QA, deterministic/factual behavior is generally more useful than creative variation.

### Why cap output tokens?

It bounds answer size and cost, although `300` is a fixed heuristic rather than a dynamically selected limit.

---

# Part D — Refusal behavior

## 11. What currently triggers refusal?

`answerQuestion()` refuses only if:

```ts
context.isEmpty === true
```

That happens when no chunks are returned or no chunk fits into the context builder.

There is also a helper:

```ts
shouldRefuseAnswer(context)
```

but it is currently unused.

### Important retrieval issue

A vector search with `LIMIT 5` will normally return the **five nearest chunks even for an unrelated question**, as long as the table contains data.

For example:

```text
"What is the capital of France?"
```

still has some nearest vectors among Berkshire chunks.

Because there is currently **no minimum similarity threshold**, `context.isEmpty` is not a reliable out-of-domain detector.

So the prompt asks the LLM to refuse unsupported questions, but retrieval itself does not yet reject low-relevance results.

A stronger architecture would add:

```text
query
  -> vector search
  -> similarity threshold / reranker
       |
       +-- relevant -> build context -> answer
       +-- irrelevant -> deterministic refusal
```

---

# Part E — Source citations

## 12. What citation support exists?

The context builder injects filenames such as:

```text
[Source: 2007.pdf]
```

and collects a list of unique source filenames.

This provides **document-level provenance**.

It does not currently provide:

- page numbers,
- chunk IDs in the final answer,
- verified quote spans,
- explicit source objects returned alongside the generated answer.

If asked in an interview, describe the current behavior as **source-aware grounding**, not full citation infrastructure.
