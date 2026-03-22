import { NextRequest, NextResponse } from "next/server";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Busboy from "busboy";
import {
  getEmbeddings,
  resetStore,
  indexDocuments,
  isStoreReady,
} from "@/lib/vectorStore";
import { getOrCreateSessionId, setSessionCookie } from "@/lib/session";
import {
  extractTextFromFile,
  createDocumentsFromText,
  validateFileSize,
  validateFileType,
} from "@/lib/fileProcessor";

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
    "bin",
  );
  if (existsSync(nodeModulesDir)) {
    return nodeModulesDir;
  }

  const nextModulesScopeDir = join(
    process.cwd(),
    ".next",
    "node_modules",
    "@sparticuz",
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
    const { sessionId, isNew } = getOrCreateSessionId(request);
    const contentType = request.headers.get("content-type") || "";

    const encoder = new TextEncoder();

    // Determine if this is multipart file upload or JSON URL request
    const isMultipart = contentType.includes("multipart/form-data");

    const stream = new ReadableStream({
      async start(controller) {
        const sendStep = (step: string) => {
          controller.enqueue(encoder.encode(JSON.stringify({ step }) + "\n"));
        };

        try {
          sendStep("Initializing LangChain pipeline...");

          // Only reset store on first ingest; append on subsequent ingests
          if (!isStoreReady(sessionId)) {
            await resetStore(sessionId);
          }

          const allDocs: Document[] = [];
          const sources: Array<{ type: string; name: string; chunks: number }> =
            [];

          if (isMultipart) {
            // Handle file uploads
            sendStep("Parsing file upload...");

            const fileBuffers: Array<{
              filename: string;
              buffer: Buffer;
              mimetype: string;
            }> = [];

            // Parse multipart form data
            await new Promise<void>((resolve, reject) => {
              const bb = Busboy({ headers: { "content-type": contentType } });

              bb.on("file", (fieldname: string, file: any, info: any) => {
                const chunks: Buffer[] = [];

                file.on("data", (data: Buffer) => {
                  chunks.push(data);
                });

                file.on("end", () => {
                  fileBuffers.push({
                    filename: info.filename,
                    buffer: Buffer.concat(chunks),
                    mimetype: info.mimeType || "application/octet-stream",
                  });
                });

                file.on("error", reject);
              });

              bb.on("error", reject);
              bb.on("close", resolve);

              const reader = request.body?.getReader();
              if (!reader) {
                reject(new Error("No request body"));
                return;
              }

              const pump = async (): Promise<void> => {
                const result = await reader.read();
                if (result.done) {
                  bb.end();
                  return;
                }
                bb.write(result.value);
                return pump();
              };

              pump().catch(reject);
            });

            if (fileBuffers.length === 0) {
              throw new Error("No files provided in upload");
            }

            sendStep(`Processing ${fileBuffers.length} file(s)...`);

            // Track errors to provide better diagnostics
            const fileErrors: Array<{ file: string; error: string }> = [];

            // Process each file
            for (const file of fileBuffers) {
              try {
                sendStep(`Validating file: ${file.filename}`);
                validateFileType(file.filename, file.mimetype);
                validateFileSize(file.buffer);

                sendStep(`Extracting text from: ${file.filename}`);
                const text = await extractTextFromFile(
                  file.buffer,
                  file.filename,
                  file.mimetype,
                );

                if (!text || !text.trim()) {
                  throw new Error("Extracted text is empty");
                }

                sendStep(`Creating documents from: ${file.filename}`);
                const fileDocs = createDocumentsFromText(
                  text,
                  file.filename,
                  "file",
                );

                allDocs.push(...fileDocs);
                sources.push({
                  type: "file",
                  name: file.filename,
                  chunks: fileDocs.length,
                });
              } catch (error) {
                const errorMsg =
                  error instanceof Error ? error.message : "Unknown error";
                fileErrors.push({ file: file.filename, error: errorMsg });
                sendStep(`Error processing ${file.filename}: ${errorMsg}`);
                // Continue with other files
              }
            }

            if (allDocs.length === 0) {
              const errorDetails =
                fileErrors.length > 0
                  ? `\n${fileErrors.map((e) => `- ${e.file}: ${e.error}`).join("\n")}`
                  : "";
              throw new Error(
                `Failed to extract content from all files.${errorDetails}`,
              );
            }
          } else {
            // Handle URL ingestion (existing flow)
            let bodyText = "";
            const reader = request.body?.getReader();
            if (reader) {
              const { value } = await reader.read();
              bodyText = new TextDecoder().decode(value);
            }

            let url: string;
            try {
              const json = JSON.parse(bodyText);
              url = json.url;
            } catch {
              throw new Error("Invalid JSON: missing or invalid URL");
            }

            if (!url || typeof url !== "string") {
              throw new Error("Please provide a valid URL");
            }

            try {
              new URL(url);
            } catch {
              throw new Error("Invalid URL format");
            }

            let executablePath: string | undefined;
            let args = [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              `--user-agent=${DEFAULT_USER_AGENT}`,
            ];
            let headless: boolean | "shell" = true;

            if (process.env.NODE_ENV === "production") {
              const chromium = await import("@sparticuz/chromium").then(
                (mod) => mod.default,
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

            allDocs.push(...docs);
            sources.push({
              type: "url",
              name: url,
              chunks: docs.length,
            });
          }

          sendStep("Splitting documents via RecursiveCharacterTextSplitter...");
          const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
          });
          const splitDocs = await textSplitter.splitDocuments(allDocs);

          sendStep(`Chunk stats: ~1000 tokens/chunk, 200 overlap...`);

          sendStep("Generating OpenAI Embeddings (text-embedding-3-small)...");
          getEmbeddings();

          sendStep("Upserting vectors (Pinecone, session namespace)...");
          const { provider } = await indexDocuments(
            sessionId,
            sources.map((s) => s.name).join(", "),
            splitDocs,
          );

          if (provider === "memory") {
            sendStep(
              "Pinecone unavailable; using in-memory vectors for this session...",
            );
          }

          sendStep("Success. Hydrating context window...");

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                success: true,
                sources,
                documentCount: allDocs.length,
                chunkCount: splitDocs.length,
                message: `Successfully indexed ${splitDocs.length} chunks from ${sources.length} source(s)`,
              }) + "\n",
            ),
          );
          controller.close();
        } catch (error) {
          console.error("Ingest error:", error);
          const message =
            error instanceof Error ? error.message : "Failed to ingest content";
          controller.enqueue(
            encoder.encode(JSON.stringify({ error: message }) + "\n"),
          );
          controller.close();
        }
      },
    });

    const response = new NextResponse(stream, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (isNew) {
      setSessionCookie(response, sessionId);
    }

    return response;
  } catch (error: unknown) {
    console.error("Ingest setup error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to ingest content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
