# berkshire_hathaway_intelligence

## Architecture Diagram

The architecture has three main parts: **document preparation, question answering, and the Mastra application shell.**

The **offline document preparation** pipeline processes all Berkshire Hathaway shareholder-letter PDFs before any user question is asked. The PDFs are converted to text, split into smaller chunks, converted into embeddings using OpenAI, and stored in **PostgreSQL with pgvector**.

When a user asks a question, the **online RAG pipeline** validates it, creates an embedding for the question, and searches PostgreSQL for the **five most similar document chunks**. Those chunks are combined into a limited context, used to build a grounded prompt, and then sent to **gpt-4o-mini** to generate the final answer.

**The Mastra application shell** initializes the application components. It registers the `ragWorkflow`, the separate `ragAgent`, and the in-memory Mastra storage. The current question-answering path is handled by the workflow-based RAG pipeline.

<p align="center">
  <img width="900" alt="berkshire_hathaway_architecture" src="https://github.com/user-attachments/assets/5b301a97-0895-4739-9995-27a6ee2724c3" />
</p>

Welcome to your new [Mastra](https://mastra.ai/) project! We're excited to see what you'll build.


## Getting Started

Start the development server:

```shell
npm run dev
```

Open [http://localhost:4111](http://localhost:4111) in your browser to access [Mastra Studio](https://mastra.ai/docs/getting-started/studio). It provides an interactive UI for building and testing your agents, along with a REST API that exposes your Mastra application as a local service. This lets you start building without worrying about integration right away.

You can start editing files inside the `src/mastra` directory. The development server will automatically reload whenever you make changes.

## Learn more

To learn more about Mastra, visit our [documentation](https://mastra.ai/docs/). Your bootstrapped project includes example code for [agents](https://mastra.ai/docs/agents/overview), [tools](https://mastra.ai/docs/agents/using-tools), [workflows](https://mastra.ai/docs/workflows/overview), [scorers](https://mastra.ai/docs/evals/overview), and [observability](https://mastra.ai/docs/observability/overview).

If you're new to AI agents, check out our [course](https://mastra.ai/course) and [YouTube videos](https://youtube.com/@mastra-ai). You can also join our [Discord](https://discord.gg/BTYqqHKUrf) community to get help and share your projects.

## Deploy on Mastra Cloud

[Mastra Cloud](https://cloud.mastra.ai/) gives you a serverless agent environment with atomic deployments. Access your agents from anywhere and monitor performance. Make sure they don't go off the rails with evals and tracing.

Check out the [deployment guide](https://mastra.ai/docs/deployment/overview) for more details.
