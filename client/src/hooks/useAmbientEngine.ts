import { useEffect, useRef } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { getSharedAudioContext } from "../lib/audioContext";

let masterAmbientGain: GainNode | null = null;
const activeSounds: Record<string, { source: AudioBufferSourceNode; gain: GainNode }> = {};
const bufferCache: Record<string, AudioBuffer> = {};

// Ambient tracks are hosted on webdev asset storage (too large to bundle in the project).
const AMBIENT_STORAGE_URLS: Record<string, string> = {
  airport: "/manus-storage/airport_293bbe21.mp3",
  "ceiling-fan": "/manus-storage/ceiling-fan_006f84a0.mp3",
  clock: "/manus-storage/clock_ee45c412.mp3",
  "coffee-shop": "/manus-storage/coffee-shop_ae18e65c.mp3",
  crickets: "/manus-storage/crickets_a10184f7.mp3",
  fireside: "/manus-storage/fireside_c5c78639.mp3",
  fireworks: "/manus-storage/fireworks_50296a0f.mp3",
  owl: "/manus-storage/owl_a178c013.mp3",
  "rain-on-leaves": "/manus-storage/rain-on-leaves_f42a8eea.mp3",
  rain: "/manus-storage/rain_947136bf.mp3",
  "singing-bowl": "/manus-storage/singing-bowl_5e4d8cba.mp3",
  "suburban-street": "/manus-storage/suburban-street_60ffce56.mp3",
  thunder: "/manus-storage/thunder_564aa8e3.mp3",
  train: "/manus-storage/train_32642034.mp3",
  "tuning-radio": "/manus-storage/tuning-radio_4f29a615.mp3",
  underwater: "/manus-storage/underwater_f9411d3f.mp3",
  waves: "/manus-storage/waves_8ff26e94.mp3",
  "white-noise": "/manus-storage/white-noise_e4a71bfa.mp3",
  "wind-chimes": "/manus-storage/wind-chimes_d14c3e08.mp3",
  "winter-morning": "/manus-storage/winter-morning_31f275a3.mp3",
};

const loadBuffer = async (ctx: AudioContext, id: string): Promise<AudioBuffer> => {
  if (bufferCache[id]) return bufferCache[id];
  const url = AMBIENT_STORAGE_URLS[id] ?? `/assets/sounds/ambient/${id}.mp3`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ambient sound ${id}: HTTP status ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const decodedData = await ctx.decodeAudioData(arrayBuffer);
  bufferCache[id] = decodedData;
  return decodedData;
};

let previewSource: AudioBufferSourceNode | null = null;
let previewGain: GainNode | null = null;
let previewStopTimeout: ReturnType<typeof setTimeout> | null = null;
// Generation token: every call to previewAmbientSound/stopAmbientPreview bumps this.
// An in-flight async load checks its own token before starting playback, so if the
// mouse has already left (stop called) or moved to a different sound (new preview
// call) before the fetch/decode resolves, the stale load is a no-op instead of
// starting an orphaned, unstoppable sound.
let previewToken = 0;

/**
 * Plays a temporary, non-persistent preview of an ambient/background track —
 * used for hover-to-preview in Settings without touching the user's actual
 * ambient mix or requiring Zen Noise to be enabled. Longer default duration
 * than a keyboard click preview since these are meant to be experienced as
 * background music, not a single hit. Only one preview plays at a time.
 */
export async function previewAmbientSound(id: string, volume = 0.5, durationMs = 6000): Promise<void> {
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch { return; }
  }

  const token = ++previewToken;
  stopCurrentPreviewPlayback();

  try {
    const buffer = await loadBuffer(ctx, id);

    // If the mouse left, or moved to another sound, or a newer preview started
    // while this fetch/decode was in flight, abandon this stale load silently.
    if (token !== previewToken) return;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.25);
    gain.connect(ctx.destination);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start();

    previewSource = source;
    previewGain = gain;

    previewStopTimeout = setTimeout(() => {
      if (token === previewToken) stopAmbientPreview();
    }, durationMs);
  } catch (err: any) {
    console.warn(`Ambient preview '${id}' failed to play:`, err?.message || err);
  }
}

function stopCurrentPreviewPlayback(): void {
  if (previewStopTimeout) {
    clearTimeout(previewStopTimeout);
    previewStopTimeout = null;
  }
  if (previewSource || previewGain) {
    const ctx = getSharedAudioContext();
    const gain = previewGain;
    const source = previewSource;
    previewSource = null;
    previewGain = null;
    try {
      if (gain && ctx) {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      }
      setTimeout(() => {
        try { source?.stop(); } catch {}
        try { gain?.disconnect(); } catch {}
      }, 200);
    } catch {}
  }
}

/** Stops any active/pending ambient preview and invalidates in-flight loads. */
export function stopAmbientPreview(): void {
  previewToken++;
  stopCurrentPreviewPlayback();
}

export function useAmbientEngine() {
  const { ambientMix, zenNoiseEnabled, zenNoiseVolume } = useSettings();
  const activeMixRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!zenNoiseEnabled) {
      Object.keys(activeSounds).forEach((id) => {
        try {
          activeSounds[id].source.stop();
          activeSounds[id].gain.disconnect();
        } catch {}
        delete activeSounds[id];
      });
      activeMixRef.current = {};
      return;
    }

    const ctx = getSharedAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    if (!masterAmbientGain) {
      masterAmbientGain = ctx.createGain();
      masterAmbientGain.connect(ctx.destination);
    }

    masterAmbientGain.gain.setTargetAtTime(zenNoiseVolume, ctx.currentTime, 0.1);

    Object.keys(ambientMix).forEach((id) => {
      const targetVolume = ambientMix[id];
      const prevVolume = activeMixRef.current[id] || 0;
      activeMixRef.current[id] = targetVolume;

      if (targetVolume > 0) {
        if (!activeSounds[id]) {
          loadBuffer(ctx, id).then((buffer) => {
            if (!activeMixRef.current[id]) return;
            if (activeSounds[id]) return;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.setTargetAtTime(targetVolume, ctx.currentTime, 0.5);
            gain.connect(masterAmbientGain!);

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            source.connect(gain);
            source.start();
            activeSounds[id] = { source, gain };
          }).catch(err => console.warn(`Ambient sound '${id}' failed to play:`, err?.message || err));
        } else {
          if (prevVolume !== targetVolume) {
            activeSounds[id].gain.gain.setTargetAtTime(targetVolume, ctx.currentTime, 0.1);
          }
        }
      } else if (targetVolume === 0 && activeSounds[id]) {
        const node = activeSounds[id];
        node.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
        setTimeout(() => {
          try {
            node.source.stop();
            node.gain.disconnect();
          } catch {}
        }, 1000);
        delete activeSounds[id];
      }
    });

    Object.keys(activeSounds).forEach((id) => {
      if (ambientMix[id] === undefined || ambientMix[id] <= 0) {
        const node = activeSounds[id];
        node.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
        setTimeout(() => {
          try {
            node.source.stop();
            node.gain.disconnect();
          } catch {}
        }, 1000);
        delete activeSounds[id];
      }
    });
  }, [ambientMix, zenNoiseEnabled, zenNoiseVolume]);

  useEffect(() => {
    return () => {
      Object.keys(activeSounds).forEach((id) => {
        try {
          activeSounds[id].source.stop();
          activeSounds[id].gain.disconnect();
        } catch {}
        delete activeSounds[id];
      });
      activeMixRef.current = {};
    };
  }, []);

  return null;
}
