import { embedQuery } from "./queryEmbedding.js";
import { searchSimilarChunks, RetrievedChunk } from "./search.js";

export async function retrieveRelevantChunks(
  query: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  const embedding = await embedQuery(query);
  return searchSimilarChunks(embedding, topK);
}
