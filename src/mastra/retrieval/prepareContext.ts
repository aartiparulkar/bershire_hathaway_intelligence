import { retrieveRelevantChunks } from "./retrive.js";
import { buildContext } from "./contextBuilder.js";
import { RAGContext } from "./context.js";

export async function prepareRagContext(
  query: string
): Promise<RAGContext> {
  const chunks = await retrieveRelevantChunks(query);
  return buildContext(chunks);
}
