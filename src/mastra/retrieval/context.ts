import { RetrievedChunk } from "./search.js";

export interface RAGContext {
  contextText: string;
  sources: string[];
  isEmpty: boolean;
}
