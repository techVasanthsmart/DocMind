import { NextRequest, NextResponse } from "next/server";
import { resetStore } from "@/lib/vectorStore";
import { getOrCreateSessionId, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

/**
 * DELETE /api/session
 * Called via fetch({ keepalive: true }) on beforeunload / tab close / browser close.
 * Immediately deletes the Pinecone namespace for the current session.
 */
export async function DELETE(request: NextRequest) {
  const { sessionId } = getOrCreateSessionId(request);

  await resetStore(sessionId);

  const response = new NextResponse(null, { status: 204 });
  setSessionCookie(response, sessionId);
  return response;
}
