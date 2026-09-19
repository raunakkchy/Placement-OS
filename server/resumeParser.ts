import mammoth from "mammoth";

/**
 * Robust document parser for extracting plain text from resumes (PDF, DOCX, TXT).
 * Provides clean text representation suitable for Gemini AI analysis without corrupted binary noise.
 */
export async function parseResumeDocument(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<string> {
  if (!buffer || buffer.length === 0) return "";

  const ext = (fileName.split(".").pop() || "").toLowerCase();

  // 1. DOCX Handling via mammoth
  if (ext === "docx" || ext === "doc" || mimeType?.includes("wordprocessingml")) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const extracted = (result.value || "").trim();
      if (extracted.length > 20) {
        return cleanExtractedText(extracted);
      }
    } catch (err: any) {
      console.warn("Mammoth docx parsing failed:", err.message);
    }
  }

  // 2. PDF Handling via pdf-parse
  if (ext === "pdf" || mimeType?.includes("pdf") || buffer.slice(0, 5).toString() === "%PDF-") {
    try {
      const pdfModule: any = await import("pdf-parse");
      if (pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer });
        const textResult = await parser.getText();
        if (typeof parser.destroy === "function") {
          await parser.destroy().catch(() => {});
        }
        if (textResult) {
          if (typeof textResult === "string" && textResult.trim().length > 20) {
            return cleanExtractedText(textResult);
          } else if (typeof textResult === "object" && textResult.text && textResult.text.trim().length > 20) {
            return cleanExtractedText(textResult.text);
          }
        }
      } else {
        const parseFn = typeof pdfModule.default === "function" ? pdfModule.default : pdfModule;
        if (typeof parseFn === "function") {
          const data = await parseFn(buffer);
          if (data?.text && data.text.trim().length > 20) {
            return cleanExtractedText(data.text);
          }
        }
      }
    } catch (err: any) {
      console.warn("PDF parsing failed:", err.message);
    }
  }

  // 3. Fallback: extract readable strings (useful for plain text or txt files)
  const rawString = buffer.toString("utf-8");
  // Ensure it is not raw unparsed binary PDF
  if (!rawString.startsWith("%PDF")) {
    const cleaned = rawString.replace(/[^\x20-\x7E\t\n\r]/g, " ").replace(/\s+/g, " ").trim();
    if (cleaned.length > 30) {
      return cleanExtractedText(cleaned);
    }
  }

  return "";
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 16000);
}
