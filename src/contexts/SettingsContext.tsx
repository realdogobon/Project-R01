import React, { createContext, useContext, useState, useEffect } from "react";
import { MONKEYTYPE_THEMES, MONKEYTYPE_FONTS } from "../constants/themes";

export type TypingFont = string;
export type KeyboardThemeName = string;

export type SwitchType =
  | "blue"
  | "brown"
  | "red"
  | "cdn_1" | "cdn_2" | "cdn_3" | "cdn_4" | "cdn_5" | "cdn_6" | "cdn_7"
  | "cdn_14" | "cdn_15" | "cdn_16" | "cdn_17" | "cdn_18" | "cdn_19" | "cdn_20"
  | "cdn_21" | "cdn_22" | "cdn_23" | "cdn_24" | "cdn_25" | "cdn_26";

export type ErrorSoundType = "off" | "default" | "err_1" | "err_2" | "err_3" | "err_4" | "err_5";

export interface FontOption {
  id: string;
  label: string;
  googleFamily: string | null;
  cssFamily: string;
  tag: "mono" | "sans";
  mtFileName?: string;
}

const BUILT_IN_FONTS: FontOption[] = [
  {
    id: "geist-mono",
    label: "Geist Mono",
    googleFamily: null,
    cssFamily: "ui-monospace, 'Cascadia Code', monospace",
    tag: "mono",
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    googleFamily: "JetBrains+Mono:wght@400;500;700",
    cssFamily: "'JetBrains Mono', monospace",
    tag: "mono",
  },
  {
    id: "fira-code",
    label: "Fira Code",
    googleFamily: "Fira+Code:wght@400;500;700",
    cssFamily: "'Fira Code', monospace",
    tag: "mono",
  },
  {
    id: "ibm-plex-mono",
    label: "IBM Plex Mono",
    googleFamily: "IBM+Plex+Mono:wght@400;500;700",
    cssFamily: "'IBM Plex Mono', monospace",
    tag: "mono",
  },
  {
    id: "source-code-pro",
    label: "Source Code Pro",
    googleFamily: null,
    cssFamily: "'Source Code Pro', monospace",
    tag: "mono",
    mtFileName: "SourceCodePro-Regular.woff2",
  },
  {
    id: "inter-tight",
    label: "Inter Tight",
    googleFamily: "Inter+Tight:wght@400;500;700",
    cssFamily: "'Inter Tight', sans-serif",
    tag: "sans",
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    googleFamily: "Space+Grotesk:wght@400;500;700",
    cssFamily: "'Space Grotesk', sans-serif",
    tag: "sans",
  },
  {
    id: "nunito",
    label: "Nunito",
    googleFamily: "Nunito:wght@400;500;700",
    cssFamily: "'Nunito', sans-serif",
    tag: "sans",
  },
  {
    id: "atkinson-hyperlegible",
    label: "Atkinson Hyperlegible",
    googleFamily: "Atkinson+Hyperlegible:wght@400;700",
    cssFamily: "'Atkinson Hyperlegible', sans-serif",
    tag: "sans",
  },
];

const uniqueFontMap = new Map<string, FontOption>();

BUILT_IN_FONTS.forEach(font => {
  uniqueFontMap.set(font.id, font);
});

Object.entries(MONKEYTYPE_FONTS).forEach(([key, config]) => {
  const id = key.toLowerCase().replace(/_/g, "-");
  if (!uniqueFontMap.has(id)) {
    const label = config.display || key.replace(/_/g, " ");
    const googleFamily = config.systemFont ? null : `${key.replace(/_/g, "+")}:wght@400;500;700`;


    const fontName = key.replace(/_/g, " ");
    const cssFamily = config.systemFont ? (key === "Courier" ? "Courier, monospace" : key) : `'${fontName}', monospace`;

    const isMono = key.toLowerCase().includes("mono") ||
                   key.toLowerCase().includes("code") ||
                   ["Inconsolata", "Courier", "Hack", "Mononoki", "CommitMono", "Iosevka", "Proto"].includes(key);

    uniqueFontMap.set(id, {
      id,
      label,
      googleFamily: config.fileName ? null : googleFamily,
      cssFamily,
      tag: isMono ? "mono" : "sans",
      mtFileName: config.fileName,
    });
  }
});

export const FONT_OPTIONS: FontOption[] = Array.from(uniqueFontMap.values());

const BUILT_IN_THEMES: { id: string; label: string; colors: [string, string, string] }[] = [
  { id: "classic", label: "Classic", colors: ["#F5F5F5", "#737373", "#F57644"] },
  { id: "mint", label: "Mint", colors: ["#EEEEEE", "#447B82", "#86C8AC"] },
  { id: "royal", label: "Royal", colors: ["#324974", "#3A3B35", "#E4D440"] },
  { id: "dolch", label: "Dolch", colors: ["#4F5E78", "#3E3B4C", "#D73E42"] },
  { id: "sand", label: "Sand", colors: ["#EFEFEF", "#893D36", "#C94E41"] },
  { id: "scarlet", label: "Scarlet", colors: ["#E4D7D7", "#D5868A", "#E1E1E1"] },
];

export const THEME_OPTIONS: {
  id: string;
  label: string;
  colors: [string, string, string];
}[] = [
  ...BUILT_IN_THEMES,
  ...Object.entries(MONKEYTYPE_THEMES)
    .filter(([key]) => !BUILT_IN_THEMES.some(t => t.id === key))
    .map(([key, value]) => {
      const label = key
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      return {
        id: key,
        label,
        colors: [value.subAlt, value.sub, value.main] as [string, string, string],
      };
    })
];

export interface SettingsContextType {
  accent: KeyboardThemeName;
  font: TypingFont;
  fontCssFamily: string;
  soundEnabled: boolean;
  soundVolume: number;
  activeSwitch: SwitchType;
  showKeyboard: boolean;
  backlightEnabled: boolean;
  liveStats: boolean;
  ghostMode: boolean;
  errorSoundProfile: ErrorSoundType;


  autoPairSound: boolean;
  wordFadeOut: boolean;
  betterPerformance: boolean;
  zenNoiseEnabled: boolean;
  zenNoiseType: "rain" | "celestial" | "forest" | "none" | string;
  zenNoiseVolume: number;

  keyboardModel: "classic" | "das_keyboard_4";
  setKeyboardModel: (v: "classic" | "das_keyboard_4") => void;

  ambientMix: Record<string, number>;
  setAmbientMix: (v: Record<string, number>) => void;

  savedAmbientMixes: Record<string, Record<string, number>>;
  setSavedAmbientMixes: (v: Record<string, Record<string, number>>) => void;

  setAccent: (c: KeyboardThemeName) => void;
  setFont: (f: TypingFont) => void;
  setSoundEnabled: (v: boolean) => void;
  setSoundVolume: (v: number) => void;
  setActiveSwitch: (sw: SwitchType) => void;
  setShowKeyboard: (v: boolean) => void;
  setBacklightEnabled: (v: boolean) => void;
  setLiveStats: (v: boolean) => void;
  setGhostMode: (v: boolean) => void;
  setErrorSoundProfile: (v: ErrorSoundType) => void;

  setAutoPairSound: (v: boolean) => void;
  setWordFadeOut: (v: boolean) => void;
  setBetterPerformance: (v: boolean) => void;
  setZenNoiseEnabled: (v: boolean) => void;
  setZenNoiseType: (v: "rain" | "celestial" | "forest" | "none" | string) => void;
  setZenNoiseVolume: (v: number) => void;

  resetToDefaults: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

function injectAllFonts() {
  if (typeof document === "undefined") return;


  const gfLinkId = "ais-google-fonts-link";
  if (!document.getElementById(gfLinkId)) {
    const googleFamilies = FONT_OPTIONS.filter(f => f.googleFamily).map(f => f.googleFamily);
    if (googleFamilies.length > 0) {
      const familyQuery = googleFamilies.map(f => `family=${f}`).join("&");
      const link = document.createElement("link");
      link.id = gfLinkId;
      link.rel = "stylesheet";
      link.href = "/assets/fonts/google_fonts.css";
      document.head.appendChild(link);
    }
  }


  const styleId = "ais-global-fonts";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;

  let css = "";
  FONT_OPTIONS.forEach(f => {
    if (f.mtFileName) {

      let fontName = f.cssFamily.split(',')[0].replace(/['"]/g, '').trim();
      css += `
@font-face {
  font-family: '${fontName}';
  src: url('/assets/fonts/${f.mtFileName}') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}\n`;
    }
  });

  style.textContent = css;
  document.head.appendChild(style);
}

function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function applyDynamicThemeColors(themeId: string) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  const builtInThemes: Record<string, [string, string, string]> = {
    classic: ["#F5F5F5", "#737373", "#F57644"],
    mint: ["#EEEEEE", "#447B82", "#86C8AC"],
    royal: ["#324974", "#3A3B35", "#E4D440"],
    dolch: ["#4F5E78", "#3E3B4C", "#D73E42"],
    sand: ["#EFEFEF", "#893D36", "#C94E41"],
    scarlet: ["#E4D7D7", "#D5868A", "#E1E1E1"]
  };

  let bg = "#111213";
  let main = "#F57644";
  let sub = "#a3a3a3";
  let subAlt = "#1a1b1c";
  let text = "#ffffff";
  let caret = "#F57644";
  let error = "#ef4444";

  if (themeId in builtInThemes) {
    const colors = builtInThemes[themeId];
    bg = colors[0];
    sub = colors[1];
    main = colors[2];
    caret = colors[2];
    subAlt = bg;
    text = hexLuminance(bg) > 0.5 ? "#2c2e31" : "#d1d0c4";
  } else {
    const mtTheme = MONKEYTYPE_THEMES[themeId];
    if (mtTheme) {
      bg = mtTheme.bg;
      main = mtTheme.main;
      sub = mtTheme.sub;
      subAlt = mtTheme.subAlt;
      text = mtTheme.text;
      caret = mtTheme.caret || mtTheme.main;
      error = mtTheme.error || "#ef4444";
    }
  }

  root.style.setProperty("--theme-bg", bg);
  root.style.setProperty("--theme-main", main);
  root.style.setProperty("--theme-sub", sub);
  root.style.setProperty("--theme-sub-alt", subAlt);
  root.style.setProperty("--theme-text", text);
  root.style.setProperty("--theme-caret", caret);
  root.style.setProperty("--theme-error", error);

  root.style.setProperty("--typing-accent", main);
  root.style.setProperty("--typing-text-correct", text);
  root.style.setProperty("--typing-text-pending", sub);
  root.style.setProperty("--typing-text-error", error);
}

function applySettingsToDom(accent: KeyboardThemeName, fontId: TypingFont) {
  if (typeof document === "undefined") return;


  injectAllFonts();


  document.documentElement.setAttribute("data-app-theme", accent);


  applyDynamicThemeColors(accent);


  const option = FONT_OPTIONS.find((f) => f.id === fontId);
  if (option) {
    document.documentElement.style.setProperty("--app-font-family", option.cssFamily);
  }
}

export function getThemeDefaultSwitch(themeId: string): SwitchType {
  const builtIn: Record<string, SwitchType> = {
    classic: "blue",
    mint: "brown",
    royal: "blue",
    dolch: "brown",
    sand: "red",
    scarlet: "red"
  };

  if (themeId in builtIn) return builtIn[themeId];

  const availableSwitches: SwitchType[] = [
    "blue", "brown", "red",
    "cdn_1", "cdn_2", "cdn_3", "cdn_4", "cdn_5", "cdn_6", "cdn_7",
    "cdn_14", "cdn_15", "cdn_16", "cdn_17", "cdn_18", "cdn_19", "cdn_20",
    "cdn_21", "cdn_22", "cdn_23", "cdn_24", "cdn_25", "cdn_26"
  ];


  let hash = 0;
  for (let i = 0; i < themeId.length; i++) {
    hash = themeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % availableSwitches.length;
  return availableSwitches[index];
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<KeyboardThemeName>("classic");
  const [font, setFontState] = useState<TypingFont>("geist-mono");
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [soundVolume, setSoundVolumeState] = useState(0.8);
  const [activeSwitch, setActiveSwitchState] = useState<SwitchType>("blue");
  const [showKeyboard, setShowKeyboardState] = useState(true);
  const [backlightEnabled, setBacklightEnabledState] = useState(true);
  const [liveStats, setLiveStatsState] = useState(true);
  const [ghostMode, setGhostModeState] = useState(false);
  const [errorSoundProfile, setErrorSoundProfileState] = useState<ErrorSoundType>("off");


  const [autoPairSound, setAutoPairSoundState] = useState(true);
  const [wordFadeOut, setWordFadeOutState] = useState(false);
  const [betterPerformance, setBetterPerformanceState] = useState(false);
  const [zenNoiseEnabled, setZenNoiseEnabledState] = useState(false);
  const [zenNoiseType, setZenNoiseTypeState] = useState<"rain" | "celestial" | "forest" | "none" | string>("none");
  const [zenNoiseVolume, setZenNoiseVolumeState] = useState(0.35);
  const [ambientMix, setAmbientMixState] = useState<Record<string, number>>({});
  const [savedAmbientMixes, setSavedAmbientMixesState] = useState<Record<string, Record<string, number>>>({});
  const [keyboardModel, setKeyboardModelState] = useState<"classic" | "das_keyboard_4">("classic");

  const [userHasManuallyChangedSwitch, setUserHasManuallyChangedSwitchState] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("ais_user_manually_changed_switch") === "true";
    }
    return false;
  });

  const setUserHasManuallyChangedSwitch = (v: boolean) => {
    setUserHasManuallyChangedSwitchState(v);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("ais_user_manually_changed_switch", String(v));
      } catch {}
    }
  };


  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("ais_keyboard_theme") as KeyboardThemeName | null;
      const savedFont = localStorage.getItem("ais_app_font") as TypingFont | null;
      const savedSound = localStorage.getItem("ais_sound_enabled");
      const savedVolume = localStorage.getItem("ais_sound_volume");
      const savedSwitch = localStorage.getItem("ais_keyboard_switch") as SwitchType | null;
      const savedKeyboard = localStorage.getItem("ais_show_keyboard");
      const savedBacklight = localStorage.getItem("ais_backlight_enabled");
      const savedStats = localStorage.getItem("ais_live_stats");
      const savedGhost = localStorage.getItem("ais_ghost_mode");
      const savedErrorProfile = localStorage.getItem("ais_error_sound_profile") as ErrorSoundType | null;


      const savedAutoPair = localStorage.getItem("ais_autopair_sound");
      const savedWordFade = localStorage.getItem("ais_word_fade_out");
      const savedPerformance = localStorage.getItem("ais_better_performance");
      const savedZenEnabled = localStorage.getItem("ais_zen_noise_enabled");
      const savedZenType = localStorage.getItem("ais_zen_noise_type") as "rain" | "celestial" | "forest" | null;
      const savedZenVolume = localStorage.getItem("ais_zen_noise_volume");
      const savedAmbientMix = localStorage.getItem("ais_ambient_mix");
      const savedSavedAmbientMixes = localStorage.getItem("ais_saved_ambient_mixes");
      const savedKeyboardModel = localStorage.getItem("ais_keyboard_model") as "classic" | "das_keyboard_4" | null;

      const themeToUse = savedTheme || "classic";
      const fontToUse = savedFont || "geist-mono";

      setAccentState(themeToUse);
      setFontState(fontToUse);
      applySettingsToDom(themeToUse, fontToUse);

      if (savedKeyboardModel && savedKeyboardModel !== "das_keyboard_4") {
        setKeyboardModelState(savedKeyboardModel);
      } else {
        setKeyboardModelState("classic");
      }

      if (savedSound !== null) setSoundEnabledState(savedSound !== "false");
      if (savedVolume !== null) {
        const v = Number(savedVolume);
        if (!isNaN(v) && v >= 0 && v <= 1) setSoundVolumeState(v);
      }
      if (savedSwitch) setActiveSwitchState(savedSwitch);
      if (savedKeyboard !== null) setShowKeyboardState(savedKeyboard !== "false");
      if (savedBacklight !== null) setBacklightEnabledState(savedBacklight !== "false");
      if (savedStats !== null) setLiveStatsState(savedStats !== "false");
      if (savedGhost !== null) setGhostModeState(savedGhost === "true");
      if (savedErrorProfile !== null) setErrorSoundProfileState(savedErrorProfile);

      if (savedAutoPair !== null) setAutoPairSoundState(savedAutoPair !== "false");
      if (savedWordFade !== null) setWordFadeOutState(savedWordFade === "true");
      if (savedPerformance !== null) setBetterPerformanceState(savedPerformance === "true");
      if (savedZenEnabled !== null) setZenNoiseEnabledState(savedZenEnabled === "true");
      if (savedZenType) setZenNoiseTypeState(savedZenType);
      if (savedZenVolume !== null) {
        const v = Number(savedZenVolume);
        if (!isNaN(v) && v >= 0 && v <= 1) setZenNoiseVolumeState(v);
      }
      if (savedAmbientMix) {
        try {
          const parsed = JSON.parse(savedAmbientMix);
          setAmbientMixState(parsed);
        } catch {}
      }
      if (savedSavedAmbientMixes) {
        try {
          const parsed = JSON.parse(savedSavedAmbientMixes);
          setSavedAmbientMixesState(parsed);
        } catch {}
      }
    } catch (e) {
      console.warn("Could not read settings from localStorage", e);
    }
  }, []);

  const setAccent = (theme: KeyboardThemeName) => {
    setAccentState(theme);
    applySettingsToDom(theme, font);
    try {
      localStorage.setItem("ais_keyboard_theme", theme);
    } catch {}

    if (autoPairSound && !userHasManuallyChangedSwitch) {
      const paired = getThemeDefaultSwitch(theme);
      setActiveSwitchState(paired);
      try {
        localStorage.setItem("ais_keyboard_switch", paired);
      } catch {}
    }
  };

  const setFont = (newFont: TypingFont) => {
    setFontState(newFont);
    applySettingsToDom(accent, newFont);
    try {
      localStorage.setItem("ais_app_font", newFont);
    } catch {}
  };

  const setSoundEnabled = (v: boolean) => {
    setSoundEnabledState(v);
    try {
      localStorage.setItem("ais_sound_enabled", String(v));
    } catch {}
  };

  const setSoundVolume = (v: number) => {
    setSoundVolumeState(v);
    try {
      localStorage.setItem("ais_sound_volume", String(v));
    } catch {}
  };

  const setActiveSwitch = (sw: SwitchType) => {
    setActiveSwitchState(sw);
    setUserHasManuallyChangedSwitch(true);
    try {
      localStorage.setItem("ais_keyboard_switch", sw);
    } catch {}
  };

  const setShowKeyboard = (v: boolean) => {
    setShowKeyboardState(v);
    try {
      localStorage.setItem("ais_show_keyboard", String(v));
    } catch {}
  };

  const setBacklightEnabled = (v: boolean) => {
    setBacklightEnabledState(v);
    try {
      localStorage.setItem("ais_backlight_enabled", String(v));
    } catch {}
  };

  const setLiveStats = (v: boolean) => {
    setLiveStatsState(v);
    try {
      localStorage.setItem("ais_live_stats", String(v));
    } catch {}
  };

  const setGhostMode = (v: boolean) => {
    setGhostModeState(v);
    try {
      localStorage.setItem("ais_ghost_mode", String(v));
    } catch {}
  };

  const setErrorSoundProfile = (v: ErrorSoundType) => {
    setErrorSoundProfileState(v);
    try {
      localStorage.setItem("ais_error_sound_profile", v);
    } catch {}
  };

  const setAutoPairSound = (v: boolean) => {
    setAutoPairSoundState(v);
    try {
      localStorage.setItem("ais_autopair_sound", String(v));
    } catch {}
  };

  const setWordFadeOut = (v: boolean) => {
    setWordFadeOutState(v);
    try {
      localStorage.setItem("ais_word_fade_out", String(v));
    } catch {}
  };

  const setBetterPerformance = (v: boolean) => {
    setBetterPerformanceState(v);
    try {
      localStorage.setItem("ais_better_performance", String(v));
    } catch {}
  };

  const setZenNoiseEnabled = (v: boolean) => {
    setZenNoiseEnabledState(v);
    try {
      localStorage.setItem("ais_zen_noise_enabled", String(v));
    } catch {}
  };

  const setZenNoiseType = (v: "rain" | "celestial" | "forest" | "none" | string) => {
    setZenNoiseTypeState(v);
    try {
      localStorage.setItem("ais_zen_noise_type", v);
    } catch {}
  };

  const setZenNoiseVolume = (v: number) => {
    setZenNoiseVolumeState(v);
    try {
      localStorage.setItem("ais_zen_noise_volume", String(v));
    } catch {}
  };

  const setAmbientMix = (mix: Record<string, number>) => {
    setAmbientMixState(mix);
    try {
      localStorage.setItem("ais_ambient_mix", JSON.stringify(mix));
    } catch {}
  };

  const setKeyboardModel = (v: "classic" | "das_keyboard_4") => {
    setKeyboardModelState(v);
    try {
      localStorage.setItem("ais_keyboard_model", v);
    } catch {}
  };

  const setSavedAmbientMixes = (mixes: Record<string, Record<string, number>>) => {
    setSavedAmbientMixesState(mixes);
    try {
      localStorage.setItem("ais_saved_ambient_mixes", JSON.stringify(mixes));
    } catch {}
  };

  const resetToDefaults = () => {
    setAccentState("classic");
    setFontState("geist-mono");
    setSoundEnabledState(true);
    setSoundVolumeState(0.8);
    setActiveSwitchState("blue");
    setShowKeyboardState(true);
    setBacklightEnabledState(true);
    setLiveStatsState(true);
    setGhostModeState(false);
    setErrorSoundProfileState("off");
    setUserHasManuallyChangedSwitch(false);


    setAutoPairSoundState(true);
    setWordFadeOutState(false);
    setBetterPerformanceState(false);
    setZenNoiseEnabledState(false);
    setZenNoiseTypeState("none");
    setZenNoiseVolumeState(0.35);
    setAmbientMixState({});
    setKeyboardModelState("classic");

    applySettingsToDom("classic", "geist-mono");

    try {
      localStorage.removeItem("ais_keyboard_theme");
      localStorage.removeItem("ais_app_font");
      localStorage.removeItem("ais_sound_enabled");
      localStorage.removeItem("ais_sound_volume");
      localStorage.removeItem("ais_keyboard_switch");
      localStorage.removeItem("ais_show_keyboard");
      localStorage.removeItem("ais_backlight_enabled");
      localStorage.removeItem("ais_live_stats");
      localStorage.removeItem("ais_ghost_mode");
      localStorage.removeItem("ais_error_sound_profile");

      localStorage.removeItem("ais_autopair_sound");
      localStorage.removeItem("ais_word_fade_out");
      localStorage.removeItem("ais_better_performance");
      localStorage.removeItem("ais_zen_noise_enabled");
      localStorage.removeItem("ais_zen_noise_type");
      localStorage.removeItem("ais_zen_noise_volume");
      localStorage.removeItem("ais_ambient_mix");
      localStorage.removeItem("ais_keyboard_model");
    } catch {}
  };

  const fontCssFamily = FONT_OPTIONS.find((f) => f.id === font)?.cssFamily ?? "var(--font-mono)";

  return (
    <SettingsContext.Provider
      value={{
        accent,
        font,
        fontCssFamily,
        soundEnabled,
        soundVolume,
        activeSwitch,
        showKeyboard,
        backlightEnabled,
        liveStats,
        ghostMode,
        errorSoundProfile,


        autoPairSound,
        wordFadeOut,
        betterPerformance,
        zenNoiseEnabled,
        zenNoiseType,
        zenNoiseVolume,
        keyboardModel,
        ambientMix,
        savedAmbientMixes,

        setAccent,
        setFont,
        setSoundEnabled,
        setSoundVolume,
        setActiveSwitch,
        setShowKeyboard,
        setBacklightEnabled,
        setLiveStats,
        setGhostMode,
        setErrorSoundProfile,
        setKeyboardModel,


        setAutoPairSound,
        setWordFadeOut,
        setBetterPerformance,
        setZenNoiseEnabled,
        setZenNoiseType,
        setZenNoiseVolume,
        setAmbientMix,
        setSavedAmbientMixes,

        resetToDefaults,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}
