import OpenAI from "openai";
import { env } from "../config/env";

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY
});

export async function generateAnswer(
  prompt: string
): Promise<string> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: prompt }
    ],
    temperature: 0,
    max_tokens: 300
  });

  return response.choices[0].message.content?.trim() ?? "";
}
