import { answerQuestion } from "./answer.js";

async function test() {
  const answer = await answerQuestion(
    "What is the capital of France?"
  );

  console.log("Answer:");
  console.log(answer);

  process.exit(0);
}

test();
