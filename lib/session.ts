import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "docmind_session";

export function getOrCreateSessionId(
  request: NextRequest
): { sessionId: string; isNew: boolean } {
  const existing = request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim();
  if (existing) {
    return { sessionId: existing, isNew: false };
  }

  return { sessionId: crypto.randomUUID(), isNew: true };
}

export function setSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

