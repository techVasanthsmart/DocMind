import { Document } from "@langchain/core/documents";

// Lazy import these to avoid hard dependencies causing build failures
let PDFParser: any = null;
let XLSX: any = null;
let docxModule: any = null;

async function getPDFParser() {
  if (!PDFParser) {
    try {
      // pdf-parse 2.4.5 exports as named export
      const pdfParseModule: any = await import("pdf-parse");
      // Try different export patterns
      PDFParser =
        pdfParseModule.default || pdfParseModule.pdf || pdfParseModule;

      // If it's a namespace with a default property, use that
      if (
        PDFParser &&
        typeof PDFParser === "object" &&
        PDFParser.default &&
        typeof PDFParser.default === "function"
      ) {
        PDFParser = PDFParser.default;
      }
    } catch (error) {
      console.warn("pdf-parse not available:", error);
      return null;
    }
  }
  return PDFParser;
}

async function getXLSX() {
  if (!XLSX) {
    try {
      const module = await import("xlsx");
      XLSX = module.default || module;
    } catch (error) {
      console.warn("xlsx not available:", error);
      return null;
    }
  }
  return XLSX;
}

async function getDocxModule() {
  if (!docxModule) {
    try {
      const module = await import("docx");
      docxModule = module;
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

    const zip = await docx.load(buffer);

    if (!zip || !zip.document) {
      throw new Error("Invalid DOCX file structure");
    }

    let text = "";

    // Try to extract text from document body
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
    const workbook = xlsx.read(buffer, { type: "buffer" });
    let text = "";

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      text += `=== Sheet: ${sheetName} ===\n`;

      // Convert sheet to CSV format for text extraction
      const csv = xlsx.utils.sheet_to_csv(worksheet);
      text += csv + "\n\n";
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
      throw new Error("PDF parser not available");
    }
    const pdfData = await parser(buffer);
    const text = pdfData.text;

    if (!text || !text.trim()) {
      throw new Error("No text content found in PDF");
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
    const zipContent = await zip.loadAsync(buffer);

    let text = "";

    // Look for slide files in ppt/slides/
    const slideFiles = Object.keys(zipContent.files).filter((path) =>
      path.match(/ppt\/slides\/slide\d+\.xml$/),
    );

    for (const slidePath of slideFiles.sort()) {
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
    }

    if (!text.trim()) {
      throw new Error("No text content found in PPTX");
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
      `Unsupported file format: .${fileExtension}. Supported formats: PDF, DOCX, XLSX, PPTX, TXT, Markdown`,
    );
  }
}
