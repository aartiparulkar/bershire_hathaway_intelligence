import { mastra } from "../index.js";

async function test() {
    const agent = mastra.getAgent("ragAgent");
    const response = await agent.generate(
      "What is the capital of France?",
      {
        memory: {
          thread: "user-123",
          resource: "test-123",
        },
      },
    );

    console.log("Agent output:");
    console.log(response.text);

    return {
      list: response.text,
    };



  process.exit(0);
}

test();
