// import { createStep, createWorkflow } from "@mastra/core/workflows";
// import { z } from "zod";

// import { retrieveRelevantChunks } from "../retrieval/retrive.js";
// import { answerQuestion } from "../generation/answer.js";

// const retrievalStep = createStep({
//   id: "retrieve-chunks",
//   inputSchema: z.object({
//     question: z.string()
//   }),
//   outputSchema: z.object({
//     chunks: z.array(
//       z.object({
//         content: z.string(),
//         metadata: z.any(),
//         similarity: z.number()
//       })
//     )
//   }),
//   execute: async ({ inputData }) => {
//     const { question } = inputData;
//     const chunks = await retrieveRelevantChunks(question);
//     return { chunks };
//   }
// });

// const generationStep = createStep({
//   id: "generate-answer",
//   inputSchema: z.object({
//     chunks: z.array(
//       z.object({
//         content: z.string(),
//         metadata: z.any(),
//         similarity: z.number()
//       })
//     )
//   }),
//   outputSchema: z.object({
//     answer: z.string()
//   }),
//   execute: async ({ inputData }) => {
//     const { chunks } = inputData;
//     // Assume answerQuestion accepts chunks and returns a string
//     const answer = await answerQuestion(chunks);
//     return { answer };
//   }
// });

// export const ragWorkflow = createWorkflow({
//   id: "rag-workflow",
//   inputSchema: z.object({
//     question: z.string()
//   }),
//   outputSchema: z.object({
//     answer: z.string()
//   })
// })
//   .then(retrievalStep)
//   .then(generationStep)
//   .commit();



