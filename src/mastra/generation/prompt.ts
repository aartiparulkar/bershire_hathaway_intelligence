export function buildPrompt(
  question: string,
  context: string
): string {
  return `
You are a question-answering system.

Rules you MUST follow:
- Answer using ONLY the provided context.
- If the answer is not present in the context, say:
  "I don't have enough information to answer this question."
- Do NOT add external knowledge.
- Do NOT speculate.

Context:
${context}

Question:
${question}

Answer:
`.trim();
}
