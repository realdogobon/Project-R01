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
