import { embedText } from "../ingestion/embeddings.js";

export async function embedQuery(query: string): Promise<string> {
  const embedding = await embedText(query);
  return `[${embedding.join(",")}]`;
}
