import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set in environment. Algorithmic intelligence engine will be used as fallback.");
    }
    geminiClient = new GoogleGenAI({
      apiKey: apiKey || "dummy-key-for-fallback",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// High-availability model cascade prioritizing fast, high-throughput models
const TEXT_MODELS_CASCADE = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
  }
  return cleaned.trim();
}

export async function generateGeminiJson<T>(
  prompt: string,
  options?: {
    systemInstruction?: string;
  }
): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "dummy-key-for-fallback") {
    return null;
  }

  const ai = getGemini();

  for (let i = 0; i < TEXT_MODELS_CASCADE.length; i++) {
    const model = TEXT_MODELS_CASCADE[i];
    try {
      const generatePromise = ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: options?.systemInstruction,
        },
      });

      // 6.5s timeout per model to prevent container/reverse-proxy gateway drops
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout invoking model ${model}`)), 6500)
      );

      const response: any = await Promise.race([generatePromise, timeoutPromise]);

      if (response && response.text) {
        const cleaned = cleanJsonString(response.text);
        const parsed = JSON.parse(cleaned) as T;
        return parsed;
      }
    } catch (err: any) {
      console.warn(`Gemini model ${model} (attempt ${i + 1}/${TEXT_MODELS_CASCADE.length}) error:`, err?.message || err);
      if (i < TEXT_MODELS_CASCADE.length - 1) {
        // Switch to next available model quickly
        await new Promise((resolve) => setTimeout(resolve, 150));
        continue;
      }
    }
  }

  return null;
}

