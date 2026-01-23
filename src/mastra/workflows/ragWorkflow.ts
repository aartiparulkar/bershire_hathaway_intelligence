import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import { answerQuestion } from "../generation/answer.js";


const validateQuestionStep = createStep({
  id: "validate-question",
  inputSchema: z.object({
    question: z.string(),
  }),
  outputSchema: z.object({
    question: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { question } = inputData;
    if (!question || typeof question !== "string") {
      throw new Error("Invalid input to RAG workflow");
    }
    return { question };
  }
});

const answerQuestionStep = createStep({
  id: "answer-question",
  inputSchema: z.object({
    question: z.string(),
  }),
  outputSchema: z.object({
    answer: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { question } = inputData;

    // Call your business logic
    const answer = await answerQuestion(question);

    return { answer };
  }
});

export const ragWorkflow = createWorkflow({
  id: "rag-workflow",
  inputSchema: z.object({
    question: z.string(),
  }),
  outputSchema: z.object({
    answer: z.string(),
  }),
})
  .then(validateQuestionStep)
  .then(answerQuestionStep)
  .commit();


