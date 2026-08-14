# Practice Mode AI Generation Specification

## Live verification evidence (2026-08-14)

The live Practice Mode preview now exposes a standalone blue sparkle icon beside “Configure Session” with no surrounding button block or text. Opening it renders the compact Advanced Config-style “AI Practice” modal. Changing Subject from “Legal and court” to “Parliament and public policy” immediately replaces the Topic options with “Parliamentary questions,” “Bills and legislation,” “Motions and resolutions,” “Committees and reports,” “Budget and finance,” and “Policy and public-interest debates.” Clicking Generate without a provider key produces the local, actionable message “Add a Gemini, OpenAI, or Groq key in Settings > AI Setup to generate practice text.” No obsolete `/api/generate-practice` error appeared in the preview.

## Product intent

Practice Mode should turn a small number of plain-language choices into a clean, keyboard-friendly typing passage. The generator must be understandable without legal or technical knowledge, while still giving experienced users meaningful subject depth. The AI entry point is a standalone star beside **Configure Session**; the menu uses the existing **Test Options** visual grammar instead of introducing a second modal style.

## Content model

The UI uses two levels: a broad **Subject** and a narrower **Topic**. The topic is stored as a stable identifier and is included in the prompt as structured metadata. This keeps the interface short while allowing legal, court, parliamentary, healthcare, science, business, and general users to choose a useful focus.

| Subject | Example topics |
| --- | --- |
| Legal and court | Civil disputes; Criminal law; Family and personal matters; Constitutional and public law; Consumer and RERA; Arbitration and mediation; Property and land; Labour and service; Tax and regulatory; Environmental and public interest |
| Parliament and public policy | Parliamentary questions; Bills and legislation; Motions and resolutions; Committees and reports; Budget and finance; Policy and public-interest debates |
| Editorial and opinion | Public policy; Society and culture; Technology and media; Education and work; Environment and climate |
| Business and finance | Management and workplace; Banking and markets; Entrepreneurship; Economics and trade; Accounting and operations |
| General and narrative | News-style explainer; History and culture; Travel and places; Everyday life; Short narrative |
| Science and technology | Physics and engineering; Computing and AI; Climate and earth; Space and astronomy; Research methods |
| Medical and healthcare | Public health; Clinical medicine; Anatomy and physiology; Pharmacy and therapeutics; Mental health and wellbeing |
| Education and research | Teaching and learning; Academic writing; Study skills; Library and information work; Research communication |
| Arts and humanities | Literature; Language; Visual arts; Music and performance; Philosophy and ethics |
| Environment and agriculture | Conservation; Agriculture and food systems; Water and energy; Climate adaptation; Sustainable cities |

The top-level legal groupings are based on the Supreme Court of India’s current case-category structure and the U.S. Courts’ case-type overview, then simplified for a general audience. Parliamentary devices are separated from subject matter because official Digital Sansad and Lok Sabha resources distinguish debates, questions, bills, motions, committees, amendments, and related terminology.[1] [2] [3] [4]

## Prompt contract

Every generation request includes the selected subject, topic, difficulty, and approximate length. The system prompt requires one original plain-text passage, no title, no preamble, no Markdown, no bullets, no code fences, no answer key, and no commentary. The passage must use English (US) or English (India) spelling and grammar, and only characters available on a normal English QWERTY keyboard: ASCII letters, digits, spaces, line breaks, and common punctuation.

The response is normalized before it reaches the editor. Unicode normalization converts curly quotes to straight quotes, em and en dashes to a normal hyphen, and ellipses to three periods. Any remaining non-ASCII characters, invisible characters, emoji, decorative bullets, and typographic symbols are removed. This is a deliberate typing-surface constraint, not a claim that those characters are invalid in real legal, medical, or parliamentary documents.

## Provider routing

Practice Mode reuses the established `royscript_ai_keys` contract: one local key per provider, no rotation pool, and no load balancing. Generation chooses the first configured provider in deterministic order: Gemini 3.7 Flash, OpenAI GPT-4o mini, then Groq Llama 3.3 70B. The Gemini default was privately validated against the active account and current browser request contract for keyboard-safe Practice Text and scanner-style image OCR before routing changed. The chosen model is returned with the generated text for diagnostics, but provider keys are never persisted anywhere else. If no key is configured, the user receives a direct instruction to add one under **Settings → AI Setup**.

This client-side path is required because the current static host has no `/api/generate-practice` handler; `aiAwareFetch` intentionally short-circuits that route. The new helper calls the selected provider directly using the same browser-side key model already used by document OCR.

## Interaction and visual decisions

The old bordered **AI Generation** button becomes a single standalone blue star with an accessible label and tooltip. It has no background, border, pill, wordmark, or surrounding element. Clicking it opens a 400px **AI Practice** modal using the existing **Test Options** title bar, select fields, spacing, close affordance, and footer action treatment. The modal contains only **Subject**, **Topic**, **Difficulty**, and **Length**, followed by **Cancel** and **Generate**.

## References

1. [Supreme Court of India — Case Category](https://www.sci.gov.in/case-category/)
2. [United States Courts — Types of Cases](https://www.uscourts.gov/about-federal-courts/types-cases)
3. [Digital Sansad — Official Debates](https://sansad.in/rs/debates/officials)
4. [Lok Sabha — Important Parliamentary Terms](https://sansad.in/ls/about/important-parliamentary-terms)
5. [Library of Congress — Classification Outline](https://www.loc.gov/catdir/cpso/lcco/)
6. [NIH/NLM — MeSH](https://www.ncbi.nlm.nih.gov/mesh/)
