import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { getStore, isStoreReady } from "@/lib/vectorStore";
import { computeMetrics } from "@/lib/evaluator";
import { Document } from "@langchain/core/documents";

const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.1,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Please provide a question" },
        { status: 400 }
      );
    }

    if (!isStoreReady()) {
      return NextResponse.json(
        { error: "No documents indexed yet. Please ingest a URL first." },
        { status: 400 }
      );
    }

    const store = getStore()!;

    // Retrieve relevant chunks with scores
    const resultsWithScores = await store.similaritySearchWithScore(
      question,
      4
    );

    const chunks: Document[] = resultsWithScores.map(([doc]) => doc);
    const scores: number[] = resultsWithScores.map(([, score]) =>
      Math.max(0, 1 - score)
    ); // Convert distance to similarity

    // Build context with source labels
    const contextParts = chunks.map(
      (chunk, i) =>
        `[Source ${i + 1}]:\n${chunk.pageContent}`
    );
    const context = contextParts.join("\n\n---\n\n");

    // Anti-hallucination system prompt
    const systemPrompt = `You are a helpful, precise research assistant. Your goal is to answer the user's questions using EXCLUSIVELY the provided context.

CRITICAL RULES:
1. FAILURE TO CITE SOURCES WILL RESULT IN A PENALTY. Always cite your sources using [Source N] notation for every claim.
2. You MAY use creative formats (story, dialogue, poem, etc.) if requested, but the FACTS and INFORMATION must come strictly from the context.
3. If asked for opinions or suggestions, you may offer them ONLY if they can be directly supported or inferred from the context. Otherwise, state that the context does not contain enough information.
4. NEVER fabricate information or bring in outside knowledge.
5. Be concise but thorough.

CONTEXT:
${context}`;

    // Generate response
    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ]);

    const answer =
      typeof response.content === "string" ? response.content : "";

    // Compute evaluation metrics
    const metrics = await computeMetrics(answer, chunks, scores);

    // Format sources for the response
    const sources = chunks.map((chunk, i) => ({
      id: i + 1,
      content: chunk.pageContent,
      metadata: chunk.metadata,
      similarity: Math.round(scores[i] * 100),
    }));

    return NextResponse.json({
      answer,
      sources,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Chat error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
