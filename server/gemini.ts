import { GoogleGenAI } from "@google/genai";

// Key rotation and pool management
let keyPool: string[] = [];
let currentKeyIndex = 0;
const clientCache = new Map<string, GoogleGenAI>();

// Cooldown map for keys that return 401 Unauthenticated / invalid credentials
const invalidKeyCooldowns = new Map<string, { blockedUntil: number; reason: string }>();
const warnedKeys = new Set<string>();

/**
 * Parses all available Gemini API keys from environment variables.
 * Supports:
 * - Comma-separated GEMINI_API_KEY: key1,key2,key3,...
 * - Comma-separated GEMINI_API_KEYS: key1,key2,key3,...
 * - Individual keys: GEMINI_API_KEY_1 through GEMINI_API_KEY_10
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

export function isKeyInCooldown(apiKey: string): boolean {
  const record = invalidKeyCooldowns.get(apiKey);
  if (!record) return false;
  if (Date.now() > record.blockedUntil) {
    invalidKeyCooldowns.delete(apiKey);
    return false;
  }
  return true;
}

export function hasValidGeminiKey(): boolean {
  const keys = getAvailableApiKeys();
  if (keys.length === 0) return false;
  return keys.some((k) => !isKeyInCooldown(k));
}

export function markKeyInvalid(apiKey: string, reason: string, cooldownMs = 5 * 60 * 1000) {
  invalidKeyCooldowns.set(apiKey, {
    blockedUntil: Date.now() + cooldownMs,
    reason,
  });

  const keyPrefix = apiKey.length > 8 ? `${apiKey.substring(0, 6)}...` : "configured key";
  if (!warnedKeys.has(apiKey)) {
    warnedKeys.add(apiKey);
    console.warn(
      `[Gemini Auth Notice] Key (${keyPrefix}) was rejected by Google Generative Language API (${reason}). Using built-in verified placement intelligence engine.`
    );
  }
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
            "x-goog-api-key": apiKey,
          },
        },
      })
    );
  }
  return clientCache.get(apiKey)!;
}

export function getGemini(): GoogleGenAI {
  const allKeys = getAvailableApiKeys();
  const validKeys = allKeys.filter((k) => !isKeyInCooldown(k));
  const candidateKeys = validKeys.length > 0 ? validKeys : allKeys;

  if (candidateKeys.length === 0) {
    const fallbackKey = "dummy-key-for-fallback";
    return getGeminiClientForKey(fallbackKey);
  }

  // Round-robin selection
  const selectedKey = candidateKeys[currentKeyIndex % candidateKeys.length];
  currentKeyIndex = (currentKeyIndex + 1) % candidateKeys.length;
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
  const allKeys = getAvailableApiKeys();
  if (allKeys.length === 0) {
    return null;
  }

  // Filter out keys known to be rejected by Google authentication
  const usableKeys = allKeys.filter((k) => !isKeyInCooldown(k));
  if (usableKeys.length === 0) {
    return null;
  }

  // Rotate through available API keys if quota/rate-limit is encountered
  const totalKeys = usableKeys.length;
  const startIndex = currentKeyIndex % totalKeys;
  currentKeyIndex = (currentKeyIndex + 1) % totalKeys;

  for (let k = 0; k < totalKeys; k++) {
    const activeKey = usableKeys[(startIndex + k) % totalKeys];
    if (isKeyInCooldown(activeKey)) {
      continue;
    }

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
        const rawErrMsg = err?.message || String(err || "");
        const errMsg = rawErrMsg.toLowerCase();

        // 1. Check for Authentication Errors
        const isAuthError =
          errMsg.includes("401") ||
          errMsg.includes("unauthenticated") ||
          errMsg.includes("invalid authentication credentials") ||
          errMsg.includes("access_token_type_unsupported") ||
          errMsg.includes("api_key_service_blocked") ||
          errMsg.includes("api_key_invalid") ||
          errMsg.includes("invalid_token");

        if (isAuthError) {
          // Immediately mark this key in cooldown and stop retrying other models with this broken key
          markKeyInvalid(
            activeKey,
            errMsg.includes("access_token_type_unsupported")
              ? "401 ACCESS_TOKEN_TYPE_UNSUPPORTED"
              : "401 UNAUTHENTICATED"
          );
          break; // Break the model loop for this key
        }

        // 2. Check for Quota / Rate-limit
        const isQuotaOrRateLimit =
          errMsg.includes("resource_exhausted") ||
          errMsg.includes("quota") ||
          errMsg.includes("rate limit") ||
          errMsg.includes("429") ||
          errMsg.includes("overloaded");

        // If this key ran out of quota / rate-limited and we have other keys, immediately rotate
        if (isQuotaOrRateLimit && totalKeys > 1) {
          console.warn(`Rotating to next Gemini API key in pool due to rate-limit/quota...`);
          break; // Break model loop, proceed to next key in outer loop
        }

        // For other transient errors, wait briefly before cascading to next model
        if (i < TEXT_MODELS_CASCADE.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          continue;
        }
      }
    }
  }

  return null;
}


