# Provider API-Key Usage Audit

## Scope

This is a read-only architecture audit prepared before any Settings copy or information-architecture change. No application behavior was changed for this audit.

## Verified current behavior

RoyScript stores one scalar key per provider in `localStorage` under `royscript_ai_keys`:

```ts
{
  gemini?: string;
  groq?: string;
  openai?: string;
}
```

The key lookup is provider-based. A selected model such as `gemini-2.5-flash`, `groq-llama-3.3-70b`, or `openai-gpt-4o` maps to exactly one provider and retrieves that provider’s single stored key. There is no shared key pool, key rotation, round-robin routing, or load-balancing layer.

## Current consumers

| Workflow | Current request path | Uses `royscript_ai_keys`? | Current result |
|---|---|---:|---|
| Document scanner OCR | `Workspace.tsx` → `transcribeWithModel()` → Gemini, Groq, or OpenAI | **Yes** | Uses the selected scanner model’s provider key. If absent or cloud OCR fails, local Tesseract OCR is used. |
| Practice text generation | `PracticeMode.tsx` → `aiAwareFetch("/api/generate-practice")` | **No** | The static build intercepts the route and returns an honest unavailable-backend message. It does not read or forward the Settings keys. |
| Local practice text generation | `WordEngine.generateReferenceText()` and related local generators | **No** | Runs locally and does not require an API key. |
| Translation, legacy OCR, and test-key routes mentioned by the helper | No active client call site was found in the current static build | **No active consumer verified** | The helper documents these as unavailable legacy backend routes, not as active users of the Settings keys. |

## Direct answer to the product question

The current API-key screen is **not yet a general AI setup screen in terms of implementation**. The saved Gemini, Groq, and OpenAI keys are currently consumed by the cloud document-scanning pipeline only. They do not currently power Practice Mode’s AI text generation, because that flow still calls an unavailable `/api/generate-practice` backend route. Practice Mode’s local generation works without a key.

Therefore, changing the heading from **Scanner** to a broader label is correct for the intended product direction, but the copy must not falsely claim that the keys already power every AI feature. The screen should explain the current capability accurately while leaving room for future shared AI usage.

## Recommended information architecture for approval

Use a provider-neutral category and page title:

- **Rail category:** `AI Setup`
- **Detail title:** `AI Setup`
- **Section title:** `Cloud providers`

The screen should describe what the keys do today without exposing implementation jargon. It should also make the single-key-per-provider decision explicit in a quiet, secondary sentence rather than presenting it as a limitation-heavy warning.

## Copy direction, not yet implemented

Suggested concise copy:

> Add a provider key to use cloud-powered document scanning. Practice text can still be created locally without a key.

Suggested section helper:

> Keys are saved only on this device and used when you choose that provider.

Suggested field labels:

- `Gemini key`
- `Groq key`
- `OpenAI key`

Suggested empty-state/helper line:

> Leave a provider blank to keep using local features.

This wording is intentionally accurate for the current implementation. If Practice Mode is later rewired to use these keys, the copy can be broadened without renaming the screen again.

## Future boundary

If the product later intends the same provider keys to power cloud practice-text generation, translation, or other AI actions, those workflows need explicit routing through a shared AI client. That change should define model selection, feature-specific prompts, usage/error handling, and fallback behavior before the Settings screen claims those capabilities.

## Visual verification

The approved copy was captured in the live preview at desktop and 375px mobile widths with the dark theme forced. The new **AI Setup** title, **Cloud providers** section heading, provider labels, and helper text remain legible and aligned with the existing compact glyph rail. The three fields fit without horizontal overflow or clipping, and the key glyph’s selected-state accent remains consistent in both layouts. The live Settings probe also passed in light and dark modes with zero browser errors.
