import { prepareRagContext } from "./prepareContext.js";

async function test() {
  const context = await prepareRagContext(
    "What does this document talk about?"
  );

  console.log("Is empty:", context.isEmpty);
  console.log("Sources:", context.sources);
  console.log("Context preview:");
  console.log(context.contextText.slice(0, 500));

  process.exit(0);
}

test();
