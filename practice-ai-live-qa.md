# Practice Mode Live Gemini QA

**Date:** 2026-08-14 UTC  
**Mode:** QA only; no application code changes.  
**Secret handling:** The provider key was not read, printed, copied, logged, or written to this file. Testing is performed through the configured browser session.

## Initial session checks

The live preview opened successfully in the existing browser session, and Practice Mode entered normally. The AI Practice modal opened normally and exposed Subject, dependent Topic, Difficulty, Length, Cancel, and Generate controls. The current live modal still visibly contains the **“Add an AI key in Settings”** helper, so that previously approved design change has not yet been implemented.

The current live taxonomy visible in the modal includes Legal and court, Parliament and public policy, Editorial and opinion, Business and finance, General and narrative, Science and technology, Medical and healthcare, Education and research, Arts and humanities, and Environment and agriculture. The default Topic list correctly depends on the selected Subject.

No provider key value or local-storage content was inspected. The next step is a small real-generation smoke test, followed by output and routing checks.

## Smoke test result

The first Generate attempt on the current preview origin returned the app’s intentional no-key fallback: **“Add a Gemini, OpenAI, or Groq key in Settings > AI Setup to generate practice text.”** No generated text was produced, and no provider request was initiated. This indicates that the key is not available to this exact browser origin, or was configured on a different origin such as the published site rather than the dev preview. The key remains unexposed and uninspected.

## Preview-session recheck

On the next observable browser check, the session contained generated Legal and court text at approximately 360 words, the AI modal displayed **Gemini 2.5 Flash**, and the no-key helper was absent. This confirms behaviorally that a provider key is now available to the current preview origin. No key value was inspected or extracted.

## Parliament smoke-test setup

Switching Subject to **Parliament and public policy** changed Topic to the dependent parliamentary choices: Parliamentary questions, Bills and legislation, Motions and resolutions, Committees and reports, Budget and finance, and Policy and public-interest debates. The modal remained stable, and Length was changed to **Short (about 200 words)** for a bandwidth-conscious real-generation test.

## Parliament generation result

The real Gemini request completed successfully through **Gemini 2.5 Flash**. The returned reference text was **181 words**, which is reasonably close to the “about 200 words” short target. The content stayed on the selected topic, Parliamentary questions, and described oral and written questions, Question Time, supplementary questions, ministerial accountability, and public oversight. In the visible returned text, I found no em dash, curly quotation mark, bullet, emoji, or other obvious non-keyboard punctuation; quotation marks around “Question Time” were ordinary ASCII quotes. This is a positive smoke result, not yet a full quality certification.

## Console result

Immediately after the successful generation, the browser console contained no output. No application error was observed in this pass.

## Science smoke-test setup

Switching Subject to **Science and technology** changed Topic to Physics and engineering, Computing and AI, Climate and earth, Space and astronomy, and Research methods. The existing short-length setting remained selected, and the modal stayed usable without layout or state errors.

## Science generation result

The real Gemini request completed successfully. The returned reference text was **157 words**, shorter than the nominal 200-word target but still a usable short passage. It stayed on Physics and engineering, connecting foundational physics with mechanical, structural, electrical, and quantum applications. The visible text contained standard ASCII punctuation and no obvious em dash, curly quote, bullet, emoji, or other non-keyboard symbol. This confirms routing and subject/topic fidelity for a second non-legal case, while also showing that “about 200 words” is a soft target rather than an exact constraint.

The browser console was empty immediately after this generation as well. No application error was observed in either real-generation smoke case.

## No-credit interaction check

After returning to Practice Mode, the AI Practice modal opened normally, displayed the configured **Gemini 2.5 Flash** provider, and preserved the expected Subject, Topic, Difficulty, and Length controls. Clicking Cancel dismissed the modal and returned to the session card without changing the existing reference text or triggering another request. This close/cancel path produced no visible error.

## QA boundary before implementation

This is a meaningful smoke pass, not a god-level certification. Two real Gemini generations succeeded across Parliament and Science, but the current interface still has no Custom length control to test. A true mobile Practice Mode modal run, exhaustive taxonomy matrix, repeated-generation stress run, and failure/retry test remain separate gates. The narrow viewport snapshot captured the workspace shell rather than an interactively opened Practice Mode modal. No application source was changed during this QA pass.

## Post-implementation verification

The earlier sections above describe the pre-implementation QA state. After the approved Practice Mode expansion, the visible provider/model helper row was removed, the modal now exposes inline Custom topic and Custom word count controls, and the expanded taxonomy includes Current affairs and media-literacy practice. The deterministic desktop/mobile regression now passes with the updated taxonomy, no-key fallback, mocked provider routing, ASCII normalization, custom-topic prompt binding, valid 20-word custom length, and invalid 10-word rejection against the 20–2000 word bounds. TypeScript and production-build validation also pass. This report does not claim that every possible subject, provider, model, or live-news scenario has been exhaustively tested.
