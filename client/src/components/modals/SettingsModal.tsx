import React, { useState, useEffect } from "react";
/* Faithful Notepads reference shell: compact glyph rail, 60px title row, flat Fluent surfaces, 20px content inset, and a dedicated detail frame. RoyScript setting controls and state behavior remain adapted inside this shell. */
import {
  X,
  Check,
  RotateCcw,
  ChevronRight,
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Coffee,
  CloudRain,
  Droplets,
  Waves,
  Flame,
  Plane,
  Snowflake,
  Bug,
  Circle,
  TrainFront,
  Activity,
  Wind,
  Timer,
  Fan,
  Radio,
  Sparkles,
  Bird,
  GlassWater,
  MapPin,
  CloudLightning,
  Palette,
  Keyboard,
  BarChart3,
  Headphones,
  Gauge,
  KeyRound,
  Save,
  Trash2,
  Plus,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  useSettings,
  FONT_OPTIONS,
  THEME_OPTIONS,
  TypingFont,
  KeyboardThemeName,
  SwitchType,
  applyDynamicThemeColors,
} from "../../contexts/SettingsContext";
import {
  SOUND_VARIANTS,
  ERROR_SOUND_VARIANTS,
  previewClickSound,
  previewErrorSound,
} from "../../hooks/useSoundEngine";
import { previewAmbientSound, stopAmbientPreview } from "../../hooks/useAmbientEngine";
import {
  loadProviderKeys,
  saveProviderKeys,
  type ProviderKeys,
} from "../../lib/AiVisionEngine";
import { motion, AnimatePresence } from "motion/react";

function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}

export const AMBIENT_SOUNDS = [
  { id: "coffee-shop", label: "Coffee Shop", Icon: Coffee },
  { id: "rain", label: "Rain", Icon: CloudRain },
  { id: "rain-on-leaves", label: "Rain on Leaves", Icon: Droplets },
  { id: "waves", label: "Waves", Icon: Waves },
  { id: "fireside", label: "Fireside", Icon: Flame },
  { id: "airport", label: "Airport", Icon: Plane },
  { id: "winter-morning", label: "Winter Morning", Icon: Snowflake },
  { id: "crickets", label: "Forest / Crickets", Icon: Bug },
  { id: "singing-bowl", label: "Singing Bowl", Icon: Circle },
  { id: "train", label: "Train", Icon: TrainFront },
  { id: "white-noise", label: "White Noise", Icon: Activity },
  { id: "wind-chimes", label: "Wind Chimes", Icon: Wind },
  { id: "clock", label: "Clock Pendulum", Icon: Timer },
  { id: "ceiling-fan", label: "Ceiling Fan", Icon: Fan },
  { id: "tuning-radio", label: "Tuning Radio", Icon: Radio },
  { id: "fireworks", label: "Fireworks", Icon: Sparkles },
  { id: "owl", label: "Owl", Icon: Bird },
  { id: "underwater", label: "Underwater", Icon: GlassWater },
  { id: "suburban-street", label: "Suburban Street", Icon: MapPin },
  { id: "thunder", label: "Thunder", Icon: CloudLightning },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ThemeSliderProps {
  value: number;
  onChange: (v: number) => void;
  accentColor: string;
}

type SettingsCategory =
  | "appearance"
  | "keyboard"
  | "practice"
  | "ambient"
  | "performance"
  | "scanner";

type SettingsView =
  | "main"
  | "themes"
  | "fonts"
  | "profiles"
  | "atmosphere"
  | "errorSounds"
  | "soundCentre";

type NestedSettingsView = Exclude<SettingsView, "main">;

type SettingsNavigationIntent =
  | { kind: "category"; category: SettingsCategory }
  | {
      kind: "view";
      view: NestedSettingsView;
      sourceCategory: SettingsCategory;
      sourceView: SettingsView;
    }
  | { kind: "back"; sourceView: NestedSettingsView }
  | { kind: "reset" };

interface SettingsNavigationState {
  view: SettingsView;
  category: SettingsCategory;
}

function reduceSettingsNavigation(
  state: SettingsNavigationState,
  intent: SettingsNavigationIntent,
): SettingsNavigationState {
  if (intent.kind === "category") {
    return { category: intent.category, view: "main" };
  }

  if (intent.kind === "reset") {
    // Reset preferences, not navigation. Users should remain where they are
    // so the reset action never pulls them out of the current Settings context.
    return state;
  }

  if (intent.kind === "view") {
    if (
      intent.sourceCategory !== state.category ||
      intent.sourceView !== state.view
    ) {
      return state;
    }
    return { ...state, view: intent.view };
  }

  if (intent.sourceView !== state.view) return state;
  return {
    ...state,
    view:
      state.view === "profiles" || state.view === "errorSounds"
        ? "soundCentre"
        : "main",
  };
}

const SETTINGS_CATEGORIES: Array<{
  id: SettingsCategory;
  label: string;
  Icon: typeof Palette;
}> = [
  {
    id: "appearance",
    label: "Appearance",
    Icon: Palette,
  },
  {
    id: "keyboard",
    label: "Keyboard & Typing",
    Icon: Keyboard,
  },
  {
    id: "practice",
    label: "Practice",
    Icon: BarChart3,
  },
  {
    id: "ambient",
    label: "Ambient Focus",
    Icon: Headphones,
  },
  {
    id: "performance",
    label: "Performance",
    Icon: Gauge,
  },
  {
    id: "scanner",
    label: "AI Setup",
    Icon: KeyRound,
  },
];

export function ThemeSlider({
  value,
  onChange,
  accentColor,
}: ThemeSliderProps) {
  const percent = value * 100;

  return (
    <div className="relative flex-1 flex items-center h-5 select-none group">
      <div className="relative w-full h-1 bg-neutral-200 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-75 ease-out"
          style={{
            width: `${percent}%`,
            backgroundColor: accentColor,
          }}
        />
      </div>

      <div
        className="absolute size-3 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-75 ease-out shadow-[0_1px_3px_rgba(0,0,0,0.15)] bg-white dark:bg-neutral-100"
        style={{
          left: `${percent}%`,
          border: `2px solid ${accentColor}`,
          backgroundColor: accentColor,
        }}
      />

      {/* Invisible overlay range input to handle inputs and clicks */}
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ transform: "none", cursor: "pointer" }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Drawer Modal Component
───────────────────────────────────────────────────────────── */
export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    accent,
    font,
    soundEnabled,
    soundVolume,
    activeSwitch,
    showKeyboard,
    liveStats,
    ghostMode,
    errorSoundProfile,
    keyboardModel,

    // Premium custom properties
    autoPairSound,
    wordFadeOut,
    betterPerformance,
    zenNoiseEnabled,
    zenNoiseType,
    zenNoiseVolume,
    ambientMix,

    setAccent,
    setFont,
    setSoundEnabled,
    setSoundVolume,
    setActiveSwitch,
    setShowKeyboard,
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
    savedAmbientMixes,
    setSavedAmbientMixes,

    resetToDefaults,
  } = useSettings();

  const [view, setView] = useState<SettingsView>("main");
  const [activeCategory, setActiveCategory] =
    useState<SettingsCategory>("appearance");
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const viewRef = React.useRef<SettingsView>(view);
  const activeCategoryRef = React.useRef<SettingsCategory>(activeCategory);
  const navigationQueueRef = React.useRef<SettingsNavigationIntent[]>([]);
  const navigationFlushScheduledRef = React.useRef(false);

  // Settings navigation is coalesced once per microtask: clicks from one
  // browser turn become one valid state transition without delaying the next
  // visible route long enough for the title row or back affordance to lag.
  viewRef.current = view;
  activeCategoryRef.current = activeCategory;

  const clearNavigationQueue = () => {
    navigationFlushScheduledRef.current = false;
    navigationQueueRef.current = [];
  };

  const projectNavigationState = (): SettingsNavigationState =>
    navigationQueueRef.current.reduce(reduceSettingsNavigation, {
      view: viewRef.current,
      category: activeCategoryRef.current,
    });

  const flushNavigationQueue = () => {
    navigationFlushScheduledRef.current = false;
    const intents = navigationQueueRef.current.splice(
      0,
      navigationQueueRef.current.length,
    );
    if (intents.length === 0) return;

    const previousView = viewRef.current;
    const previousCategory = activeCategoryRef.current;
    const nextState = intents.reduce(reduceSettingsNavigation, {
      view: previousView,
      category: previousCategory,
    });

    viewRef.current = nextState.view;
    activeCategoryRef.current = nextState.category;
    if (nextState.view !== previousView) setView(nextState.view);
    if (nextState.category !== previousCategory) {
      setActiveCategory(nextState.category);
    }
  };

  const enqueueNavigation = (intent: SettingsNavigationIntent) => {
    navigationQueueRef.current.push(intent);
    if (navigationQueueRef.current.length > 32) {
      navigationQueueRef.current.splice(
        0,
        navigationQueueRef.current.length - 32,
      );
    }
    if (!navigationFlushScheduledRef.current) {
      navigationFlushScheduledRef.current = true;
      queueMicrotask(flushNavigationQueue);
    }
  };

  const navigateToView = (nextView: NestedSettingsView) => {
    const projected = projectNavigationState();
    enqueueNavigation({
      kind: "view",
      view: nextView,
      sourceCategory: projected.category,
      sourceView: projected.view,
    });
  };

  const navigateBack = () => {
    const projected = projectNavigationState();
    if (projected.view !== "main") {
      enqueueNavigation({
        kind: "back",
        sourceView: projected.view,
      });
    }
  };

  const handleCloseSettings = () => {
    clearNavigationQueue();
    onClose();
  };

  useEffect(() => {
    if (scrollRef.current) {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: 0, behavior: "instant" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [view, activeCategory, isOpen]);

  const activeSoundsList = Object.keys(ambientMix).filter(
    (id) => ambientMix[id] > 0,
  );
  let atmosphereLabel = "None";
  if (activeSoundsList.length === 1) {
    atmosphereLabel =
      AMBIENT_SOUNDS.find((s) => s.id === activeSoundsList[0])?.label ||
      "Custom Mix";
  } else if (activeSoundsList.length > 1) {
    atmosphereLabel = "Custom Mix";
    for (const [presetName, mix] of Object.entries(savedAmbientMixes || {})) {
      const presetActive = Object.keys(mix).filter((id) => mix[id] > 0);
      if (presetActive.length !== activeSoundsList.length) continue;

      const isMatch = activeSoundsList.every(
        (id) => mix[id] === ambientMix[id],
      );
      if (isMatch) {
        atmosphereLabel = presetName;
        break;
      }
    }
  }

  useEffect(() => {
    if (!isOpen) {
      clearNavigationQueue();
      viewRef.current = "main";
      activeCategoryRef.current = "appearance";
      setView("main");
      setActiveCategory("appearance");
    }
  }, [isOpen]);

  useEffect(() => {
    return () => clearNavigationQueue();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const currentThemeObj =
    THEME_OPTIONS.find((t) => t.id === accent) || THEME_OPTIONS[0];
  const selectedFont =
    FONT_OPTIONS.find((f) => f.id === font) || FONT_OPTIONS[0];
  const accentColor = currentThemeObj.colors[2];

  const handleResetSettings = () => {
    resetToDefaults();
    enqueueNavigation({ kind: "reset" });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center select-none font-sans"
          data-settings-panel="true"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseSettings}
            className={cn(
              "fixed inset-0 bg-neutral-950/20 dark:bg-black/60 transition-opacity transform-gpu",
              !betterPerformance && "backdrop-blur-[2px]",
            )}
          />

          {/* Core settings cabinet drawer panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            tabIndex={-1}
            initial={{ x: "100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.8 }}
            transition={
              betterPerformance
                ? { type: "tween", ease: "linear", duration: 0.12 }
                : { type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.3 }
            }
            className={cn(
              "fixed right-0 top-0 bottom-0 w-[430px] max-w-full h-full flex flex-col z-[105] overflow-hidden transform-gpu transition-all bg-[#f5f5f5] dark:bg-[#222222] border-l border-neutral-300 dark:border-white/[0.12] shadow-2xl",
            )}
            style={{
              fontFamily: "var(--app-font-family), monospace",
              transform: "none !important", // Strict blocker for page scale
            }}
          >
            {/* Scoped CSS Blocker injected directly inside panel */}
            <style
              dangerouslySetInnerHTML={{
                __html: `
              [data-settings-panel] button,
              [data-settings-panel] select,
              [data-settings-panel] [role="button"],
              [data-settings-panel] [role="switch"],
              [data-settings-panel] input[type="range"] {
                transform: none !important;
                transition: background-color 150ms ease, opacity 150ms ease, border-color 150ms ease, color 150ms ease !important;
              }
              [data-settings-panel] button:hover,
              [data-settings-panel] button:active,
              [data-settings-panel] [role="button"]:hover,
              [data-settings-panel] [role="button"]:active {
                transform: none !important;
              }
              /* Fine-tune scrollbar matching minimalism */
              [data-settings-panel] .custom-scrollbar::-webkit-scrollbar {
                width: 4px;
              }
              [data-settings-panel] .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              [data-settings-panel] .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(0,0,0,0.08);
                border-radius: 99px;
              }
              .dark [data-settings-panel] .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.06);
              }
            `,
              }}
            />

            {/* Notepads-style title row: compact, flat, and anchored to the content frame. */}
            <div className="mx-[18px] h-[60px] flex items-end justify-between border-b border-neutral-300/80 dark:border-white/[0.18] shrink-0">
              <AnimatePresence mode="wait">
                {view === "main" ? (
                  <motion.div
                    key="main-title"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.1 }}
                  >
                    <span className="pb-[10px] font-normal text-neutral-900 dark:text-neutral-50 text-[24px] leading-none tracking-tight">
                      {SETTINGS_CATEGORIES.find((category) => category.id === activeCategory)?.label ?? "Settings"}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="sub-title"
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={{ duration: 0.1 }}
                    className="flex items-center gap-1.5 pb-[10px]"
                  >
                <button
                  onClick={navigateBack}
                      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-white/[0.05] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-normal text-neutral-900 dark:text-neutral-50 text-[24px] leading-none tracking-tight">
                      {view === "themes"
                        ? "Themes"
                        : view === "fonts"
                          ? "Font"
                          : view === "soundCentre"
                            ? "Choose Clicky Sounds"
                            : view === "profiles"
                              ? "Keyboard Sounds"
                              : view === "errorSounds"
                                ? "Error Sounds"
                                : "Atmosphere"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Close action remains in the title row, without a floating pill. */}
              <button
                onClick={handleCloseSettings}
                aria-label="Close settings"
                className="mb-[10px] flex items-center justify-center p-1 text-neutral-500 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notepads-style compact navigation rail and independent detail frame */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <nav
                aria-label="Settings categories"
                className="w-14 shrink-0 flex flex-col items-center border-r border-neutral-200/70 dark:border-white/[0.08] bg-neutral-100/40 dark:bg-white/[0.018] pt-4 pb-4"
              >
                {SETTINGS_CATEGORIES.map(({ id, label, Icon }) => {
                  const selected = activeCategory === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      title={label}
                      aria-label={label}
                      aria-current={selected ? "page" : undefined}
                      aria-pressed={selected}
                      data-settings-category={id}
                      onClick={() =>
                        enqueueNavigation({ kind: "category", category: id })
                      }
                      className={cn(
                        "group relative flex h-12 w-14 items-center justify-center text-neutral-500 transition-colors duration-150 hover:bg-neutral-500/[0.05] dark:text-neutral-400 dark:hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400 dark:focus-visible:ring-white/40",
                        selected && "bg-neutral-900/[0.04] dark:bg-white/[0.06]",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute left-0 h-7 w-[5px] bg-current transition-opacity duration-150",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                        style={selected ? { color: accentColor } : undefined}
                      />
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          "size-[18px] transition-colors duration-150",
                          selected
                            ? "text-neutral-900 dark:text-white"
                            : "text-neutral-500 group-hover:text-neutral-800 dark:text-neutral-400 dark:group-hover:text-white",
                        )}
                        strokeWidth={1.7}
                      />
                    </button>
                  );
                })}

                <div className="mt-auto w-full px-2 pt-4">
                  <div className="mb-3 h-px w-full bg-neutral-200/80 dark:bg-white/[0.09]" />
                  <button
                    type="button"
                    title="Reset settings"
                    aria-label="Reset settings"
                    data-settings-reset="true"
                    onClick={handleResetSettings}
                    className="group flex h-11 w-full items-center justify-center text-neutral-400 transition-colors duration-150 hover:bg-red-500/[0.08] hover:text-red-500 dark:text-neutral-500 dark:hover:bg-red-400/[0.10] dark:hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-400/60"
                  >
                    <RotateCcw aria-hidden="true" className="size-[18px]" strokeWidth={1.7} />
                    <span className="sr-only">Reset settings</span>
                  </button>
                </div>
              </nav>

              <div
                ref={scrollRef}
                className={cn(
                  "relative flex-1 min-w-0 overflow-y-auto custom-scrollbar px-7 pb-10",
                  view !== "main" && "pt-6",
                )}
              >
              <AnimatePresence mode="popLayout">
                {view === "main" ? (
                  <motion.div
                    key="main-view"
                    initial={{ opacity: 0, x: 25 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    {/* SECTION: APPEARANCE */}
                    <Section
                      title="Appearance"
                      className={activeCategory !== "appearance" ? "hidden" : undefined}
                    >
                      <Row label="Mode">
                        <ThemeSwitcher />
                      </Row>

                      <SubDrawerRow
                        label="Themes"
                        onClick={() => navigateToView("themes")}
                        preview={
                          <>
                            <span className="flex h-3.5 w-8 overflow-hidden rounded-full ring-1 ring-neutral-200 dark:ring-white/10 shrink-0">
                              {currentThemeObj.colors.map((c, idx) => (
                                <span
                                  key={idx}
                                  className="flex-1"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </span>
                            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                              {currentThemeObj.label}
                            </span>
                          </>
                        }
                      />

                      <SubDrawerRow
                        label="Font"
                        onClick={() => navigateToView("fonts")}
                        preview={
                          <span
                            className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400"
                            style={{ fontFamily: selectedFont.cssFamily }}
                          >
                            {selectedFont.label}
                          </span>
                        }
                      />
                    </Section>

                    {/* SECTION: KEYBOARD */}
                    <Section
                      title="Keyboard"
                      className={activeCategory !== "keyboard" ? "hidden" : undefined}
                    >
                      <Row label="Keyboard Type">
                        <div className="relative isolate flex h-8 rounded-full border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/[0.06] p-1">
                          {[
                            { key: "classic", label: "Classic" },
                            {
                              key: "das_keyboard_4",
                              label: "Das Keyboard",
                              disabled: false,
                            },
                          ].map(({ key, label, disabled }) => {
                            const isActive = keyboardModel === key;
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  if (!disabled) {
                                    setKeyboardModel(
                                      key as "classic" | "das_keyboard_4",
                                    );
                                  }
                                }}
                                disabled={disabled}
                                className={cn(
                                  "relative h-6 px-3 rounded-full flex items-center justify-center text-[10px] font-semibold select-none transition-colors",
                                  disabled
                                    ? "opacity-40 cursor-not-allowed text-neutral-400 dark:text-neutral-500"
                                    : isActive
                                      ? "text-neutral-900 dark:text-neutral-50 font-bold cursor-pointer"
                                      : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer",
                                )}
                                type="button"
                                style={{ transform: "none" }}
                              >
                                {isActive && !disabled && (
                                  <motion.div
                                    layoutId="activeKeyboardModel"
                                    className="absolute inset-0 rounded-full bg-neutral-300/40 dark:bg-white/10"
                                    transition={{
                                      type: "spring",
                                      stiffness: 380,
                                      damping: 30,
                                    }}
                                  />
                                )}
                                <span className="relative z-10">{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </Row>

                      <Toggle
                        label="Show keyboard"
                        description="Virtual keyboard below the test"
                        enabled={showKeyboard}
                        onToggle={() => setShowKeyboard(!showKeyboard)}
                        activeColor={accentColor}
                      />

                      <Toggle
                        label="Typing Sounds"
                        description="Hear nice click-clack sounds when you type on your keyboard"
                        enabled={soundEnabled}
                        onToggle={() => setSoundEnabled(!soundEnabled)}
                        activeColor={accentColor}
                      />

                      {soundEnabled && (
                        <>
                          <SubDrawerRow
                            label="Choose Clicky Sounds"
                            onClick={() => navigateToView("soundCentre")}
                            preview={
                              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 capitalize max-w-[150px] truncate text-right">
                                {SOUND_VARIANTS.find(
                                  (v) => v.id === activeSwitch,
                                )?.label ||
                                  activeSwitch.replace("cdn_", "")}{" "}
                                /{" "}
                                {errorSoundProfile === "off"
                                  ? "Off"
                                  : ERROR_SOUND_VARIANTS.find(
                                      (v) => v.id === errorSoundProfile,
                                    )?.label ||
                                    errorSoundProfile.replace("err_", "")}
                              </span>
                            }
                          />

                          <div className="flex items-center gap-3 px-3 py-2">
                            <ThemeSlider
                              value={soundVolume}
                              onChange={setSoundVolume}
                              accentColor={accentColor}
                            />
                            <span className="w-8 text-right font-medium text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                              {Math.round(soundVolume * 100)}%
                            </span>
                          </div>
                        </>
                      )}

                      <Toggle
                        label="Auto-Pair Profiles"
                        description="Locks switch profile to matching themes"
                        enabled={autoPairSound}
                        onToggle={() => setAutoPairSound(!autoPairSound)}
                        activeColor={accentColor}
                      />
                    </Section>

                    {/* SECTION: GAMEPLAY */}
                    <Section
                      title="Gameplay"
                      className={activeCategory !== "practice" ? "hidden" : undefined}
                    >
                      <Toggle
                        label="Live stats"
                        description="Show WPM and accuracy while typing"
                        enabled={liveStats}
                        onToggle={() => setLiveStats(!liveStats)}
                        activeColor={accentColor}
                      />

                      <Toggle
                        label="Ghost mode"
                        description="Dim upcoming words for focus"
                        enabled={ghostMode}
                        onToggle={() => setGhostMode(!ghostMode)}
                        activeColor={accentColor}
                      />

                      <Toggle
                        label="Word Fade-Out"
                        description="Completed words fade and blur"
                        enabled={wordFadeOut}
                        onToggle={() => setWordFadeOut(!wordFadeOut)}
                        activeColor={accentColor}
                      />
                    </Section>

                    {/* SECTION: AMBIENT FOCUS */}
                    <Section
                      title="Ambient Focus"
                      className={activeCategory !== "ambient" ? "hidden" : undefined}
                    >
                      <Toggle
                        label="Soundscape"
                        description="Calming constant background atmosphere"
                        enabled={zenNoiseEnabled}
                        onToggle={() => setZenNoiseEnabled(!zenNoiseEnabled)}
                        activeColor={accentColor}
                      />

                      {zenNoiseEnabled && (
                        <>
                          <SubDrawerRow
                            label="Atmosphere"
                            onClick={() => navigateToView("atmosphere")}
                            preview={
                              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 capitalize max-w-[100px] truncate text-right">
                                {atmosphereLabel}
                              </span>
                            }
                          />

                          <div className="flex items-center gap-3 px-3 py-2">
                            <ThemeSlider
                              value={zenNoiseVolume}
                              onChange={setZenNoiseVolume}
                              accentColor={accentColor}
                            />
                            <span className="w-8 text-right font-medium text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                              {Math.round(zenNoiseVolume * 100)}%
                            </span>
                          </div>
                        </>
                      )}
                    </Section>

                    {/* SECTION: PERFORMANCE */}
                    <Section
                      title="Performance"
                      className={activeCategory !== "performance" ? "hidden" : undefined}
                    >
                      <Toggle
                        label="Better Performance"
                        description="Limit high-intensity blurs for maximum FPS"
                        enabled={betterPerformance}
                        onToggle={() =>
                          setBetterPerformance(!betterPerformance)
                        }
                        activeColor={accentColor}
                      />
                    </Section>

                    {/* SECTION: AI SETUP */}
                    <Section
                      title="Cloud providers"
                      className={activeCategory !== "scanner" ? "hidden" : undefined}
                    >
                      <p className="mb-5 max-w-[280px] text-[12px] leading-relaxed text-neutral-400 dark:text-neutral-500">
                        Add a key to use online document scanning. Practice text can still be created on this device without one. Keys are saved on this device and used when you choose that provider.
                      </p>
                      <div className="flex flex-col gap-4">
                        {[
                          { key: "gemini", label: "Gemini key" },
                          { key: "groq", label: "Groq key" },
                          { key: "openai", label: "OpenAI key" },
                        ].map(({ key, label }) => (
                          <label key={key} className="flex flex-col gap-2">
                            <span className="text-[12px] font-medium tracking-tight text-neutral-800 dark:text-neutral-100">{label}</span>
                            <input
                              type="password"
                              defaultValue={loadProviderKeys()[key as keyof ProviderKeys] || ""}
                              onBlur={(e) => {
                                const keys = { ...loadProviderKeys() };
                                if (e.target.value.trim()) {
                                  keys[key as keyof ProviderKeys] = e.target.value.trim();
                                } else {
                                  delete keys[key as keyof ProviderKeys];
                                }
                                saveProviderKeys(keys);
                              }}
                              placeholder="Paste your key"
                              aria-label={label}
                              className="h-10 w-full rounded-lg border border-neutral-200 bg-white/80 px-3 text-[12px] text-neutral-700 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#C28181] dark:border-white/10 dark:bg-black/20 dark:text-neutral-200 dark:placeholder:text-neutral-600 dark:focus:border-[#60C5EA]"
                            />
                          </label>
                        ))}
                      </div>
                    </Section>
                  </motion.div>
                ) : view === "themes" ? (
                  <motion.div
                    key="themes-view"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.1 }}
                    className="flex-1 min-h-0 pt-1"
                  >
                    {/* Theme switcher grid matching grid-cols-2 gap-2 px-1 */}
                    <div className="grid grid-cols-2 gap-2">
                      {THEME_OPTIONS.map((t) => {
                        const selected = accent === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setAccent(t.id)}
                            onMouseEnter={() => applyDynamicThemeColors(t.id)}
                            onMouseLeave={() => applyDynamicThemeColors(accent)}
                            className={cn(
                              "group relative flex flex-col gap-2 rounded-xl px-3 py-3 text-left transition-all duration-150 cursor-pointer border",
                              selected
                                ? "bg-neutral-550/[0.08] dark:bg-white/[0.06]"
                                : "bg-transparent border-transparent hover:bg-neutral-500/[0.04] dark:hover:bg-white/[0.03]",
                            )}
                            style={{
                              borderColor: selected
                                ? accentColor
                                : "transparent",
                            }}
                          >
                            {/* Palette strip — 3 colors */}
                            <div className="grid grid-cols-3 h-6 w-full overflow-hidden rounded-lg border border-black/5 dark:border-white/5 shadow-xs">
                              <span
                                className="h-full border-r border-black/5 dark:border-white/5"
                                style={{ backgroundColor: t.colors[0] }}
                              />
                              <span
                                className="h-full border-r border-black/5 dark:border-white/5"
                                style={{ backgroundColor: t.colors[1] }}
                              />
                              <span
                                className="h-full"
                                style={{ backgroundColor: t.colors[2] }}
                              />
                            </div>

                            <div className="flex items-center justify-between w-full mt-0.5">
                              <span
                                className={cn(
                                  "font-medium text-xs capitalize transition-colors duration-150 leading-none",
                                  selected
                                    ? "text-neutral-900 dark:text-neutral-50 font-bold"
                                    : "text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200",
                                )}
                              >
                                {t.label}
                              </span>
                              {selected && (
                                <Check
                                  style={{ color: accentColor }}
                                  className="stroke-[3.5px]"
                                  size={11}
                                />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : view === "fonts" ? (
                  <motion.div
                    key="fonts-view"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.1 }}
                    className="flex-1 min-h-0 space-y-4 pt-1"
                  >
                    <FontGroup
                      active={font}
                      fonts={FONT_OPTIONS.filter((f) => f.tag === "mono")}
                      label="Mono Layouts"
                      onSelect={setFont}
                      themeAccent={accentColor}
                      activeCssFamily={selectedFont.cssFamily}
                    />
                    <FontGroup
                      active={font}
                      fonts={FONT_OPTIONS.filter((f) => f.tag === "sans")}
                      label="Proportional Layouts"
                      onSelect={setFont}
                      themeAccent={accentColor}
                      activeCssFamily={selectedFont.cssFamily}
                    />
                  </motion.div>
                ) : view === "soundCentre" ? (
                  <motion.div
                    key="sound-centre-view"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.1 }}
                    className="flex-1 min-h-0 space-y-5 pt-1"
                  >
                    <Section title="Sound Options">
                      <SubDrawerRow
                        label="Keyboard Sounds"
                        onClick={() => navigateToView("profiles")}
                        preview={
                          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 capitalize max-w-[150px] truncate text-right">
                            {SOUND_VARIANTS.find((v) => v.id === activeSwitch)
                              ?.label || activeSwitch.replace("cdn_", "")}
                          </span>
                        }
                      />
                      <SubDrawerRow
                        label="Error Sounds"
                        onClick={() => navigateToView("errorSounds")}
                        preview={
                          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 capitalize max-w-[150px] truncate text-right">
                            {errorSoundProfile === "off"
                              ? "Off"
                              : ERROR_SOUND_VARIANTS.find(
                                  (v) => v.id === errorSoundProfile,
                                )?.label ||
                                errorSoundProfile.replace("err_", "")}
                          </span>
                        }
                      />
                    </Section>
                  </motion.div>
                ) : view === "profiles" ? (
                  <motion.div
                    key="profiles-view"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.1 }}
                    className="flex-1 min-h-0 pt-1"
                  >
                    <div className="space-y-4">
                      <div>
                        <p className="px-3 mb-1.5 text-[10px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
                          Classic Switches
                        </p>
                        <div className="space-y-0.5">
                          {(["blue", "brown", "red"] as const).map((sw) => {
                            const selected = activeSwitch === sw;
                            const switchImg =
                              sw === "blue"
                                ? "/assets/images/CherryMX2ABlue.png"
                                : sw === "brown"
                                  ? "/assets/images/CherryMX2ABrown.png"
                                  : "/assets/images/CherryMX2ARed.png";
                            return (
                              <button
                                key={sw}
                                onClick={() => setActiveSwitch(sw)}
                                onMouseEnter={() => {
                                  void previewClickSound(sw, soundVolume);
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer",
                                  selected
                                    ? "bg-neutral-500/[0.05] dark:bg-white/[0.05]"
                                    : "hover:bg-neutral-500/[0.03] dark:hover:bg-white/[0.03]",
                                )}
                              >
                                <span className="flex items-center gap-3">
                                  <img
                                    src={switchImg}
                                    alt={`${sw} switch`}
                                    className="w-15 h-15 object-contain select-none"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span
                                    className={cn(
                                      "text-xs font-medium capitalize",
                                      selected
                                        ? "text-neutral-900 dark:text-neutral-50 font-bold"
                                        : "text-neutral-500 dark:text-neutral-400",
                                    )}
                                  >
                                    {sw} tactile switch
                                  </span>
                                </span>
                                {selected && (
                                  <Check
                                    style={{ color: accentColor }}
                                    className="stroke-[3.5px]"
                                    size={12}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="px-3 mb-1.5 text-[10px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
                          Premium Hardware
                        </p>
                        <div className="space-y-0.5">
                          {SOUND_VARIANTS.filter(
                            (v) =>
                              parseInt(v.id.split("_")[1]) >= 17 ||
                              v.id === "cdn_4",
                          ).map((v) => {
                            const selected = activeSwitch === v.id;
                            return (
                              <button
                                key={v.id}
                                onClick={() => setActiveSwitch(v.id as any)}
                                onMouseEnter={() => {
                                  void previewClickSound(v.id, soundVolume);
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer",
                                  selected
                                    ? "bg-neutral-500/[0.05] dark:bg-white/[0.05]"
                                    : "hover:bg-neutral-500/[0.03] dark:hover:bg-white/[0.03]",
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-600",
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      "text-xs font-medium",
                                      selected
                                        ? "text-neutral-900 dark:text-neutral-50 font-bold"
                                        : "text-neutral-500 dark:text-neutral-400",
                                    )}
                                  >
                                    {v.label}
                                  </span>
                                </span>
                                {selected && (
                                  <Check
                                    style={{ color: accentColor }}
                                    className="stroke-[3.5px]"
                                    size={12}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="px-3 mb-1.5 text-[10px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
                          Arcade & Effects
                        </p>
                        <div className="space-y-0.5">
                          {SOUND_VARIANTS.filter((v) => {
                            const num = parseInt(v.id.split("_")[1]);
                            return num >= 1 && num <= 16 && num !== 4;
                          }).map((v) => {
                            const selected = activeSwitch === v.id;
                            return (
                              <button
                                key={v.id}
                                onClick={() => setActiveSwitch(v.id as any)}
                                onMouseEnter={() => {
                                  void previewClickSound(v.id, soundVolume);
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer",
                                  selected
                                    ? "bg-neutral-500/[0.05] dark:bg-white/[0.05]"
                                    : "hover:bg-neutral-500/[0.03] dark:hover:bg-white/[0.03]",
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-600",
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      "text-xs font-medium",
                                      selected
                                        ? "text-neutral-900 dark:text-neutral-50 font-bold"
                                        : "text-neutral-500 dark:text-neutral-400",
                                    )}
                                  >
                                    {v.label}
                                  </span>
                                </span>
                                {selected && (
                                  <Check
                                    style={{ color: accentColor }}
                                    className="stroke-[3.5px]"
                                    size={12}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : view === "errorSounds" ? (
                  <motion.div
                    key="error-sounds-view"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.1 }}
                    className="flex-1 min-h-0 pt-1"
                  >
                    <div className="space-y-4">
                      <div>
                        <p className="px-3 mb-1.5 text-[10px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
                          Error Sounds
                        </p>
                        <div className="space-y-0.5">
                          {[
                            { id: "off", label: "Off (Silent)" },
                            { id: "default", label: "Default Buzzer" },
                            ...ERROR_SOUND_VARIANTS,
                          ].map((v) => {
                            const selected =
                              errorSoundProfile === v.id ||
                              ((errorSoundProfile as string) === "" && v.id === "off");
                            return (
                              <button
                                key={v.id}
                                onClick={() =>
                                  setErrorSoundProfile(
                                    v.id as import("@/contexts/SettingsContext").ErrorSoundType,
                                  )
                                }
                                onMouseEnter={() => {
                                  void previewErrorSound(v.id, soundVolume);
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer",
                                  selected
                                    ? "bg-neutral-500/[0.05] dark:bg-white/[0.05]"
                                    : "hover:bg-neutral-500/[0.03] dark:hover:bg-white/[0.03]",
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-600",
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      "text-xs font-medium",
                                      selected
                                        ? "text-neutral-900 dark:text-neutral-50 font-bold"
                                        : "text-neutral-500 dark:text-neutral-400",
                                    )}
                                  >
                                    {v.label}
                                  </span>
                                </span>
                                {selected && (
                                  <Check
                                    style={{ color: accentColor }}
                                    className="stroke-[3.5px]"
                                    size={12}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="atmosphere-view"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.1 }}
                    className="space-y-2 pb-8 pt-1"
                  >
                    <div className="flex items-center justify-between px-2 mb-2 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                      <div className="text-[10px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
                        Profiles
                      </div>
                      <button
                        onClick={() => setIsSavingPreset(!isSavingPreset)}
                        className="text-[10px] flex items-center gap-1 font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                      >
                        <Save size={12} /> Save Mix
                      </button>
                    </div>

                    <div className="pr-1 space-y-4">
                      {isSavingPreset && (
                        <div className="px-2 py-3 mb-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                          <div className="flex items-center gap-2">
                            <input                               type="text"
                              autoFocus
                              placeholder="Preset name..."
                              value={newPresetName}
                              onChange={(e) => setNewPresetName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newPresetName.trim()) {
                                  setSavedAmbientMixes({
                                    ...savedAmbientMixes,
                                    [newPresetName.trim()]: ambientMix,
                                  });
                                  setNewPresetName("");
                                  setIsSavingPreset(false);
                                }
                              }}
                              className="flex-1 text-xs px-2 py-1.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none"
                            />
                            <button
                              onClick={() => setIsSavingPreset(false)}
                              className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      )}

                      {Object.keys(savedAmbientMixes || {}).length > 0 && (
                        <div className="space-y-0.5 px-2 mb-4">
                          {Object.keys(savedAmbientMixes).map((presetName) => {
                            const mix = savedAmbientMixes[presetName];

                            // Check if current active sounds match the preset sounds and volumes
                            const presetKeys = Object.keys(mix).filter(
                              (k) => mix[k] > 0,
                            );
                            const activeKeys = Object.keys(ambientMix).filter(
                              (k) => ambientMix[k] > 0,
                            );
                            const isActive =
                              presetKeys.length === activeKeys.length &&
                              presetKeys.every((k) => ambientMix[k] === mix[k]);

                            return (
                              <div
                                key={presetName}
                                className={cn(
                                  "flex items-center group justify-between rounded px-2 py-1.5 transition-colors",
                                  isActive
                                    ? "bg-neutral-500/[0.05] dark:bg-white/[0.05]"
                                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                                )}
                              >
                                <button
                                  onClick={() => {
                                    if (isActive) {
                                      setAmbientMix({});
                                    } else {
                                      setAmbientMix(mix);
                                    }
                                  }}
                                  className={cn(
                                    "flex-1 text-left text-xs font-medium",
                                    isActive
                                      ? "text-neutral-900 dark:text-white font-bold"
                                      : "text-neutral-700 dark:text-neutral-300",
                                  )}
                                >
                                  {presetName}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newMixes = { ...savedAmbientMixes };
                                    delete newMixes[presetName];
                                    setSavedAmbientMixes(newMixes);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="px-2 mb-2 text-[10px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
                        Sounds
                      </div>
                      <div className="space-y-0.5">
                        {AMBIENT_SOUNDS.map(({ id, label, Icon }) => {
                          const currentVolume = ambientMix[id] || 0;
                          const selected = currentVolume > 0;

                          const toggleSound = () => {
                            if (selected) {
                              const newMix = { ...ambientMix };
                              delete newMix[id];
                              setAmbientMix(newMix);
                            } else {
                              setAmbientMix({ ...ambientMix, [id]: 0.5 });
                            }
                          };

                          return (
                            <div
                              key={id}
                              className={cn(
                                "w-full rounded-lg px-3 py-2.5 transition-colors",
                                selected
                                  ? "bg-neutral-500/[0.05] dark:bg-white/[0.05]"
                                  : "hover:bg-neutral-500/[0.03] dark:hover:bg-white/[0.03]",
                              )}
                            >
                              <button
                                onClick={toggleSound}
                                onMouseEnter={() => {
                                  // Don't disturb a track the user already has playing for real.
                                  if (!selected) void previewAmbientSound(id, 0.5);
                                }}
                                onMouseLeave={() => {
                                  if (!selected) stopAmbientPreview();
                                }}
                                className="flex w-full items-center justify-between text-left cursor-pointer outline-none"
                              >
                                <span
                                  className={cn(
                                    "text-xs font-medium flex items-center gap-2",
                                    selected
                                      ? "text-neutral-900 dark:text-neutral-50 font-bold"
                                      : "text-neutral-500 dark:text-neutral-400",
                                  )}
                                >
                                  <Icon
                                    size={14}
                                    className={cn(
                                      selected ? "opacity-100" : "opacity-70",
                                    )}
                                  />
                                  {label}
                                </span>
                                {selected && (
                                  <Check
                                    style={{ color: accentColor }}
                                    className="stroke-[3.5px]"
                                    size={12}
                                  />
                                )}
                              </button>
                              {selected && (
                                <div className="pt-3 pb-1 pl-1 pr-1">
                                  <ThemeSlider
                                    value={currentVolume}
                                    onChange={(v) =>
                                      setAmbientMix({ ...ambientMix, [id]: v })
                                    }
                                    accentColor={accentColor}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────
   1:1 Light/Dark Mode Switcher Component
   - Compact rounded track
   - size-6 buttons
   - Clean active sliding overlay background
───────────────────────────────────────────────────────────── */
function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-8 w-24 rounded-full bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
    );
  }

  const themes = [
    { key: "system", icon: Monitor, label: "System theme" },
    { key: "light", icon: Sun, label: "Light theme" },
    { key: "dark", icon: Moon, label: "Dark theme" },
  ] as const;

  const currentTheme = theme ?? "system";

  return (
    <div
      className={cn(
        "relative isolate flex h-8 rounded-full border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/[0.06] p-1",
        className,
      )}
    >
      {themes.map(({ key, icon: Icon, label }) => {
        const isActive = currentTheme === key;

        return (
          <button
            aria-label={label}
            className="relative h-6 w-8 rounded-full flex items-center justify-center cursor-pointer select-none group"
            key={key}
            onClick={() => setTheme(key)}
            type="button"
            style={{ transform: "none" }}
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full bg-neutral-300/40 dark:bg-white/10"
                layoutId="activeTheme"
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
              />
            )}
            <Icon
              className={cn(
                "relative z-10 w-3.5 h-3.5 transition-colors",
                isActive
                  ? "text-neutral-900 dark:text-foreground font-bold"
                  : "text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Fonts grouped items layout matching 1:1
───────────────────────────────────────────────────────────── */
interface FontGroupProps {
  label: string;
  fonts: typeof FONT_OPTIONS;
  active: TypingFont;
  onSelect: (id: TypingFont) => void;
  themeAccent: string;
  activeCssFamily: string;
}

function FontGroup({
  label,
  fonts,
  active,
  onSelect,
  themeAccent,
  activeCssFamily,
}: FontGroupProps) {
  return (
    <div className="space-y-1 block text-left">
      <p className="mb-1.5 px-3 font-semibold text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
        {label}
      </p>
      <div className="space-y-0.5">
        {fonts.map((f) => {
          const selected = active === f.id;
          return (
            <button
              key={f.id}
              className={cn(
                "group/font flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors duration-150 select-none cursor-pointer border border-transparent",
                selected
                  ? "bg-neutral-100 dark:bg-white/[0.06]"
                  : "bg-transparent hover:bg-neutral-500/[0.03] dark:hover:bg-white/[0.03]",
              )}
              onClick={() => onSelect(f.id)}
              onMouseEnter={() =>
                document.documentElement.style.setProperty(
                  "--app-font-family",
                  f.cssFamily,
                )
              }
              onMouseLeave={() =>
                document.documentElement.style.setProperty(
                  "--app-font-family",
                  activeCssFamily,
                )
              }
              style={{ transform: "none" }}
            >
              <span
                className={cn(
                  "text-xs transition-colors duration-150 leading-none",
                  selected
                    ? "font-bold text-neutral-900 dark:text-neutral-50"
                    : "text-neutral-400 group-hover/font:text-neutral-800 dark:group-hover/font:text-neutral-200",
                )}
                style={{
                  fontFamily: f.cssFamily,
                  color: selected ? themeAccent : undefined,
                }}
              >
                {f.label}
              </span>
              {selected && (
                <Check
                  style={{ color: themeAccent }}
                  className="shrink-0 stroke-[3.5px]"
                  size={12}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Custom structural visual sub-components
───────────────────────────────────────────────────────────── */
function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("block text-left shrink-0", className)}>
      <p className="mt-[25px] mb-[14px] px-0 font-normal text-[15px] text-neutral-900 dark:text-neutral-50 leading-tight tracking-tight">
        {title}
      </p>
      <div className="space-y-0">{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-0 py-2.5 transition-colors min-h-11 shrink-0">
      <span className="text-neutral-900 dark:text-neutral-100 text-[13px] font-normal tracking-tight">
        {label}
      </span>
      {children}
    </div>
  );
}

function SubDrawerRow({
  label,
  preview,
  onClick,
}: {
  label: string;
  preview: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center justify-between px-0 py-2.5 transition-colors text-left min-h-11 shrink-0 cursor-pointer border-b border-transparent"
      style={{ transform: "none" }}
    >
      <span className="text-neutral-900 dark:text-neutral-100 text-[13px] font-normal tracking-tight">
        {label}
      </span>
      <span className="flex items-center gap-1.5 shrink-0">
        {preview}
        <ChevronRight
          className="text-neutral-400 dark:text-neutral-600 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-neutral-600 dark:group-hover:text-neutral-400"
          size={12}
        />
      </span>
    </button>
  );
}

interface ToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onToggle: () => void;
  activeColor: string;
}

function Toggle({
  label,
  description,
  enabled,
  onToggle,
  activeColor,
}: ToggleProps) {
  return (
    <button
      onClick={onToggle}
      type="button"
      className="flex w-full items-center justify-between px-0 py-2.5 transition-colors text-left min-h-11 shrink-0 cursor-pointer border-b border-transparent"
      style={{ transform: "none" }}
    >
      <div className="flex flex-col gap-1 text-left select-none pr-4">
        <span className="text-neutral-900 dark:text-neutral-100 text-[13px] font-normal tracking-tight">
          {label}
        </span>
        {description && (
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-[1.35]">
            {description}
          </span>
        )}
      </div>

      {/* Dynamic toggle chassis */}
      <div
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 p-0.5 border outline-none border-transparent",
          enabled
            ? "bg-neutral-400 dark:bg-neutral-800"
            : "bg-neutral-200 dark:bg-white/10",
        )}
        style={
          enabled
            ? {
                backgroundColor: activeColor,
              }
            : undefined
        }
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 shadow-sm",
            enabled ? "translate-x-4" : "translate-x-0",
          )}
        />
      </div>
    </button>
  );
}
