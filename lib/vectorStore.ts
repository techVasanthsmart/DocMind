import { MemoryVectorStore } from "./MemoryVectorStore";
import { HybridSearchEngine, type HybridSearchOptions } from "./hybridSearch";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { Pinecone, type Index } from "@pinecone-database/pinecone";
import crypto from "node:crypto";

type StoreProvider = "pinecone" | "memory";

type SessionState = {
  provider: StoreProvider;
  isReady: boolean;
  ingestedUrl: string;
  documentCount: number;
  suggestionContext: string;
  lastActiveAt: number;
  memoryStore?: MemoryVectorStore;
  hybridSearchEngine?: HybridSearchEngine;
  allDocuments?: Document[]; // Store all documents for hybrid search
};

type PineconeChunkMetadata = {
  text: string;
  url: string;
  chunk: number;
  source?: string;
};

const DEFAULT_PINECONE_HOST =
  "https://text-embedding-3-small-ahn1c8v.svc.aped-4627-b74a.pinecone.io";

const CONFIGURED_EMBEDDING_DIMENSIONS = (() => {
  const raw = process.env.OPENAI_EMBEDDING_DIMENSIONS?.trim();
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
})();

const SESSION_IDLE_TTL_MINUTES = Number.parseInt(
  process.env.SESSION_IDLE_TTL_MINUTES ?? "30",
  10,
);
const SESSION_IDLE_TTL_MS = Number.isFinite(SESSION_IDLE_TTL_MINUTES)
  ? Math.max(1, SESSION_IDLE_TTL_MINUTES) * 60_000
  : 30 * 60_000;

let lastCleanupAt = 0;
const sessions = new Map<string, SessionState>();

const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  openAIApiKey: process.env.OPENAI_API_KEY,
  dimensions: CONFIGURED_EMBEDDING_DIMENSIONS,
});

let pineconeIndex: Index<PineconeChunkMetadata> | null = null;
let pineconeIndexDimension: number | null = null;

function createPineconeClient() {
  const apiKey = process.env.PINECONE_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return new Pinecone({ apiKey });
}

function getPineconeIndex() {
  if (pineconeIndex) return pineconeIndex;

  const pc = createPineconeClient();
  if (!pc) return null;

  const host = (
    process.env.PINECONE_HOST?.trim() || DEFAULT_PINECONE_HOST
  ).trim();
  if (!host) return null;

  pineconeIndex = pc.index<PineconeChunkMetadata>({ host });
  return pineconeIndex;
}

async function ensurePineconeDimensions(index: Index<PineconeChunkMetadata>) {
  if (pineconeIndexDimension !== null) {
    if (embeddings.dimensions !== pineconeIndexDimension) {
      embeddings.dimensions = pineconeIndexDimension;
    }
    return pineconeIndexDimension;
  }

  const stats = await index.describeIndexStats();
  const dim = stats?.dimension;
  if (typeof dim === "number" && Number.isFinite(dim) && dim > 0) {
    pineconeIndexDimension = dim;
    if (embeddings.dimensions !== dim) {
      embeddings.dimensions = dim;
    }
    return dim;
  }

  return null;
}

function cleanupExpiredSessions(now: number) {
  if (now - lastCleanupAt < 60_000) return;
  lastCleanupAt = now;

  const index = getPineconeIndex();
  for (const [sessionId, state] of sessions) {
    if (now - state.lastActiveAt <= SESSION_IDLE_TTL_MS) continue;

    if (state.provider === "pinecone" && index) {
      void index.deleteNamespace(sessionId).catch((e: unknown) => {
        if (
          e &&
          typeof e === "object" &&
          "name" in e &&
          e.name === "PineconeNotFoundError"
        ) {
          return;
        }
        console.error("Pinecone cleanup failed:", e);
      });
    }

    sessions.delete(sessionId);
  }
}

function touchSession(sessionId: string): SessionState {
  const now = Date.now();
  cleanupExpiredSessions(now);

  const existing = sessions.get(sessionId);
  if (existing) {
    existing.lastActiveAt = now;
    return existing;
  }

  const provider: StoreProvider = getPineconeIndex() ? "pinecone" : "memory";
  const created: SessionState = {
    provider,
    isReady: false,
    ingestedUrl: "",
    documentCount: 0,
    suggestionContext: "",
    lastActiveAt: now,
  };
  sessions.set(sessionId, created);
  return created;
}

export function getEmbeddings(): OpenAIEmbeddings {
  return embeddings;
}

export function isStoreReady(sessionId: string): boolean {
  const state = touchSession(sessionId);
  return state.isReady;
}

export async function resetStore(sessionId: string) {
  const state = touchSession(sessionId);
  state.isReady = false;
  state.ingestedUrl = "";
  state.documentCount = 0;
  state.suggestionContext = "";
  state.memoryStore = undefined;
  state.hybridSearchEngine = undefined;
  state.allDocuments = undefined;

  const index = getPineconeIndex();
  if (state.provider === "pinecone" && index) {
    try {
      await index.deleteNamespace(sessionId);
    } catch (e: unknown) {
      if (
        e &&
        typeof e === "object" &&
        "name" in e &&
        e.name === "PineconeNotFoundError"
      ) {
        return;
      }
      throw e;
    }
  }
}

export function getIngestedUrl(sessionId: string): string {
  return touchSession(sessionId).ingestedUrl;
}

export function getSuggestionContext(sessionId: string): string {
  return touchSession(sessionId).suggestionContext;
}

export async function indexDocuments(
  sessionId: string,
  url: string,
  splitDocs: Document[],
) {
  const state = touchSession(sessionId);
  const context = splitDocs
    .slice(0, 8)
    .map((d) => d.pageContent)
    .join("\n\n")
    .slice(0, 8000);

  state.ingestedUrl = url;
  state.documentCount = splitDocs.length;
  state.suggestionContext = context;
  state.allDocuments = splitDocs; // Store all documents for hybrid search

  // Initialize hybrid search engine
  state.hybridSearchEngine = new HybridSearchEngine(splitDocs);

  const index = getPineconeIndex();
  if (state.provider === "pinecone" && index) {
    await ensurePineconeDimensions(index);
    const texts = splitDocs.map((d) => d.pageContent);
    const vectors = await embeddings.embedDocuments(texts);

    const records = vectors.map((values, i) => {
      const doc = splitDocs[i];
      const metadata: PineconeChunkMetadata = {
        text: doc.pageContent,
        url,
        chunk: i,
      };
      const source = doc.metadata?.source;
      if (typeof source === "string" && source.trim()) {
        metadata.source = source.trim();
      }

      return {
        id: `${sessionId}:${i}:${crypto.randomUUID()}`,
        values,
        metadata,
      };
    });

    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await index.upsert({ namespace: sessionId, records: batch });
    }

    state.isReady = true;
    return { provider: "pinecone" as const };
  }

  const memoryStore = await MemoryVectorStore.fromDocuments(
    splitDocs,
    embeddings,
  );
  state.memoryStore = memoryStore;
  state.isReady = true;
  state.provider = "memory";
  return { provider: "memory" as const };
}

export async function similaritySearchWithScore(
  sessionId: string,
  query: string,
  k: number,
): Promise<Array<[Document, number]>> {
  const state = touchSession(sessionId);
  if (!state.isReady) return [];

  const index = getPineconeIndex();
  if (state.provider === "pinecone" && index) {
    await ensurePineconeDimensions(index);
    const vector = await embeddings.embedQuery(query);
    const res = await index.query({
      namespace: sessionId,
      vector,
      topK: k,
      includeMetadata: true,
    });

    const matches = Array.isArray(res.matches) ? res.matches : [];
    return matches
      .filter((m) => m && m.metadata && typeof m.metadata.text === "string")
      .map((m) => {
        const similarity = typeof m.score === "number" ? m.score : 0;
        const distance = Math.max(0, 1 - similarity);
        const doc = new Document({
          pageContent: m.metadata!.text,
          metadata: {
            url: m.metadata!.url,
            chunk: m.metadata!.chunk,
            source: m.metadata!.source,
            id: m.id,
          },
        });
        return [doc, distance];
      });
  }

  const store = state.memoryStore;
  if (!store) return [];
  return store.similaritySearchWithScore(query, k);
}

/**
 * Hybrid search combining BM25 (lexical) + semantic similarity
 * Returns results sorted by combined hybrid score
 */
export async function hybridSearchWithScore(
  sessionId: string,
  query: string,
  k: number = 4,
  options?: Partial<HybridSearchOptions>,
): Promise<Array<[Document, number]>> {
  const state = touchSession(sessionId);
  if (!state.isReady || !state.hybridSearchEngine) return [];

  // First, get semantic results
  const semanticResults = await similaritySearchWithScore(
    sessionId,
    query,
    k * 2,
  );

  // Perform hybrid search
  const hybridResults = state.hybridSearchEngine.hybridSearch(
    semanticResults,
    query,
    { k, ...options },
  );

  // Convert to format compatible with existing code
  return hybridResults.map((result) => [result.document, result.distance]);
}

/**
 * Hybrid search using Reciprocal Rank Fusion (RRF)
 * Alternative method that fuses rankings instead of combining scores
 */
export async function hybridSearchRRFWithScore(
  sessionId: string,
  query: string,
  k: number = 4,
): Promise<Array<[Document, number]>> {
  const state = touchSession(sessionId);
  if (!state.isReady || !state.hybridSearchEngine) return [];

  // First, get semantic results
  const semanticResults = await similaritySearchWithScore(
    sessionId,
    query,
    k * 2,
  );

  // Perform RRF hybrid search
  const hybridResults = state.hybridSearchEngine.hybridSearchRRF(
    semanticResults,
    query,
    k,
  );

  // Convert to format compatible with existing code
  return hybridResults.map((result) => [result.document, result.distance]);
}

/**
 * Get detailed hybrid search results with all scoring information
 * Useful for debugging and understanding which method contributed more
 */
export async function getDetailedHybridSearchResults(
  sessionId: string,
  query: string,
  k: number = 4,
  options?: Partial<HybridSearchOptions>,
): Promise<
  Array<{
    document: Document;
    semanticScore: number;
    lexicalScore: number;
    hybridScore: number;
  }>
> {
  const state = touchSession(sessionId);
  if (!state.isReady || !state.hybridSearchEngine) return [];

  // First, get semantic results
  const semanticResults = await similaritySearchWithScore(
    sessionId,
    query,
    k * 2,
  );

  // Perform hybrid search
  const hybridResults = state.hybridSearchEngine.hybridSearch(
    semanticResults,
    query,
    { k, ...options },
  );

  return hybridResults.map((result) => ({
    document: result.document,
    semanticScore: result.semanticScore,
    lexicalScore: result.lexicalScore,
    hybridScore: result.hybridScore,
  }));
}
