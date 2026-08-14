/*
 * RoyScript Practice AI — structured, keyboard-safe text generation.
 * The UI keeps the Notepads/Advanced Config language: short labels, native
 * select controls, and no decorative copy. This module owns only provider
 * routing, prompt construction, and response normalization.
 */

import { loadProviderKeys, type ProviderKeys } from "./AiVisionEngine";

export type PracticeAiProvider = "gemini" | "openai" | "groq";

export interface PracticeAiOption {
  id: string;
  label: string;
}

export interface PracticeAiCategory extends PracticeAiOption {
  topics: PracticeAiOption[];
}

const CUSTOM_TOPIC: PracticeAiOption = { id: "custom-topic", label: "Custom topic" };

export const PRACTICE_AI_CATEGORIES: PracticeAiCategory[] = [
  {
    id: "legal",
    label: "Legal and court",
    topics: [
      { id: "civil", label: "Civil disputes" },
      { id: "criminal", label: "Criminal law" },
      { id: "family", label: "Family and personal matters" },
      { id: "constitutional", label: "Constitutional and public law" },
      { id: "consumer", label: "Consumer and RERA" },
      { id: "arbitration", label: "Arbitration and mediation" },
      { id: "property", label: "Property and land" },
      { id: "labour", label: "Labour and service" },
      { id: "tax", label: "Tax and regulatory" },
      { id: "environmental", label: "Environmental and public interest" },
      { id: "intellectual-property", label: "Intellectual property" },
      { id: "cyber-digital", label: "Cyber and digital law" },
      { id: "evidence-procedure", label: "Evidence and court procedure" },
    ],
  },
  {
    id: "parliament",
    label: "Parliament and public policy",
    topics: [
      { id: "questions", label: "Parliamentary questions" },
      { id: "bills", label: "Bills and legislation" },
      { id: "motions", label: "Motions and resolutions" },
      { id: "committees", label: "Committees and reports" },
      { id: "budget", label: "Budget and finance" },
      { id: "policy", label: "Policy and public-interest debates" },
      { id: "elections", label: "Elections and representation" },
      { id: "governance", label: "Governance and public services" },
      { id: "welfare", label: "Social welfare and inclusion" },
      { id: "international", label: "International affairs" },
    ],
  },
  {
    id: "editorial",
    label: "Editorial and opinion",
    topics: [
      { id: "public-policy", label: "Public policy" },
      { id: "society", label: "Society and culture" },
      { id: "technology-media", label: "Technology and media" },
      { id: "education-work", label: "Education and work" },
      { id: "environment-climate", label: "Environment and climate" },
    ],
  },
  {
    id: "business",
    label: "Business and finance",
    topics: [
      { id: "management", label: "Management and workplace" },
      { id: "banking-markets", label: "Banking and markets" },
      { id: "entrepreneurship", label: "Entrepreneurship" },
      { id: "economics-trade", label: "Economics and trade" },
      { id: "accounting-operations", label: "Accounting and operations" },
      { id: "personal-finance", label: "Personal finance and consumer life" },
      { id: "entrepreneurial-case", label: "Entrepreneurial case studies" },
    ],
  },
  {
    id: "general",
    label: "General and narrative",
    topics: [
      { id: "explainer", label: "News-style explainer" },
      { id: "history-culture", label: "History and culture" },
      { id: "travel", label: "Travel and places" },
      { id: "everyday", label: "Everyday life" },
      { id: "short-narrative", label: "Short narrative" },
      { id: "food-hospitality", label: "Food and hospitality" },
      { id: "sports-fitness", label: "Sports and fitness" },
    ],
  },
  {
    id: "science",
    label: "Science and technology",
    topics: [
      { id: "physics-engineering", label: "Physics and engineering" },
      { id: "computing-ai", label: "Computing and AI" },
      { id: "climate-earth", label: "Climate and earth" },
      { id: "space", label: "Space and astronomy" },
      { id: "research-methods", label: "Research methods" },
      { id: "mathematics-data", label: "Mathematics and data" },
      { id: "biology-chemistry", label: "Biology and chemistry" },
      { id: "software-engineering", label: "Software engineering" },
    ],
  },
  {
    id: "medical",
    label: "Medical and healthcare",
    topics: [
      { id: "public-health", label: "Public health" },
      { id: "clinical", label: "Clinical medicine" },
      { id: "anatomy", label: "Anatomy and physiology" },
      { id: "pharmacy", label: "Pharmacy and therapeutics" },
      { id: "mental-health", label: "Mental health and wellbeing" },
      { id: "nutrition", label: "Nutrition and food health" },
      { id: "infectious-disease", label: "Infectious disease" },
      { id: "health-systems", label: "Health systems and access" },
      { id: "nursing-allied", label: "Nursing and allied health" },
    ],
  },
  {
    id: "education",
    label: "Education and research",
    topics: [
      { id: "teaching", label: "Teaching and learning" },
      { id: "academic-writing", label: "Academic writing" },
      { id: "study-skills", label: "Study skills" },
      { id: "information-work", label: "Library and information work" },
      { id: "research-communication", label: "Research communication" },
      { id: "early-childhood", label: "Early childhood learning" },
      { id: "special-education", label: "Inclusive and special education" },
      { id: "assessment", label: "Assessment and examinations" },
      { id: "vocational", label: "Vocational and skills training" },
    ],
  },
  {
    id: "arts",
    label: "Arts and humanities",
    topics: [
      { id: "literature", label: "Literature" },
      { id: "language", label: "Language" },
      { id: "visual-arts", label: "Visual arts" },
      { id: "music-performance", label: "Music and performance" },
      { id: "philosophy-ethics", label: "Philosophy and ethics" },
      { id: "architecture-design", label: "Architecture and design" },
      { id: "film-photography", label: "Film and photography" },
      { id: "heritage", label: "Cultural heritage" },
    ],
  },
  {
    id: "environment",
    label: "Environment and agriculture",
    topics: [
      { id: "conservation", label: "Conservation" },
      { id: "agriculture-food", label: "Agriculture and food systems" },
      { id: "water-energy", label: "Water and energy" },
      { id: "climate-adaptation", label: "Climate adaptation" },
      { id: "sustainable-cities", label: "Sustainable cities" },
      { id: "biodiversity", label: "Biodiversity and ecosystems" },
      { id: "pollution", label: "Pollution and public health" },
      { id: "disaster-resilience", label: "Disaster resilience" },
    ],
  },
  {
    id: "current-affairs",
    label: "Current affairs and media",
    topics: [
      { id: "world-context", label: "World issues and context" },
      { id: "india-regional", label: "India and regional affairs" },
      { id: "public-debate", label: "Public debate and policy" },
      { id: "climate-disasters", label: "Climate and disasters" },
      { id: "economy-markets", label: "Economy and markets" },
      { id: "science-news", label: "Science and technology news" },
      { id: "media-literacy", label: "Media literacy" },
      { id: "compare-reports", label: "Compare reported viewpoints" },
      { id: "elections-governance", label: "Elections and governance" },
      { id: "health-society", label: "Health and society" },
      { id: "humanitarian", label: "Humanitarian crises" },
      { id: "energy-food", label: "Energy and food security" },
      { id: "technology-regulation", label: "Technology and regulation" },
      { id: "fact-checking", label: "Fact-checking and verification" },
    ],
  },
  {
    id: "humanities",
    label: "Humanities and society",
    topics: [
      { id: "history", label: "History" },
      { id: "geography", label: "Geography" },
      { id: "psychology", label: "Psychology" },
      { id: "sociology", label: "Sociology and anthropology" },
      { id: "philosophy-ethics", label: "Philosophy and ethics" },
      { id: "human-rights", label: "Human rights and society" },
      { id: "international-relations", label: "International relations" },
    ],
  },
  {
    id: "language-literature",
    label: "Language and literature",
    topics: [
      { id: "general-english", label: "General English" },
      { id: "grammar-vocabulary", label: "Grammar and vocabulary" },
      { id: "journalism", label: "Journalism" },
      { id: "essays-speeches", label: "Essays and speeches" },
      { id: "fiction-poetry", label: "Fiction and poetry" },
      { id: "biography-reviews", label: "Biography and book reviews" },
      { id: "translation", label: "Translation practice" },
    ],
  },
  {
    id: "professional-writing",
    label: "Everyday and professional writing",
    topics: [
      { id: "email", label: "Email and correspondence" },
      { id: "notices", label: "Notices and announcements" },
      { id: "reports", label: "Reports and summaries" },
      { id: "instructions", label: "Instructions and procedures" },
      { id: "customer-support", label: "Customer support" },
      { id: "applications-resumes", label: "Applications and resumes" },
      { id: "meeting-notes", label: "Meeting notes and presentations" },
      { id: "technical-documentation", label: "Technical documentation" },
      { id: "workplace-safety", label: "Workplace safety" },
    ],
  },
];

export const PRACTICE_AI_DIFFICULTIES: PracticeAiOption[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "professional", label: "Professional" },
];

export const PRACTICE_AI_CUSTOM_MIN_WORDS = 20;
export const PRACTICE_AI_CUSTOM_MAX_WORDS = 2000;

export const PRACTICE_AI_LENGTHS: Array<PracticeAiOption & { words?: number }> = [
  { id: "short", label: "Short (about 200 words)", words: 200 },
  { id: "medium", label: "Medium (about 400 words)", words: 400 },
  { id: "long", label: "Long (about 800 words)", words: 800 },
  { id: "custom", label: "Custom", words: undefined },
];

const MODEL_ORDER: Array<{ id: string; provider: PracticeAiProvider; model: string; label: string }> = [
  { id: "gemini-2.5-flash", provider: "gemini", model: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "openai-gpt-4o-mini", provider: "openai", model: "gpt-4o-mini", label: "OpenAI GPT-4o mini" },
  { id: "groq-llama-3.3-70b", provider: "groq", model: "llama-3.3-70b-versatile", label: "Groq Llama 3.3 70B" },
];

export interface PracticeGenerationRequest {
  categoryId: string;
  topicId: string;
  difficultyId: string;
  lengthId: string;
  customTopic?: string;
  customLengthWords?: number;
}

export interface PracticeGenerationResult {
  text: string;
  modelId: string;
  provider: PracticeAiProvider;
  modelLabel: string;
}

function optionLabel(options: PracticeAiOption[], id: string, fallback: string): string {
  return options.find((option) => option.id === id)?.label ?? fallback;
}

export function getPracticeAiCategory(id: string): PracticeAiCategory {
  const category = PRACTICE_AI_CATEGORIES.find((entry) => entry.id === id) ?? PRACTICE_AI_CATEGORIES[0];
  return category.topics.some((topic) => topic.id === CUSTOM_TOPIC.id)
    ? category
    : { ...category, topics: [...category.topics, CUSTOM_TOPIC] };
}

export function getPracticeAiTopic(categoryId: string, topicId: string): PracticeAiOption {
  const category = getPracticeAiCategory(categoryId);
  return category.topics.find((topic) => topic.id === topicId) ?? category.topics[0];
}

function getLength(lengthId: string) {
  return PRACTICE_AI_LENGTHS.find((length) => length.id === lengthId) ?? PRACTICE_AI_LENGTHS[1];
}

function getTargetWords(request: PracticeGenerationRequest): number {
  if (request.lengthId === "custom") {
    const value = Number(request.customLengthWords);
    if (!Number.isInteger(value) || value < PRACTICE_AI_CUSTOM_MIN_WORDS || value > PRACTICE_AI_CUSTOM_MAX_WORDS) {
      throw new Error(`Custom length must be between ${PRACTICE_AI_CUSTOM_MIN_WORDS} and ${PRACTICE_AI_CUSTOM_MAX_WORDS} words.`);
    }
    return value;
  }
  return getLength(request.lengthId).words ?? 400;
}

function getTopicLabel(request: PracticeGenerationRequest, fallback: string): string {
  if (request.topicId === CUSTOM_TOPIC.id) {
    const customTopic = request.customTopic?.trim();
    if (!customTopic) throw new Error("Enter a topic before generating practice text.");
    return customTopic.slice(0, 120);
  }
  return fallback;
}

const CATEGORY_GUIDANCE: Record<string, string> = {
  legal: "Explain the selected legal area through a neutral fictional or general-knowledge scenario, define key terms, show more than one viewpoint, and describe process or public impact without giving personal legal advice.",
  parliament: "Explain the selected parliamentary device or policy issue through its purpose, participants, stages, trade-offs, and public effect; use neutral civic language rather than partisan persuasion.",
  editorial: "Build a balanced editorial-style explainer with a clear issue, relevant context, competing considerations, and a measured conclusion; distinguish facts, interpretation, and opinion.",
  business: "Develop a practical business passage with a concrete situation, relevant terminology, decisions, constraints, risks, and outcomes; keep figures illustrative rather than presenting financial advice.",
  general: "Create a coherent, accessible passage with a clear setting or question, concrete details, logical development, and a satisfying conclusion that remains useful for typing practice.",
  science: "Explain the selected scientific or technical subject from foundation to application, using accurate plain language, cause and effect, examples, limitations, and responsible uncertainty.",
  medical: "Write neutral health education that explains concepts, symptoms or systems, prevention or care context, and uncertainty without diagnosing a person or prescribing treatment.",
  education: "Teach the selected subject with a clear learning goal, ordered explanation, examples, common misunderstandings, and a short synthesis suitable for study or classroom practice.",
  arts: "Explore the selected art or humanities subject through context, technique or ideas, examples, interpretation, and cultural perspective without reducing it to a list.",
  environment: "Explain the environmental or agricultural issue through systems, causes, lived effects, trade-offs, and realistic responses while acknowledging regional variation.",
  "current-affairs": "Create a non-live media-literacy exercise that teaches how to understand, compare, and question reporting about the selected issue without asserting current facts or inventing events.",
  humanities: "Develop the selected society or humanities topic through historical or social context, multiple perspectives, key concepts, examples, and a balanced synthesis.",
  "language-literature": "Create a rich language or literature passage with clear vocabulary, natural rhythm, context, interpretation, and varied sentence construction while remaining easy to type.",
  "professional-writing": "Model a useful professional document or situation with a clear purpose, audience, logical structure, precise wording, and realistic details without including private personal data.",
};

function getTargetWindow(targetWords: number): { minimum: number; maximum: number } {
  return {
    minimum: Math.max(PRACTICE_AI_CUSTOM_MIN_WORDS, Math.ceil(targetWords * 0.95)),
    maximum: Math.max(targetWords + 1, Math.ceil(targetWords * 1.08)),
  };
}

function getProviderTokenBudget(targetWords: number): number {
  return Math.min(8192, Math.max(1024, Math.ceil(targetWords * 3 + 512)));
}

function getLengthRecoveryPasses(targetWords: number): number {
  // A short 400-word answer often needs one full replacement plus several
  // focused continuations. Larger answers have much bigger token budgets, so
  // retain the existing bounded request count unless the model truly stalls.
  return targetWords <= 500 ? 4 : 2;
}

function buildPrompt(request: PracticeGenerationRequest, retry?: { previousWordCount: number; remainingWords?: number; continuation?: boolean }): string {
  const category = getPracticeAiCategory(request.categoryId);
  const topic = getPracticeAiTopic(request.categoryId, request.topicId);
  const difficulty = optionLabel(PRACTICE_AI_DIFFICULTIES, request.difficultyId, "Intermediate");
  const targetWords = getTargetWords(request);
  const targetWindow = getTargetWindow(targetWords);
  const topicLabel = getTopicLabel(request, topic.label);
  const isCurrentAffairs = request.categoryId === "current-affairs";
  const guidance = CATEGORY_GUIDANCE[request.categoryId] ?? CATEGORY_GUIDANCE.general;
  const structure = targetWords <= 250
    ? "Use 2 or 3 connected paragraphs with a clear opening, development, and close."
    : targetWords <= 800
      ? "Use 4 to 6 connected paragraphs. Develop the idea with concrete detail instead of repeating the introduction."
      : "Use at least 6 connected paragraphs. Build the subject in stages, add concrete examples and implications, and reach a real conclusion rather than stopping after a short summary.";
  const retryInstruction = retry?.continuation
    ? `The existing draft is ${retry.previousWordCount} words and needs approximately ${retry.remainingWords ?? Math.max(1, targetWords - retry.previousWordCount)} additional words. Write only a coherent continuation segment that develops the same topic, does not repeat the opening, and ends naturally. Return only the continuation text.`
    : retry
    ? `The previous draft was only ${retry.previousWordCount} words. Write a complete replacement, not a summary or continuation, and keep developing the selected topic until it reaches the requested length window.`
    : "Do not stop after a short overview; continue developing the selected topic until the requested length window is reached.";

  return [
    "Create one original typing-practice passage.",
    `Subject: ${category.label}.`,
    `Topic: ${topicLabel}.`,
    `Typing level: ${difficulty}.`,
    `Target length: ${targetWords} words. Aim for ${targetWindow.minimum} to ${targetWindow.maximum} words before returning.`,
    guidance,
    structure,
    retryInstruction,
    "Use specific nouns, useful detail, varied but natural sentence lengths, and logical transitions. Do not pad with repetition.",
    "Use clear English in a consistent US English or India English style, with natural grammar and spelling.",
    "Use only characters available on a standard English QWERTY keyboard: ASCII letters, digits, spaces, line breaks, and common punctuation such as . , ; : ! ? ' \" ( ) - / %.",
    "Do not use em dashes, en dashes, curly quotes, ellipsis characters, emoji, decorative symbols, non-Latin scripts, Markdown, bullet points, code fences, headings, metadata, citations, disclaimers, or a preamble.",
    isCurrentAffairs
      ? "This is a non-live current-affairs and media-literacy exercise. Do not claim that information is the latest, today’s news, or verified by live sources; do not invent dates, statistics, sources, or breaking events. Present general context, media-literacy skills, or balanced viewpoints without political persuasion."
      : "Keep the passage educational and grounded in the selected subject; do not present it as personalized legal, medical, financial, or professional advice.",
    retry?.continuation
      ? "Return only the continuation segment. Do not add a heading, preamble, bullet list, citation, or explanation."
      : "Return only the passage. Make it useful for typing practice, coherent from beginning to end, and appropriate for a general audience.",
  ].join(" ");
}

const SYSTEM_PROMPT = [
  "You are RoyScript's plain-text typing practice writer.",
  "Follow the user's subject and topic exactly.",
  "Develop the passage fully instead of stopping once the basic idea has been introduced.",
  "Respect the requested word-count window; for long requests, use multiple connected paragraphs and concrete detail rather than a short summary.",
  "Never invent legal advice, medical advice, citations, case outcomes, or official statements; write neutral educational practice text instead.",
  "For current-affairs requests, write a non-live educational exercise and never imply live retrieval or up-to-date verification.",
  "Return only one original passage and follow the keyboard-safe character rules in the request.",
].join(" ");

function normalizePracticeText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, " ")
    .replace(/```[a-zA-Z]*\n?/g, "")
    .replace(/```/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countPracticeWords(value: string): number {
  return value.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)?.length ?? 0;
}

function trimToSentenceBoundary(value: string, maximumWords: number): string {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= maximumWords) return value;

  const candidate = words.slice(0, maximumWords).join(" ");
  const sentenceEnd = Math.max(candidate.lastIndexOf("."), candidate.lastIndexOf("!"), candidate.lastIndexOf("?"));
  const safeMinimumCharacters = Math.floor(candidate.length * 0.7);
  return sentenceEnd >= safeMinimumCharacters ? candidate.slice(0, sentenceEnd + 1).trim() : candidate;
}

function isWithinTargetWindow(wordCount: number, targetWords: number): boolean {
  const window = getTargetWindow(targetWords);
  return wordCount >= window.minimum && wordCount <= window.maximum;
}

function shortResponseError(targetWords: number, wordCount: number): Error {
  return new Error(`The AI returned ${wordCount} words for a ${targetWords}-word request. Try again or choose a shorter length.`);
}

function createPracticeAbortError(): Error {
  if (typeof DOMException !== "undefined") return new DOMException("Practice generation was stopped.", "AbortError");
  const error = new Error("Practice generation was stopped.");
  error.name = "AbortError";
  return error;
}

function throwIfPracticeAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw createPracticeAbortError();
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 90000, externalSignal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const handleAbort = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  else externalSignal?.addEventListener("abort", handleAbort, { once: true });
  return fetch(url, { ...init, signal: controller.signal }).finally(() => {
    window.clearTimeout(timer);
    externalSignal?.removeEventListener("abort", handleAbort);
  });
}

async function requestGemini(apiKey: string, prompt: string, model: string, maxOutputTokens: number, signal?: AbortSignal): Promise<string> {
  throwIfPracticeAborted(signal);
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.45, maxOutputTokens },
      }),
    },
    90000,
    signal,
  );
  if (!response.ok) throw new Error(`Gemini API error ${response.status}: ${(await response.text()).slice(0, 240)}`);
  const json = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

async function requestChatCompletion(provider: PracticeAiProvider, apiKey: string, prompt: string, model: string, maxOutputTokens: number, signal?: AbortSignal): Promise<string> {
  throwIfPracticeAborted(signal);
  const baseUrl = provider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1";
  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      max_tokens: maxOutputTokens,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  }, 90000, signal);
  if (!response.ok) throw new Error(`${provider === "groq" ? "Groq" : "OpenAI"} API error ${response.status}: ${(await response.text()).slice(0, 240)}`);
  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

export function getAvailablePracticeModel(keys: ProviderKeys = loadProviderKeys()) {
  return MODEL_ORDER.find((model) => Boolean(keys[model.provider]?.trim()));
}

export async function generatePracticeText(request: PracticeGenerationRequest, signal?: AbortSignal): Promise<PracticeGenerationResult> {
  throwIfPracticeAborted(signal);
  const selected = getAvailablePracticeModel();
  if (!selected) throw new Error("Choose a provider in AI Setup to generate practice text.");

  const apiKey = loadProviderKeys()[selected.provider]?.trim();
  if (!apiKey) throw new Error("The selected AI provider key is not available. Check Settings > AI Setup.");

  const targetWords = getTargetWords(request);
  const maxOutputTokens = getProviderTokenBudget(targetWords);
  const prompt = buildPrompt(request);
  throwIfPracticeAborted(signal);
  const raw = selected.provider === "gemini"
    ? await requestGemini(apiKey, prompt, selected.model, maxOutputTokens, signal)
    : await requestChatCompletion(selected.provider, apiKey, prompt, selected.model, maxOutputTokens, signal);
  throwIfPracticeAborted(signal);
  let text = normalizePracticeText(raw);
  if (!text) throw new Error(`${selected.label} returned no usable practice text. Try again.`);

  let wordCount = countPracticeWords(text);
  const targetWindow = getTargetWindow(targetWords);
  if (wordCount > targetWindow.maximum) {
    text = trimToSentenceBoundary(text, targetWindow.maximum);
    wordCount = countPracticeWords(text);
  }

  if (wordCount < targetWindow.minimum) {
    const maxRecoveryPasses = getLengthRecoveryPasses(targetWords);
    for (let recoveryPass = 0; wordCount < targetWindow.minimum && recoveryPass < maxRecoveryPasses; recoveryPass += 1) {
      throwIfPracticeAborted(signal);
      const isReplacementPass = recoveryPass === 0;
      const recoveryPrompt = isReplacementPass
        ? buildPrompt(request, { previousWordCount: wordCount })
        : buildPrompt(request, {
            previousWordCount: wordCount,
            remainingWords: Math.max(1, targetWords - wordCount),
            continuation: true,
          });
      const recoveryRaw = selected.provider === "gemini"
        ? await requestGemini(apiKey, recoveryPrompt, selected.model, maxOutputTokens, signal)
        : await requestChatCompletion(selected.provider, apiKey, recoveryPrompt, selected.model, maxOutputTokens, signal);
      throwIfPracticeAborted(signal);
      const recoveryText = normalizePracticeText(recoveryRaw);
      if (!recoveryText) continue;

      text = isReplacementPass ? recoveryText : normalizePracticeText(`${text}\n\n${recoveryText}`);
      wordCount = countPracticeWords(text);
      if (wordCount > targetWindow.maximum) {
        text = trimToSentenceBoundary(text, targetWindow.maximum);
        wordCount = countPracticeWords(text);
      }
    }
  }

  if (!isWithinTargetWindow(wordCount, targetWords)) {
    throw shortResponseError(targetWords, wordCount);
  }

  throwIfPracticeAborted(signal);
  return { text, modelId: selected.id, provider: selected.provider, modelLabel: selected.label };
}
