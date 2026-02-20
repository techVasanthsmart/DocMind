import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import {
  getIngestedUrl,
  getSuggestionContext,
  isStoreReady,
} from "@/lib/vectorStore";
import { getOrCreateSessionId, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.2,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

function fallbackSuggestions(url: string): string[] {
  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return "this site";
    }
  })();

  return [
    `What is ${host} about?`,
    "What are the main sections or topics covered?",
    "Summarize the key takeaways in 5 bullet points.",
    "What actions should a visitor take next (links, signup, contact)?",
  ];
}

export async function GET(request: NextRequest) {
  const { sessionId, isNew } = getOrCreateSessionId(request);
  const url = getIngestedUrl(sessionId);
  if (!url) {
    const response = NextResponse.json({
      suggestions: fallbackSuggestions("this site"),
    });
    if (isNew) setSessionCookie(response, sessionId);
    return response;
  }

  if (!isStoreReady(sessionId)) {
    const response = NextResponse.json({ suggestions: fallbackSuggestions(url) });
    if (isNew) setSessionCookie(response, sessionId);
    return response;
  }

  const context = getSuggestionContext(sessionId).trim();
  if (!context) {
    const response = NextResponse.json({ suggestions: fallbackSuggestions(url) });
    if (isNew) setSessionCookie(response, sessionId);
    return response;
  }

  try {
    const prompt = `You generate suggested questions for a user to ask about an ingested website.

URL: ${url}

Context excerpt (from the website):
"""
${context}
"""

Return EXACTLY a JSON array of 4 short questions (strings). Rules:
- Each question must be answerable from the context excerpt.
- Make them specific to what the site contains (avoid generic "uploaded content" wording).
- No numbering, no extra text, only valid JSON.`;

    const response = await llm.invoke(prompt);
    const text = typeof response.content === "string" ? response.content : "";

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    const jsonSlice = start >= 0 && end > start ? text.slice(start, end + 1) : text;

    const parsed = JSON.parse(jsonSlice) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length >= 4 &&
      parsed.every((s) => typeof s === "string" && s.trim().length > 0)
    ) {
      const response = NextResponse.json({ suggestions: parsed.slice(0, 4) });
      if (isNew) setSessionCookie(response, sessionId);
      return response;
    }
  } catch (e) {
    console.error("Suggestions error:", e);
  }

  const response = NextResponse.json({ suggestions: fallbackSuggestions(url) });
  if (isNew) setSessionCookie(response, sessionId);
  return response;
}
