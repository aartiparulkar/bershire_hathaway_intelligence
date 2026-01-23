import { retrieveRelevantChunks } from "./retrive.js";

async function test() {
  const results = await retrieveRelevantChunks(
    "What is the capital of France?",
  );

  console.log(
    results.map(r => ({
      similarity: r.similarity.toFixed(4),
      preview: r.content.slice(0, 80),
      source: r.metadata?.source
    }))
  );

  process.exit(0);
}

test();
