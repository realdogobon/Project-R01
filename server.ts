import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

class KeyPool {
  private index: number = 0;
  private envPluralName: string;
  private envSingularName: string;
  private fallbackList: string[];

  constructor(envPluralName: string, envSingularName: string, fallbackList: string[]) {
    this.envPluralName = envPluralName;
    this.envSingularName = envSingularName;
    this.fallbackList = fallbackList;
  }

  public getKeys(): string[] {
    const pluralEnv = process.env[this.envPluralName];
    const singularEnv = process.env[this.envSingularName];

    if (pluralEnv) {
      const parsed = pluralEnv.split(",").map(k => k.trim()).filter(Boolean);
      if (parsed.length > 0) return parsed;
    }
    if (singularEnv && singularEnv.trim()) {
      return [singularEnv.trim()];
    }
    return this.fallbackList;
  }

  public hasKeys(): boolean {
    return this.getKeys().length > 0;
  }

  public getNextKey(): string | null {
    const keys = this.getKeys();
    if (keys.length === 0) return null;
    const key = keys[this.index];
    this.index = (this.index + 1) % keys.length;
    return key;
  }

  public getKeyAtIndex(idx: number): string | null {
    const keys = this.getKeys();
    if (keys.length === 0) return null;
    return keys[idx % keys.length];
  }
}

const geminiPool = new KeyPool("GEMINI_API_KEYS", "GEMINI_API_KEY", []);
const groqPool = new KeyPool("GROQ_API_KEYS", "GROQ_API_KEY", []);
const openaiPool = new KeyPool("OPENAI_API_KEYS", "OPENAI_API_KEY", []);

function getGeminiKey() {
  return geminiPool.getNextKey() || "";
}

function getGroqKey() {
  return groqPool.getNextKey() || "";
}

function getOpenAIKey() {
  return openaiPool.getNextKey() || "";
}

async function startServer() {

  if (process.env.NODE_ENV !== "production") {
    const dotenv = await import("dotenv");
    dotenv.config();
  }

  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));


  const getAssetPath = (filename: string) => {
    const isProduction = process.env.NODE_ENV === "production";
    const distPath = path.join(process.cwd(), "dist", filename);
    const publicPath = path.join(process.cwd(), "public", filename);
    return isProduction && fs.existsSync(distPath) ? distPath : publicPath;
  };

  app.get("/sound.ogg", (req, res) => {
    res.sendFile(getAssetPath("sound.ogg"));
  });
  app.get("/sounds/sound.ogg", (req, res) => {
    res.sendFile(getAssetPath("sound.ogg"));
  });
  app.get("/fahhhhh.mp3", (req, res) => {
    res.sendFile(getAssetPath("fahhhhh.mp3"));
  });
  app.get("/sounds/fahhhhh.mp3", (req, res) => {
    res.sendFile(getAssetPath("fahhhhh.mp3"));
  });


  app.get("/sw.js", (req, res) => {
    const isProduction = process.env.NODE_ENV === "production";
    const distPath = path.join(process.cwd(), "dist", "sw.js");
    const publicPath = path.join(process.cwd(), "public", "sw.js");

    let finalPath = publicPath;
    if (isProduction && fs.existsSync(distPath)) {
      finalPath = distPath;
    }

    res.setHeader("Content-Type", "application/javascript");
    res.sendFile(finalPath);
  });

  app.get(["/manifest.json", "/manifest.webmanifest"], (req, res) => {
    const isProduction = process.env.NODE_ENV === "production";
    const filename = req.path.endsWith("webmanifest")
      ? "manifest.webmanifest"
      : "manifest.json";
    const distPath = path.join(process.cwd(), "dist", filename);
    const publicPath = path.join(process.cwd(), "public", filename);

    let finalPath = publicPath;
    if (isProduction && fs.existsSync(distPath)) {
      finalPath = distPath;
    } else if (
      !fs.existsSync(publicPath) &&
      filename === "manifest.webmanifest"
    ) {
      finalPath = path.join(process.cwd(), "public", "manifest.json");
    }

    res.setHeader("Content-Type", "application/json");
    res.sendFile(finalPath);
  });


  app.post("/api/generate-practice", async (req, res) => {
    try {
      const { category, difficulty, length } = req.body;

      if (!geminiPool.hasKeys() && !groqPool.hasKeys() && !openaiPool.hasKeys()) {
        return res.status(500).json({
          error: "API Key is missing.",
          details:
            "Please configure your GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY inside the Settings > Secrets configuration panel to enable custom typing content generation.",
        });
      }

      const lengthMap: Record<string, string> = {
        short: "about 150-200 words (suitable for a 2-minute test)",
        medium: "about 350-400 words (suitable for a 4-minute test)",
        long: "about 750-800 words (suitable for an 8-minute test)",
      };

      const difficultyMap: Record<string, string> = {
        beginner:
          "simple vocabulary, short plain sentences, entirely alphabetic text. Strictly NO numbers, NO brackets, and NO complex symbols (<60 WPM level)",
        intermediate:
          'moderate vocabulary and varied sentence structures. Include some numbers (like years or quantities), basic punctuation (commas, quotes), and simple brackets "()" (60-90 WPM level)',
        advanced:
          'complex vocabulary, domain-specific terminology. Authentically integrate numbers, dates, fractions, percentages, hyphens/dashes, and brackets "[]" or "()" to test numeric and symbol precision (90-120 WPM level)',
        professional:
          "highly technical/academic vocabulary, advanced phrasing. Heavily feature alphanumeric case references/codes, exact statutory/technical citations, complex symbols (like $, %, @, &, /), and frequent brackets (120+ WPM level)",
      };

      const prompt = `Generate a high-quality typing practice text.
Category: ${category}
Difficulty: ${difficultyMap[difficulty] || difficultyMap["intermediate"]}
Length: ${lengthMap[length] || lengthMap["medium"]}

Requirements:
- The text must be coherent, professionally written, and directly related to the Category.
- Strongly align with the complexity, symbols, and elements specified in the Difficulty level.
- Structure into appropriate paragraphs. Separate paragraphs using a single newline character. Do NOT use bullet points, markdown bolding, or headers.
- ONLY output the generated text, with no introductory or concluding remarks.`;

      let responseText = "";


      if (geminiPool.hasKeys()) {
        let attempt = 0;
        const maxAttempts = Math.min(geminiPool.getKeys().length, 5);

        while (attempt < maxAttempts) {
          const keyToUse = geminiPool.getKeyAtIndex(attempt);
          if (!keyToUse) break;

          let modelToUse = "gemini-3.5-flash";
          if (attempt % 3 === 1) modelToUse = "gemini-flash-latest";
          if (attempt % 3 === 2) modelToUse = "gemini-3.1-flash-lite";

          try {
            console.log(`[Content Gen] Trying Gemini generation... Attempt: ${attempt + 1} with ${modelToUse}`);
            const ai = new GoogleGenAI({
              apiKey: keyToUse,
              httpOptions: {
                headers: {
                  "User-Agent": "aistudio-build",
                },
              },
            });
            const response = await ai.models.generateContent({
              model: modelToUse,
              contents: prompt,
            });
            responseText = response.text || "";
            if (responseText) {
              console.log(`[Content Gen] Gemini generation succeeded on attempt ${attempt + 1}`);
              break;
            }
          } catch (error: any) {
            attempt++;
            console.warn(`[Content Gen] Gemini attempt ${attempt} failed with ${modelToUse}:`, error.message || String(error));
            if (attempt < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          }
        }
      }


      if (!responseText && groqPool.hasKeys()) {
        let groqAttempt = 0;
        const maxGroqAttempts = Math.min(groqPool.getKeys().length, 6);

        while (groqAttempt < maxGroqAttempts) {
          const keyToUse = groqPool.getKeyAtIndex(groqAttempt);
          if (!keyToUse) break;

          try {
            console.log(`[Content Gen] Trying Groq fallback generation... Attempt: ${groqAttempt + 1}`);
            const response = await fetch(
              "https://api.groq.com/openai/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${keyToUse}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "llama-3.3-70b-versatile",
                  messages: [{ role: "user", content: prompt }],
                  temperature: 0.6,
                }),
              },
            );

            if (!response.ok) {
              const errText = await response.text();
              throw new Error(`Groq API Error (${response.status}): ${errText}`);
            }
            const data = await response.json();
            responseText = data.choices[0]?.message?.content || "";
            if (responseText) {
              console.log(`[Content Gen] Groq generation succeeded on attempt ${groqAttempt + 1}`);
              break;
            }
          } catch (error: any) {
            groqAttempt++;
            console.warn(`Groq fallback attempt ${groqAttempt} failed:`, error.message || String(error));
            if (groqAttempt < maxGroqAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          }
        }
      }


      if (!responseText && openaiPool.hasKeys()) {
        let openaiAttempt = 0;
        const maxOpenAIAttempts = Math.min(openaiPool.getKeys().length, 3);

        while (openaiAttempt < maxOpenAIAttempts) {
          const keyToUse = openaiPool.getKeyAtIndex(openaiAttempt);
          if (!keyToUse) break;

          try {
            console.log(`[Content Gen] Trying OpenAI fallback generation... Attempt: ${openaiAttempt + 1}`);
            const response = await fetch(
              "https://api.openai.com/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${keyToUse}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "gpt-4o-mini",
                  messages: [{ role: "user", content: prompt }],
                  temperature: 0.6,
                }),
              },
            );

            if (!response.ok) {
              const errText = await response.text();
              throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
            }
            const data = await response.json();
            responseText = data.choices[0]?.message?.content || "";
            if (responseText) {
              console.log(`[Content Gen] OpenAI generation succeeded on attempt ${openaiAttempt + 1}`);
              break;
            }
          } catch (error: any) {
            openaiAttempt++;
            console.warn(`OpenAI fallback attempt ${openaiAttempt} failed:`, error.message || String(error));
            if (openaiAttempt < maxOpenAIAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          }
        }
      }

      if (responseText) {
        res.json({ text: responseText });
      } else {
        console.warn(
          "Falling back to predefined text due to AI rate limits/errors.",
        );

        const fallbackTexts: Record<string, string> = {
          "Legal & Court Matters":
            "The defendant, being duly sworn, deposes and says: that on or about the aforementioned date, the plaintiff did knowingly and willfully breach the terms of the contract set forth in Exhibit A. As a direct result of these actions, irreparable harm has been caused to the plaintiff's business operations. Furthermore, statutory compliance under section 4.1.2 is mandated.",
          "Medical & Healthcare":
            "The patient presented with acute myocardial infarction, confirmed by elevated troponin levels and ST-segment elevation on the electrocardiogram (ECG). Immediate percutaneous coronary intervention (PCI) was performed. The patient was initiated on dual antiplatelet therapy (DAPT) and high-intensity statins to optimize cardiovascular outcomes.",
          "General & Narrative":
            "The quick brown fox jumps over the lazy dog. Shadows lengthened across the cobblestone street as evening approached, painting the sky in vibrant strokes of orange, magenta, and deep indigo. The old clock tower stood silently, its hands frozen, a lingering testament to a forgotten era.",
          "Code & Technical":
            "function calculateFibonacci(n) {\n  if (typeof n !== 'number' || n < 0) return null;\n  if (n <= 1) return n;\n  let a = 0, b = 1;\n  for (let i = 2; i <= n; i++) {\n    let temp = a + b;\n    a = b;\n    b = temp;\n  }\n  return b;\n}",
        };
        const fallbackId =
          Object.keys(fallbackTexts).find((k) => category.includes(k)) ||
          "General & Narrative";
        res.json({
          text:
            fallbackTexts[fallbackId] || fallbackTexts["General & Narrative"],
        });
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      res
        .status(500)
        .json({
          error: "Failed to generate text.",
          details: error.message || String(error),
        });
    }
  });


  app.post("/api/ocr-extract", async (req, res) => {
    try {
      const {
        image,
        mimeType,
        extractionMethod,
        customPromptText,
        zoneMarker,
      } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No image data provided" });
      }

      if (!geminiPool.hasKeys() && !groqPool.hasKeys() && !openaiPool.hasKeys()) {
        return res.status(500).json({
          error: "API Key is missing.",
          details:
            "Please configure your GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY inside the Settings > Secrets configuration panel to enable OCR image/document text transcribing.",
        });
      }

      let prompt = `Extract all readable text or transcription with absolute 100% precision from this document or image. Ensure all words, letters, casing, punctuation, line breaks, and paragraph structures are preserved exactly as in the original source. Return ONLY the raw extracted text cleanly. If the document contains any shorthand, handwriting, stenography symbols, or dictation layouts, transcribe and output its correct translation cleanly.\n\nCRITICAL SYSTEM INSTRUCTION:\nYou are functioning as a raw OCR extraction engine. Under NO circumstances should you include conversational filler, pleasantries, explanations, or formatting artifacts (like markdown \`\`\`). Do NOT output phrases such as "Here is the text" or "I have extracted the content." Output NOTHING but the literal transcribed text from the image. Avoid adding additional structure or inferred data points not explicitly visible in the document.`;

      if (extractionMethod === "clean") {
        prompt = `Extract ONLY the main, meaningful pure clean text from this document. Ignore obstructing symbols, random lines, stray marks, headers/footers, watermarks, or page numbers that are not part of the primary reading content. Reformat broken sentences into clean readable paragraphs.\n\nCRITICAL SYSTEM INSTRUCTION:\nYou are a strict data-extraction pipeline. Output ONLY the clean text. Never output conversational pleasantries, headings summarizing your action, or markdown code block fences (\`\`\`). Return pure, raw, cleaned text and nothing else.`;
      } else if (extractionMethod === "custom" && customPromptText) {
        prompt = `You are a helpful structural OCR extraction assistant. The user wants you to extract text/data from the attached document according to these explicit instructions:\n\nUSER INSTRUCTIONS:\n"${customPromptText}"\n\nCRITICAL SYSTEM INSTRUCTION:\nReturn EXACTLY what was requested based on the image, nothing else. Do NOT include any conversational text, greetings, or conclusions like "Here is the extracted text". Do not wrap in markdown \`\`\`. ONLY return the raw requested data payload.`;
      }

      if (zoneMarker && zoneMarker !== "full") {
        const zoneText =
          zoneMarker === "top"
            ? "TOP 50% HALF OF THE PAGE"
            : zoneMarker === "bottom"
              ? "BOTTOM 50% HALF OF THE PAGE"
              : zoneMarker === "para"
                ? "FIRST FEW OPENING PARAGRAPHS ONLY"
                : zoneMarker;
        prompt += `\n\nIMPORTANT SPATIAL LIMITATION: The user specifically requested to ONLY extract text from the region: "${zoneText}". Strictly ignore and exclude any text outside of that requested zone.`;
      }

      let extractedText = "";


      if (geminiPool.hasKeys()) {
        let attempt = 0;
        const maxGeminiAttempts = Math.min(geminiPool.getKeys().length, 5);

        while (attempt < maxGeminiAttempts) {
          const keyToUse = geminiPool.getKeyAtIndex(attempt);
          if (!keyToUse) break;

          let modelId = "gemini-3.5-flash";
          if (attempt % 3 === 1) modelId = "gemini-2.5-flash";
          if (attempt % 3 === 2) modelId = "gemini-3.1-flash-lite";

          try {
            console.log(`[OCR Engine] Trying Gemini OCR... Attempt ${attempt + 1} with ${modelId}`);
            const ai = new GoogleGenAI({
              apiKey: keyToUse,
              httpOptions: {
                headers: {
                  "User-Agent": "aistudio-build",
                },
              },
            });

            const documentPart = {
              inlineData: {
                mimeType: mimeType || "image/png",
                data: image.replace(/^data:image\/\w+;base64,/, ""),
              },
            };
            const promptPart = { text: prompt };

            const response = await ai.models.generateContent({
              model: modelId,
              contents: { parts: [documentPart, promptPart] },
            });

            extractedText = response?.text || "";
            if (extractedText) {
              console.log(`[OCR Engine] Gemini OCR completed successfully on attempt ${attempt + 1} using model ${modelId}!`);
              break;
            }
          } catch (e: any) {
            attempt++;
            console.warn(`[OCR Engine] Gemini OCR attempt ${attempt} failed with ${modelId}:`, e.message || String(e));
            if (attempt < maxGeminiAttempts) {
              await new Promise((r) => setTimeout(r, 400));
            }
          }
        }
      }


      if (!extractedText && groqPool.hasKeys()) {
        console.log("[OCR Engine] Performing fallback OCR using Groq Vision Models...");
        let groqAttempt = 0;
        const maxGroqAttempts = Math.min(groqPool.getKeys().length, 6);

        while (groqAttempt < maxGroqAttempts) {
          const keyToUse = groqPool.getKeyAtIndex(groqAttempt);
          if (!keyToUse) break;

          try {
            const rawBase64 = image.replace(/^data:image\/\w+;base64,/, "");
            console.log(`[OCR Engine] Trying Groq Vision OCR... Attempt ${groqAttempt + 1}`);
            const groqOCRResponse = await fetch(
              "https://api.groq.com/openai/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${keyToUse}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "llama-3.2-11b-vision-preview",
                  messages: [
                    {
                      role: "user",
                      content: [
                        {
                          type: "text",
                          text: prompt,
                        },
                        {
                          type: "image_url",
                          image_url: {
                            url: `data:${mimeType || "image/png"};base64,${rawBase64}`,
                          },
                        },
                      ],
                    },
                  ],
                  temperature: 0.1,
                }),
              },
            );

            if (!groqOCRResponse.ok) {
              throw new Error(`Groq Vision OCR Error: ${await groqOCRResponse.text()}`);
            }

            const data = await groqOCRResponse.json();
            extractedText = data.choices[0]?.message?.content || "";
            if (extractedText) {
              console.log(`[OCR Engine] Groq Vision OCR completed successfully on attempt ${groqAttempt + 1}!`);
              break;
            }
          } catch (e: any) {
            groqAttempt++;
            console.warn(`[OCR Engine] Groq Vision attempt ${groqAttempt} failed:`, e.message || String(e));
            if (groqAttempt < maxGroqAttempts) {
              await new Promise((r) => setTimeout(r, 300));
            }
          }
        }
      }


      if (!extractedText && openaiPool.hasKeys()) {
        console.log("[OCR Engine] Performing fallback OCR using OpenAI Vision Models...");
        let openaiAttempt = 0;
        const maxOpenAIAttempts = Math.min(openaiPool.getKeys().length, 3);

        while (openaiAttempt < maxOpenAIAttempts) {
          const keyToUse = openaiPool.getKeyAtIndex(openaiAttempt);
          if (!keyToUse) break;

          try {
            const rawBase64 = image.replace(/^data:image\/\w+;base64,/, "");
            console.log(`[OCR Engine] Trying OpenAI Vision OCR... Attempt ${openaiAttempt + 1}`);
            const openaiResponse = await fetch(
              "https://api.openai.com/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${keyToUse}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "gpt-4o-mini",
                  messages: [
                    {
                      role: "user",
                      content: [
                        {
                          type: "text",
                          text: prompt,
                        },
                        {
                          type: "image_url",
                          image_url: {
                            url: `data:${mimeType || "image/png"};base64,${rawBase64}`,
                          },
                        },
                      ],
                    },
                  ],
                  temperature: 0.1,
                }),
              },
            );

            if (!openaiResponse.ok) {
              throw new Error(`OpenAI Vision OCR Error: ${await openaiResponse.text()}`);
            }

            const data = await openaiResponse.json();
            extractedText = data.choices[0]?.message?.content || "";
            if (extractedText) {
              console.log(`[OCR Engine] OpenAI Vision OCR completed successfully on attempt ${openaiAttempt + 1}!`);
              break;
            }
          } catch (e: any) {
            openaiAttempt++;
            console.warn(`[OCR Engine] OpenAI Vision attempt ${openaiAttempt} failed:`, e.message || String(e));
            if (openaiAttempt < maxOpenAIAttempts) {
              await new Promise((r) => setTimeout(r, 300));
            }
          }
        }
      }


      if (!extractedText) {
        return res.status(503).json({
          error: "OCR Extraction failed",
          details: "All available Gemini, Groq, and OpenAI OCR options were exhausted or rejected.",
        });
      }


      if (extractedText && (groqPool.hasKeys() || openaiPool.hasKeys())) {
        let refinedText = "";


        if (groqPool.hasKeys()) {
          let groqAttempt = 0;
          const maxGroqAttempts = Math.min(groqPool.getKeys().length, 6);

          while (groqAttempt < maxGroqAttempts) {
            const keyToUse = groqPool.getKeyAtIndex(groqAttempt);
            if (!keyToUse) break;

            try {
              console.log(`[Dual-Brain] Groq Post-Processing... Attempt ${groqAttempt + 1}`);
              const groqResponse = await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${keyToUse}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                      {
                        role: "system",
                        content:
                          "You are an expert NLP data cleaner. Correct any garbled typos caused by OCR, but DO NOT invent or synthesize new information. Maintain the exact meaning. Ensure flawless Markdown formatting.",
                      },
                      {
                        role: "user",
                        content: `Refine, spell-check, format, and structure this raw OCR transcript. Just return the structured refined text directly:\n\n${extractedText}`,
                      },
                    ],
                    temperature: 0.1,
                  }),
                },
              );

              if (!groqResponse.ok) {
                throw new Error(`Groq API Error: ${await groqResponse.text()}`);
              }
              const data = await groqResponse.json();
              const text = data.choices[0]?.message?.content;
              if (text) {
                refinedText = text;
                console.log(`[Dual-Brain] Groq Post-Processing completed on attempt ${groqAttempt + 1}!`);
                break;
              }
            } catch (error: any) {
              groqAttempt++;
              console.warn(`[Dual-Brain] Groq attempt ${groqAttempt} failed:`, error.message);
              if (groqAttempt < maxGroqAttempts) {
                await new Promise((r) => setTimeout(r, 200));
              }
            }
          }
        }


        if (!refinedText && openaiPool.hasKeys()) {
          let openaiAttempt = 0;
          const maxOpenAIAttempts = Math.min(openaiPool.getKeys().length, 3);

          while (openaiAttempt < maxOpenAIAttempts) {
            const keyToUse = openaiPool.getKeyAtIndex(openaiAttempt);
            if (!keyToUse) break;

            try {
              console.log(`[Dual-Brain] OpenAI Post-Processing... Attempt ${openaiAttempt + 1}`);
              const openaiResponse = await fetch(
                "https://api.openai.com/v1/chat/completions",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${keyToUse}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                      {
                        role: "system",
                        content:
                          "You are an expert NLP data cleaner. Correct any garbled typos caused by OCR, but DO NOT invent or synthesize new information. Maintain the exact meaning. Ensure flawless Markdown formatting.",
                      },
                      {
                        role: "user",
                        content: `Refine, spell-check, format, and structure this raw OCR transcript. Just return the structured refined text directly:\n\n${extractedText}`,
                      },
                    ],
                    temperature: 0.1,
                  }),
                },
              );

              if (!openaiResponse.ok) {
                throw new Error(`OpenAI API Error: ${await openaiResponse.text()}`);
              }
              const data = await openaiResponse.json();
              const text = data.choices[0]?.message?.content;
              if (text) {
                refinedText = text;
                console.log(`[Dual-Brain] OpenAI Post-Processing completed on attempt ${openaiAttempt + 1}!`);
                break;
              }
            } catch (error: any) {
              openaiAttempt++;
              console.warn(`[Dual-Brain] OpenAI attempt ${openaiAttempt} failed:`, error.message);
              if (openaiAttempt < maxOpenAIAttempts) {
                await new Promise((r) => setTimeout(r, 200));
              }
            }
          }
        }

        if (refinedText) {
          extractedText = refinedText;
        }
      }

      res.json({ text: extractedText });
    } catch (error: any) {
      console.error("OCR Extraction Error:", error);
      res
        .status(500)
        .json({
          error: "Failed to run OCR extraction.",
          details: error.message || String(error),
        });
    }
  });

  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      if (!text || !targetLanguage) {
        return res
          .status(400)
          .json({ error: "Missing text or targetLanguage" });
      }

      if (!geminiPool.hasKeys() && !groqPool.hasKeys() && !openaiPool.hasKeys()) {
        return res.status(500).json({
          error: "API Key is missing.",
          details: "Please configure your GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY inside the Settings > Secrets configuration panel to enable translation.",
        });
      }

      const prompt = `Translate the following text to ${targetLanguage}. Maintain the exact layout, tone, punctuation, and structural formatting of the original document. Do NOT wrap in markdown blocks.\n\n[ORIGINAL TEXT]:\n${text}`;

      let responseText = "";


      if (geminiPool.hasKeys()) {
        let attempt = 0;
        const maxGeminiAttempts = Math.min(geminiPool.getKeys().length, 5);

        while (attempt < maxGeminiAttempts) {
          const keyToUse = geminiPool.getKeyAtIndex(attempt);
          if (!keyToUse) break;

          let model = "gemini-3.5-flash";
          if (attempt % 3 === 1) model = "gemini-flash-latest";
          if (attempt % 3 === 2) model = "gemini-3.1-flash-lite";

          try {
            console.log(`[Translator] Trying Gemini translation... Attempt ${attempt + 1} with ${model}`);
            const currentAi = new GoogleGenAI({
              apiKey: keyToUse,
              httpOptions: { headers: { "User-Agent": "aistudio-build" } },
            });
            const response = await currentAi.models.generateContent({
              model: model,
              contents: prompt,
            });
            responseText = response.text || "";
            if (responseText) {
              console.log(`[Translator] Gemini translation completed successfully on attempt ${attempt + 1} using model ${model}!`);
              break;
            }
          } catch (e: any) {
            attempt++;
            console.warn(`[Translator] Gemini attempt ${attempt} failed with ${model}:`, e.message || String(e));
            if (attempt < maxGeminiAttempts) {
              await new Promise((r) => setTimeout(r, 300));
            }
          }
        }
      }


      if (!responseText && groqPool.hasKeys()) {
        console.log("[Translator] Performing fallback translation using Groq Models...");
        let groqAttempt = 0;
        const maxGroqAttempts = Math.min(groqPool.getKeys().length, 6);

        while (groqAttempt < maxGroqAttempts) {
          const keyToUse = groqPool.getKeyAtIndex(groqAttempt);
          if (!keyToUse) break;

          try {
            console.log(`[Translator] Trying Groq translation... Attempt ${groqAttempt + 1}`);
            const groqResponse = await fetch(
              "https://api.groq.com/openai/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${keyToUse}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "llama-3.3-70b-versatile",
                  messages: [
                    {
                      role: "system",
                      content: `Translate the user's text to ${targetLanguage}. Maintain the exact layout, tone, punctuation, and structural formatting of the original document. Respond ONLY with the translation - do NOT include any introductory or concluding remarks, explanations, or markdown blocks.`,
                    },
                    {
                      role: "user",
                      content: text,
                    },
                  ],
                  temperature: 0.2,
                }),
              },
            );

            if (!groqResponse.ok) {
              throw new Error(`Groq Translation Error: ${await groqResponse.text()}`);
            }

            const data = await groqResponse.json();
            const translatedText = data.choices[0]?.message?.content;
            if (translatedText) {
              responseText = translatedText;
              console.log(`[Translator] Groq fallback translation completed successfully on attempt ${groqAttempt + 1}!`);
              break;
            }
          } catch (e: any) {
            groqAttempt++;
            console.warn(`[Translator] Groq fallback attempt ${groqAttempt} failed:`, e.message || String(e));
            if (groqAttempt < maxGroqAttempts) {
              await new Promise((r) => setTimeout(r, 200));
            }
          }
        }
      }


      if (!responseText && openaiPool.hasKeys()) {
        console.log("[Translator] Performing fallback translation using OpenAI Models...");
        let openaiAttempt = 0;
        const maxOpenAIAttempts = Math.min(openaiPool.getKeys().length, 3);

        while (openaiAttempt < maxOpenAIAttempts) {
          const keyToUse = openaiPool.getKeyAtIndex(openaiAttempt);
          if (!keyToUse) break;

          try {
            console.log(`[Translator] Trying OpenAI translation... Attempt ${openaiAttempt + 1}`);
            const openaiResponse = await fetch(
              "https://api.openai.com/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${keyToUse}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "gpt-4o-mini",
                  messages: [
                    {
                      role: "system",
                      content: `Translate the user's text to ${targetLanguage}. Maintain the exact layout, tone, punctuation, and structural formatting of the original document. Respond ONLY with the translation - do NOT include any introductory or concluding remarks, explanations, or markdown blocks.`,
                    },
                    {
                      role: "user",
                      content: text,
                    },
                  ],
                  temperature: 0.2,
                }),
              },
            );

            if (!openaiResponse.ok) {
              throw new Error(`OpenAI Translation Error: ${await openaiResponse.text()}`);
            }

            const data = await openaiResponse.json();
            const translatedText = data.choices[0]?.message?.content;
            if (translatedText) {
              responseText = translatedText;
              console.log(`[Translator] OpenAI fallback translation completed successfully on attempt ${openaiAttempt + 1}!`);
              break;
            }
          } catch (e: any) {
            openaiAttempt++;
            console.warn(`[Translator] OpenAI fallback attempt ${openaiAttempt} failed:`, e.message || String(e));
            if (openaiAttempt < maxOpenAIAttempts) {
              await new Promise((r) => setTimeout(r, 200));
            }
          }
        }
      }

      if (!responseText) {
        return res.status(503).json({
          error: "Translation failed",
          details: "All available Gemini, Groq, and OpenAI Translation options were exhausted or rejected.",
        });
      }

      res.json({ text: responseText });
    } catch (error: any) {
      console.error("Translation Error:", error);
      res
        .status(500)
        .json({
          error: "Failed to translate.",
          details: error.message || String(error),
        });
    }
  });


  app.get("/api/test-keys", async (req, res) => {
    res.json({
      geminiKeyLoaded: geminiPool.hasKeys(),
      groqKeyLoaded: groqPool.hasKeys(),
      openaiKeyLoaded: openaiPool.hasKeys(),
      geminiPoolSize: geminiPool.getKeys().length,
      groqPoolSize: groqPool.getKeys().length,
      openaiPoolSize: openaiPool.getKeys().length,
    });
  });


  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== "true",
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {

    const distPath = path.join(process.cwd(), "dist");

    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
