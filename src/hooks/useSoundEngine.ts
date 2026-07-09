import { useState, useEffect, useCallback, useRef } from "react";
import { useSettings } from "../contexts/SettingsContext";

export const CDN_SOUND_BASE_URL = "https://cdn.jsdelivr.net/gh/monkeytypegame/monkeytype@master/frontend/static/sounds";

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
];

export function getCdnUrl(variantId: string, sampleIndex: number, type: 'click' | 'error'): string {
  const id = variantId.replace(type === 'click' ? "cdn_" : "err_", "");
  return `${CDN_SOUND_BASE_URL}/${type === 'click' ? 'click' : 'error'}${id}/${sampleIndex}.wav`;
}

export type SoundType = "press" | "release" | "space" | "down" | "up";
export type SwitchType = "blue" | "brown" | "red" | string;


let audioCtx: AudioContext | null = null;
let soundBuffer: AudioBuffer | null = null;
let isLoaded = false;
let loadPromise: Promise<void> | null = null;


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


export const SOUND_DEFINES_DOWN: Record<string, [number, number]> = {
  Escape: [9069, 115],
  F1: [2754, 104],
  F2: [3155, 99],
  F3: [3545, 103],
  F4: [3913, 100],
  F5: [4305, 96],
  F6: [4666, 103],
  F7: [5034, 110],
  F8: [5433, 103],
  F9: [7795, 109],
  F10: [6146, 105],
  F11: [7322, 97],
  F12: [7699, 98],
  F13: [2754, 104],
  Delete: [14199, 100],
  F14: [3155, 99],
  Backquote: [9069, 115],
  Digit1: [2280, 109],
  Digit2: [9444, 102],
  Digit3: [9833, 103],
  Digit4: [10185, 107],
  Digit5: [10551, 108],
  Digit6: [10899, 107],
  Digit7: [11282, 99],
  Digit8: [11623, 103],
  Digit9: [11976, 110],
  Digit0: [12337, 108],
  Minus: [12667, 107],
  Equal: [13058, 105],
  Backspace: [13765, 101],
  PageUp: [14522, 108],
  Tab: [15916, 97],
  KeyQ: [16284, 83],
  KeyW: [16637, 97],
  KeyE: [16964, 105],
  KeyR: [17275, 102],
  KeyT: [17613, 108],
  KeyY: [17957, 95],
  KeyU: [18301, 105],
  KeyI: [18643, 110],
  KeyO: [18994, 98],
  KeyP: [19331, 108],
  BracketLeft: [19671, 94],
  BracketRight: [20020, 96],
  Backslash: [20387, 97],
  PageDown: [14852, 93],
  CapsLock: [22560, 100],
  KeyA: [22869, 109],
  KeyS: [23237, 98],
  KeyD: [23586, 103],
  KeyF: [23898, 98],
  KeyG: [24237, 102],
  KeyH: [24550, 106],
  KeyJ: [24917, 103],
  KeyK: [25274, 102],
  KeyL: [25625, 101],
  Semicolon: [25989, 100],
  Quote: [26335, 99],
  Enter: [26703, 100],
  Home: [20766, 102],
  ShiftLeft: [28109, 99],
  KeyZ: [28550, 92],
  KeyX: [28855, 101],
  KeyC: [29557, 112],
  KeyV: [29557, 112],
  KeyB: [29909, 98],
  KeyN: [30252, 112],
  KeyM: [30605, 101],
  Comma: [30965, 117],
  Period: [31315, 97],
  Slash: [31659, 96],
  ShiftRight: [28109, 99],
  ArrowUp: [32429, 96],
  End: [21409, 83],
  ControlLeft: [8036, 92],
  AltLeft: [34551, 96],
  MetaLeft: [34551, 96],
  Space: [33857, 100],
  MetaRight: [34181, 97],
  Fn: [8036, 92],
  ControlRight: [8036, 92],
  ArrowLeft: [36907, 90],
  ArrowDown: [37267, 94],
  ArrowRight: [37586, 88],
  AltRight: [35878, 90],
};


export const SOUND_DEFINES_UP: Record<string, [number, number]> = {
  Escape: [9069 + 115, 94],
  F1: [2754 + 104, 85],
  F2: [3155 + 99, 81],
  F3: [3545 + 103, 84],
  F4: [3913 + 100, 83],
  F5: [4305 + 96, 78],
  F6: [4666 + 103, 84],
  F7: [5034 + 110, 90],
  F8: [5433 + 103, 84],
  F9: [7795 + 109, 89],
  F10: [6146 + 105, 86],
  F11: [7322 + 97, 80],
  F12: [7699 + 98, 80],
  F13: [2754 + 104, 85],
  Delete: [14199 + 100, 81],
  F14: [3155 + 99, 81],
  Backquote: [9069 + 115, 94],
  Digit1: [2280 + 109, 90],
  Digit2: [9444 + 102, 83],
  Digit3: [9833 + 103, 84],
  Digit4: [10185 + 107, 87],
  Digit5: [10551 + 108, 88],
  Digit6: [10899 + 107, 87],
  Digit7: [11282 + 99, 81],
  Digit8: [11623 + 103, 85],
  Digit9: [11976 + 110, 90],
  Digit0: [12337 + 108, 89],
  Minus: [12667 + 107, 87],
  Equal: [13058 + 105, 86],
  Backspace: [13765 + 101, 83],
  PageUp: [14522 + 108, 88],
  Tab: [15916 + 97, 79],
  KeyQ: [16284 + 83, 67],
  KeyW: [16637 + 97, 79],
  KeyE: [16964 + 105, 85],
  KeyR: [17275 + 102, 83],
  KeyT: [17613 + 108, 88],
  KeyY: [17957 + 95, 78],
  KeyU: [18301 + 105, 85],
  KeyI: [18643 + 110, 90],
  KeyO: [18994 + 98, 80],
  KeyP: [19331 + 108, 89],
  BracketLeft: [19671 + 94, 77],
  BracketRight: [20020 + 96, 79],
  Backslash: [20387 + 97, 79],
  PageDown: [14852 + 93, 76],
  CapsLock: [22560 + 100, 81],
  KeyA: [22869 + 109, 89],
  KeyS: [23237 + 98, 80],
  KeyD: [23586 + 103, 84],
  KeyF: [23898 + 98, 81],
  KeyG: [24237 + 102, 83],
  KeyH: [24550 + 106, 86],
  KeyJ: [24917 + 103, 85],
  KeyK: [25274 + 102, 83],
  KeyL: [25625 + 101, 82],
  Semicolon: [25989 + 100, 82],
  Quote: [26335 + 99, 81],
  Enter: [26703 + 100, 81],
  Home: [20766 + 102, 83],
  ShiftLeft: [28109 + 99, 81],
  KeyZ: [28550 + 92, 75],
  KeyX: [28855 + 101, 83],
  KeyC: [29557 + 112, 92],
  KeyV: [29557 + 112, 92],
  KeyB: [29909 + 98, 81],
  KeyN: [30252 + 112, 91],
  KeyM: [30605 + 101, 83],
  Comma: [30965 + 117, 95],
  Period: [31315 + 97, 79],
  Slash: [31659 + 96, 79],
  ShiftRight: [28109 + 99, 81],
  ArrowUp: [32429 + 96, 78],
  End: [21409 + 83, 68],
  ControlLeft: [8036 + 92, 76],
  AltLeft: [34551 + 96, 79],
  MetaLeft: [34551 + 96, 79],
  Space: [33857 + 100, 82],
  MetaRight: [34181 + 97, 80],
  Fn: [8036 + 92, 76],
  ControlRight: [8036 + 92, 76],
  ArrowLeft: [36907 + 90, 73],
  ArrowDown: [37267 + 94, 76],
  ArrowRight: [37586 + 88, 72],
  AltRight: [35878 + 90, 74],
};

const loadSoundBuffer = async (): Promise<void> => {
  if (isLoaded) return;
  const ctx = ensureAudioContext();
  if (!ctx) return;

  try {
    const response = await fetch("/sound.ogg");
    if (!response.ok || response.headers.get("content-type")?.includes("text/html")) {
      throw new Error(`Failed to fetch sound.ogg or got HTML fallback: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    soundBuffer = await ctx.decodeAudioData(arrayBuffer);

    isLoaded = true;
  } catch (err) {
    console.error("Failed to load sound.ogg buffer:", err);
  }
};


if (typeof window !== "undefined") {
  loadPromise = loadSoundBuffer();
}

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

    if (!activeSwitch || !activeSwitch.startsWith("cdn_")) return;
    if (cdnSoundBuffers[activeSwitch] || loadingCdnVariants.has(activeSwitch)) return;

    const variant = SOUND_VARIANTS.find(v => v.id === activeSwitch);
    if (!variant) return;

    const loadVariant = async () => {
      loadingCdnVariants.add(activeSwitch);
      const ctx = ensureAudioContext();
      if (!ctx) return;

      const buffers: AudioBuffer[] = [];
      const promises = [];

      for (let i = 1; i <= variant.samples; i++) {
        promises.push(
          fetch(getCdnUrl(activeSwitch, i, 'click'))
            .then(res => res.arrayBuffer())
            .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
            .then(buffer => {
              buffers.push(buffer);
            })
            .catch(err => console.warn(`Failed to load CDN sample ${i}:`, err))
        );
      }

      await Promise.all(promises);
      if (buffers.length > 0) {
        cdnSoundBuffers[activeSwitch] = buffers;
      }
      loadingCdnVariants.delete(activeSwitch);
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


    if (activeSwitch && typeof activeSwitch === "string" && activeSwitch.startsWith("cdn_")) {
      const buffers = cdnSoundBuffers[activeSwitch];
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
      return;
    }

    if (!soundBuffer) return;

    let startMs = 0;
    let durationMs = 0;


    if (typeOrPhase === "down") {
      const activeCode = keyCode || "KeyJ";
      const def = SOUND_DEFINES_DOWN[activeCode] || SOUND_DEFINES_DOWN["KeyJ"];
      startMs = def[0];
      durationMs = def[1];
    } else if (typeOrPhase === "up") {
      const activeCode = keyCode || "KeyJ";
      const def = SOUND_DEFINES_UP[activeCode] || SOUND_DEFINES_UP["KeyJ"];
      startMs = def[0];
      durationMs = def[1];
    } else if (typeOrPhase === "press") {
      const activeCode = keyCode || "KeyJ";
      const def = SOUND_DEFINES_DOWN[activeCode] || SOUND_DEFINES_DOWN["KeyJ"];
      startMs = def[0];
      durationMs = def[1];
    } else if (typeOrPhase === "release") {
      const activeCode = keyCode || "KeyJ";
      const def = SOUND_DEFINES_UP[activeCode] || SOUND_DEFINES_UP["KeyJ"];
      startMs = def[0];
      durationMs = def[1];
    } else if (typeOrPhase === "space") {
      const def = SOUND_DEFINES_DOWN["Space"];
      startMs = def[0];
      durationMs = def[1];
    }

    if (durationMs <= 0) return;

    const source = ctx.createBufferSource();
    source.buffer = soundBuffer;

    const gainNode = ctx.createGain();


    let switchGain = 0.85;
    if (activeSwitch === "blue") {

      source.playbackRate.value = 1.05;
      switchGain = 0.95;
    } else if (activeSwitch === "brown") {

      source.playbackRate.value = 0.88;
      switchGain = 0.70;
    } else if (activeSwitch === "red") {

      source.playbackRate.value = 0.82;
      switchGain = 0.50;
    }

    gainNode.gain.value = switchGain * soundVolume;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);


    source.start(0, startMs / 1000, durationMs / 1000);
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
    isLoaded,
    isErrorSoundLoaded: errorSoundProfile !== "off" ? !!errorSoundBuffers[errorSoundProfile] : true,
  };
}

