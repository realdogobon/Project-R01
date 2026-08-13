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

function createAbortError(): DOMException {
  return new DOMException("The scan was stopped.", "AbortError");
}

function terminateWorker(instance: Worker): Promise<void> {
  return instance.terminate().catch(() => undefined);
}

function raceWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(createAbortError());

  return new Promise<T>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", handleAbort);
    const handleAbort = () => {
      cleanup();
      reject(createAbortError());
    };

    signal.addEventListener("abort", handleAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}

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

  const pendingWorker = (async () => {
    if (worker) {
      await terminateWorker(worker);
      worker = null;
    }
    return createWorker(language);
  })();

  workerPromise = pendingWorker;
  pendingWorker.then(
    (createdWorker) => {
      if (workerPromise === pendingWorker) {
        worker = createdWorker;
        activeLanguage = language;
        workerPromise = null;
      } else {
        void terminateWorker(createdWorker);
      }
    },
    () => {
      if (workerPromise === pendingWorker) workerPromise = null;
    },
  );
  return pendingWorker;
}

export interface OcrOptions {
  language?: string;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

/**
 * Transcribes a JPEG image given as raw base64 (no data: prefix).
 */
export async function recognizeImage(
  base64Jpeg: string,
  options: OcrOptions = {},
): Promise<string> {
  const language = options.language || "eng";
  if (options.signal?.aborted) {
    throw createAbortError();
  }
  const w = await raceWithAbort(getWorker(language), options.signal);

  if (options.signal?.aborted) {
    throw createAbortError();
  }

  const binary = Uint8Array.from(atob(base64Jpeg), (c) => c.charCodeAt(0));
  const blob = new Blob([binary], { type: "image/jpeg" });

  const recognitionPromise = w.recognize(blob);
  let abortHandler: (() => void) | null = null;
  let result: Awaited<typeof recognitionPromise>;

  if (options.signal) {
    const abortPromise = new Promise<never>((_, reject) => {
      abortHandler = () => reject(createAbortError());
      if (options.signal?.aborted) {
        abortHandler();
      } else {
        options.signal?.addEventListener("abort", abortHandler, { once: true });
      }
    });

    try {
      result = await Promise.race([recognitionPromise, abortPromise]);
    } finally {
      if (abortHandler) options.signal.removeEventListener("abort", abortHandler);
    }
  } else {
    result = await recognitionPromise;
  }

  if (options.signal?.aborted) {
    throw createAbortError();
  }
  if (options.onProgress) {
    options.onProgress(1);
  }
  return (result?.data?.text || "").trim();
}

/**
 * Terminate the worker (e.g. on unmount or language switch).
 */
export async function releaseWorker(): Promise<void> {
  const currentWorker = worker;
  const pendingWorker = workerPromise;
  worker = null;
  workerPromise = null;

  if (currentWorker) await terminateWorker(currentWorker);
  if (pendingWorker) {
    try {
      const createdWorker = await pendingWorker;
      if (createdWorker !== currentWorker) await terminateWorker(createdWorker);
    } catch {
      /* ignore a worker that was stopped while initializing */
    }
  }
}
