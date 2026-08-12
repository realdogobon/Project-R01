/**
 * RoyScript TSR in-browser OCR engine.
 *
 * Uses Tesseract.js (WebAssembly) to transcribe scanned images entirely
 * inside the browser — no backend, no API keys, works offline.
 *
 * Usage:
 *   const text = await recognizeImage(base64Jpeg, {
 *     language: "eng",
 *     onProgress: (p) => { ... },   // 0..1
 *   });
 *
 * The worker is created lazily and reused across calls until release().
 */

import { createWorker, type Worker } from "tesseract.js";

let worker: Worker | null = null;
let workerPromise: Promise<Worker> | null = null;
let activeLanguage = "eng";

/**
 * Returns a ready worker for the given language, creating or recycling one.
 */
function getWorker(language: string): Promise<Worker> {
  if (worker && activeLanguage === language) {
    return Promise.resolve(worker);
  }
  if (workerPromise && activeLanguage === language) {
    return workerPromise;
  }
  workerPromise = (async () => {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        /* ignore */
      }
      worker = null;
    }
    const w = await createWorker(language);
    worker = w;
    activeLanguage = language;
    workerPromise = null;
    return w;
  })();
  return workerPromise;
}

export interface OcrOptions {
  language?: string;
  onProgress?: (progress: number) => void;
}

/**
 * Transcribes a JPEG image given as raw base64 (no data: prefix).
 */
export async function recognizeImage(
  base64Jpeg: string,
  options: OcrOptions = {},
): Promise<string> {
  const language = options.language || "eng";
  const w = await getWorker(language);

  const binary = Uint8Array.from(atob(base64Jpeg), (c) => c.charCodeAt(0));
  const blob = new Blob([binary], { type: "image/jpeg" });

  const result = await w.recognize(blob);
  if (options.onProgress) {
    options.onProgress(1);
  }
  return (result?.data?.text || "").trim();
}

/**
 * Terminate the worker (e.g. on unmount or language switch).
 */
export async function releaseWorker(): Promise<void> {
  if (worker) {
    try {
      await worker.terminate();
    } catch {
      /* ignore */
    }
    worker = null;
    workerPromise = null;
  }
}
