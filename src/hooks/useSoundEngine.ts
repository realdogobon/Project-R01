import { useState, useEffect, useCallback } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { getSharedAudioContext } from "../lib/audioContext";

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
  // fahhhhh keeps its original filename and format from Keythm
  if (type === 'error' && variantId === 'err_5') {
    return `${CDN_SOUND_BASE_URL}/error5/fahhhhh.mp3`;
  }
  const id = variantId.replace(type === 'click' ? "cdn_" : "err_", "");
  return `${CDN_SOUND_BASE_URL}/${type === 'click' ? 'click' : 'error'}${id}/${sampleIndex}.wav`;
}

export type SoundType = "press" | "release" | "space" | "down" | "up";
export type SwitchType = "blue" | "brown" | "red" | string;

const cdnSoundBuffers: Record<string, AudioBuffer[]> = {};
const errorSoundBuffers: Record<string, AudioBuffer[]> = {};
const loadingCdnVariants: Set<string> = new Set();
const loadingErrorVariants: Set<string> = new Set();

let hasStartedBackgroundPreload = false;

const backgroundPreloadAllSounds = async () => {
  if (hasStartedBackgroundPreload) return;
  hasStartedBackgroundPreload = true;

  await new Promise(resolve => setTimeout(resolve, 3000));

  const ctx = getSharedAudioContext();
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
            .then(res => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.arrayBuffer();
            })
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

  // Preload the 3 core switches (blue -> cdn_20, brown -> cdn_22, red -> cdn_19)
  // to avoid hitting the browser's parallel connection limits and lagging the UI.
  const coreVariants = SOUND_VARIANTS.filter(v =>
    v.id === "cdn_20" || v.id === "cdn_22" || v.id === "cdn_19"
  );

  for (const variant of coreVariants) {
    await preloadVariant(variant, 'click');
    await new Promise(resolve => setTimeout(resolve, 200));
  }
};

export function resolveSwitchToCdn(sw: string): string {
  if (sw === "blue") return "cdn_20";     // CherryMX Blue ABS (clicky)
  if (sw === "brown") return "cdn_22";    // CherryMX Brown PBT (tactile)
  if (sw === "red") return "cdn_19";      // CherryMX Black PBT (linear — closest to MX Red)
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

  const targetSwitch = resolveSwitchToCdn(activeSwitch);
  const [isLoaded, setIsLoaded] = useState(() => {
    if (!targetSwitch) return true;
    return !!cdnSoundBuffers[targetSwitch];
  });

  const [isErrorSoundLoaded, setIsErrorSoundLoaded] = useState(() => {
    if (!errorSoundProfile || errorSoundProfile === "off") return true;
    return !!errorSoundBuffers[errorSoundProfile];
  });

  useEffect(() => {
    backgroundPreloadAllSounds();

    if (!targetSwitch || !targetSwitch.startsWith("cdn_")) {
      setIsLoaded(true);
      return;
    }

    if (cdnSoundBuffers[targetSwitch]) {
      setIsLoaded(true);
      return;
    }

    if (loadingCdnVariants.has(targetSwitch)) {
      // Poll or wait for the global loading to finish
      const interval = setInterval(() => {
        if (cdnSoundBuffers[targetSwitch]) {
          setIsLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }

    const variant = SOUND_VARIANTS.find(v => v.id === targetSwitch);
    if (!variant) {
      setIsLoaded(true);
      return;
    }

    const loadVariant = async () => {
      setIsLoaded(false);
      loadingCdnVariants.add(targetSwitch);
      const ctx = getSharedAudioContext();
      if (!ctx) {
        setIsLoaded(true);
        return;
      }

      const buffers: AudioBuffer[] = [];
      const promises = [];

      for (let i = 1; i <= variant.samples; i++) {
        promises.push(
          fetch(getCdnUrl(targetSwitch, i, 'click'))
            .then(res => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.arrayBuffer();
            })
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
      setIsLoaded(true);
    };

    void loadVariant();
  }, [activeSwitch, targetSwitch]);

  useEffect(() => {
    if (!errorSoundProfile || errorSoundProfile === "off") {
      setIsErrorSoundLoaded(true);
      return;
    }

    if (errorSoundBuffers[errorSoundProfile]) {
      setIsErrorSoundLoaded(true);
      return;
    }

    if (loadingErrorVariants.has(errorSoundProfile)) {
      const interval = setInterval(() => {
        if (errorSoundBuffers[errorSoundProfile]) {
          setIsErrorSoundLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }

    const variant = ERROR_SOUND_VARIANTS.find(v => v.id === errorSoundProfile);
    if (!variant) {
      setIsErrorSoundLoaded(true);
      return;
    }

    const loadVariant = async () => {
      setIsErrorSoundLoaded(false);
      loadingErrorVariants.add(errorSoundProfile);
      const ctx = getSharedAudioContext();
      if (!ctx) {
        setIsErrorSoundLoaded(true);
        return;
      }

      const buffers: AudioBuffer[] = [];
      const promises = [];

      for (let i = 1; i <= variant.samples; i++) {
        promises.push(
          fetch(getCdnUrl(errorSoundProfile, i, 'error'))
            .then(res => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.arrayBuffer();
            })
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
      setIsErrorSoundLoaded(true);
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

    const ctx = getSharedAudioContext();
    if (!ctx || ctx.state === "closed") return;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const targetSwitch = resolveSwitchToCdn(activeSwitch);

    if (targetSwitch && typeof targetSwitch === "string" && targetSwitch.startsWith("cdn_")) {
      const buffers = cdnSoundBuffers[targetSwitch];
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
      }
    }
  }, [activeSwitch, soundEnabled, soundVolume]);

  useEffect(() => {
    const resumeCtx = () => {
      const ctx = getSharedAudioContext();
      if (ctx && ctx.state === "suspended") {
        void ctx.resume().catch(() => {});
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
      const ctx = getSharedAudioContext();
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
        }
      }
    } catch (err) {
      console.warn("Synthetic buzzer could not play audio context:", err);
    }
  }, [soundEnabled, soundVolume, errorSoundProfile]);

  return {
    playSound,
    playErrorSound,
    currentSwitch: activeSwitch,
    setCurrentSwitch,
    isLoaded,
    isErrorSoundLoaded,
  };
}
