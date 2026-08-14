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
    ],
  },
];

export const PRACTICE_AI_DIFFICULTIES: PracticeAiOption[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "professional", label: "Professional" },
];

export const PRACTICE_AI_LENGTHS: Array<PracticeAiOption & { words: number }> = [
  { id: "short", label: "Short (about 200 words)", words: 200 },
  { id: "medium", label: "Medium (about 400 words)", words: 400 },
  { id: "long", label: "Long (about 800 words)", words: 800 },
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
  return PRACTICE_AI_CATEGORIES.find((category) => category.id === id) ?? PRACTICE_AI_CATEGORIES[0];
}

export function getPracticeAiTopic(categoryId: string, topicId: string): PracticeAiOption {
  const category = getPracticeAiCategory(categoryId);
  return category.topics.find((topic) => topic.id === topicId) ?? category.topics[0];
}

function getLength(lengthId: string) {
  return PRACTICE_AI_LENGTHS.find((length) => length.id === lengthId) ?? PRACTICE_AI_LENGTHS[1];
}

function buildPrompt(request: PracticeGenerationRequest): string {
  const category = getPracticeAiCategory(request.categoryId);
  const topic = getPracticeAiTopic(request.categoryId, request.topicId);
  const difficulty = optionLabel(PRACTICE_AI_DIFFICULTIES, request.difficultyId, "Intermediate");
  const length = getLength(request.lengthId);

  return [
    "Create one original typing-practice passage.",
    `Subject: ${category.label}.`,
    `Topic: ${topic.label}.`,
    `Typing level: ${difficulty}.`,
    `Target length: approximately ${length.words} words.`,
    "Use clear English (US or India) and natural, accurate grammar for the selected subject.",
    "Use only characters available on a standard English QWERTY keyboard: ASCII letters, digits, spaces, line breaks, and common punctuation such as . , ; : ! ? ' \" ( ) - / %.",
    "Do not use em dashes, en dashes, curly quotes, ellipsis characters, emoji, decorative symbols, non-Latin scripts, Markdown, bullet points, code fences, headings, metadata, citations, disclaimers, or a preamble.",
    "Return only the passage. Make it useful for typing practice, coherent from beginning to end, and appropriate for a general audience.",
  ].join(" ");
}

const SYSTEM_PROMPT = [
  "You are RoyScript's plain-text typing practice writer.",
  "Follow the user's subject and topic exactly.",
  "Never invent legal advice, medical advice, citations, case outcomes, or official statements; write neutral educational practice text instead.",
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
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 90000): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => window.clearTimeout(timer));
}

async function requestGemini(apiKey: string, prompt: string, model: string): Promise<string> {
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.45, maxOutputTokens: 1800 },
      }),
    },
  );
  if (!response.ok) throw new Error(`Gemini API error ${response.status}: ${(await response.text()).slice(0, 240)}`);
  const json = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

async function requestChatCompletion(provider: PracticeAiProvider, apiKey: string, prompt: string, model: string): Promise<string> {
  const baseUrl = provider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1";
  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      max_tokens: 1800,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) throw new Error(`${provider === "groq" ? "Groq" : "OpenAI"} API error ${response.status}: ${(await response.text()).slice(0, 240)}`);
  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

export function getAvailablePracticeModel(keys: ProviderKeys = loadProviderKeys()) {
  return MODEL_ORDER.find((model) => Boolean(keys[model.provider]?.trim()));
}

export async function generatePracticeText(request: PracticeGenerationRequest): Promise<PracticeGenerationResult> {
  const selected = getAvailablePracticeModel();
  if (!selected) {
    throw new Error("Add a Gemini, OpenAI, or Groq key in Settings > AI Setup to generate practice text.");
  }

  const apiKey = loadProviderKeys()[selected.provider]?.trim();
  if (!apiKey) throw new Error("The selected AI provider key is not available. Check Settings > AI Setup.");

  const raw = selected.provider === "gemini"
    ? await requestGemini(apiKey, buildPrompt(request), selected.model)
    : await requestChatCompletion(selected.provider, apiKey, buildPrompt(request), selected.model);
  const text = normalizePracticeText(raw);
  if (!text) throw new Error(`${selected.label} returned no usable practice text. Try again.`);

  return { text, modelId: selected.id, provider: selected.provider, modelLabel: selected.label };
}
