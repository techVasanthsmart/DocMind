import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import {
  isStoreReady,
  getDetailedHybridSearchResults,
} from "@/lib/vectorStore";
import { computeMetrics } from "@/lib/evaluator";
import { Document } from "@langchain/core/documents";
import { getOrCreateSessionId, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.1,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId, isNew } = getOrCreateSessionId(request);
    const { question } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Please provide a question" },
        { status: 400 },
      );
    }

    if (!isStoreReady(sessionId)) {
      return NextResponse.json(
        { error: "No documents indexed yet. Please ingest a URL first." },
        { status: 400 },
      );
    }

    // Retrieve relevant chunks using hybrid search (BM25 + semantic)
    const hybridResults = await getDetailedHybridSearchResults(
      sessionId,
      question,
      4,
      {
        semanticWeight: 0.6,
        lexicalWeight: 0.4,
      },
    );

    const chunks: Document[] = hybridResults.map((r) => r.document);
    const scores: number[] = hybridResults.map((r) => r.hybridScore);
    const semanticScores: number[] = hybridResults.map((r) => r.semanticScore);
    const lexicalScores: number[] = hybridResults.map((r) => r.lexicalScore);

    // Build context with source labels
    const contextParts = chunks.map(
      (chunk, i) => `[Source ${i + 1}]:\n${chunk.pageContent}`,
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
    const llmResponse = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ]);

    const answer =
      typeof llmResponse.content === "string" ? llmResponse.content : "";

    // Compute evaluation metrics
    const metrics = await computeMetrics(answer, chunks, scores);

    // Format sources for the response with hybrid score breakdown
    const sources = chunks.map((chunk, i) => ({
      id: i + 1,
      content: chunk.pageContent,
      metadata: chunk.metadata,
      similarity: Math.round(scores[i] * 100),
      semanticScore: Math.round(semanticScores[i] * 100),
      lexicalScore: Math.round(lexicalScores[i] * 100),
      hybridScore: Math.round(scores[i] * 100),
    }));

    // Compute average hybrid search scores
    const avgSemantic =
      sources.length > 0
        ? Math.round(
            sources.reduce((sum, s) => sum + s.semanticScore, 0) /
              sources.length,
          )
        : 0;
    const avgLexical =
      sources.length > 0
        ? Math.round(
            sources.reduce((sum, s) => sum + s.lexicalScore, 0) /
              sources.length,
          )
        : 0;
    const avgHybrid =
      sources.length > 0
        ? Math.round(
            sources.reduce((sum, s) => sum + s.hybridScore, 0) / sources.length,
          )
        : 0;

    const response = NextResponse.json({
      answer,
      sources,
      metrics: {
        ...metrics,
        avgSemanticScore: avgSemantic,
        avgLexicalScore: avgLexical,
        avgHybridScore: avgHybrid,
      },
      timestamp: new Date().toISOString(),
    });

    if (isNew) {
      setSessionCookie(response, sessionId);
    }

    return response;
  } catch (error: unknown) {
    console.error("Chat error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
