import { GoogleGenAI } from "@google/genai";

// Key rotation and pool management
let keyPool: string[] = [];
let currentKeyIndex = 0;
const clientCache = new Map<string, GoogleGenAI>();

/**
 * Parses all available Gemini API keys from environment variables.
 * Supports:
 * - Comma-separated GEMINI_API_KEY: key1,key2,key3,...
 * - Comma-separated GEMINI_API_KEYS: key1,key2,key3,...
 * - Individual keys: GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3, GEMINI_API_KEY_4, GEMINI_API_KEY_5
 */
export function getAvailableApiKeys(): string[] {
  const keys: string[] = [];

  const rawKey = process.env.GEMINI_API_KEY || "";
  const rawKeys = process.env.GEMINI_API_KEYS || "";

  // Split comma or newline separated keys
  const parseList = (str: string) =>
    str
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 10 && k !== "dummy-key-for-fallback");

  keys.push(...parseList(rawKey));
  keys.push(...parseList(rawKeys));

  // Check numbered environment variables GEMINI_API_KEY_1 through GEMINI_API_KEY_10
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`]?.trim();
    if (k && k.length > 10 && !keys.includes(k)) {
      keys.push(k);
    }
  }

  // Deduplicate keys
  return Array.from(new Set(keys));
}

export function getGeminiClientForKey(apiKey: string): GoogleGenAI {
  if (!clientCache.has(apiKey)) {
    clientCache.set(
      apiKey,
      new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      })
    );
  }
  return clientCache.get(apiKey)!;
}

export function getGemini(): GoogleGenAI {
  const keys = getAvailableApiKeys();
  if (keys.length === 0) {
    const fallbackKey = "dummy-key-for-fallback";
    return getGeminiClientForKey(fallbackKey);
  }

  // Round-robin selection
  const selectedKey = keys[currentKeyIndex % keys.length];
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  return getGeminiClientForKey(selectedKey);
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
  const keys = getAvailableApiKeys();
  if (keys.length === 0) {
    return null;
  }

  // Rotate through available API keys if quota/rate-limit is encountered
  const totalKeys = keys.length;
  const startIndex = currentKeyIndex % totalKeys;
  currentKeyIndex = (currentKeyIndex + 1) % totalKeys;

  for (let k = 0; k < totalKeys; k++) {
    const activeKey = keys[(startIndex + k) % totalKeys];
    const ai = getGeminiClientForKey(activeKey);

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

        // 6.5s timeout per attempt to keep UI snappy
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
        const errMsg = (err?.message || "").toLowerCase();
        const isQuotaOrRateLimit =
          errMsg.includes("resource_exhausted") ||
          errMsg.includes("quota") ||
          errMsg.includes("rate limit") ||
          errMsg.includes("429") ||
          errMsg.includes("overloaded");

        console.warn(
          `Gemini [Key ${k + 1}/${totalKeys}] model ${model} (attempt ${i + 1}/${TEXT_MODELS_CASCADE.length}) error:`,
          err?.message || err
        );

        // If this key ran out of quota / rate-limited, immediately break to NEXT API KEY
        if (isQuotaOrRateLimit && totalKeys > 1) {
          console.warn(`Rotating to next Gemini API key in pool due to rate-limit/quota...`);
          break; // Break model loop, proceed to next key in outer loop
        }

        if (i < TEXT_MODELS_CASCADE.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          continue;
        }
      }
    }
  }

  return null;
}


