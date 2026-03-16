/**
 * Hybrid Search Implementation
 * Combines BM25 (lexical) and semantic (embedding-based) search
 * for improved document retrieval.
 */

import { Document } from "@langchain/core/documents";
import { BM25 } from "./bm25Search";

export interface HybridSearchOptions {
  semanticWeight: number; // 0-1, weight for semantic similarity
  lexicalWeight: number; // 0-1, weight for BM25 lexical search
  k: number; // Number of results to return
}

export interface HybridSearchResult {
  document: Document;
  semanticScore: number; // 0-1 (normalized)
  lexicalScore: number; // 0-1 (normalized)
  hybridScore: number; // Combined score (0-1)
  distance: number; // For compatibility with existing code (1 - hybridScore)
}

/**
 * Normalize scores to 0-1 range using min-max normalization
 */
function normalizeScores(scores: number[]): number[] {
  if (scores.length === 0) return [];
  if (scores.every((s) => s === 0)) return scores.map(() => 0);

  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;

  return scores.map((s) => (s - min) / range);
}

/**
 * Calculate rank fusion score (RRF - Reciprocal Rank Fusion)
 * Combines rankings from different search methods
 */
function calculateRRF(semanticRank: number, lexicalRank: number): number {
  const k = 60; // RRF parameter (usually 60)
  const semanticRRF = 1 / (k + semanticRank);
  const lexicalRRF = 1 / (k + lexicalRank);
  return semanticRRF + lexicalRRF;
}

export class HybridSearchEngine {
  private documents: Document[];
  private bm25: BM25;
  private defaultOptions: HybridSearchOptions = {
    semanticWeight: 0.6, // 60% semantic, 40% lexical by default
    lexicalWeight: 0.4,
    k: 10,
  };

  constructor(documents: Document[]) {
    this.documents = documents;
    // Extract text content for BM25 indexing
    const texts = documents.map((doc) => doc.pageContent);
    this.bm25 = new BM25(texts);
  }

  /**
   * Perform hybrid search combining semantic and lexical scores
   */
  hybridSearch(
    semanticResults: Array<[Document, number]>, // [doc, distance]
    query: string,
    options?: Partial<HybridSearchOptions>,
  ): HybridSearchResult[] {
    const opts = { ...this.defaultOptions, ...options };

    // Normalize semantic scores
    const semanticScores = semanticResults.map(([, distance]) => 1 - distance); // Convert distance to similarity
    const normalizedSemanticScores = normalizeScores(semanticScores);

    // Create a map for quick lookup of semantic results
    const semanticMap = new Map<string, number>();
    semanticResults.forEach(([doc], idx) => {
      const docId = this.getDocId(doc);
      semanticMap.set(docId, normalizedSemanticScores[idx]);
    });

    // Perform BM25 search on all documents
    const bm25Results = this.bm25.search(query, opts.k * 3); // Get more results for merging
    const bm25Scores = bm25Results.map((result) => result.score);
    const normalizedBM25Scores = normalizeScores(bm25Scores);

    // Create result list with hybrid scores
    const resultMap = new Map<string, HybridSearchResult>();

    // Add results from both search methods
    bm25Results.forEach((bm25Result, idx) => {
      const doc = this.documents[bm25Result.index];
      const docId = this.getDocId(doc);

      const semanticScore = semanticMap.get(docId) ?? 0;
      const lexicalScore = normalizedBM25Scores[idx];

      // Combine scores using weighted average
      const hybridScore =
        opts.semanticWeight * semanticScore + opts.lexicalWeight * lexicalScore;

      resultMap.set(docId, {
        document: doc,
        semanticScore,
        lexicalScore,
        hybridScore,
        distance: 1 - hybridScore,
      });
    });

    // Add remaining semantic results not found by BM25
    semanticResults.forEach(([doc], idx) => {
      const docId = this.getDocId(doc);
      if (!resultMap.has(docId)) {
        const semanticScore = normalizedSemanticScores[idx];
        const lexicalScore = 0;

        const hybridScore =
          opts.semanticWeight * semanticScore +
          opts.lexicalWeight * lexicalScore;

        resultMap.set(docId, {
          document: doc,
          semanticScore,
          lexicalScore,
          hybridScore,
          distance: 1 - hybridScore,
        });
      }
    });

    // Sort by hybrid score and return top-k
    const results = Array.from(resultMap.values()).sort(
      (a, b) => b.hybridScore - a.hybridScore,
    );

    return results.slice(0, opts.k);
  }

  /**
   * Reciprocal Rank Fusion method - alternative to weighted averaging
   */
  hybridSearchRRF(
    semanticResults: Array<[Document, number]>,
    query: string,
    k: number = 10,
  ): HybridSearchResult[] {
    // Perform BM25 search
    const bm25Results = this.bm25.search(query, k * 2);

    // Create ranking maps
    const semanticRankMap = new Map<string, number>();
    semanticResults.forEach(([doc], rank) => {
      semanticRankMap.set(this.getDocId(doc), rank);
    });

    const bm25RankMap = new Map<string, number>();
    bm25Results.forEach((result, rank) => {
      bm25RankMap.set(this.getDocId(this.documents[result.index]), rank);
    });

    // Calculate RRF scores
    const resultMap = new Map<string, HybridSearchResult>();

    // Process all unique documents from both results
    const allDocIds = new Set<string>();
    semanticRankMap.forEach((_, docId) => allDocIds.add(docId));
    bm25RankMap.forEach((_, docId) => allDocIds.add(docId));

    for (const docId of allDocIds) {
      const semanticRank = semanticRankMap.get(docId) ?? 999;
      const lexicalRank = bm25RankMap.get(docId) ?? 999;

      const rrfScore = calculateRRF(semanticRank, lexicalRank);

      // Find the actual document
      let doc: Document | undefined;
      if (semanticRank !== 999) {
        doc = semanticResults[semanticRank][0];
      } else if (lexicalRank !== 999) {
        doc = this.documents[bm25Results[lexicalRank].index];
      }

      if (doc) {
        resultMap.set(docId, {
          document: doc,
          semanticScore: semanticRank !== 999 ? 1 / (60 + semanticRank) : 0,
          lexicalScore: lexicalRank !== 999 ? 1 / (60 + lexicalRank) : 0,
          hybridScore: rrfScore,
          distance: 1 - rrfScore, // Normalize to document distance format
        });
      }
    }

    const results = Array.from(resultMap.values()).sort(
      (a, b) => b.hybridScore - a.hybridScore,
    );

    return results.slice(0, k);
  }

  /**
   * Generate unique document ID for tracking
   */
  private getDocId(doc: Document): string {
    return (
      (doc.metadata?.id as string) || `${doc.pageContent.slice(0, 50)}_hash`
    );
  }

  /**
   * Update documents (useful for dynamic content)
   */
  updateDocuments(documents: Document[]): void {
    this.documents = documents;
    const texts = documents.map((doc) => doc.pageContent);
    this.bm25 = new BM25(texts);
  }
}
