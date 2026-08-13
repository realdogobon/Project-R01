/**
 * RoyScript TSR AI Vision OCR engine.
 *
 * Routes a scanned image to a real cloud multimodal model (Google Gemini,
 * Groq, or OpenAI) based on the model id selected in the Scanner panel.
 * Calls are made directly from the browser with the user's own API key,
 * which is stored in localStorage (never sent anywhere except the provider).
 *
 * Model id format: "<provider>-<slug>"
 *   gemini-*   -> Google Gemini (generateContent, inline_data)
 *   groq-*     -> Groq OpenAI-compatible chat completions
 *   openai-*   -> OpenAI chat completions
 *
 * The user should see the transcribed text land straight in the editor
 * through the existing Path selector + Send flow — there is no preview panel.
 */

export type VisionProvider = "gemini" | "groq" | "openai";

export interface AiTranscriptionOptions {
  onProgress?: (progress: number) => void;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const STORAGE_KEY = "royscript_ai_keys";

export interface ProviderKeys {
  gemini?: string;
  groq?: string;
  openai?: string;
}

export function loadProviderKeys(): ProviderKeys {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveProviderKeys(keys: ProviderKeys): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function getProviderOf(modelId: string): VisionProvider {
  if (modelId.startsWith("gemini-")) return "gemini";
  if (modelId.startsWith("groq-")) return "groq";
  return "openai";
}

function apiKeyFor(modelId: string, keys: ProviderKeys): string | undefined {
  const provider = getProviderOf(modelId);
  const raw = keys[provider] || "";
  return raw.trim() || undefined;
}

/**
 * Canonical model ids per provider, mapped from the Scanner select values.
 */
function resolveModelId(modelId: string): string {
  if (modelId.startsWith("gemini-")) {
    const map: Record<string, string> = {
      "gemini-2.5-flash": "gemini-2.5-flash",
      "gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
      "gemini-2.5-pro": "gemini-2.5-pro",
      "gemini-2.0-flash-exp": "gemini-2.0-flash",
      "gemini-1.5-flash": "gemini-1.5-flash",
    };
    return map[modelId] || "gemini-2.5-flash";
  }
  if (modelId.startsWith("groq-")) {
    const map: Record<string, string> = {
      "groq-llama-3.3-70b": "llama-3.3-70b-versatile",
      "groq-llama-3.1-8b": "llama-3.1-8b-instant",
      // Mixtral and Gemma have no vision on Groq; route to the 11B vision model
      "groq-mixtral-8x7b": "llama-3.2-11b-vision-preview",
      "groq-gemma2-9b": "llama-3.2-11b-vision-preview",
    };
    return map[modelId] || "llama-3.2-11b-vision-preview";
  }
  const map: Record<string, string> = {
    "openai-gpt-4o": "gpt-4o",
    "openai-gpt-4o-mini": "gpt-4o-mini",
    "openai-gpt-4.1": "gpt-4.1",
    "openai-gpt-4.1-mini": "gpt-4.1-mini",
    "openai-gpt-4.1-nano": "gpt-4.1-nano",
  };
  return map[modelId] || "gpt-4o";
}

const OCR_SYSTEM_PROMPT =
  "You are a document scanner OCR engine. Transcribe ALL visible text in the image exactly as written, preserving line breaks and layout order. Do not describe the image, do not add commentary, do not fix spelling, output only the raw transcribed text. If there is no readable text, output nothing.";

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, externalSignal?: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", handleExternalAbort);
    };
    const rejectAborted = () => {
      if (settled) return;
      settled = true;
      controller.abort();
      cleanup();
      reject(new DOMException("The scan was stopped.", "AbortError"));
    };
    const handleExternalAbort = () => rejectAborted();
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      controller.abort();
      cleanup();
      reject(new Error("Request timed out"));
    }, timeoutMs);
    if (externalSignal?.aborted) {
      rejectAborted();
      return;
    }
    externalSignal?.addEventListener("abort", handleExternalAbort, { once: true });
    fetch(url, { ...init, signal: controller.signal })
      .then((res) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(res);
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      });
  });
}

async function transcribeGemini(
  apiKey: string,
  base64Jpeg: string,
  model: string,
  options: AiTranscriptionOptions,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Jpeg,
            },
          },
          { text: OCR_SYSTEM_PROMPT },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
  };
  const res = await fetchWithTimeout(
    url,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    options.timeoutMs ?? 60000,
    options.signal,
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  options.onProgress?.(1);
  const candidates = json?.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
  const parts = candidates?.[0]?.content?.parts;
  return (parts?.map((p) => p?.text ?? "").join("") || "").trim();
}

async function transcribeChatCompletion(
  label: string,
  apiKey: string,
  base64Jpeg: string,
  model: string,
  baseUrl: string,
  options: AiTranscriptionOptions,
): Promise<string> {
  const url = `${baseUrl}/chat/completions`;
  const body = {
    model,
    max_tokens: 4096,
    temperature: 0.1,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: OCR_SYSTEM_PROMPT },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Jpeg}` } },
        ],
      },
    ],
  };
  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
    options.timeoutMs ?? 90000,
    options.signal,
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`${label} API error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  options.onProgress?.(1);
  const choices = json?.choices as Array<{ message?: { content?: string | null } }> | undefined;
  return (choices?.[0]?.message?.content ?? "").trim();
}

/**
 * Transcribe a JPEG image (raw base64, no data: prefix) using the selected
 * cloud model. Throws an Error with a provider-readable message on failure,
 * so callers can fall back to the local Tesseract engine.
 */
export async function transcribeWithModel(
  modelId: string,
  base64Jpeg: string,
  options: AiTranscriptionOptions = {},
): Promise<string> {
  const keys = loadProviderKeys();
  const provider = getProviderOf(modelId);
  const apiKey = apiKeyFor(modelId, keys);
  if (!apiKey) {
    throw new Error(`${provider} API key not configured`);
  }
  const model = resolveModelId(modelId);
  if (provider === "gemini") {
    return transcribeGemini(apiKey, base64Jpeg, model, options);
  }
  if (provider === "groq") {
    return transcribeChatCompletion("Groq", apiKey, base64Jpeg, model, "https://api.groq.com/openai/v1", options);
  }
  return transcribeChatCompletion("OpenAI", apiKey, base64Jpeg, model, "https://api.openai.com/v1", options);
}

/**
 * True when a usable cloud key exists for the given model.
 */
export function hasApiKeyFor(modelId: string): boolean {
  const provider = getProviderOf(modelId);
  const keys = loadProviderKeys();
  return Boolean((keys[provider] || "").trim());
}
