/**
 * BM25 Search Implementation
 * A simple yet effective full-text search algorithm that ranks documents
 * based on term frequency and inverse document frequency.
 */

export interface BM25Result {
  index: number;
  score: number;
  text: string;
}

export class BM25 {
  private documents: string[];
  private tokenizedDocs: string[][];
  private docFreq: Map<string, number>;
  private avgDocLength: number;
  private idf: Map<string, number>;

  // BM25 parameters
  private k1: number; // controls term frequency saturation (default: 1.5)
  private b: number; // controls length normalization (default: 0.75)

  constructor(documents: string[], k1: number = 1.5, b: number = 0.75) {
    this.documents = documents;
    this.k1 = k1;
    this.b = b;
    this.tokenizedDocs = [];
    this.docFreq = new Map();
    this.idf = new Map();

    this.index();
    this.computeIDF();

    // Calculate average document length
    this.avgDocLength =
      this.tokenizedDocs.length > 0
        ? this.tokenizedDocs.reduce((sum, doc) => sum + doc.length, 0) /
          this.tokenizedDocs.length
        : 0;
  }

  /**
   * Tokenize and normalize text
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Remove special characters
      .split(/\s+/)
      .filter((token) => token.length > 0 && !this.isStopword(token));
  }

  /**
   * Simple English stopwords to filter out common terms
   */
  private isStopword(token: string): boolean {
    const stopwords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "can",
      "this",
      "that",
      "these",
      "those",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "what",
      "which",
      "who",
      "when",
      "where",
      "why",
      "how",
    ]);
    return stopwords.has(token);
  }

  /**
   * Index all documents
   */
  private index(): void {
    for (const doc of this.documents) {
      const tokens = this.tokenize(doc);
      this.tokenizedDocs.push(tokens);

      // Build document frequency map
      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        this.docFreq.set(token, (this.docFreq.get(token) ?? 0) + 1);
      }
    }
  }

  /**
   * Compute IDF (Inverse Document Frequency) for all terms
   */
  private computeIDF(): void {
    const totalDocs = this.documents.length;
    for (const [term, freq] of this.docFreq) {
      // IDF = log((N - df + 0.5) / (df + 0.5))
      const idf = Math.log((totalDocs - freq + 0.5) / (freq + 0.5));
      this.idf.set(term, idf);
    }
  }

  /**
   * Calculate BM25 score for a document
   */
  private calculateScore(docIndex: number, tokens: string[]): number {
    const doc = this.tokenizedDocs[docIndex];
    const docLength = doc.length;
    let score = 0;

    // Count term frequencies in the document
    const termFreq = new Map<string, number>();
    for (const token of doc) {
      termFreq.set(token, (termFreq.get(token) ?? 0) + 1);
    }

    // Calculate BM25 score
    for (const token of tokens) {
      const idf = this.idf.get(token) ?? 0;
      const freq = termFreq.get(token) ?? 0;

      // BM25 formula:
      // Score = IDF * (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * (docLength / avgDocLength)))
      const numerator = freq * (this.k1 + 1);
      const denominator =
        freq +
        this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));
      score += idf * (numerator / denominator);
    }

    return score;
  }

  /**
   * Search for documents matching the query
   */
  search(query: string, topK: number = 10): BM25Result[] {
    const queryTokens = this.tokenize(query);
    const scores: BM25Result[] = [];

    for (let i = 0; i < this.documents.length; i++) {
      const score = this.calculateScore(i, queryTokens);
      if (score > 0) {
        scores.push({
          index: i,
          score,
          text: this.documents[i],
        });
      }
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK);
  }

  /**
   * Get score for a specific query-document pair
   */
  getScore(query: string, docIndex: number): number {
    if (docIndex < 0 || docIndex >= this.documents.length) return 0;
    const queryTokens = this.tokenize(query);
    return this.calculateScore(docIndex, queryTokens);
  }
}
