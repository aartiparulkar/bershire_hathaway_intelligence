import { answerQuestion } from "./answer";

async function test() {
  const answer = await answerQuestion(
    "What is this document about?"
  );

  console.log("Answer:");
  console.log(answer);

  process.exit(0);
}

test();
