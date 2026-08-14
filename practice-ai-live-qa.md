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

## Controlled 1,236-word live-provider attempt

On 2026-08-14 UTC, one controlled live attempt was run on the current preview origin without reading or exposing the configured provider key. The test selected **Science and technology → Custom topic**, entered “How scientific peer review improves reproducibility,” selected **Custom** length, entered **1,236** words, and submitted once. The modal displayed the requested values and entered its normal working state.

Gemini returned an HTTP **503 UNAVAILABLE** response stating that the model was experiencing high demand. The application exited the working state, restored the Generate action, and displayed the provider error without producing replacement text. Therefore, this attempt provides verified error-recovery evidence but **does not provide a live word-count measurement**. The earlier successful long-output measurement documented in `practice-ai-length-audit.md`, together with the no-credit matrix’s exact prompt-target assertions, remains the available evidence for length enforcement; no additional provider retries were made in order to conserve bandwidth and avoid unnecessary calls.

## Final Practice theme and interaction verification

On 2026-08-14 UTC, the final verification pass ran without reading, printing, or exposing any provider key. The neutral-color matrix exercised **192 themes on desktop and 192 themes on mobile**. All **384 cases** passed: normal pending characters remained neutral, the pending token stayed `currentColor`, the strict-warning token stayed `#ef4444`, and the keyboard/cursor accent token remained present. No application browser errors were recorded.

The live no-credit interaction probes passed on both viewports. Generation recovered silently and retained the current controls; cancellation propagated through provider, retry, and continuation paths; closing during work prevented stale commits; and the red Cancel control returned to Generate. The smoothness probe measured **49 ms desktop** and **48 ms mobile** click-to-first-loading-frame latency and confirmed the active spinner animation. The heavyweight no-credit taxonomy matrix passed **14 subjects, 121 topic cases, 166 cases per viewport, and 166 mocked requests per viewport**. Settings, nested-view spacing, rapid-switch, and unrelated modal regressions also passed with zero application browser errors.

The final desktop and mobile workspace screenshots were captured for layout sanity. They verify that the scoped typing-surface change did not alter the editor shell. The interactive Practice surface itself was validated through the live browser probes rather than claimed from those shell screenshots. TypeScript and the production build passed. The earlier live-provider 503 recovery remains documented above; no additional live-provider calls were made in this final pass to conserve bandwidth.

## Dual-action loading UX and Length presentation verification

On 2026-08-14 UTC, the Practice modal was reworked so generation keeps a visible disabled `Creating…` action with the existing smooth spinner, while the separate left-side action becomes an enabled red `Cancel` button with a white X. The live cancellation probe passed on desktop and mobile, including abort propagation, Generate recovery, no stale text commit, and modal close behavior. The generation and heavyweight no-credit taxonomy probes also passed unchanged.

Settled live screenshots at **734×766 desktop** and **375×812 mobile** show the two actions aligned in one footer row. The red Cancel appearance was verified after allowing the modal entrance animation to finish; an earlier muted screenshot was correctly identified as an in-transition capture at approximately 69% modal opacity. The displayed `Medium · 400 words` label remained fully readable. The Length control measured **217px desktop** and **299px mobile**, with responsive stacking retained for narrow layouts. TypeScript, production build, Settings/modal regressions, and diff validation passed.

## Persistent generation across Practice Text modal dismissal — verified

On 2026-08-14 UTC, the approved lifecycle refinement was tested with a delayed no-credit provider mock on desktop and mobile. The title-bar X now only dismisses the Practice Text modal; it does not call the cooperative cancellation path. Configure Session retained `aria-busy="true"` and its loading overlay while the request continued. Reopening the NotebookPen modal restored the live `Creating…` action, spinner, and explicit red Cancel action instead of starting a new request.

The delayed request completed once, committed generated text into the Configure Session reference-text area, cleared the busy state, and auto-closed the modal. The lifecycle probe recorded exactly one provider request and zero aborts, with no browser errors on either viewport. The separate explicit-cancellation probe still passed on desktop and mobile, confirming that the red Cancel action remains the only user action that aborts generation and that cancelled work cannot commit stale text. TypeScript, production build, generation, smoothness, heavyweight no-credit matrix, Settings, unrelated modal, and final responsive checks also passed.
