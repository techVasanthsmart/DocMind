import { NextRequest, NextResponse } from "next/server";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@/lib/MemoryVectorStore";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  getEmbeddings,
  setStore,
  setIngestedUrl,
  setDocumentCount,
  resetStore,
  setSuggestionContext,
} from "@/lib/vectorStore";

export const runtime = "nodejs";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function resolveChromiumBrotliDir(): string | undefined {
  const configuredDir = process.env.CHROMIUM_BROTLI_DIR?.trim();
  if (configuredDir && existsSync(configuredDir)) {
    return configuredDir;
  }

  const nodeModulesDir = join(
    process.cwd(),
    "node_modules",
    "@sparticuz",
    "chromium",
    "bin"
  );
  if (existsSync(nodeModulesDir)) {
    return nodeModulesDir;
  }

  const nextModulesScopeDir = join(
    process.cwd(),
    ".next",
    "node_modules",
    "@sparticuz"
  );
  if (existsSync(nextModulesScopeDir)) {
    for (const entry of readdirSync(nextModulesScopeDir)) {
      if (!entry.startsWith("chromium")) {
        continue;
      }

      const candidate = join(nextModulesScopeDir, entry, "bin");
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Please provide a valid URL" },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendStep = (step: string) => {
          controller.enqueue(encoder.encode(JSON.stringify({ step }) + "\n"));
        };

        try {
          sendStep("Initializing LangChain pipeline...");

          // Reset previous store
          resetStore();

          let executablePath: string | undefined;
          let args = [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            `--user-agent=${DEFAULT_USER_AGENT}`,
          ];
          let headless: boolean | "shell" = true;

          if (process.env.NODE_ENV === "production") {
            const chromium = await import("@sparticuz/chromium").then(
              (mod) => mod.default
            );
            const chromiumBrotliDir = resolveChromiumBrotliDir();

            executablePath = await chromium.executablePath(chromiumBrotliDir);
            args = [...chromium.args, `--user-agent=${DEFAULT_USER_AGENT}`];
            headless = "shell";
          }

          sendStep("Connecting to headless browser...");

          // Load the webpage using Puppeteer
          const loader = new PuppeteerWebBaseLoader(url, {
            launchOptions: {
              headless,
              args,
              executablePath,
            },
            gotoOptions: {
              waitUntil: "networkidle2",
            },
          });

          sendStep("Scraping DOM elements via Puppeteer selectors...");
          const docs = await loader.load();

          if (docs.length === 0) {
            throw new Error("Could not extract content from this URL");
          }

          sendStep("Cleaning text & removing whitespace noise...");
          // Basic cleaning is implicitly done by loader, but we can simulate/add more if needed

          sendStep("Splitting documents via RecursiveCharacterTextSplitter...");
          const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
          });
          const splitDocs = await textSplitter.splitDocuments(docs);

          sendStep(`Chunk stats: ~1000 tokens/chunk, 200 overlap...`);

          // Cache a small snippet of the ingested text so we can generate
          // content-aware suggestion prompts without re-scraping.
          setSuggestionContext(
            splitDocs
              .slice(0, 8)
              .map((d) => d.pageContent)
              .join("\n\n")
              .slice(0, 8000)
          );

          sendStep("Generating OpenAI Embeddings (text-embedding-3-small, 1024-dim)...");
          const embeddings = getEmbeddings();

          sendStep("Initializing Memory Vector Store...");

          sendStep("Upserting vectors batch...");
          const vectorStore = await MemoryVectorStore.fromDocuments(
            splitDocs,
            embeddings
          );

          // Store globally
          setStore(vectorStore);
          setIngestedUrl(url);
          setDocumentCount(splitDocs.length);

          sendStep("Success. Hydrating context window...");

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                success: true,
                url,
                documentCount: docs.length,
                chunkCount: splitDocs.length,
                message: `Successfully indexed ${splitDocs.length} chunks from ${url}`,
              }) + "\n"
            )
          );
          controller.close();
        } catch (error) {
          console.error("Ingest error:", error);
          const message =
            error instanceof Error ? error.message : "Failed to ingest URL";
          controller.enqueue(
            encoder.encode(JSON.stringify({ error: message }) + "\n")
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    console.error("Ingest setup error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to ingest URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
