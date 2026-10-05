import { mastra } from "../index.js";
import { ragWorkflow } from "../workflows/ragWorkflow.js";
// import { Mastra } from '@mastra/core/mastra';

async function test() {
  const agent = mastra.getAgent("ragAgent");
  const response = await agent.generate("What is the name of my dog?");
  
  console.log(response.text);
}


test();
