import { Document } from "@langchain/core/documents";
import { createRequire } from "node:module";

// Lazy import these to avoid hard dependencies causing build failures
type ParsedPdfData = { text?: string };
type PdfParseFunction = (buffer: Buffer) => Promise<ParsedPdfData>;

interface PdfParseInstance {
  getText: () => Promise<ParsedPdfData>;
  destroy?: () => Promise<void> | void;
}

interface PdfParseCtor {
  new (options: { data: Uint8Array }): PdfParseInstance;
}

interface XlsxWorkbook {
  SheetNames: string[];
  Sheets: Record<string, unknown>;
}

interface XlsxModuleType {
  read: (buffer: Buffer, options: { type: "buffer" }) => XlsxWorkbook;
  utils: {
    sheet_to_csv: (sheet: unknown) => string;
  };
}

interface DocxNode {
  children?: DocxNode[];
  text?: string;
}

interface DocxZip {
  document?: {
    body?: {
      children?: DocxNode[];
    };
  };
}

interface DocxModuleType {
  load: (buffer: Buffer) => Promise<DocxZip>;
}

interface ZipEntry {
  async: (type: "string") => Promise<string>;
}

interface ZipContent {
  files: Record<string, ZipEntry>;
}

let PDFParser: PdfParseFunction | null = null;
let XLSX: XlsxModuleType | null = null;
let docxModule: DocxModuleType | null = null;

async function getPDFParser(): Promise<PdfParseFunction | null> {
  if (!PDFParser) {
    const require = createRequire(import.meta.url);

    const resolvePdfParserFromModule = (
      pdfParseModule: unknown,
    ): PdfParseFunction | null => {
      const moduleRecord =
        pdfParseModule && typeof pdfParseModule === "object"
          ? (pdfParseModule as Record<string, unknown>)
          : null;

      const isLegacyFunction = (value: unknown): value is PdfParseFunction =>
        typeof value === "function" &&
        typeof (value as { prototype?: { getText?: unknown } }).prototype
          ?.getText !== "function";

      const isPdfParseCtor = (value: unknown): value is PdfParseCtor =>
        typeof value === "function" &&
        typeof (value as { prototype?: { getText?: unknown } }).prototype
          ?.getText === "function";

      const modernParserCtorCandidates: unknown[] = [
        moduleRecord?.PDFParse,
        (moduleRecord?.default as Record<string, unknown> | undefined)
          ?.PDFParse,
      ];

      const modernParserCtor = modernParserCtorCandidates.find(isPdfParseCtor);

      if (modernParserCtor) {
        return async (buffer: Buffer): Promise<ParsedPdfData> => {
          const parser = new modernParserCtor({ data: new Uint8Array(buffer) });
          try {
            const result = await parser.getText();
            return { text: result?.text ?? "" };
          } finally {
            await parser.destroy?.();
          }
        };
      }

      const candidates = [
        moduleRecord?.default,
        moduleRecord?.pdf,
        (moduleRecord?.default as Record<string, unknown> | undefined)?.default,
        pdfParseModule,
      ];

      const parser = candidates.find(isLegacyFunction) || null;

      if (!parser) {
        console.warn(
          "pdf-parse module loaded but no callable export was found",
          {
            moduleType: typeof pdfParseModule,
            moduleKeys: moduleRecord ? Object.keys(moduleRecord) : [],
          },
        );
      }

      return parser;
    };

    try {
      const pdfParseModule: unknown = await import("pdf-parse");
      PDFParser = resolvePdfParserFromModule(pdfParseModule);
      if (PDFParser) {
        return PDFParser;
      }

      const requiredModule = require("pdf-parse") as unknown;
      PDFParser = resolvePdfParserFromModule(requiredModule);
      if (PDFParser) {
        return PDFParser;
      }
    } catch (error) {
      console.warn(
        "pdf-parse not available:",
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }
  return PDFParser;
}

async function getXLSX(): Promise<XlsxModuleType | null> {
  if (!XLSX) {
    try {
      const importedModule = await import("xlsx");
      XLSX = (importedModule.default || importedModule) as XlsxModuleType;
    } catch (error) {
      console.warn("xlsx not available:", error);
      return null;
    }
  }
  return XLSX;
}

async function getDocxModule(): Promise<DocxModuleType | null> {
  if (!docxModule) {
    try {
      const importedModule = await import("docx");
      docxModule = importedModule as unknown as DocxModuleType;
    } catch (error) {
      console.warn("docx not available:", error);
      return null;
    }
  }
  return docxModule;
}

// Read docx files
async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const docx = await getDocxModule();
    if (!docx || !docx.load) {
      throw new Error("DOCX parser not available");
    }

    let zip: DocxZip;
    try {
      zip = await docx.load(buffer);
    } catch (loadError) {
      throw new Error(
        `Failed to parse DOCX file: ${loadError instanceof Error ? loadError.message : "Invalid file format"}`,
      );
    }

    if (!zip || !zip.document) {
      throw new Error("Invalid DOCX file structure - missing document");
    }

    let text = "";

    if (zip.document.body && zip.document.body.children) {
      for (const child of zip.document.body.children) {
        if (child.children) {
          for (const subChild of child.children) {
            if (subChild.text) {
              text += subChild.text + " ";
            }
          }
        }
      }
    }

    if (!text.trim()) {
      throw new Error("No text content found in DOCX file");
    }

    return text.trim();
  } catch (error) {
    throw new Error(
      `Failed to extract text from DOCX: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Read Excel files
async function extractTextFromXlsx(buffer: Buffer): Promise<string> {
  try {
    const xlsx = await getXLSX();
    if (!xlsx) {
      throw new Error("XLSX parser not available");
    }

    let workbook: XlsxWorkbook;
    try {
      workbook = xlsx.read(buffer, { type: "buffer" });
    } catch (readError) {
      throw new Error(
        `Failed to parse XLSX file: ${readError instanceof Error ? readError.message : "Invalid file format"}`,
      );
    }

    if (!workbook || !workbook.SheetNames) {
      throw new Error("Invalid XLSX file structure");
    }

    let text = "";

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        continue;
      }

      text += `=== Sheet: ${sheetName} ===\n`;

      try {
        const csv = xlsx.utils.sheet_to_csv(worksheet);
        if (csv && csv.trim()) {
          text += csv + "\n\n";
        }
      } catch {
        console.warn(`Warning: Could not convert sheet ${sheetName} to CSV`);
      }
    }

    if (!text.trim()) {
      throw new Error("No content found in XLSX file");
    }

    return text.trim();
  } catch (error) {
    throw new Error(
      `Failed to extract text from XLSX: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Read PDF files
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const parser = await getPDFParser();
    if (!parser) {
      throw new Error(
        "PDF parser not available - pdf-parse module failed to load",
      );
    }

    if (typeof parser !== "function") {
      throw new Error(
        `PDF parser has unexpected type: ${typeof parser}. Expected function.`,
      );
    }

    let pdfData: ParsedPdfData | null = null;
    try {
      pdfData = await parser(buffer);
    } catch (parseError) {
      throw new Error(
        `Failed to parse PDF content: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
      );
    }

    if (!pdfData) {
      throw new Error("PDF parser returned no data");
    }

    const text = pdfData.text;

    if (!text || !text.trim()) {
      throw new Error("No text content found in PDF (may be image-based)");
    }

    return text.trim();
  } catch (error) {
    throw new Error(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Read PPTX files (treat as ZIP and extract text from XML)
async function extractTextFromPptx(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import for JSZip
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    let zipContent: ZipContent;
    try {
      zipContent = (await zip.loadAsync(buffer)) as unknown as ZipContent;
    } catch (zipError) {
      throw new Error(
        `Failed to parse PPTX file structure: ${zipError instanceof Error ? zipError.message : "Invalid ZIP format"}`,
      );
    }

    let text = "";

    // Look for slide files in ppt/slides/
    const slideFiles = Object.keys(zipContent.files).filter((path) =>
      path.match(/ppt\/slides\/slide\d+\.xml$/),
    );

    if (slideFiles.length === 0) {
      throw new Error("No slide content found in PPTX file");
    }

    for (const slidePath of slideFiles.sort()) {
      try {
        const slideContent = await zipContent.files[slidePath].async("string");

        // Extract text from XML tags (simple regex approach)
        const textMatches = slideContent.match(/<a:t>([^<]+)<\/a:t>/g);
        if (textMatches) {
          for (const match of textMatches) {
            const content = match.replace(/<a:t>|<\/a:t>/g, "");
            text += content + " ";
          }
        }
        text += "\n";
      } catch {
        console.warn(`Warning: Could not extract text from slide ${slidePath}`);
      }
    }

    if (!text.trim()) {
      throw new Error("No text content found in PPTX (may be image-only)");
    }

    return text.trim();
  } catch (error) {
    throw new Error(
      `Failed to extract text from PPTX: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Read plain text files (TXT, MD)
function extractTextFromPlainText(buffer: Buffer): string {
  try {
    const text = buffer.toString("utf-8");

    if (!text || !text.trim()) {
      throw new Error("File is empty");
    }

    return text.trim();
  } catch (error) {
    throw new Error(
      `Failed to extract text from file: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Extract text content from uploaded file based on MIME type or filename
 * @param buffer - File buffer
 * @param fileName - Original filename
 * @param mimeType - MIME type of file
 * @returns Extracted text content
 */
export async function extractTextFromFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  // Normalize MIME type
  const baseMimeType = mimeType.split(";")[0].toLowerCase();
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";

  // Route to appropriate parser
  if (baseMimeType === "application/pdf" || fileExtension === "pdf") {
    return await extractTextFromPdf(buffer);
  }

  if (
    baseMimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileExtension === "docx"
  ) {
    return await extractTextFromDocx(buffer);
  }

  if (
    baseMimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    baseMimeType === "application/vnd.ms-excel" ||
    fileExtension === "xlsx" ||
    fileExtension === "xls"
  ) {
    return await extractTextFromXlsx(buffer);
  }

  if (
    baseMimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    fileExtension === "pptx"
  ) {
    return await extractTextFromPptx(buffer);
  }

  if (baseMimeType === "text/plain" || fileExtension === "txt") {
    return extractTextFromPlainText(buffer);
  }

  if (
    baseMimeType === "text/markdown" ||
    fileExtension === "md" ||
    fileExtension === "markdown"
  ) {
    return extractTextFromPlainText(buffer);
  }

  // Default: try as plain text
  try {
    return extractTextFromPlainText(buffer);
  } catch {
    throw new Error(
      `Unsupported file format: ${fileExtension || mimeType}. Supported formats: PDF, DOCX, XLSX, PPTX, TXT, Markdown`,
    );
  }
}

/**
 * Create Document objects from extracted text (compatible with LangChain)
 */
export function createDocumentsFromText(
  text: string,
  fileName: string,
  fileType: "url" | "file",
): Document[] {
  // Create a single document for the entire file
  // (It will be chunked later by RecursiveCharacterTextSplitter in the ingest route)
  return [
    new Document({
      pageContent: text,
      metadata: {
        source: fileType,
        fileName: fileName,
        uploadedAt: new Date().toISOString(),
      },
    }),
  ];
}

/**
 * Validate file size client-side hints (for server-side validation)
 */
export function validateFileSize(
  buffer: Buffer,
  maxSizeInBytes: number = 10 * 1024 * 1024,
): void {
  if (buffer.length > maxSizeInBytes) {
    const maxSizeMB = maxSizeInBytes / (1024 * 1024);
    throw new Error(
      `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed size of ${maxSizeMB} MB`,
    );
  }
}

/**
 * Validate file type based on extension and MIME type
 */
export function validateFileType(fileName: string, mimeType: string): void {
  const supportedExtensions = [
    "pdf",
    "docx",
    "xlsx",
    "xls",
    "pptx",
    "txt",
    "md",
    "markdown",
  ];
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";

  if (!supportedExtensions.includes(fileExtension)) {
    throw new Error(
      `Unsupported file format: .${fileExtension} (${mimeType}). Supported formats: PDF, DOCX, XLSX, PPTX, TXT, Markdown`,
    );
  }
}
