# Practice Mode AI Expansion — Discussion Report

**Status:** Discussion only. No application code, UI, prompt logic, or production behavior was changed during this review.

## Executive view

Your four ideas fit together well, but they should be treated as one system rather than four isolated tweaks. The right direction is a **small, calm generator surface** backed by a much richer internal taxonomy: a short Subject list, a dependent Topic list, an optional custom topic, and a custom word target. This gives the user broad coverage without turning the modal into a giant form.

The Current affairs idea is valuable and logically belongs in Practice Mode. However, “current” must mean **retrieved from current sources**, not merely requested in a prompt. Google’s official Gemini documentation says Search grounding can connect Gemini to real-time web content, improve factual accuracy, answer recent-event questions, and return citation annotations and search metadata [1]. Without that grounding path, the app should not claim that a generated passage reflects the latest news.

## 1. The visible “Add an AI key in Settings” helper

I agree that the persistent span is visually noisy and weakens the premium design. I recommend removing that visible helper from the generator surface. The no-key state should remain understandable only when the user actually presses Generate, using a compact contextual message such as **“Choose a provider in AI Setup to generate practice text.”** That preserves recoverability without leaving a permanent instruction beside the control.

The standalone star should remain the only visual entry point. Its tooltip and accessible label can quietly explain the action, but the surrounding card should not grow back into another status block. This keeps the change aligned with the existing Advanced Config/Test Options language.

## 2. Recommended global Subject and Topic model

The research supports a broad taxonomy, but not a giant flat dropdown. The Library of Congress outline spans humanities, history, geography, social sciences, political science, law, education, language and literature, science, medicine, agriculture, technology, military science, and information resources [2]. UNESCO’s internationally comparable ISCED framework similarly confirms that fields of study are broad and cross-national, but are best handled as structured categories rather than exposed classification codes [3].

The proposed user-facing set below is intentionally compact. Each Subject should open a dependent Topic list, and every Subject should also offer **Custom topic** so the product does not pretend that a finite list can cover every country, profession, examination, or personal interest.

| Subject | High-value Topic groups | Why it belongs |
|---|---|---|
| **Current Affairs & Media** | World events; India and regional affairs; elections and public policy; climate and disasters; economy and markets; science and technology news; media literacy; headline to brief; compare two reports; balanced debate practice | Adds timely reading and debate practice, but must be grounded and dated. UNESCO frames media literacy around critical engagement, safe navigation, misinformation, hate speech, and trust in media and AI [4]. |
| **Legal & Court** | Civil disputes; criminal law; family and personal law; constitutional law; consumer matters; property and contracts; employment; administrative law; arbitration and mediation; public interest; court orders and case summaries | The Supreme Court of India lists civil, criminal, constitutional, family, consumer, and RERA groupings, with specialist categories beneath them [5]. The U.S. Courts separately identifies civil, criminal, bankruptcy, and appeals at the federal level [6]. |
| **Parliament & Public Policy** | Questions; bills and legislative stages; motions and resolutions; amendments; committee work; budget and finance; social policy; education and health policy; environment; international relations; constituency issues | Official Indian parliamentary resources expose debate type, subject, title, and participant dimensions, while the Lok Sabha explains formal parliamentary terms [7] [8]. The generator should separate the parliamentary device from the subject matter. |
| **Business & Economics** | Business communication; entrepreneurship; management; marketing; finance basics; accounting; economics; labour and employment; trade; supply chains; workplace reports | Useful for office typing, competitive exams, commerce, and professional communication. |
| **Science & Technology** | Physics; chemistry; biology; mathematics; astronomy; earth science; computing; software; artificial intelligence; cybersecurity; engineering; data and statistics | Covers academic and professional practice without forcing the user into one narrow “science” prompt. |
| **Health & Medicine** | Public health; anatomy and physiology; nutrition; mental health; nursing; medicines; clinical communication; epidemiology; health policy; ageing; disability and accessibility | The WHO maintains global health classifications and a wide health-topic index, supporting a structured healthcare area rather than one generic medical label [9]. Medical passages should be educational and avoid personalized diagnosis or treatment advice. |
| **Education & Learning** | Classroom practice; teaching methods; child development; higher education; examinations; study skills; research writing; educational policy; vocational training; teacher communication | Matches UNESCO’s global education-field framing while remaining understandable to ordinary users [3]. |
| **Humanities & Society** | History; geography; philosophy; psychology; sociology; anthropology; religion and ethics; culture; international relations; human rights; everyday society | Provides broad general-knowledge practice and supports essays, exams, and public-interest reading. |
| **Language & Literature** | General English; grammar; vocabulary; journalism; essays; speeches; fiction; poetry; biography; book reviews; translation practice | Directly supports language fluency and typing quality. Output can be tuned for standard prose, literary prose, or formal communication. |
| **Arts, Culture & Entertainment** | Visual arts; music; film; architecture; design; theatre; cultural heritage; museums; creative reviews; event writing | Adds creative and cultural practice without mixing it into generic humanities. |
| **Environment & Sustainability** | Climate change; biodiversity; water; energy; pollution; agriculture; conservation; sustainable cities; disaster preparedness; environmental policy | Supports current public-interest topics and practical vocabulary. |
| **Everyday & Professional Writing** | Email; notices; reports; instructions; customer support; applications; resumes; meeting notes; presentations; public announcements | Gives beginners and working users a direct route to useful typing material. |

This is broad enough to serve most users while still being usable. The internal prompt profile should carry more detail than the UI: genre, audience, region, formality, factuality mode, and typing constraints should be metadata rather than additional visible controls.

## 3. Current affairs and media debates: feasible, with one important boundary

The feature is feasible and worthwhile, but I recommend two explicit modes:

| Mode | Behavior | Requirement |
|---|---|---|
| **Fresh brief** | Retrieves recent public information, writes a neutral practice passage, and records the retrieval date and source links. | Gemini Search grounding or another approved retrieval layer. |
| **Topic practice** | Uses a user-selected or user-entered topic without claiming that the passage contains the latest facts. | Existing generation path is sufficient; the prompt must avoid “latest” claims. |

For Fresh brief, the generator should ask for a topic or choose a broad news area, then generate a passage with a small source note outside the typing text. The typing text itself should remain clean. The application should preserve citations or at least a “Sources and retrieved on” record because Google’s documentation describes citation annotations and search metadata in the grounded response [1].

The prompt should also distinguish **fact, context, and viewpoint**. It should not present a contested claim as settled fact, should avoid political persuasion, and should not invent a source. For media-debate practice, a better structure is “summarize the issue neutrally,” “compare two reported positions,” or “write a balanced briefing,” not “tell me who is right.” This follows UNESCO’s emphasis on critical engagement with information and the problems of misinformation and declining trust [4].

Without a grounding layer, I would still include **Current Affairs & Media** as a subject, but limit it to non-time-sensitive formats such as media literacy, headline analysis, source comparison using supplied text, and public-issue vocabulary. I would not label ungrounded text as “Latest Highlights.”

## 4. Custom length: yes, and it should stay small

You are right that the Length control needs a Custom option. The cleanest design is to keep the existing Length select and add one integrated inline field only when **Custom** is selected:

> **Length:** Custom  [ 250 ] words

The number field should have a clear minimum and maximum, remain inside the same modal field treatment, and not open a separate dialog. I recommend an initial range of **20–2,000 words**. The lower bound avoids unusably short passages; the upper bound protects latency, cost, and mobile usability. We can revisit the upper bound after real usage data.

The prompt should request a target word count, but the application should not trust a language model to hit an exact number every time. The robust behavior is:

1. Ask the provider for the requested target with a narrow tolerance.
2. Validate the returned word count programmatically.
3. If it is slightly long, trim at a complete sentence rather than cutting a word or leaving a broken fragment.
4. If it is too short, perform one controlled regeneration or show a clear retry state instead of padding the passage with meaningless filler.

Custom length should be one word-count field for now. A characters-versus-words toggle would increase complexity and is not necessary until users request character-based drills.

## 5. Can this become a one-stop practice solution?

Almost, but not literally everything. The correct product goal is **broad coverage with a stable interaction model**, not an endlessly expanding list. The combination of compact Subjects, dependent Topics, Custom topic, Custom length, and a future Fresh brief mode can cover most academic, professional, legal, civic, creative, and everyday practice needs.

Three boundaries keep the system useful:

First, a finite taxonomy cannot represent every local exam, national law, profession, or community. Custom topic is therefore essential. Second, legal and medical material should be framed as educational typing practice, not personalized advice or a substitute for a professional. Third, current affairs requires retrieval and source handling; it cannot be made reliable by prompt wording alone.

## 6. Gemini key and “god-level” QA testing

Yes, a real live QA pass is possible with your Gemini key, but **please do not send the key in chat**. The safest path is for you to enter it yourself through the app’s AI Setup screen. The current project contract is one key per provider, stored locally for the app’s provider flow. Once the key is configured in the browser session, I can run the tests without seeing or copying the secret.

I can test far more than whether one passage generates. The proposed QA matrix is:

| Test layer | What will be measured |
|---|---|
| Request routing | Correct Gemini model/provider, correct Subject and Topic identifiers, correct length, no accidental old endpoint, no duplicate requests. |
| Output charset | No smart quotes, em dashes, en dashes, non-breaking spaces, invisible control characters, emoji, or other characters outside the selected keyboard policy unless the mode explicitly requests punctuation. |
| English mode | US English spelling/style and India English spelling/style are checked as language preferences, while the keyboard policy is checked separately. Locale is not treated as a character filter. |
| Length | Word count, sentence completeness, no abrupt cutoffs, tolerance behavior, custom-length extremes, and retry behavior. |
| Content fidelity | The selected Subject and Topic are actually reflected in the passage, with no drift into a generic essay. Legal, medical, political, and current-affairs passages receive extra factual and neutrality checks. |
| Practice usability | Passage is typeable, readable, not overloaded with unusual names or symbols, and appropriate for the requested difficulty and length. |
| UI behavior | Modal opening/closing, dependent Topic changes, custom-length reveal, loading state, duplicate-click protection, mobile layout, keyboard focus, Escape handling, and error recovery. |
| Failure behavior | Missing key, invalid key, quota/rate limit, timeout, malformed response, blocked current-affairs retrieval, and retry path. |

To protect your hotspot and API quota, I would not begin with hundreds of calls. I recommend a staged pass: a small smoke suite across representative Subjects, then targeted repetitions for any failure, followed by a larger stress matrix only after the contract is stable. A sensible first pass would be approximately 12–18 calls, including legal, parliament, current affairs, professional writing, health, science, and custom-topic cases, with two or three custom lengths. The browser probe can perform deterministic checks, while human review is still needed for naturalness, factual nuance, and whether the text genuinely feels good to type.

No finite test can guarantee that there will never be another iteration: model outputs are stochastic, providers change, and current events change. What we can achieve is a strong release gate with reproducible checks, sampled human review, clean failure states, and a documented list of known limits. That is the honest version of a “god-level” quality pass.

## Recommended implementation order after approval

I would implement this in four small checkpoints rather than one risky rewrite. First, remove the persistent AI-key span and add Custom length without changing the taxonomy. Second, expand and normalize the Subject/Topic data model with Custom topic. Third, add the Current Affairs & Media subject in non-live mode, then add grounded Fresh brief only after its source/citation path is approved. Fourth, run the secure Gemini QA matrix and tune prompts from observed failures rather than guessing.

## References

1. [Google AI for Developers — Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search)
2. [Library of Congress — Classification Outline](https://www.loc.gov/catdir/cpso/lcco/)
3. [UNESCO Institute for Statistics — International Standard Classification of Education](https://www.uis.unesco.org/en/methods-and-tools/isced)
4. [UNESCO — Media and Information Literacy](https://www.unesco.org/en/media-information-literacy)
5. [Supreme Court of India — Case Category](https://www.sci.gov.in/case-category/)
6. [United States Courts — Types of Cases](https://www.uscourts.gov/about-federal-courts/types-cases)
7. [Digital Sansad — Official Debates](https://sansad.in/rs/debates/officials)
8. [Lok Sabha — Important Parliamentary Terms](https://sansad.in/ls/about/important-parliamentary-terms)
9. [World Health Organization — Health Topics](https://www.who.int/health-topics)
