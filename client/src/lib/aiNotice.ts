/**
 * AI endpoint availability helper.
 *
 * RoyScript TSR was originally served by an Express server that proxied AI
 * requests (Gemini / Groq / OpenAI) using secret API keys. This static build
 * has no backend, so the AI endpoints (/api/generate-practice, /api/ocr-extract,
 * /api/translate, /api/test-keys) cannot be served here.
 *
 * Instead of failing with cryptic 404s, we intercept these calls and return a
 * response-shaped object so existing UI logic (setGenerateError, toast, etc.)
 * shows a friendly, honest message to the user.
 */

export const AI_DISABLED_NOTICE =
  "AI features (content generation, OCR, translation) are unavailable in this static build. They were served by a backend that required secret API keys (Gemini/Groq/OpenAI). To restore them, connect an API key or run the original server version.";

function aiResponse(payload: { error: string; unavailable?: boolean }): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Drop-in replacement for fetch() that short-circuits the known AI API routes
 * with friendly disabled responses. All other routes pass through untouched.
 */
export function aiAwareFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const path = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url ?? "";
  if (path.startsWith("/api/")) {
    return Promise.resolve(
      aiResponse({
        error: AI_DISABLED_NOTICE,
        unavailable: true,
      }),
    );
  }
  return fetch(input, init);
}
