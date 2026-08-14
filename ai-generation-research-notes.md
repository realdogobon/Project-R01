# Practice Mode AI Generation Research Notes

## Initial authoritative findings

The United States Courts describes the top-level federal case structure as **criminal, civil, and bankruptcy**, with a separate **appeals** path after a decision. This is useful as a broad legal/court taxonomy, but it is not sufficient by itself for a user-facing practice generator because family, property, employment, consumer, administrative, and constitutional matters need clearer subcategories for ordinary users.

The Digital Sansad official debates index exposes searchable dimensions including **Title of Debate**, **Debate Type**, **Debate Title Subject**, and **Members Participated**. This supports a parliamentary generator organized around the form of parliamentary work (for example questions, bills, motions, committee work, and policy debates) plus a plain-language subject area, rather than a single “Parliamentary & Debates” bucket.

The Library of Congress Classification outline provides a useful coverage check across **general works, philosophy and religion, history, geography and anthropology, social sciences, political science, law, education, language and literature, science, medicine, agriculture, technology, military science, and information resources**. It is a library classification rather than a direct UI taxonomy, so the product should simplify and group these areas instead of exposing classification codes.

The NIH/NLM states that **MeSH is a controlled vocabulary thesaurus used for indexing PubMed articles**. Its hierarchical approach is a good model for medical and healthcare generation: expose a small set of plain-language areas in the UI, while keeping more specific subtopics in structured prompt metadata rather than a giant flat dropdown.

The Supreme Court of India’s current case-category page separates **Civil Law, Criminal Law, Constitutional Law, Family Laws, and Consumer Disputes and RERA**, and its detailed table includes specialist categories such as admiralty and maritime law, constitutional-functionary appointments, arbitration and alternative dispute resolution, and public-interest groupings. The generator should therefore offer broad, understandable headings with carefully scoped subtopics, rather than pretending that “Legal & Court Matters” is one homogeneous genre.

The Lok Sabha’s official parliamentary-terms page is explicitly dedicated to **Important Terms** and **Parliamentary Terminology**. Together with the Digital Sansad debate index, this supports a generator structure that distinguishes parliamentary device from subject: questions, bills and legislative stages, motions and resolutions, amendments, committee work, budget and finance, and policy or public-interest debates.

## Sources

1. [United States Courts — Types of Cases](https://www.uscourts.gov/about-federal-courts/types-cases)
2. [Digital Sansad — Official Debates](https://sansad.in/rs/debates/officials)
3. [Library of Congress — Classification Outline](https://www.loc.gov/catdir/cpso/lcco/)
4. [NIH/NLM — MeSH](https://www.ncbi.nlm.nih.gov/mesh/)
5. [Supreme Court of India — Case Category](https://www.sci.gov.in/case-category/)
6. [Lok Sabha — Important Parliamentary Terms](https://sansad.in/ls/about/important-parliamentary-terms)

## Current-affairs feasibility findings

The official Gemini documentation states that Google Search grounding connects Gemini to real-time web content, can improve factual accuracy, can answer recent-event questions, and returns citation annotations plus search metadata. This means a Current affairs practice subject is logically valuable, but it must be treated as a separate **grounded mode** rather than pretending that an ordinary prompt is automatically current. The app would need to preserve source citations or clearly label the generated text with its retrieval date and grounding status.

UNESCO frames Media and Information Literacy as the ability to engage critically with information, navigate online environments safely, and address mis- and disinformation, hate speech, and declining trust in media and AI. A current-affairs practice category should therefore include options such as news reading, source comparison, headline-to-brief, public-issue vocabulary, and balanced debate language, rather than only asking the model for “latest news.”

## Sources added

7. [Google AI for Developers — Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search)
8. [UNESCO — Media and Information Literacy](https://www.unesco.org/en/media-information-literacy)

## Global coverage findings

The Library of Congress outline is useful as a coverage audit rather than a direct interface model. Its top-level classes span general works; philosophy, psychology, and religion; history; geography and anthropology; social sciences; political science; law; education; music and fine arts; language and literature; science; medicine; agriculture; technology; military and naval science; and information resources. The UI should collapse these into a much smaller number of plain-language subjects with topic-level specificity and an optional custom topic.

UNESCO’s ISCED framework is a globally agreed way to categorize education programs and qualifications for cross-national comparison, and its ISCED-F companion organizes fields of study. This supports the idea of a broad, international practice taxonomy, but also reinforces the need to present it as simple user-facing subjects rather than expose formal classification codes or pretend that one list can represent every national curriculum.

9. [Library of Congress — Classification Outline](https://www.loc.gov/catdir/cpso/lcco/)
10. [UNESCO Institute for Statistics — ISCED](https://www.uis.unesco.org/en/methods-and-tools/isced)
