import { MemoryVectorStore } from "./MemoryVectorStore";
import { OpenAIEmbeddings } from "@langchain/openai";

let vectorStoreInstance: MemoryVectorStore | null = null;
let isReady = false;
let ingestedUrl = "";
let documentCount = 0;

const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export function getStore(): MemoryVectorStore | null {
  return vectorStoreInstance;
}

export function setStore(store: MemoryVectorStore) {
  vectorStoreInstance = store;
  isReady = true;
}

export function resetStore() {
  vectorStoreInstance = null;
  isReady = false;
  ingestedUrl = "";
  documentCount = 0;
}

export function isStoreReady(): boolean {
  return isReady && vectorStoreInstance !== null;
}

export function getEmbeddings(): OpenAIEmbeddings {
  return embeddings;
}

export function setIngestedUrl(url: string) {
  ingestedUrl = url;
}

export function getIngestedUrl(): string {
  return ingestedUrl;
}

export function setDocumentCount(count: number) {
  documentCount = count;
}

export function getDocumentCount(): number {
  return documentCount;
}
