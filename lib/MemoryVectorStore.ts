import { Document } from "@langchain/core/documents";
import { maximalMarginalRelevance } from "@langchain/core/utils/math";
import { VectorStore } from "@langchain/core/vectorstores";
import { EmbeddingsInterface } from "@langchain/core/embeddings";

/**
 * Returns the average of cosine distances between vectors a and b
 * @param a - first vector
 * @param b - second vector
 *
 */
export function cosine(a: number[], b: number[]) {
  let p = 0;
  let p2 = 0;
  let q2 = 0;
  for (let i = 0; i < a.length; i++) {
    p += a[i] * b[i];
    p2 += a[i] * a[i];
    q2 += b[i] * b[i];
  }
  return p / (Math.sqrt(p2) * Math.sqrt(q2));
}

export interface MemoryVector {
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  id?: string;
}

export interface MemoryVectorStoreArgs {
  similarity?: typeof cosine;
}

/**
 * In-memory, ephemeral vector store.
 */
export class MemoryVectorStore extends VectorStore {
  memoryVectors: MemoryVector[] = [];
  similarity: typeof cosine;

  _vectorstoreType(): string {
    return "memory";
  }

  constructor(
    embeddings: EmbeddingsInterface,
    { similarity, ...rest }: MemoryVectorStoreArgs = {}
  ) {
    super(embeddings, rest);
    this.similarity = similarity ?? cosine;
  }

  /**
   * Method to add documents to the memory vector store. It extracts the
   * text from each document, generates embeddings for them, and adds the
   * resulting vectors to the store.
   * @param documents Array of `Document` instances to be added to the store.
   * @returns Promise that resolves when all documents have been added.
   */
  async addDocuments(documents: Document[]): Promise<void> {
    const texts = documents.map(({ pageContent }) => pageContent);
    return this.addVectors(
      await this.embeddings.embedDocuments(texts),
      documents
    );
  }

  /**
   * Method to add vectors to the memory vector store. It creates
   * `MemoryVector` instances for each vector and document pair and adds
   * them to the store.
   * @param vectors Array of vectors to be added to the store.
   * @param documents Array of `Document` instances corresponding to the vectors.
   * @returns Promise that resolves when all vectors have been added.
   */
  async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
    const memoryVectors = vectors.map((embedding, idx) => ({
      content: documents[idx].pageContent,
      embedding,
      metadata: documents[idx].metadata,
      id: documents[idx].id,
    }));
    this.memoryVectors = this.memoryVectors.concat(memoryVectors);
  }

  async _queryVectors(
    query: number[],
    k: number,
    filter?: (doc: Document) => boolean
  ) {
    const filterFunction = (memoryVector: MemoryVector) => {
      if (!filter) return true;
      return filter(
        new Document({
          metadata: memoryVector.metadata,
          pageContent: memoryVector.content,
          id: memoryVector.id,
        })
      );
    };
    return this.memoryVectors
      .filter(filterFunction)
      .map((vector, index) => ({
        similarity: this.similarity(query, vector.embedding),
        index,
        metadata: vector.metadata,
        content: vector.content,
        embedding: vector.embedding,
        id: vector.id,
      }))
      .sort((a, b) => (a.similarity > b.similarity ? -1 : 0))
      .slice(0, k);
  }

  /**
   * Method to perform a similarity search in the memory vector store. It
   * calculates the similarity between the query vector and each vector in
   * the store, sorts the results by similarity, and returns the top `k`
   * results along with their scores.
   * @param query Query vector to compare against the vectors in the store.
   * @param k Number of top results to return.
   * @param filter Optional filter function to apply to the vectors before performing the search.
   * @returns Promise that resolves with an array of tuples, each containing a `Document` and its similarity score.
   */
  async similaritySearchVectorWithScore(
    query: number[],
    k: number,
    filter?: (doc: Document) => boolean
  ): Promise<[Document, number][]> {
    return (await this._queryVectors(query, k, filter)).map((search) => [
      new Document({
        metadata: search.metadata,
        pageContent: search.content,
        id: search.id,
      }),
      search.similarity,
    ]);
  }

  async maxMarginalRelevanceSearch(
    query: string,
    options: any // Simplified options type
  ): Promise<Document[]> {
    const queryEmbedding = await this.embeddings.embedQuery(query);
    const searches = await this._queryVectors(
      queryEmbedding,
      options.fetchK ?? 20,
      options.filter
    );
    const embeddingList = searches.map((searchResp) => searchResp.embedding);
    
    // safe guard for empty embeddings
    if (embeddingList.length === 0) {
      return [];
    }

    const mmrIndexes = maximalMarginalRelevance(
      queryEmbedding,
      embeddingList,
      options.lambda,
      options.k
    );
    
    return mmrIndexes.map((idx) =>
      new Document({
        metadata: searches[idx].metadata,
        pageContent: searches[idx].content,
        id: searches[idx].id,
      })
    );
  }

  /**
   * Static method to create a `MemoryVectorStore` instance from an array of
   * texts. It creates a `Document` for each text and metadata pair, and
   * adds them to the store.
   * @param texts Array of texts to be added to the store.
   * @param metadatas Array or single object of metadata corresponding to the texts.
   * @param embeddings `Embeddings` instance used to generate embeddings for the texts.
   * @param dbConfig Optional `MemoryVectorStoreArgs` to configure the `MemoryVectorStore` instance.
   * @returns Promise that resolves with a new `MemoryVectorStore` instance.
   */
  static async fromTexts(
    texts: string[],
    metadatas: object[] | object,
    embeddings: EmbeddingsInterface,
    dbConfig?: MemoryVectorStoreArgs
  ): Promise<MemoryVectorStore> {
    const docs: Document[] = [];
    for (let i = 0; i < texts.length; i += 1) {
      const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
      const newDoc = new Document({
        pageContent: texts[i],
        metadata,
      });
      docs.push(newDoc);
    }
    return MemoryVectorStore.fromDocuments(docs, embeddings, dbConfig);
  }

  /**
   * Static method to create a `MemoryVectorStore` instance from an array of
   * `Document` instances. It adds the documents to the store.
   * @param docs Array of `Document` instances to be added to the store.
   * @param embeddings `Embeddings` instance used to generate embeddings for the documents.
   * @param dbConfig Optional `MemoryVectorStoreArgs` to configure the `MemoryVectorStore` instance.
   * @returns Promise that resolves with a new `MemoryVectorStore` instance.
   */
  static async fromDocuments(
    docs: Document[],
    embeddings: EmbeddingsInterface,
    dbConfig?: MemoryVectorStoreArgs
  ): Promise<MemoryVectorStore> {
    const instance = new this(embeddings, dbConfig);
    await instance.addDocuments(docs);
    return instance;
  }

  /**
   * Static method to create a `MemoryVectorStore` instance from an existing
   * index. It creates a new `MemoryVectorStore` instance without adding any
   * documents or vectors.
   * @param embeddings `Embeddings` instance used to generate embeddings for the documents.
   * @param dbConfig Optional `MemoryVectorStoreArgs` to configure the `MemoryVectorStore` instance.
   * @returns Promise that resolves with a new `MemoryVectorStore` instance.
   */
  static async fromExistingIndex(
    embeddings: EmbeddingsInterface,
    dbConfig?: MemoryVectorStoreArgs
  ): Promise<MemoryVectorStore> {
    return new this(embeddings, dbConfig);
  }
}
