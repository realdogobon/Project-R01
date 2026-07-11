# RoyScript TSR

An advanced productivity workspace integrating professional translation, document scanning, real-time typing metrics, examination mode, and intelligent RAG search powered by Gemini.

## Stack
- Frontend: React 19 + Vite, TypeScript, Tailwind CSS v4, Lexical editor
- Backend: Express (server.ts) served alongside Vite dev server
- AI: Google Gemini (primary), with Groq/OpenAI as configurable fallback key pools

## Running
- Dev workflow "Start application" runs: `node_modules/.bin/tsx server.ts & node_modules/.bin/vite --port 5000 --host 0.0.0.0`
- Vite dev server serves the app on port 5000 (this is what's shown in the Preview pane); the Express server (server.ts) handles API routes (content generation, OCR, etc.) on port 3000.
- Build: `npm run build` (vite build + esbuild bundle of server.ts to dist/server.cjs); Start: `npm start`.

## Secrets / API keys
AI features (custom typing content generation, OCR/document transcription) require at least one of:
- `GEMINI_API_KEY` (or `GEMINI_API_KEYS` comma-separated for a key pool)
- `GROQ_API_KEY` (or `GROQ_API_KEYS`)
- `OPENAI_API_KEY` (or `OPENAI_API_KEYS`)

None are currently configured. The app runs without them, but AI-dependent features will show a configuration prompt until a key is added.

## User preferences
- Keep the project root minimal — only files essential to running the app belong there. No stray backup archives or agent-authored markdown files beyond this one.
- Do not run lint/type-check ("code review") passes unless explicitly asked — the user wants to conserve credits.
