# Practice AI taxonomy research

## Official sources reviewed

| Source | URL | Design implication |
| --- | --- | --- |
| UNESCO Institute for Statistics, International Standard Classification of Education (ISCED) | https://www.uis.unesco.org/en/methods-and-tools/isced | Use broad, human-readable subject families rather than exposing formal classification codes. The taxonomy should cover general learning, literacy, computing, engineering, health, business, society, arts, and services. |
| U.S. National Library of Medicine, Medical Subject Headings (MeSH) | https://www.nlm.nih.gov/mesh/meshhome.html | Health practice should separate anatomy, conditions, medicines, diagnosis, treatment, public health, and mental health concepts while remaining educational and non-diagnostic. |
| Library of Congress Classification Outline | https://www.loc.gov/catdir/cpso/lcco/ | A globally useful practice system should span general works, philosophy and religion, social sciences, law, education, science, technology, agriculture, arts, language, and literature. User-facing labels should stay plain-English. |

## Implementation interpretation

These frameworks support expanding the existing taxonomy by meaningful subject families and topic directions, not by creating a flat list of hundreds of opaque choices. Every topic should give the prompt a concrete anchor and require definition, context, examples, process or mechanism, contrasting considerations, and a conclusion. The UI should remain understandable to a beginner while the prompt profile provides the depth.

The custom-length contract must treat the requested count as a measurable output requirement. A response is not successful merely because it contains the right topic. For large requests, the provider budget, corrective retry, and final acceptance window must all scale with the target. The final practice text must remain plain keyboard-safe English after normalization.

## Long-output provider constraint

Google's official Gemini token documentation states that Gemini tokens are roughly four characters, and that 100 tokens commonly correspond to about 60–80 English words. It also documents that `maxOutputTokens` is a generation ceiling and that model-specific output limits should be checked rather than assumed. Sources: [Gemini generateContent API](https://ai.google.dev/api/generate-content) and [Gemini token counting guide](https://ai.google.dev/gemini-api/docs/tokens), both accessed during the 2026-08-14 QA pass.

Implementation implication: a word target must be translated into a generous, model-aware output budget and then verified against the normalized returned word count. Prompt wording alone cannot guarantee a count; the client needs an acceptance window, corrective retry or continuation strategy, and a clear failure when the provider remains materially short.
