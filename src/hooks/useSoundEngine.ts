import { useState, useEffect, useCallback } from "react";
import { useSettings } from "../contexts/SettingsContext";

export const CDN_SOUND_BASE_URL = "/assets/sounds/keyboard";

export interface SoundVariant {
  id: string;
  label: string;
  samples: number;
}

export const SOUND_VARIANTS: SoundVariant[] = [
  { id: "cdn_1", label: "click", samples: 3 },
  { id: "cdn_2", label: "beep", samples: 3 },
  { id: "cdn_3", label: "pop", samples: 3 },
  { id: "cdn_4", label: "nk creams", samples: 6 },
  { id: "cdn_5", label: "typewriter", samples: 6 },
  { id: "cdn_6", label: "osu", samples: 3 },
  { id: "cdn_7", label: "hitmarker", samples: 3 },
  { id: "cdn_14", label: "fist fight", samples: 8 },
  { id: "cdn_15", label: "rubber keys", samples: 5 },
  { id: "cdn_16", label: "fart", samples: 8 },
  { id: "cdn_17", label: "akko lavenders", samples: 10 },
  { id: "cdn_18", label: "cherrymx black abs", samples: 10 },
  { id: "cdn_19", label: "cherrymx black pbt", samples: 10 },
  { id: "cdn_20", label: "cherrymx blue abs", samples: 10 },
  { id: "cdn_21", label: "cherrymx blue pbt", samples: 10 },
  { id: "cdn_22", label: "cherrymx brown pbt", samples: 10 },
  { id: "cdn_23", label: "kalih box white", samples: 10 },
  { id: "cdn_24", label: "razer green", samples: 10 },
  { id: "cdn_25", label: "tealios v2", samples: 10 },
  { id: "cdn_26", label: "trust gxt", samples: 10 },
];

export const ERROR_SOUND_VARIANTS: SoundVariant[] = [
  { id: "err_1", label: "damage", samples: 1 },
  { id: "err_2", label: "triangle", samples: 1 },
  { id: "err_3", label: "square", samples: 1 },
  { id: "err_4", label: "missed punch", samples: 2 },
  { id: "err_5", label: "faah", samples: 1 },
];

export function getCdnUrl(variantId: string, sampleIndex: number, type: 'click' | 'error'): string {
  const id = variantId.replace(type === 'click' ? "cdn_" : "err_", "");
  return `${CDN_SOUND_BASE_URL}/${type === 'click' ? 'click' : 'error'}${id}/${sampleIndex}.wav`;
}

export type SoundType = "press" | "release" | "space" | "down" | "up";
export type SwitchType = "blue" | "brown" | "red" | string;

let audioCtx: AudioContext | null = null;

const cdnSoundBuffers: Record<string, AudioBuffer[]> = {};
const errorSoundBuffers: Record<string, AudioBuffer[]> = {};
const loadingCdnVariants: Set<string> = new Set();
const loadingErrorVariants: Set<string> = new Set();

let ambientSources: (AudioScheduledSourceNode | OscillatorNode | GainNode | any)[] = [];
let ambientGainNode: GainNode | null = null;
let hasStartedBackgroundPreload = false;

const ensureAudioContext = () => {
  if (!audioCtx && typeof window !== "undefined") {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ latencyHint: "interactive" });
  }
  return audioCtx;
};

const stopAmbientSound = () => {
  if (ambientSources.length > 0) {
    ambientSources.forEach((src) => {
      try {
        src.stop();
      } catch {}
    });
    ambientSources = [];
  }
  const anySources = ambientSources as any;
  if (anySources._birdInterval) {
    clearInterval(anySources._birdInterval);
    anySources._birdInterval = null;
  }
  if (ambientGainNode) {
    try {
      ambientGainNode.disconnect();
    } catch {}
    ambientGainNode = null;
  }
};

const playAmbientSound = (
  ctx: AudioContext,
  type: "rain" | "celestial" | "forest",
  volume: number
) => {
  stopAmbientSound();

  if (ctx.state === "closed") return;

  ambientGainNode = ctx.createGain();
  ambientGainNode.gain.setValueAtTime(volume * 0.12, ctx.currentTime);
  ambientGainNode.connect(ctx.destination);

  if (type === "rain") {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(850, ctx.currentTime);

    const bpFilter = ctx.createBiquadFilter();
    bpFilter.type = "bandpass";
    bpFilter.frequency.setValueAtTime(400, ctx.currentTime);
    bpFilter.Q.setValueAtTime(0.8, ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(bpFilter);
    bpFilter.connect(ambientGainNode);

    noiseSource.start(0);
    ambientSources.push(noiseSource);

  } else if (type === "celestial") {
    const freqs = [65.41, 98.0, 110.0, 146.83];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.06 + idx * 0.02, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(1.2, ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(0);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(204, ctx.currentTime);

      osc.connect(filter);
      filter.connect(ambientGainNode!);

      osc.start(0);
      ambientSources.push(osc);
      ambientSources.push(lfo);
    });

  } else if (type === "forest") {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const windSource = ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.setValueAtTime(250, ctx.currentTime);

    const windLFO = ctx.createOscillator();
    windLFO.frequency.setValueAtTime(0.1, ctx.currentTime);
    const windLFOGain = ctx.createGain();
    windLFOGain.gain.setValueAtTime(80, ctx.currentTime);

    windLFO.connect(windLFOGain);
    windLFOGain.connect(windFilter.frequency);
    windLFO.start(0);

    windSource.connect(windFilter);
    windFilter.connect(ambientGainNode);

    windSource.start(0);
    ambientSources.push(windSource);
    ambientSources.push(windLFO);

    const intervalId = setInterval(() => {
      if (ctx.state === "closed" || !ambientGainNode) {
        clearInterval(intervalId);
        return;
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const startFreq = 2300 + Math.random() * 600;
      const endFreq = 3100 + Math.random() * 400;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(startFreq - 200, now + 0.25);

      const chirpGain = ctx.createGain();
      chirpGain.gain.setValueAtTime(0, now);
      chirpGain.gain.linearRampToValueAtTime(0.06, now + 0.04);
      chirpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(chirpGain);
      chirpGain.connect(ambientGainNode);

      osc.start(now);
      osc.stop(now + 0.3);
    }, 4500);

    const anySources = ambientSources as any;
    anySources._birdInterval = intervalId;
  }
};

const backgroundPreloadAllSounds = async () => {
  if (hasStartedBackgroundPreload) return;
  hasStartedBackgroundPreload = true;

  await new Promise(resolve => setTimeout(resolve, 3000));

  const ctx = ensureAudioContext();
  if (!ctx) return;

  const preloadVariant = async (variant: SoundVariant, type: 'click' | 'error') => {
    const buffersDict = type === 'click' ? cdnSoundBuffers : errorSoundBuffers;
    if (buffersDict[variant.id]) return;

    try {
      const promises: Promise<void>[] = [];
      const tempBuffers: AudioBuffer[] = new Array(variant.samples);

      for (let i = 1; i <= variant.samples; i++) {
        promises.push(
          fetch(getCdnUrl(variant.id, i, type))
            .then(res => res.arrayBuffer())
            .then(buf => ctx.decodeAudioData(buf))
            .then(audioBuf => {
              tempBuffers[i - 1] = audioBuf;
            })
            .catch(() => {})
        );
      }

      await Promise.all(promises);
      const validBuffers = tempBuffers.filter(Boolean);
      if (validBuffers.length > 0) {
        buffersDict[variant.id] = validBuffers;
      }
    } catch (err) {
      console.warn(`Failed to background preload ${variant.id}`);
    }
  };

  for (const variant of ERROR_SOUND_VARIANTS) {
    await preloadVariant(variant, 'error');
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  for (const variant of SOUND_VARIANTS) {
    await preloadVariant(variant, 'click');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
};

export function resolveSwitchToCdn(sw: string): string {
  if (sw === "blue") return "cdn_6";      // Osu (clicky)
  if (sw === "brown") return "cdn_15";    // Rubber keys (tactile)
  if (sw === "red") return "cdn_7";       // Hitmarker (linear/smooth)
  return sw;
}

export function useSoundEngine() {
  let settings: any = null;
  try {
    settings = useSettings();
  } catch {}

  const [currentSwitchState, setCurrentSwitchState] = useState<any>(() => {
    try {
      const stored = localStorage.getItem("ais_keyboard_switch");
      return stored || "blue";
    } catch {
      return "blue";
    }
  });

  const activeSwitch = settings ? settings.activeSwitch : currentSwitchState;
  const errorSoundProfile = settings ? settings.errorSoundProfile : "off";

  useEffect(() => {
    backgroundPreloadAllSounds();

    const targetSwitch = resolveSwitchToCdn(activeSwitch);
    if (!targetSwitch || !targetSwitch.startsWith("cdn_")) return;
    if (cdnSoundBuffers[targetSwitch] || loadingCdnVariants.has(targetSwitch)) return;

    const variant = SOUND_VARIANTS.find(v => v.id === targetSwitch);
    if (!variant) return;

    const loadVariant = async () => {
      loadingCdnVariants.add(targetSwitch);
      const ctx = ensureAudioContext();
      if (!ctx) return;

      const buffers: AudioBuffer[] = [];
      const promises = [];

      for (let i = 1; i <= variant.samples; i++) {
        promises.push(
          fetch(getCdnUrl(targetSwitch, i, 'click'))
            .then(res => res.arrayBuffer())
            .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
            .then(buffer => {
              buffers.push(buffer);
            })
            .catch(err => console.warn(`Failed to load sample ${i} for ${targetSwitch}:`, err))
        );
      }

      await Promise.all(promises);
      if (buffers.length > 0) {
        cdnSoundBuffers[targetSwitch] = buffers;
      }
      loadingCdnVariants.delete(targetSwitch);
    };

    void loadVariant();
  }, [activeSwitch]);

  useEffect(() => {
    if (!errorSoundProfile || errorSoundProfile === "off") return;
    if (errorSoundBuffers[errorSoundProfile] || loadingErrorVariants.has(errorSoundProfile)) return;

    const variant = ERROR_SOUND_VARIANTS.find(v => v.id === errorSoundProfile);
    if (!variant) return;

    const loadVariant = async () => {
      loadingErrorVariants.add(errorSoundProfile);
      const ctx = ensureAudioContext();
      if (!ctx) return;

      const buffers: AudioBuffer[] = [];
      const promises = [];

      for (let i = 1; i <= variant.samples; i++) {
        promises.push(
          fetch(getCdnUrl(errorSoundProfile, i, 'error'))
            .then(res => res.arrayBuffer())
            .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
            .then(buffer => {
              buffers.push(buffer);
            })
            .catch(err => console.warn(`Failed to load error sample ${i}:`, err))
        );
      }

      await Promise.all(promises);
      if (buffers.length > 0) {
        errorSoundBuffers[errorSoundProfile] = buffers;
      }
      loadingErrorVariants.delete(errorSoundProfile);
    };

    void loadVariant();
  }, [errorSoundProfile]);

  const setCurrentSwitch = useCallback((sw: any) => {
    if (settings) {
      settings.setActiveSwitch(sw);
    } else {
      setCurrentSwitchState(sw);
      try {
        localStorage.setItem("ais_keyboard_switch", sw);
      } catch {}
    }
  }, [settings]);

  const soundEnabled = settings ? settings.soundEnabled : true;
  const soundVolume = settings ? settings.soundVolume : 0.8;

  const playSound = useCallback((typeOrPhase: SoundType, keyCode?: string) => {
    if (!soundEnabled) return;

    const ctx = ensureAudioContext();
    if (!ctx || ctx.state === "closed") return;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const targetSwitch = resolveSwitchToCdn(activeSwitch);

    if (targetSwitch && typeof targetSwitch === "string" && targetSwitch.startsWith("cdn_")) {
      const buffers = cdnSoundBuffers[targetSwitch];
      if (!buffers || buffers.length === 0) return;

      const randomIndex = Math.floor(Math.random() * buffers.length);
      const buffer = buffers[randomIndex];

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = soundVolume;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
    }
  }, [activeSwitch, soundEnabled, soundVolume]);

  const zenNoiseEnabled = settings ? settings.zenNoiseEnabled : false;
  const zenNoiseType = settings ? settings.zenNoiseType : "rain";
  const zenNoiseVolume = settings ? settings.zenNoiseVolume : 0.35;

  useEffect(() => {
    if (zenNoiseEnabled) {
      const ctx = ensureAudioContext();
      if (ctx) {
        if (ctx.state === "suspended") {
          const run = () => {
             playAmbientSound(ctx, zenNoiseType, zenNoiseVolume);
             window.removeEventListener("click", run);
             window.removeEventListener("pointerdown", run);
          };
          window.addEventListener("click", run);
          window.addEventListener("pointerdown", run);
          playAmbientSound(ctx, zenNoiseType, zenNoiseVolume);
        } else {
          playAmbientSound(ctx, zenNoiseType, zenNoiseVolume);
        }
      }
    } else {
      stopAmbientSound();
    }
  }, [zenNoiseEnabled, zenNoiseType, zenNoiseVolume]);

  useEffect(() => {
    const resumeCtx = () => {
      const ctx = ensureAudioContext();
      if (ctx && ctx.state === "suspended") {
        void ctx.resume();
      }
    };

    window.addEventListener("click", resumeCtx, { once: true });
    window.addEventListener("pointerdown", resumeCtx, { once: true });

    return () => {
      window.removeEventListener("click", resumeCtx);
      window.removeEventListener("pointerdown", resumeCtx);
    };
  }, []);

  const playErrorSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = ensureAudioContext();
      if (!ctx || ctx.state === "closed") return;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      if (errorSoundProfile && errorSoundProfile !== "off" && errorSoundBuffers[errorSoundProfile]) {
        const buffers = errorSoundBuffers[errorSoundProfile];
        if (buffers && buffers.length > 0) {
          const randomIndex = Math.floor(Math.random() * buffers.length);
          const buffer = buffers[randomIndex];
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          const gainNode = ctx.createGain();
          gainNode.gain.value = soundVolume;
          source.connect(gainNode);
          gainNode.connect(ctx.destination);
          source.start(0);
          return;
        }
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(soundVolume * 0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (err) {
      console.warn("Synthetic buzzer could not play audio context:", err);
    }
  }, [soundEnabled, soundVolume, errorSoundProfile]);

  return {
    playSound,
    playErrorSound,
    currentSwitch: activeSwitch,
    setCurrentSwitch,
    isLoaded: true,
    isErrorSoundLoaded: errorSoundProfile !== "off" ? !!errorSoundBuffers[errorSoundProfile] : true,
  };
}
