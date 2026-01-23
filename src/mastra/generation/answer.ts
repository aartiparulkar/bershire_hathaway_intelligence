import { prepareRagContext } from "../retrieval/prepareContext.js";
import { buildPrompt } from "./prompt.js";
import { generateAnswer } from "./generate.js";

export async function answerQuestion(
  question: string
): Promise<string> {
  const context = await prepareRagContext(question);

  if (context.isEmpty) {
    return "I don't have enough information to answer this question.";
  }

  const prompt = buildPrompt(question, context.contextText);
  return generateAnswer(prompt);
}
