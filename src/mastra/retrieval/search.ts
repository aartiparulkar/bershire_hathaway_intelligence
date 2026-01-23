import { db } from "../db/client.js";

export interface RetrievedChunk {
  id: string;
  content: string;
  metadata: any;
  similarity: number;
}

export async function searchSimilarChunks(
  queryEmbedding: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  const result = await db.query(
    `
    SELECT
      id,
      content,
      metadata,
      1 - (embedding <=> $1::vector) AS similarity
    FROM document_chunks
    ORDER BY embedding <=> $1::vector
    LIMIT $2
    `,
    [queryEmbedding, topK]
  );

  return result.rows;
}
