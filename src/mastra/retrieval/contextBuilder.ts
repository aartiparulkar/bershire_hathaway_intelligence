import { RetrievedChunk } from "./search.js";
import { RAGContext } from "./context.js";

const MAX_CONTEXT_CHARS = 4000;

export function buildContext(
  chunks: RetrievedChunk[]
): RAGContext {
  if (!chunks.length) {
    return {
      contextText: "",
      sources: [],
      isEmpty: true
    };
  }

  let context = "";
  const sources = new Set<string>();

  for (const chunk of chunks) {
    if (context.length + chunk.content.length > MAX_CONTEXT_CHARS) {
      break;
    }

    context += `\n\n[Source: ${chunk.metadata?.source ?? "unknown"}]\n`;
    context += chunk.content;

    if (chunk.metadata?.source) {
      sources.add(chunk.metadata.source);
    }
  }

  return {
    contextText: context.trim(),
    sources: Array.from(sources),
    isEmpty: context.length === 0
  };
}
