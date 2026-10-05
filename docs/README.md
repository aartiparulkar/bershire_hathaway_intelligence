# Berkshire Hathaway Intelligence — Architecture Notes

This documentation is a **future-you / interview reference** for the Berkshire Hathaway shareholder-letter RAG project in this repository.

It is written from the implementation currently present in `src/mastra`, not from an idealized architecture. Where the code has unfinished or disconnected pieces, the docs call that out explicitly.

## What this project is

A Retrieval-Augmented Generation (RAG) system that answers questions using Berkshire Hathaway shareholder letters as its knowledge base.

The repository contains **48 annual shareholder-letter PDFs (1977–2024)**. The ingestion pipeline extracts text, chunks it, generates OpenAI embeddings, and stores the chunks in PostgreSQL with `pgvector`. At query time, the application embeds the user's question, performs cosine-distance vector retrieval, builds a bounded context, and asks an LLM to answer only from that context.

Mastra is used as the application/orchestration framework around the custom RAG business logic.

## Read these in this order

1. [`01-system-architecture.md`](01-system-architecture.md) — the complete system and request flows.
2. [`02-rag-pipeline-deep-dive.md`](02-rag-pipeline-deep-dive.md) — ingestion, retrieval, context, and generation internals.
3. [`03-codebase-map.md`](03-codebase-map.md) — what every important file is responsible for.
4. [`04-design-decisions-and-tradeoffs.md`](04-design-decisions-and-tradeoffs.md) — why the implementation works this way and what alternatives exist.
5. [`05-limitations-and-production-roadmap.md`](05-limitations-and-production-roadmap.md) — current engineering gaps and how to improve them.
6. [`06-interview-guide.md`](06-interview-guide.md) — how to explain the project under interview questioning.
7. [`07-interview-cheatsheet.md`](07-interview-cheatsheet.md) — last-minute revision version.

## One-sentence architecture

> PDF shareholder letters → text extraction → overlapping chunks → OpenAI embeddings → PostgreSQL/pgvector → query embedding → top-K cosine retrieval → bounded source context → grounded LLM answer.

## What I would claim in an interview

Safe claims that are directly supported by the repository:

- Built a custom RAG pipeline over Berkshire Hathaway shareholder letters using TypeScript, OpenAI embeddings, PostgreSQL, and pgvector.
- Implemented PDF ingestion, overlapping text chunking, embedding generation, vector similarity retrieval, bounded context assembly, and context-grounded answer generation.
- Wrapped the RAG business logic in a typed Mastra workflow using Zod schemas for workflow inputs and outputs.
- Structured the code into separate ingestion, retrieval, generation, database, workflow, and agent layers.

Avoid claiming the project currently has reranking, hybrid search, production observability, citation-to-page mapping, retrieval evaluation metrics, or a similarity rejection threshold; those are not implemented in the current repository.
