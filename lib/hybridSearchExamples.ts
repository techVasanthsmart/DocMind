/**
 * Example: Using Hybrid Search in Chat API
 *
 * This file demonstrates how to integrate hybrid search into the chat API.
 * Copy the relevant code to your route.ts file.
 */

import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import {
  isStoreReady,
  hybridSearchWithScore,
  getDetailedHybridSearchResults,
} from "@/lib/vectorStore";
import { Document } from "@langchain/core/documents";
import { getOrCreateSessionId, setSessionCookie } from "@/lib/session";

const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.1,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// EXAMPLE 1: Drop-in Replacement for Chat API
// ============================================================================

/**
 * Simple example: Replace similaritySearchWithScore with hybridSearchWithScore
 * No other code changes needed
 */
export async function PureHybridChatAPI(request: NextRequest) {
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

    // USE HYBRID SEARCH INSTEAD OF SEMANTIC SEARCH
    const resultsWithScores = await hybridSearchWithScore(
      sessionId,
      question,
      4,
      {
        semanticWeight: 0.6, // Customize weights here
        lexicalWeight: 0.4,
      },
    );

    const chunks: Document[] = resultsWithScores.map(([doc]) => doc);
    const scores: number[] = resultsWithScores.map(([, distance]) =>
      Math.max(0, 1 - distance),
    );

    // Build context with source labels
    const contextParts = chunks.map(
      (chunk, i) => `[Source ${i + 1}]:\n${chunk.pageContent}`,
    );
    const context = contextParts.join("\n\n---\n\n");

    // Use context in LLM
    const systemPrompt = `You are a helpful, precise research assistant. Answer using EXCLUSIVELY the provided context.`;

    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ]);

    const answer =
      response.content && typeof response.content === "string"
        ? response.content
        : "Unable to generate response";

    const responseData = {
      answer,
      sources: scores.map((score, i) => ({
        text: chunks[i].pageContent.slice(0, 100),
        score: parseFloat(score.toFixed(2)),
        metadata: chunks[i].metadata,
      })),
    };

    const resp = NextResponse.json(responseData);
    setSessionCookie(resp, sessionId);
    return resp;
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}

// ============================================================================
// EXAMPLE 2: Advanced - With Detailed Scoring for Analysis
// ============================================================================

export async function AdvancedHybridChatAPI(request: NextRequest) {
  try {
    const { sessionId } = getOrCreateSessionId(request);
    const { question } = await request.json();

    if (!isStoreReady(sessionId)) {
      return NextResponse.json(
        { error: "No documents indexed yet" },
        { status: 400 },
      );
    }

    // Get detailed scoring information
    const detailedResults = await getDetailedHybridSearchResults(
      sessionId,
      question,
      4,
      {
        semanticWeight: 0.6,
        lexicalWeight: 0.4,
      },
    );

    // Log scoring breakdown for debugging
    console.log(`\n📊 Hybrid Search Results for: "${question}"`);
    detailedResults.forEach((result, i) => {
      console.log(`\n[Result ${i + 1}]`);
      console.log(`  Content: ${result.document.pageContent.slice(0, 80)}...`);
      console.log(`  Semantic Score: ${result.semanticScore.toFixed(3)}`);
      console.log(`  Lexical Score: ${result.lexicalScore.toFixed(3)}`);
      console.log(`  Hybrid Score: ${result.hybridScore.toFixed(3)}`);
    });

    const chunks = detailedResults.map((r) => r.document);
    const context = chunks
      .map((chunk, i) => `[Source ${i + 1}]:\n${chunk.pageContent}`)
      .join("\n\n---\n\n");

    const response = await llm.invoke([
      { role: "system", content: "You are a helpful research assistant." },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ]);

    const responseData = {
      answer: response.content,
      sources: detailedResults.map((result, i) => ({
        text: result.document.pageContent.slice(0, 100),
        semanticScore: parseFloat(result.semanticScore.toFixed(3)),
        lexicalScore: parseFloat(result.lexicalScore.toFixed(3)),
        hybridScore: parseFloat(result.hybridScore.toFixed(3)),
        metadata: result.document.metadata,
      })),
    };

    const resp = NextResponse.json(responseData);
    setSessionCookie(resp, sessionId);
    return resp;
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}

// ============================================================================
// EXAMPLE 3: Dynamic Weight Adjustment
// ============================================================================

/**
 * Adjust weights based on query characteristics
 */
function getOptimalWeights(query: string): {
  semantic: number;
  lexical: number;
} {
  // Check if query is keyword-heavy (has many technical terms)
  const technicalTerms = [
    "api",
    "database",
    "function",
    "method",
    "class",
    "schema",
  ];
  const hasTechnicalTerms = technicalTerms.some((term) =>
    query.toLowerCase().includes(term),
  );

  // Check if query is question-like (starts with question words)
  const questionWords = ["what", "why", "how", "when", "where", "who"];
  const isQuestion = questionWords.some((word) =>
    query.toLowerCase().startsWith(word),
  );

  if (hasTechnicalTerms) {
    // Keyword-heavy query: use more lexical search
    return { semantic: 0.4, lexical: 0.6 };
  } else if (isQuestion) {
    // Question query: use more semantic search
    return { semantic: 0.7, lexical: 0.3 };
  } else {
    // Default: balanced
    return { semantic: 0.6, lexical: 0.4 };
  }
}

export async function DynamicWeightChatAPI(request: NextRequest) {
  try {
    const { sessionId } = getOrCreateSessionId(request);
    const { question } = await request.json();

    if (!isStoreReady(sessionId)) {
      return NextResponse.json(
        { error: "No documents indexed yet" },
        { status: 400 },
      );
    }

    // Get optimal weights based on query
    const weights = getOptimalWeights(question);
    console.log(
      `Query weights - Semantic: ${weights.semantic}, Lexical: ${weights.lexical}`,
    );

    const resultsWithScores = await hybridSearchWithScore(
      sessionId,
      question,
      4,
      {
        semanticWeight: weights.semantic,
        lexicalWeight: weights.lexical,
      },
    );

    const chunks: Document[] = resultsWithScores.map(([doc]) => doc);
    const context = chunks
      .map((chunk, i) => `[Source ${i + 1}]:\n${chunk.pageContent}`)
      .join("\n\n---\n\n");

    const response = await llm.invoke([
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ]);

    const resp = NextResponse.json({
      answer: response.content,
      weights,
      sourceCount: chunks.length,
    });

    setSessionCookie(resp, sessionId);
    return resp;
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}

// ============================================================================
// EXAMPLE 4: Fallback Strategy
// ============================================================================

/**
 * Use hybrid search, but fallback to semantic search if needed
 */
export async function RobustHybridChatAPI(request: NextRequest) {
  try {
    const { sessionId } = getOrCreateSessionId(request);
    const { question } = await request.json();

    if (!isStoreReady(sessionId)) {
      return NextResponse.json(
        { error: "No documents indexed yet" },
        { status: 400 },
      );
    }

    let results;
    try {
      // Try hybrid search first
      results = await hybridSearchWithScore(sessionId, question, 4, {
        semanticWeight: 0.6,
        lexicalWeight: 0.4,
      });

      // Check if we got meaningful results
      if (results.length === 0 || results[0][1] > 0.8) {
        console.warn(
          "Hybrid search returned poor results, using semantic fallback",
        );
        // Fallback to semantic search only
        const { similaritySearchWithScore } = await import("@/lib/vectorStore");
        results = await similaritySearchWithScore(sessionId, question, 4);
      }
    } catch (error) {
      console.error("Hybrid search failed:", error);
      const { similaritySearchWithScore } = await import("@/lib/vectorStore");
      results = await similaritySearchWithScore(sessionId, question, 4);
    }

    const chunks: Document[] = results.map(([doc]) => doc);
    const context = chunks
      .map((chunk, i) => `[Source ${i + 1}]:\n${chunk.pageContent}`)
      .join("\n\n---\n\n");

    const response = await llm.invoke([
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ]);

    const resp = NextResponse.json({
      answer: response.content,
      resultCount: chunks.length,
    });

    setSessionCookie(resp, sessionId);
    return resp;
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}

// ============================================================================
// CONFIGURATION PRESETS
// ============================================================================

export const HybridSearchPresets = {
  // Balanced - good general purpose combination
  balanced: {
    semanticWeight: 0.5,
    lexicalWeight: 0.5,
    description: "Equal weight to both semantic and lexical matching",
  },

  // Semantic Heavy - for conceptual/meaning-based queries
  semanticHeavy: {
    semanticWeight: 0.7,
    lexicalWeight: 0.3,
    description: "Prioritize semantic meaning over keyword matching",
  },

  // Lexical Heavy - for keyword/technical queries
  lexicalHeavy: {
    semanticWeight: 0.4,
    lexicalWeight: 0.6,
    description: "Prioritize exact keyword matching",
  },

  // Semantic Only - fallback, no BM25
  semanticOnly: {
    semanticWeight: 1.0,
    lexicalWeight: 0.0,
    description: "Pure semantic search (no BM25)",
  },

  // Technical Documentation
  technical: {
    semanticWeight: 0.55,
    lexicalWeight: 0.45,
    description: "Balanced for technical docs with specific terminology",
  },

  // FAQ/Knowledge Base
  faqMode: {
    semanticWeight: 0.65,
    lexicalWeight: 0.35,
    description: "Good for FAQ-style content",
  },
} as const;
