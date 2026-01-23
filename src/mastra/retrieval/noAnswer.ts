import { RAGContext } from "./context.js";

export function shouldRefuseAnswer(
  context: RAGContext
): boolean {
  return context.isEmpty;
}
