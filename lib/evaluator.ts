import { ChatOpenAI } from "@langchain/openai";
import { Document } from "@langchain/core/documents";

const evaluatorLLM = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export interface EvaluationMetrics {
  faithfulness: number;
  contextRelevance: number;
  hallucinationRisk: number;
  sourceCoverage: number;
}

export async function evaluateFaithfulness(
  answer: string,
  context: string
): Promise<number> {
  const prompt = `You are an evaluation judge. Given the following context and answer, rate how faithful the answer is to the context on a scale of 0 to 100.

A score of 100 means every claim in the answer is directly supported by the context.
A score of 0 means the answer contains entirely fabricated information.

Context:
"""
${context}
"""

Answer:
"""
${answer}
"""

Respond with ONLY a number between 0 and 100. Nothing else.`;

  try {
    const response = await evaluatorLLM.invoke(prompt);
    const content = typeof response.content === "string" ? response.content : "";
    const score = parseInt(content.trim(), 10);
    return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
  } catch {
    return 50;
  }
}

export function evaluateContextRelevance(
  chunks: Document[],
  scores: number[]
): number {
  if (scores.length === 0) return 0;
  // Convert similarity scores to 0-100 scale
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avgScore * 100);
}

export function computeSourceCoverage(
  answer: string,
  totalSources: number
): number {
  if (totalSources === 0) return 0;
  // Count how many source references appear in the answer
  let citedCount = 0;
  for (let i = 1; i <= totalSources; i++) {
    if (answer.includes(`[Source ${i}]`) || answer.includes(`[${i}]`)) {
      citedCount++;
    }
  }
  return Math.round((citedCount / totalSources) * 100);
}

export async function computeMetrics(
  answer: string,
  chunks: Document[],
  scores: number[]
): Promise<EvaluationMetrics> {
  const context = chunks.map((c) => c.pageContent).join("\n\n");

  const [faithfulness] = await Promise.all([
    evaluateFaithfulness(answer, context),
  ]);

  const contextRelevance = evaluateContextRelevance(chunks, scores);
  const hallucinationRisk = Math.max(0, 100 - faithfulness);
  const sourceCoverage = computeSourceCoverage(answer, chunks.length);

  return {
    faithfulness,
    contextRelevance,
    hallucinationRisk,
    sourceCoverage,
  };
}
