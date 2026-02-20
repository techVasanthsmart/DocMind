import { NextRequest, NextResponse } from "next/server";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@/lib/MemoryVectorStore";
import {
  getEmbeddings,
  setStore,
  setIngestedUrl,
  setDocumentCount,
  resetStore,
} from "@/lib/vectorStore";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Please provide a valid URL" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Reset previous store
    resetStore();

    // Load the webpage using Puppeteer for better dynamic content support
    const loader = new PuppeteerWebBaseLoader(url, {
      launchOptions: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
      gotoOptions: {
        waitUntil: "networkidle2",
      },
    });
    const docs = await loader.load();

    if (docs.length === 0) {
      return NextResponse.json(
        { error: "Could not extract content from this URL" },
        { status: 400 }
      );
    }

    // Split into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splitDocs = await textSplitter.splitDocuments(docs);

    // Create vector store from chunks
    const embeddings = getEmbeddings();
    const vectorStore = await MemoryVectorStore.fromDocuments(
      splitDocs,
      embeddings
    );

    // Store globally
    setStore(vectorStore);
    setIngestedUrl(url);
    setDocumentCount(splitDocs.length);

    return NextResponse.json({
      success: true,
      url,
      documentCount: docs.length,
      chunkCount: splitDocs.length,
      message: `Successfully indexed ${splitDocs.length} chunks from ${url}`,
    });
  } catch (error: unknown) {
    console.error("Ingest error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to ingest URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
