# Interview Guide

## 1. 30-second explanation

> I built a RAG-based research assistant over Berkshire Hathaway's annual shareholder letters. The repository includes letters from 1977 through 2024. I implemented the ingestion and retrieval pipeline myself in TypeScript: PDF text extraction, overlapping chunking, OpenAI embeddings, PostgreSQL/pgvector storage, cosine-similarity retrieval, bounded context construction, and context-only LLM generation. I then wrapped that business logic in a Mastra workflow with typed Zod inputs and outputs. The main improvement I would make next is retrieval evaluation plus a similarity threshold, because nearest-neighbor search otherwise returns weak matches even for out-of-domain questions.

---

## 2. 90-second architecture explanation

> The system has an offline ingestion path and an online query path. During ingestion, I scan the Berkshire shareholder-letter PDFs, extract text using `pdf-parse`, split the text into 800-character chunks with 100-character overlap, create 1536-dimensional embeddings using `text-embedding-3-small`, and store each chunk with metadata in PostgreSQL using pgvector.
>
> At query time, I embed the user's question with the same embedding model and perform a cosine-distance search in pgvector. I retrieve the top five chunks, construct a context capped at roughly 4000 characters, attach source filenames, and build a prompt that instructs the LLM to answer only from that context. The final generation call uses GPT-4o-mini with temperature zero.
>
> Mastra is used around this as an orchestration layer. The RAG workflow validates the input and delegates to the custom `answerQuestion` service. I deliberately kept the retrieval and generation modules separate from the workflow so they are easier to test and replace independently.

---

## 3. “What did YOU actually engineer?”

Answer in terms of concrete responsibilities:

> I implemented the custom data and retrieval path rather than relying on a framework-provided RAG abstraction. That included PDF ingestion, chunking, embedding generation, the pgvector schema and SQL similarity query, query embeddings, context packing, prompt grounding, and the final answer pipeline. I also created a Mastra workflow to orchestrate the application-level flow.

Do not say that Mastra itself implemented the vector search; it did not.

---

## 4. “Walk me through what happens when I ask a question.”

Use this flow:

```text
1. Workflow receives { question }
2. Zod validates workflow input
3. answerQuestion(question) runs
4. Question -> OpenAI embedding
5. pgvector returns 5 nearest chunks
6. Context builder packs chunks <= 4000 chars
7. Prompt says use only supplied context
8. GPT-4o-mini generates answer at temperature 0
9. Workflow returns { answer }
```

Then add:

> Document embeddings are created offline, so only the user query needs to be embedded at request time.

That shows you understand latency/cost separation.

---

## 5. “How does vector search work?”

> Both document chunks and the user query are mapped into the same embedding space. Semantically similar pieces of text tend to have vectors closer together. pgvector's cosine-distance operator compares the query vector against stored chunk vectors. I order by the smallest cosine distance and retrieve the top K chunks. I also compute `1 - distance` as a similarity value for inspection.

If pushed further:

```text
embedding <=> query_vector       -> cosine distance
1 - (embedding <=> query_vector) -> similarity-like score
```

---

## 6. “Why not just send all the PDFs to the LLM?”

> That would be inefficient and eventually exceed context limits. Most passages are irrelevant to any one question. Retrieval narrows the corpus to a small evidence set, reducing input size, cost, latency, and distraction for the generator.

---

## 7. “Why overlap chunks?”

> Fixed chunk boundaries can cut a sentence or idea in half. The overlap carries some text into the next chunk so boundary information is less likely to be lost. The trade-off is extra embeddings and some duplicated retrieval content.

---

## 8. “How do you prevent hallucinations?”

Do not overclaim.

> I use several controls: retrieval grounds the model in the corpus, the prompt explicitly says to use only supplied context and not speculate, and generation uses temperature zero. However, the current implementation still needs a stronger retrieval-confidence gate. Because nearest-neighbor search always returns something, I would add a similarity threshold and evaluation-backed refusal logic so unrelated questions are rejected before generation.

This is much stronger than claiming “temperature 0 prevents hallucinations.” It does not.

---

## 9. “What was technically difficult or interesting?”

Good answer:

> The interesting part was treating answer quality as a pipeline problem rather than just an LLM prompt. The model can only be as grounded as the evidence supplied to it, so chunk size, overlap, embedding consistency, vector similarity, context limits, and refusal behavior all affect the final answer. It also forced me to separate offline ingestion from online retrieval and to design a schema that stores both document data and embeddings.

A second angle:

> Another useful architectural decision was keeping the RAG logic independent of Mastra. The workflow orchestrates the flow, but the retrieval modules remain ordinary TypeScript functions, so I can test or replace them without rewriting the orchestration layer.

---

## 10. “What evidence proves it worked?”

Be precise about what is and is not measured.

You can say:

> The repository is built around a corpus of 48 Berkshire shareholder-letter PDFs from 1977–2024 and includes executable scripts for ingestion, retrieval, context inspection, generation, and agent testing.

Then explicitly qualify:

> I did not build a formal retrieval/answer evaluation benchmark in this version, so I would not claim a measured accuracy or hallucination-reduction percentage. Adding that evaluation harness would be one of my first improvements.

That answer is technically credible because it distinguishes implementation evidence from performance metrics.

---

## 11. “Why pgvector instead of Pinecone/Weaviate/etc.?”

> This corpus does not require a separate vector infrastructure layer. pgvector lets me keep embeddings, chunk text, and metadata in PostgreSQL and use SQL for retrieval. It lowers operational complexity. If scale or retrieval requirements grew significantly, I would benchmark indexed pgvector against a specialized vector service rather than choosing one by default.

---

## 12. “How would this scale?”

Start by identifying the current bottlenecks:

```text
Current ingestion:
chunk -> API call -> INSERT
chunk -> API call -> INSERT
...

Current retrieval:
no ANN index declared in schema
```

Then answer:

> I would batch embedding requests, use controlled concurrency, make ingestion idempotent, add an HNSW index when corpus size and latency justify it, and collect retrieval latency/recall metrics. I would also make context packing token-aware. The correct scaling change depends on whether the bottleneck is ingestion throughput, vector search latency, model latency, or token volume.

---

## 13. “How would you improve retrieval quality?”

Use an ordered answer:

```text
1. Build an evaluation dataset first
2. Tune chunk size / overlap / top-K
3. Add similarity threshold
4. Preserve page/section metadata
5. Add lexical + semantic hybrid search if needed
6. Add reranking if evaluation shows improvement
```

Key sentence:

> I would not add reranking or hybrid search just because they are common RAG features; I would add them if evaluation shows a retrieval failure they solve.

---

## 14. “What happens with an unrelated question?”

Current truthful answer:

> The prompt instructs the model to refuse unsupported questions, but the retrieval layer does not yet enforce a similarity threshold. Since a nearest-neighbor search can still return five weak matches, the current `context.isEmpty` check is not sufficient for robust out-of-domain detection. I would fix that with a threshold calibrated against an evaluation set.

This is an important weakness to understand before an interviewer finds it.

---

## 15. “Where is memory used?”

> A Mastra `ragAgent` is configured with `Memory`, but the custom RAG workflow currently calls `answerQuestion()` directly and that function uses a separate GPT-4o-mini generation call. So conversational memory is not integrated into the active custom retrieval path yet. I would either expose retrieval as an agent tool and make the agent the primary entry point, or keep a deterministic workflow-centric design and remove the unused agent layer.

---

## 16. “Why a workflow if this can be a function?”

> For the current two-step flow, a normal service function would be enough. I used a workflow because the intended design can grow into explicit validation, retrieval, relevance checks, reranking, generation, and verification steps. The important part is that the domain logic remains outside the framework, so the workflow abstraction does not own the business logic.

---

## 17. “What would production-ready look like?”

```text
API/auth
   -> validated workflow
   -> query embedding
   -> hybrid/vector retrieval
   -> similarity threshold
   -> reranking
   -> token-aware context builder
   -> grounded generation
   -> structured citations
   -> answer verification/evaluation hooks
   -> response
```

Around it:

```text
idempotent ingestion
versioned corpus
retries / rate limits
observability
cost tracking
automated tests
evaluation dataset
DB migrations
secrets management
```

---

## 18. Questions an interviewer may ask next

Be prepared to reason through:

- Why 800 characters and 100 overlap?
- Why top 5?
- How would you tune those values?
- Why cosine similarity?
- What is the difference between cosine similarity and Euclidean distance?
- What happens when a question needs facts from multiple letters?
- How would you implement year filtering?
- How would you cite an exact page?
- How would you stop duplicate ingestion?
- How would you handle OpenAI rate limits?
- What happens if the embedding model changes dimension?
- How would you migrate existing embeddings to another model?
- What should be unit tested vs evaluated with an LLM?
- How would you detect retrieval drift after changing the chunker?
- What would you cache?
- Where would you add tracing?
