import { useEffect, useRef } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { getSharedAudioContext } from "../lib/audioContext";

let masterAmbientGain: GainNode | null = null;
const activeSounds: Record<string, { source: AudioBufferSourceNode; gain: GainNode }> = {};
const bufferCache: Record<string, AudioBuffer> = {};

const loadBuffer = async (ctx: AudioContext, id: string): Promise<AudioBuffer> => {
  if (bufferCache[id]) return bufferCache[id];
  const response = await fetch(`/assets/sounds/ambient/${id}.mp3`);
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

/**
 * Plays a temporary, non-persistent preview of an ambient/background track —
 * used for hover-to-preview in Settings without touching the user's actual
 * ambient mix or requiring Zen Noise to be enabled. Longer default duration
 * than a keyboard click preview since these are meant to be experienced as
 * background music, not a single hit.
 */
export async function previewAmbientSound(id: string, volume = 0.5, durationMs = 6000): Promise<void> {
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch { return; }
  }

  stopAmbientPreview();

  try {
    const buffer = await loadBuffer(ctx, id);

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
      stopAmbientPreview();
    }, durationMs);
  } catch (err: any) {
    console.warn(`Ambient preview '${id}' failed to play:`, err?.message || err);
  }
}

export function stopAmbientPreview(): void {
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
        gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      }
      setTimeout(() => {
        try { source?.stop(); } catch {}
        try { gain?.disconnect(); } catch {}
      }, 250);
    } catch {}
  }
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
