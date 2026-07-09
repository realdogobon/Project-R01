import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { SmoothInput, SmoothTextarea } from "../components/ui/SmoothInputs";
import { ArrowLeft, Play, CheckCircle, Clock, ShieldAlert, Sparkles, Loader2, Settings2, ArrowRight, RotateCcw, X, Zap, Trophy, FileText, BookOpen, HeartPulse, FastForward, PlaySquare, Lock, Hourglass, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSoundEngine } from "../hooks/useSoundEngine";
import { ClassicKeyboard, KeyboardThemeName, KEY_LABELS } from "../components/keyboard/ClassicKeyboard";
import { motion, AnimatePresence } from "motion/react";
import { useSettings, THEME_OPTIONS } from "../contexts/SettingsContext";
import { WordEngine } from "../lib/word-engine";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TypingScreen } from "../components/typing/TypingScreen";
import type { ReplayEvent } from "../lib/typing-engine";

function playErrorBuzzer() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (err) {
    console.warn("Synthetic buzzer could not play audio context:", err);
  }
}

interface CharacterSpanProps {
  char: string;
  index: number;
  typedChar: string | undefined;
  isActive: boolean;
}

const CharacterSpan = React.memo(
  React.forwardRef<HTMLSpanElement, CharacterSpanProps>(
    ({ char, index, typedChar, isActive }, ref) => {
      let stateClass = "";
      let blurClass = "";
      let inlineStyle: React.CSSProperties = {};

      let ghostModeSetting = false;
      let wordFadeOut = false;
      let accentColor = "#22d3ee";
      try {
        const settingsCtx = useSettings();
        ghostModeSetting = settingsCtx.ghostMode;
        wordFadeOut = settingsCtx.wordFadeOut;
        const currentThemeObj = THEME_OPTIONS.find((t) => t.id === settingsCtx.accent) || THEME_OPTIONS[0];
        accentColor = currentThemeObj.colors[2];
      } catch {}

      if (typedChar !== undefined) {
        const isCorrect = typedChar === char;
        if (isCorrect) {
          stateClass = "text-neutral-400 dark:text-neutral-600";
          if (wordFadeOut) {
            blurClass = "opacity-[0.16] blur-[1.4px] scale-95 select-none transition-all duration-500 inline-block";
          } else {
            blurClass = "inline-block";
          }
        } else {
          stateClass = "text-red-500 dark:text-red-400 font-bold bg-red-550/15 border-b border-red-500/50 inline-block";
          blurClass = "";
        }
      } else if (isActive) {
        stateClass = "font-bold scale-105 inline-block z-10 transition-all duration-150 relative";
        blurClass = "";
        inlineStyle = {
          color: accentColor,
          textShadow: `0 0 10px ${accentColor}45`
        };
      } else {
        stateClass = "text-neutral-700 dark:text-neutral-300";
        if (ghostModeSetting) {
          blurClass = "opacity-[0.08] blur-[0.4px] scale-[0.98] select-none transition-all duration-300 inline-block";
        } else {
          blurClass = "opacity-[0.34] blur-[0.15px] transition-all duration-300 inline-block";
        }
      }

      return (
        <span
          ref={isActive ? ref : undefined}
          className={`${stateClass} ${blurClass} relative`}
          style={inlineStyle}
        >
          {isActive && (
            <>
              <motion.span
                layoutId="smooth-caret"
                className="absolute left-[1px] top-[15%] h-[75%] w-[2.5px] rounded-full z-20"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 0 15px ${accentColor}`,
                  originY: 0
                }}
                transition={{
                  layout: {
                    type: "spring",
                    stiffness: 920,
                    damping: 42,
                    mass: 0.52
                  },
                  opacity: {
                    ease: "easeInOut",
                    duration: 1.0,
                    repeat: Infinity,
                  }
                }}
                animate={{ opacity: [1, 0, 1] }}
              />
            </>
          )}
          {char === "\n" ? (
            <>
              <span className="select-none text-sm ml-0.5" style={{ color: `${accentColor}40` }}>↵</span>
              <br />
            </>
          ) : char === " " ? (
            "\u00A0"
          ) : (
            char
          )}
        </span>
      );
    }
  )
);

CharacterSpan.displayName = "CharacterSpan";

export interface PracticeConfig {
  advMode: "custom" | "words" | "quote" | "zen";
  advWordCount: number;
  customWordCount: string;
  isCustomWordActive: boolean;
  advPunct: boolean;
  advNums: boolean;
  advDiff: "easy" | "hard";
  durationLimit: string;
  timerHrs: number;
  timerMins: number;
  timerSecs: number;
  timerMs: number;
  isStrictModeEnabled: boolean;
  strictDisableBackspace: boolean;
  strictMinAccuracy: string;
  strictCustomAccuracy: string;
  strictMaxErrors: string;
  strictCustomMaxErrors: string;
  strictWpmFloor: string;
  strictCustomWpmFloor: string;
  strictInactivityTimeout: string;
  strictCustomInactivity: string;
  strictSuddenDeath: boolean;
}

export function PracticeMode({
  accountUid,
  onReturnToWrite,
  initialText,
  initialTitle,
  initialConfig,
  onConfigChange,
  activeEditorText = "",
  onUpdateEditorText,
  initialDrillKeys,
  onDrillTriggeredDone,
  forceStep,
  onForceStepDone,
  onStateChange,
}: {
  accountUid: string;
  onReturnToWrite: () => void;
  initialText?: string;
  initialTitle?: string;
  initialConfig?: PracticeConfig;
  onConfigChange?: (cfg: PracticeConfig) => void;
  activeEditorText?: string;
  onUpdateEditorText?: (val: string) => void;
  key?: string;
  initialDrillKeys?: string[] | null;
  onDrillTriggeredDone?: () => void;
  forceStep?: number | null;
  onForceStepDone?: () => void;
  onStateChange?: (state: { step: number; wpm: number; accuracy: number; weakKeys: string[]; problemKeys: string[]; timerRunning: boolean; typedTextLength: number }) => void;
}) {
  const { user, addSession } = useAuth();
  const keystrokeLogRef = useRef<{ char: string; index: number; timestamp: number; latency: number; key: string; isCorrect: boolean }[]>([]);

  // ── Per-account exact-resume session store ──────────────────────────────
  // Keyed by accountUid so switching between real accounts (or to/from
  // guest) never leaks or clobbers another account's practice session.
  // Read synchronously (not in a post-paint effect) so every piece of state
  // below mounts already-correct on the very first render after a switch —
  // no flash of defaults, no race with paint.
  const PRACTICE_SESSION_KEY = `royscript_practice_session_${accountUid}`;
  const canRestore = !initialText && !initialDrillKeys && !forceStep;
  const loadedSession = useMemo(() => {
    if (!canRestore) return null;
    try {
      const raw = localStorage.getItem(PRACTICE_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
    // Intentionally computed once per mount only: this component is fully
    // remounted (via a `key` including accountUid) whenever the active
    // account changes, so this never needs to re-run mid-life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const canResumeSnapshot = !!(loadedSession && loadedSession.step === 2 && loadedSession.snapshot && loadedSession.originalText);

  const [step, setStep] = useState<number>(() => (canResumeSnapshot ? 2 : 1));
  const [hoveredGraphIndex, setHoveredGraphIndex] = useState<number | null>(null);
  const [text, setText] = useState(
    () => (typeof loadedSession?.text === "string" ? loadedSession.text : initialText) || "Use this form to create a typing test with the text of your choice. Each paragraph of the text will be a separate typing test.",
  );
  const [title, setTitle] = useState(() => (typeof loadedSession?.title === "string" ? loadedSession.title : initialTitle) || "Demo Test");



  const [personalBest, setPersonalBest] = useState({
    wpm: 0,
    acc: 0,
    tests: 0
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ais_typing_pb");
      if (stored) setPersonalBest(JSON.parse(stored));
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (step === 3) {
      setPersonalBest(prev => {
        const newPb = {
          wpm: Math.max(prev.wpm, wpm),
          acc: prev.tests === 0 ? accuracy : Math.round(((prev.acc * prev.tests) + accuracy) / (prev.tests + 1)),
          tests: prev.tests + 1
        };
        localStorage.setItem("ais_typing_pb", JSON.stringify(newPb));
        return newPb;
      });


      if (user && addSession) {
        addSession(wpm, accuracy, "Practice", Math.floor(elapsedTime), title || "Quick Practice", text, JSON.stringify(replayLog))
          .catch(e => console.error("Cloud practice run upload failed:", e));
      }
    }
  }, [step]);



  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiCategory, setAiCategory] = useState("Legal & Court Matters");
  const [aiDifficulty, setAiDifficulty] = useState("intermediate");
  const [aiLength, setAiLength] = useState("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const categories = [
    "Legal & Court Matters",
    "Parliamentary & Debates",
    "Progressive & Editorials",
    "Business & Financial",
    "General & Narrative",
    "Science & Technology",
    "Medical & Healthcare"
  ];

  const handleGenerateAI = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerateError("");
    try {
      const response = await fetch("/api/generate-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: aiCategory,
          difficulty: aiDifficulty,
          length: aiLength
        })
      });
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error(`Server returned an invalid response (${response.status}).`);
      }
      if (response.ok && data.text) {
        setText(data.text);
        if (!title.trim() || title === "Demo Test") {
          setTitle(`${aiCategory} - ${aiDifficulty.charAt(0).toUpperCase() + aiDifficulty.slice(1)}`);
        }
        setIsAiModalOpen(false);
      } else {
        setGenerateError(data.error || data.details || "Failed to generate text. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setGenerateError(err.message || "Failed to generate text. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };


  // Session config resolution order: an exact-resume snapshot from this
  // account's own storage wins first (most precise), then an explicitly
  // passed initialConfig (e.g. a fresh switch-back before any session
  // existed), then a hardcoded default.
  const cfg = (key: keyof PracticeConfig) =>
    loadedSession && loadedSession[key] !== undefined ? loadedSession[key] : initialConfig?.[key];

  const [isStrictModeEnabled, setIsStrictModeEnabled] = useState(() => cfg("isStrictModeEnabled") ?? false);
  const [strictDisableBackspace, setStrictDisableBackspace] = useState(() => cfg("strictDisableBackspace") ?? false);
  const [strictMinAccuracy, setStrictMinAccuracy] = useState(() => cfg("strictMinAccuracy") ?? "none");
  const [strictCustomAccuracy, setStrictCustomAccuracy] = useState(() => cfg("strictCustomAccuracy") ?? "90");
  const [strictMaxErrors, setStrictMaxErrors] = useState<string>(() => cfg("strictMaxErrors") ?? "none");
  const [strictCustomMaxErrors, setStrictCustomMaxErrors] = useState<string>(() => cfg("strictCustomMaxErrors") ?? "5");
  const [strictWpmFloor, setStrictWpmFloor] = useState<string>(() => cfg("strictWpmFloor") ?? "none");
  const [strictCustomWpmFloor, setStrictCustomWpmFloor] = useState<string>(() => cfg("strictCustomWpmFloor") ?? "40");
  const [strictInactivityTimeout, setStrictInactivityTimeout] = useState<string>(() => cfg("strictInactivityTimeout") ?? "none");
  const [strictCustomInactivity, setStrictCustomInactivity] = useState<string>(() => cfg("strictCustomInactivity") ?? "5");
  const [strictSuddenDeath, setStrictSuddenDeath] = useState<boolean>(() => cfg("strictSuddenDeath") ?? false);
  const lastKeyPressTimeRef = useRef<number>(0);
  const [isStrictModeModalOpen, setIsStrictModeModalOpen] = useState(false);
  const [strictViolation, setStrictViolation] = useState<string | null>(null);
  const [strictViolationAcknowledged, setStrictViolationAcknowledged] = useState(false);


  const [isAdvModalOpen, setIsAdvModalOpen] = useState(false);
  const [advMode, setAdvMode] = useState<"custom" | "words" | "quote" | "zen">(() => cfg("advMode") ?? (initialText ? "custom" : "words"));
  const [advWordCount, setAdvWordCount] = useState<number>(() => cfg("advWordCount") ?? 50);
  const [customWordCount, setCustomWordCount] = useState<string>(() => cfg("customWordCount") ?? "");
  const [isCustomWordActive, setIsCustomWordActive] = useState(() => cfg("isCustomWordActive") ?? false);
  const [advPunct, setAdvPunct] = useState(() => cfg("advPunct") ?? false);
  const [advNums, setAdvNums] = useState(() => cfg("advNums") ?? false);
  const [advDiff, setAdvDiff] = useState<"easy" | "hard">(() => cfg("advDiff") ?? "easy");
  const prevAdvDepsRef = useRef<any[] | null>(null);

  useEffect(() => {
    const deps = [advMode, advWordCount, isCustomWordActive, customWordCount, advPunct, advNums, advDiff];
    const prevDeps = prevAdvDepsRef.current;
    prevAdvDepsRef.current = deps;

    // Skip if this is the very first run, or if the dependency values are
    // identical to the last run (e.g. React StrictMode's dev-only double
    // invocation of effects right after mount). Only regenerate when a
    // setting has actually changed.
    if (prevDeps === null || deps.every((v, i) => v === prevDeps[i])) {
      return;
    }

    if (advMode === "custom") {
      return;
    }
    if (advMode === "zen") {
      setText("");
      setTitle("Zen Mode");
      return;
    }
    if (advMode === "quote") {
      const { title, text: qt } = WordEngine.generateRandomQuote(advDiff);
      setText(qt);
      setTitle(title);
      return;
    }


    const targetWordCount = isCustomWordActive && Number(customWordCount) > 0 ? Math.min(250, Math.max(5, Number(customWordCount))) : advWordCount;
    const generated = WordEngine.generateReferenceText("words", 30, targetWordCount, advPunct, advNums, advDiff);
    setText(generated);
    setTitle(`${targetWordCount} Words Run`);
  }, [advMode, advWordCount, isCustomWordActive, customWordCount, advPunct, advNums, advDiff]);



  const [durationLimit, setDurationLimit] = useState<string>(() => cfg("durationLimit") ?? "");
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [timerHrs, setTimerHrs] = useState<number>(() => cfg("timerHrs") ?? 0);
  const [timerMins, setTimerMins] = useState<number>(() => cfg("timerMins") ?? 0);
  const [timerSecs, setTimerSecs] = useState<number>(() => cfg("timerSecs") ?? 0);
  const [timerMs, setTimerMs] = useState<number>(() => cfg("timerMs") ?? 0);


  useEffect(() => {
    if (isTimerModalOpen) {
      const totalSecs = durationLimit ? parseFloat(durationLimit) * 60 : 0;
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = Math.floor(totalSecs % 60);
      const ms = Math.round((totalSecs % 1) * 1000);

      setTimerHrs(h);
      setTimerMins(m);
      setTimerSecs(s);
      setTimerMs(ms);
    }
  }, [isTimerModalOpen, durationLimit]);

  // Report config changes back to parent (for per-account state isolation)
  useEffect(() => {
    if (!onConfigChange) return;
    onConfigChange({
      advMode,
      advWordCount,
      customWordCount,
      isCustomWordActive,
      advPunct,
      advNums,
      advDiff,
      durationLimit,
      timerHrs,
      timerMins,
      timerSecs,
      timerMs,
      isStrictModeEnabled,
      strictDisableBackspace,
      strictMinAccuracy,
      strictCustomAccuracy,
      strictMaxErrors,
      strictCustomMaxErrors,
      strictWpmFloor,
      strictCustomWpmFloor,
      strictInactivityTimeout,
      strictCustomInactivity,
      strictSuddenDeath,
    });
  }, [
    advMode, advWordCount, customWordCount, isCustomWordActive,
    advPunct, advNums, advDiff,
    durationLimit, timerHrs, timerMins, timerSecs, timerMs,
    isStrictModeEnabled, strictDisableBackspace,
    strictMinAccuracy, strictCustomAccuracy,
    strictMaxErrors, strictCustomMaxErrors,
    strictWpmFloor, strictCustomWpmFloor,
    strictInactivityTimeout, strictCustomInactivity,
    strictSuddenDeath,
  ]);

  const updateDurationFromInputs = (h: number, m: number, s: number, ms: number) => {
    const totalMinutes = h * 60 + m + s / 60 + ms / 60000;
    if (totalMinutes <= 0) {
      setDurationLimit("");
    } else {
      setDurationLimit(parseFloat(totalMinutes.toFixed(4)).toString());
    }
  };
  const [countdown, setCountdown] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);


  const {
    accent: currentTheme,
    setAccent: changeTheme,
    activeSwitch: currentSwitch,
    setActiveSwitch: setCurrentSwitch,
    liveStats,
    ghostMode,
    errorSoundProfile,
    showKeyboard
  } = useSettings();
  const { playSound, playErrorSound, isErrorSoundLoaded } = useSoundEngine();
  const [errorKeys, setErrorKeys] = useState<Set<string>>(new Set());

  const currentThemeObj = THEME_OPTIONS.find((t) => t.id === currentTheme) || THEME_OPTIONS[0];
  const themeAccentColor = currentThemeObj.colors[2];

  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [originalText, setOriginalText] = useState(() => (typeof loadedSession?.originalText === "string" ? loadedSession.originalText : initialText?.trim()) || "");
  const [typedText, setTypedText] = useState("");
  const [replayLog, setReplayLog] = useState<ReplayEvent[]>([]);

  const problemKeys = React.useMemo(() => {
    const errorChars = new Map<string, number>();
    for (let i = 0; i < typedText.length; i++) {
      const target = originalText[i];
      const typed = typedText[i];
      if (target !== typed) {
        if (target) {
          errorChars.set(target, (errorChars.get(target) || 0) + 1);
        }
      }
    }
    return Array.from(errorChars.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(e => e[0] === ' ' ? 'Space' : e[0] === '\n' ? 'Enter' : e[0]);
  }, [originalText, typedText]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionErrorIndices, setSessionErrorIndices] = useState<number[]>([]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);
  const [detailedHistory, setDetailedHistory] = useState<{wpm: number, time: number, errors: number, word: string}[]>([]);
  const lastHistoryTime = useRef(0);
  const [accuracy, setAccuracy] = useState(0);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  const [showReplayOverlay, setShowReplayOverlay] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [activeSessionTab, setActiveSessionTab] = useState<"keyboard" | "diagnostics">("keyboard");
  const [clickedKey, setClickedKey] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const changeStep = (nextStep: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsTransitioning(false);
    }, 200);
  };
  const hasInitializedReplay = useRef(false);

  // Restoration itself now happens synchronously at initial-state time
  // (see loadedSession/cfg above), so this ref only needs to seed
  // TypingScreen's initialSnapshot prop for the exact-resume hydrate() call.
  const pendingSnapshotRef = useRef<any>(canResumeSnapshot ? loadedSession.snapshot : null);

  // The resume snapshot is only valid for the very first typing-screen mount
  // right after an account-switch restore. It must NOT be cleared by a
  // generic mount effect here, because the recovery countdown overlay
  // delays TypingScreen's actual engine.hydrate() call by several seconds —
  // a mount-effect-clears-ref approach would null this out before hydrate()
  // ever runs. Instead, TypingScreen invokes onSnapshotConsumed exactly when
  // it calls engine.hydrate(), which is the only correct moment to clear it
  // so any later "Start Practice" click begins from a clean slate.
  const handleSnapshotConsumed = () => {
    pendingSnapshotRef.current = null;
  };

  useEffect(() => {
    if (!canRestore) return;
    if (step !== 1) return;

    const configSnapshot = {
      step: 1,
      text, title, originalText,
      advMode, advWordCount, customWordCount, isCustomWordActive, advPunct, advNums, advDiff,
      durationLimit,
      isStrictModeEnabled, strictDisableBackspace, strictMinAccuracy, strictCustomAccuracy,
      strictMaxErrors, strictCustomMaxErrors, strictWpmFloor, strictCustomWpmFloor,
      strictInactivityTimeout, strictCustomInactivity, strictSuddenDeath,
    };
    const handle = setTimeout(() => {
      try { localStorage.setItem(PRACTICE_SESSION_KEY, JSON.stringify(configSnapshot)); } catch (e) {}
    }, 300);
    return () => clearTimeout(handle);
  }, [
    canRestore, step, text, title, originalText,
    advMode, advWordCount, customWordCount, isCustomWordActive, advPunct, advNums, advDiff,
    durationLimit,
    isStrictModeEnabled, strictDisableBackspace, strictMinAccuracy, strictCustomAccuracy,
    strictMaxErrors, strictCustomMaxErrors, strictWpmFloor, strictCustomWpmFloor,
    strictInactivityTimeout, strictCustomInactivity, strictSuddenDeath,
  ]);

  const persistTypingSnapshot = (snapshot: any) => {
    if (!canRestore) return;
    try {
      const blob = {
        step: 2,
        originalText, title, text,
        advMode, advWordCount, customWordCount, isCustomWordActive, advPunct, advNums, advDiff,
        durationLimit,
        isStrictModeEnabled, strictDisableBackspace, strictMinAccuracy, strictCustomAccuracy,
        strictMaxErrors, strictCustomMaxErrors, strictWpmFloor, strictCustomWpmFloor,
        strictInactivityTimeout, strictCustomInactivity, strictSuddenDeath,
        snapshot,
      };
      localStorage.setItem(PRACTICE_SESSION_KEY, JSON.stringify(blob));
    } catch (e) {}
  };

  const clearPracticeSession = () => {
    try { localStorage.removeItem(PRACTICE_SESSION_KEY); } catch (e) {}
  };

  const [weakKeys, setWeakKeys] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("ais_weak_keys");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleSetWeakKeys = (val: string[]) => {
    setWeakKeys(val);
    try { localStorage.setItem("ais_weak_keys", JSON.stringify(val)); } catch (e) {}
  };

  const generateTargetedDrill = useCallback((keys: string[]) => {
    if (keys.length === 0) return;
    const { title: titleStr, text: finalPassage } = WordEngine.generateCalibrationDrill(keys, 30);
    setTitle(titleStr);
    setText(finalPassage);


    const nextOriginalText = finalPassage.trim();
    setOriginalText(nextOriginalText);
    originalTextRef.current = nextOriginalText;
    setTypedText("");
    typedTextRef.current = "";
    setElapsedTime(0);
    startTimeRef.current = null;
    setReplaySpeed(1);
    setReplayIndex(0);
    setIsPlayingReplay(false);
    changeStep(2);
  }, []);

  const handleCustomTest = useCallback((passageText: string, testTitle: string) => {
    setTitle(testTitle);
    setText(passageText);

    const nextOriginalText = passageText.trim();
    setOriginalText(nextOriginalText);
    originalTextRef.current = nextOriginalText;
    setTypedText("");
    typedTextRef.current = "";
    setElapsedTime(0);
    startTimeRef.current = null;
    setReplaySpeed(1);
    setReplayIndex(0);
    setIsPlayingReplay(false);
    setWpm(0);
    setWpmHistory([]);
    setDetailedHistory([]);
    setAccuracy(100);
    setRemainingSeconds(null);
    setCountdown(5);
    keystrokeLogRef.current = [];
    changeStep(2);
  }, []);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeCharRef = useRef<HTMLSpanElement>(null);
  const replayContainerRef = useRef<HTMLDivElement>(null);
  const activeReplayCharRef = useRef<HTMLSpanElement>(null);
  const typedTextRef = useRef(typedText);
  const originalTextRef = useRef(originalText);
  const pressedKeysRef = useRef(pressedKeys);
  const countdownRef = useRef(countdown);
  const remainingSecondsRef = useRef(remainingSeconds);
  const timerRunningRef = useRef(timerRunning);
  const startTimeRef = useRef<number | null>(null);
  const lastActiveTopRef = useRef(0);

  const handleResetCurrentTest = useCallback(() => {
    setTypedText("");
    typedTextRef.current = "";
    keystrokeLogRef.current = [];
    setWpm(0);
    setAccuracy(100);
    setElapsedTime(0);
    startTimeRef.current = null;
    setWpmHistory([]);
    setDetailedHistory([]);
    lastHistoryTime.current = 0;
    setRenderRowOffset(0);
    if (durationLimit) {
      setRemainingSeconds(parseFloat(durationLimit) * 60);
      remainingSecondsRef.current = parseFloat(durationLimit) * 60;
    } else {
      setRemainingSeconds(null);
      remainingSecondsRef.current = null;
    }
    setTimerRunning(false);
    timerRunningRef.current = false;
    setCountdown(null);
    countdownRef.current = null;

    setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
  }, [durationLimit]);

  const originalChars = useMemo(() => originalText.split(""), [originalText]);
  const [renderRowOffset, setRenderRowOffset] = useState(0);

  const wordSegments = useMemo(() => {
    const segments: { type: "word" | "space" | "newline"; indices: number[] }[] = [];
    let currentSegment: { type: "word" | "space" | "newline"; indices: number[] } | null = null;
    for (let i = 0; i < originalChars.length; i++) {
      const char = originalChars[i];
      let type: "word" | "space" | "newline";
      if (char === "\n") {
        type = "newline";
      } else if (char === " " || char === "\u00A0") {
        type = "space";
      } else {
        type = "word";
      }

      if (currentSegment && currentSegment.type === type) {
        currentSegment.indices.push(i);
      } else {
        currentSegment = { type, indices: [i] };
        segments.push(currentSegment);
      }
    }
    return segments;
  }, [originalChars]);

  const updateLiveMetrics = useCallback((value: string, elapsedOverride?: number) => {
    const startedAt = startTimeRef.current;
    const elapsed = elapsedOverride ?? (startedAt ? (Date.now() - startedAt) / 1000 : 0);
    if (elapsed > 0) {
      const words = value.length / 5;
      const minutes = Math.max(elapsed / 60, 0.01);
      setWpm(Math.round(words / minutes));
    }

    let correctChars = 0;
    const target = originalTextRef.current;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === target[i]) correctChars++;
    }
    setAccuracy(value.length > 0 ? Math.round((correctChars / value.length) * 100) : 0);
  }, []);

  const checkStrictViolations = useCallback((val: string, elapsed: number) => {
    if (!isStrictModeEnabled || strictViolationAcknowledged) return true;

    const currentOriginal = originalTextRef.current;


    if (strictSuddenDeath && val.length > 0) {
      for (let i = 0; i < val.length; i++) {
        if (val[i] !== currentOriginal[i]) {
          setStrictViolation("Sudden Death! Typos are forbidden under perfect run parameters.");
          setTimerRunning(false);
          timerRunningRef.current = false;
          return false;
        }
      }
    }


    if (strictMinAccuracy !== "none") {
      const minAcc = strictMinAccuracy === "custom" ? parseInt(strictCustomAccuracy) : parseInt(strictMinAccuracy);

      const thresholdLength = minAcc === 100 ? 1 : Math.max(15, Math.ceil(100 / (100 - minAcc) + 5));

      if (val.length >= thresholdLength) {
        let correctChars = 0;
        for (let i = 0; i < val.length; i++) {
          if (val[i] === currentOriginal[i]) correctChars++;
        }
        const acc = val.length > 0 ? Math.round((correctChars / val.length) * 100) : 100;

        if (acc < minAcc) {
          setStrictViolation(`Accuracy dropped below minimum security guard of ${minAcc}%`);
          setTimerRunning(false);
          timerRunningRef.current = false;
          return false;
        }
      }
    }


    if (strictMaxErrors !== "none") {
      const maxErr = strictMaxErrors === "custom" ? parseInt(strictCustomMaxErrors) : parseInt(strictMaxErrors);
      let errorsCount = 0;
      for (let i = 0; i < val.length; i++) {
        if (val[i] !== currentOriginal[i]) errorsCount++;
      }
      if (errorsCount > maxErr) {
        setStrictViolation(`Mistakes exceeded maximum parameter limit of ${maxErr}`);
        setTimerRunning(false);
        timerRunningRef.current = false;
        return false;
      }
    }


    if (strictWpmFloor !== "none" && elapsed >= 5) {
      const words = val.length / 5;
      const minutes = elapsed / 60;
      const currentLiveWpm = Math.round(words / minutes);
      const wpmFloor = strictWpmFloor === "custom" ? parseInt(strictCustomWpmFloor) : parseInt(strictWpmFloor);
      if (currentLiveWpm < wpmFloor) {
        setStrictViolation(`Continuous typing speed fell below strict floor of ${wpmFloor} WPM`);
        setTimerRunning(false);
        timerRunningRef.current = false;
        return false;
      }
    }


    if (strictInactivityTimeout !== "none" && val.length > 0) {
      const maxIdle = strictInactivityTimeout === "custom" ? parseFloat(strictCustomInactivity) : parseFloat(strictInactivityTimeout);
      const idleTime = (Date.now() - lastKeyPressTimeRef.current) / 1000;
      if (idleTime > maxIdle) {
        setStrictViolation(`Rest Limit exceeded! You paused typing for over ${maxIdle} seconds.`);
        setTimerRunning(false);
        timerRunningRef.current = false;
        return false;
      }
    }

    return true;
  }, [
    isStrictModeEnabled,
    strictMinAccuracy,
    strictCustomAccuracy,
    strictMaxErrors,
    strictCustomMaxErrors,
    strictWpmFloor,
    strictCustomWpmFloor,
    strictInactivityTimeout,
    strictCustomInactivity,
    strictSuddenDeath,
    strictViolationAcknowledged
  ]);

  useEffect(() => { typedTextRef.current = typedText; }, [typedText]);
  useEffect(() => { originalTextRef.current = originalText; }, [originalText]);
  useEffect(() => { pressedKeysRef.current = pressedKeys; }, [pressedKeys]);
  useEffect(() => { countdownRef.current = countdown; }, [countdown]);
  useEffect(() => { remainingSecondsRef.current = remainingSeconds; }, [remainingSeconds]);
  useEffect(() => { timerRunningRef.current = timerRunning; }, [timerRunning]);

  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);


  useEffect(() => {
    if (onStateChangeRef.current) {
      onStateChangeRef.current({
        step,
        wpm,
        accuracy,
        weakKeys,
        problemKeys,
        timerRunning,
        typedTextLength: typedText.length,
      });
    }
  }, [step, wpm, accuracy, weakKeys, problemKeys, timerRunning, typedText.length]);


  useEffect(() => {
    if (initialDrillKeys && initialDrillKeys.length > 0) {
      generateTargetedDrill(initialDrillKeys);
      onDrillTriggeredDone?.();
    }
  }, [initialDrillKeys, generateTargetedDrill, onDrillTriggeredDone]);


  useEffect(() => {
    if (forceStep !== null && forceStep !== undefined) {
      changeStep(forceStep);
      onForceStepDone?.();
    }
  }, [forceStep, onForceStepDone]);

  useEffect(() => {
    const active = activeCharRef.current;
    if (!active) return;

    const lineH = active.offsetHeight || 38;
    const offsetTop = active.offsetTop;
    const row = Math.round(offsetTop / (lineH > 10 ? lineH : 38));



    const targetOffset = Math.max(0, (row - 1) * (lineH > 10 ? lineH : 38));

    if (Math.abs(targetOffset - renderRowOffset) > 2) {
      setRenderRowOffset(targetOffset);
    }
  }, [typedText.length, renderRowOffset]);


  useEffect(() => {
    if (step !== 2) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
      }

      if (e.key === "Enter" && pressedKeysRef.current.has("Tab")) {
        e.preventDefault();


        const enterEl = document.getElementById(`kbd-Enter`);
        if (enterEl) enterEl.setAttribute("data-pressed", "true");

        const tabEl = document.getElementById(`kbd-Tab`);
        if (tabEl) tabEl.setAttribute("data-pressed", "true");

        playSound("down", "Enter");

        setTimeout(() => {
          handleResetCurrentTest();

          if (enterEl) enterEl.setAttribute("data-pressed", "false");
          if (tabEl) tabEl.setAttribute("data-pressed", "false");
          setPressedKeys(new Set());
          playSound("up", "Enter");
        }, 150);

        return;
      }

      if (e.repeat) return;


      const element = document.getElementById(`kbd-${e.code}`);
      if (element) {
        if (e.code === "CapsLock") {
          const isPressed = pressedKeysRef.current.has("CapsLock");
          element.setAttribute("data-pressed", isPressed ? "false" : "true");
        } else {
          element.setAttribute("data-pressed", "true");
        }
      }

      setPressedKeys((prev) => {
        const next = new Set(prev);
        if (e.code === "CapsLock") {
          if (next.has("CapsLock")) next.delete("CapsLock");
          else next.add("CapsLock");
        } else {
          next.add(e.code);
        }
        return next;
      });


      playSound("down", e.code);


      if (e.key !== "Tab" && e.key !== "Escape" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        inputRef.current?.focus();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "CapsLock") {
        const element = document.getElementById(`kbd-${e.code}`);
        if (element) {
          element.setAttribute("data-pressed", "false");
        }
        setPressedKeys((prev) => {
          const next = new Set(prev);
          next.delete(e.code);
          return next;
        });
        setErrorKeys((prev) => {
          const next = new Set(prev);
          next.delete(e.code);
          return next;
        });
      }

      playSound("up", e.code);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [step, playSound]);


  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      const timer = setTimeout(() => {
        setCountdown(null);
        setTimerRunning(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (countdown === null && timerRunning) {
      setTimeout(() => {
         if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [countdown, timerRunning]);


  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now() - elapsedTime * 1000;
      }
      interval = setInterval(() => {
        const elapsed = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0;
        setElapsedTime(elapsed);
        updateLiveMetrics(typedTextRef.current, elapsed);


        if (isStrictModeEnabled && !strictViolationAcknowledged) {
          checkStrictViolations(typedTextRef.current, elapsed);
        }

        if (Math.floor(elapsed) > lastHistoryTime.current) {
          const currentWords = typedTextRef.current.trim().split(/\s+/);
          const currentWord = currentWords.length > 0 ? currentWords[currentWords.length - 1] : "";
          const calculatedWpm = Math.round((typedTextRef.current.length / 5) / Math.max(elapsed / 60, 0.01));
          setWpmHistory(prev => [...prev, calculatedWpm]);
          setDetailedHistory(prev => [...prev, {
            time: Math.floor(elapsed),
            wpm: calculatedWpm,
            errors: 0,
            word: currentWord
          }]);
          lastHistoryTime.current = Math.floor(elapsed);
        }

        if (remainingSecondsRef.current !== null) {
           setRemainingSeconds((prev) => {
             if (prev !== null && prev <= 1) {
               handleSubmit();
               remainingSecondsRef.current = 0;
               return 0;
             }
             const next = prev !== null ? prev - 1 : prev;
             remainingSecondsRef.current = next;
             return next;
           });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, updateLiveMetrics]);

  const handleStartTest = () => {
    const nextOriginalText = text.trim();
    setOriginalText(nextOriginalText);
    originalTextRef.current = nextOriginalText;
    setTypedText("");
    typedTextRef.current = "";
    setElapsedTime(0);
    startTimeRef.current = null;
    setWpm(0);
    setWpmHistory([]);
    setDetailedHistory([]);
    lastHistoryTime.current = 0;
    setRenderRowOffset(0);
    setAccuracy(0);
    setReplayIndex(0);
    setIsPlayingReplay(false);
    setShowReplayOverlay(false);
    hasInitializedReplay.current = false;
    setStrictViolation(null);
    setStrictViolationAcknowledged(false);


    setRemainingSeconds(null);
    remainingSecondsRef.current = null;
    setCountdown(null);
    setTimerRunning(false);


    changeStep(2);
  };

  const computeFluidDiagnostics = useCallback(() => {
    const logs = keystrokeLogRef.current;
    if (logs.length === 0) return [];

    const keyStats = new Map<string, { latencies: number[]; errors: number }>();

    logs.forEach((log) => {
      const char = log.char || "";
      const keyRepr = char === " " ? "Space" : char === "\n" ? "Enter" : char;
      if (!keyRepr) return;

      if (!keyStats.has(keyRepr)) {
        keyStats.set(keyRepr, { latencies: [], errors: 0 });
      }

      const stats = keyStats.get(keyRepr)!;
      if (log.latency > 0) {
        stats.latencies.push(log.latency);
      }
      if (!log.isCorrect) {
        stats.errors++;
      }
    });

    const result: { key: string; avgLatency: number; errors: number; frictionScore: number }[] = [];
    keyStats.forEach((stats, key) => {
      const avgLatency = stats.latencies.length > 0
        ? Math.round(stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length)
        : 0;


      const frictionScore = avgLatency + (stats.errors * 400);

      result.push({
        key,
        avgLatency,
        errors: stats.errors,
        frictionScore
      });
    });

    return result.sort((a, b) => b.frictionScore - a.frictionScore);
  }, []);

  const handleSubmit = () => {
    setTimerRunning(false);

    const fluidDocs = computeFluidDiagnostics();
    const derivedProblemKeys = fluidDocs.slice(0, 4).map(d => d.key);

    if (derivedProblemKeys.length > 0) {
      handleSetWeakKeys(derivedProblemKeys);
    }

    changeStep(3);
  };

  const processInputValue = useCallback((val: string) => {
    const currentTyped = typedTextRef.current;
    const currentOriginal = originalTextRef.current;


    lastKeyPressTimeRef.current = Date.now();

    if (!timerRunningRef.current && val.length > 0 && countdownRef.current === null) {
      startTimeRef.current = Date.now();
      setTimerRunning(true);
    }


    if (val.length === currentTyped.length + 1) {
       const expectedChar = currentOriginal[currentTyped.length];
       const addedChar = val[val.length - 1];

       const isCorrect = addedChar === expectedChar;
       const timestamp = Date.now();
       let latency = 0;

       if (keystrokeLogRef.current.length === 0) {
         if (startTimeRef.current) {
           latency = timestamp - startTimeRef.current;
         }
       } else {
         const lastLog = keystrokeLogRef.current[keystrokeLogRef.current.length - 1];
         latency = timestamp - lastLog.timestamp;
       }

       if (latency > 2500) {
         latency = 2500;
       }

       keystrokeLogRef.current.push({
         char: expectedChar,
         index: currentTyped.length,
         timestamp,
         latency,
         key: addedChar,
         isCorrect
       });

       if (expectedChar === "\n" && addedChar !== "\n") {
          return;
       }
       if (addedChar === "\n" && expectedChar !== "\n") {
          return;
       }


       if (addedChar !== expectedChar) {
          if (errorSoundProfile && errorSoundProfile !== "off") {
             if (isErrorSoundLoaded) {
                playErrorSound();
             } else {
                playErrorBuzzer();
             }
          }


          const wrongKeys = Array.from(pressedKeysRef.current).filter(
            (k) => k !== "ShiftLeft" && k !== "ShiftRight" && k !== "CapsLock"
          );
          if (wrongKeys.length > 0) {
            setErrorKeys((prev) => {
              const next = new Set(prev);
              wrongKeys.forEach((k) => next.add(k));
              return next;
            });
          }
       }
    }

    if (strictDisableBackspace && val.length < currentTyped.length) {
       return;
    }

    if (val.length < currentTyped.length) {
      if (keystrokeLogRef.current.length > val.length) {
        keystrokeLogRef.current = keystrokeLogRef.current.slice(0, val.length);
      }
    }


    if (isStrictModeEnabled && !strictViolationAcknowledged) {
      const startedAt = startTimeRef.current;
      const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : 0;
      if (!checkStrictViolations(val, elapsed)) {
         return;
      }
    }

    setTypedText(val);
    typedTextRef.current = val;
    updateLiveMetrics(val);


    if (val.length === currentOriginal.length) {
      setTimeout(() => {
        handleSubmit();
      }, 250);
    }
  }, [strictDisableBackspace, isStrictModeEnabled, strictViolationAcknowledged, updateLiveMetrics, errorSoundProfile, isErrorSoundLoaded, playErrorSound, checkStrictViolations]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    processInputValue(e.target.value);
  }, [processInputValue]);

  const handleKeyVirtualDown = useCallback((code: string) => {
    if (countdownRef.current !== null) return;
    const currentTyped = typedTextRef.current;
    const currentOriginal = originalTextRef.current;
    const currentPressed = pressedKeysRef.current;

    const element = document.getElementById(`kbd-${code}`);
    if (element) {
      if (code === "ShiftLeft" || code === "ShiftRight" || code === "CapsLock") {
        const isCurrentlyPressed = currentPressed.has(code);
        element.setAttribute("data-pressed", isCurrentlyPressed ? "false" : "true");
      } else {
        element.setAttribute("data-pressed", "true");
      }
    }

    if (code === "ShiftLeft" || code === "ShiftRight" || code === "CapsLock") {
      setPressedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(code)) {
          next.delete(code);
        } else {
          next.add(code);
        }
        return next;
      });
      playSound("down", code);
      return;
    }

    setPressedKeys((prev) => {
      const next = new Set(prev);
      next.add(code);
      return next;
    });
    playSound("down", code);

    if (code === "Backspace") {
      if (strictDisableBackspace) return;
      processInputValue(currentTyped.slice(0, -1));
    } else if (code === "Space") {
      processInputValue(currentTyped + " ");
    } else if (code === "Enter") {
      const expectedChar = currentOriginal[currentTyped.length];
      if (expectedChar === "\n") {
        processInputValue(currentTyped + "\n");
      }
    } else {
      const labels = KEY_LABELS[code];
      if (labels) {
        const isShift = currentPressed.has("ShiftLeft") || currentPressed.has("ShiftRight");
        const isCaps = currentPressed.has("CapsLock");

        let char = labels[0];
        const isLetter = labels.length === 1 && /^[a-z]$/i.test(labels[0]);

        if (isLetter) {
          const upper = isShift !== isCaps;
          char = upper ? labels[0].toUpperCase() : labels[0].toLowerCase();
        } else if (isShift && labels[1]) {
          char = labels[1];
        }

        processInputValue(currentTyped + char);

        if (isShift) {
          setPressedKeys((prev) => {
            const next = new Set(prev);
            next.delete("ShiftLeft");
            next.delete("ShiftRight");
            return next;
          });
          const leftShiftEl = document.getElementById("kbd-ShiftLeft");
          const rightShiftEl = document.getElementById("kbd-ShiftRight");
          if (leftShiftEl) leftShiftEl.setAttribute("data-pressed", "false");
          if (rightShiftEl) rightShiftEl.setAttribute("data-pressed", "false");
        }
      }
    }

    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  }, [playSound, processInputValue, strictDisableBackspace]);

  const handleKeyVirtualUp = useCallback((code: string) => {
    const element = document.getElementById(`kbd-${code}`);
    if (element && code !== "ShiftLeft" && code !== "ShiftRight" && code !== "CapsLock") {
      element.setAttribute("data-pressed", "false");
    }

    if (code === "ShiftLeft" || code === "ShiftRight" || code === "CapsLock") {
      playSound("up", code);
      return;
    }

    setPressedKeys((prev) => {
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
    setErrorKeys((prev) => {
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
    playSound("up", code);
  }, [playSound]);

  const applyPreset = async (presetType: 'speed' | 'legal' | 'medical' | 'story') => {
      if (isGenerating) return;

      let targetCategory = "General & Narrative";
      let targetDifficulty = "intermediate";
      let targetLength = "short";

      if (presetType === 'speed') {
          setTitle("1 Min Speed Sprint");
          setDurationLimit("1");
          setIsStrictModeEnabled(true);
          setStrictMinAccuracy("95");
          targetLength = "short";
          targetDifficulty = "advanced";
          targetCategory = "General & Narrative";
      } else if (presetType === 'legal') {
          setTitle("Legal Document Drill");
          setDurationLimit("");
          setIsStrictModeEnabled(true);
          setStrictMinAccuracy("98");
          targetLength = "medium";
          targetDifficulty = "professional";
          targetCategory = "Legal & Court Matters";
      } else if (presetType === 'medical') {
          setTitle("Medical Journal Outline");
          setDurationLimit("");
          setIsStrictModeEnabled(false);
          targetLength = "medium";
          targetDifficulty = "professional";
          targetCategory = "Medical & Healthcare";
      } else if (presetType === 'story') {
          setTitle("Story Snippet Practice");
          setDurationLimit("");
          setIsStrictModeEnabled(false);
          targetLength = "medium";
          targetDifficulty = "intermediate";
          targetCategory = "General & Narrative";
      }

      setAiCategory(targetCategory);
      setAiDifficulty(targetDifficulty);
      setAiLength(targetLength);

      setIsGenerating(true);
      setGenerateError("");
      try {
        const response = await fetch("/api/generate-practice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ category: targetCategory, difficulty: targetDifficulty, length: targetLength }),
        });

        let data;
        try {
          data = await response.json();
        } catch (jsonErr) {
          throw new Error(`Server returned an invalid response (${response.status}).`);
        }

        if (response.ok && data.text) {
          setText(data.text);
        } else {
          setGenerateError(data.error || data.details || "Failed to generate text. Please try again.");
        }
      } catch (error) {
        setGenerateError("Network error. Please try again.");
      } finally {
        setIsGenerating(false);
      }
  };


  const errorIndices = React.useMemo(() => {
    // Refined heuristic: mark every backspace (shrinking snapshot) and every
    // content mismatch relative to the final typed result as a "mistake" moment.
    if (replayLog.length > 0) {
      const indices: number[] = [];
      for (let i = 1; i < replayLog.length; i++) {
        const prev = replayLog[i - 1].s;
        const curr = replayLog[i].s;

        if (curr.length < prev.length) {
          indices.push(i);
          continue;
        }

        for (let j = 0; j < curr.length; j++) {
          if (curr[j] !== typedText[j]) {
            indices.push(i);
            break;
          }
        }
      }
      return indices;
    }

    if (sessionErrorIndices.length > 0) return sessionErrorIndices;
    const indices: number[] = [];
    for (let i = 0; i < typedText.length; i++) {
        const target = originalText[i];
        const typed = typedText[i];
        if (target !== typed) {
          indices.push(i);
        }
    }
    return indices;
  }, [typedText, originalText, sessionErrorIndices, replayLog]);

  useEffect(() => {
     if (step === 3 && typedText.length > 0 && !hasInitializedReplay.current) {
       setReplayIndex(0);
       hasInitializedReplay.current = true;
     }
  }, [step, typedText.length]);

  useEffect(() => {
    if (!isPlayingReplay) return;

    const maxIndex = replayLog.length > 0 ? replayLog.length : typedText.length;
    if (replayIndex >= maxIndex) {
       setIsPlayingReplay(false);
       return;
    }

    let delay = 50 / replaySpeed;

    if (replayLog.length > 1 && replayIndex < replayLog.length - 1) {
       // 1:1 time-accurate playback using real session timestamps
       const current = replayLog[replayIndex];
       const next = replayLog[replayIndex + 1];
       const diff = next.t - current.t;
       delay = Math.min(2000, Math.max(10, diff)) / replaySpeed;
    } else if (replayLog.length === 0) {
       delay = Math.max(10, (1000 * elapsedTime / Math.max(typedText.length, 1)) / replaySpeed);
    }

    const timeoutId = setTimeout(() => {
       setReplayIndex(prev => Math.min(prev + 1, maxIndex));
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [isPlayingReplay, typedText.length, elapsedTime, replaySpeed, replayIndex, replayLog]);

  useEffect(() => {
    if (showReplayOverlay && activeReplayCharRef.current && replayContainerRef.current) {
        const container = replayContainerRef.current;
        const activeChar = activeReplayCharRef.current;
        const containerH = container.clientHeight;
        const charRelTop = activeChar.offsetTop - container.scrollTop;

        if (charRelTop < containerH * 0.25 || charRelTop > containerH * 0.65) {
          const targetScrollTop = activeChar.offsetTop - containerH * 0.4;
          container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
        }
    }
  }, [replayIndex, showReplayOverlay]);

  const liveReplayWpm = useMemo(() => {
    if (!replayLog || replayLog.length < 2 || replayIndex === 0) return 0;
    const rt = replayLog.length > 0
      ? (replayIndex > 0 ? replayLog[Math.min(replayIndex - 1, replayLog.length - 1)].s : "")
      : typedText.substring(0, replayIndex);
    const firstT = replayLog[0].t;
    const currentT = replayLog[Math.min(replayIndex, replayLog.length - 1)]?.t ?? 0;
    const elapsedMin = Math.max(0.001, currentT / 60000);
    return Math.round((rt.length / 5) / elapsedMin);
  }, [replayLog, replayIndex, typedText]);

  const liveReplayAccuracy = useMemo(() => {
    const rt = replayLog.length > 0
      ? (replayIndex > 0 ? replayLog[Math.min(replayIndex - 1, replayLog.length - 1)].s : "")
      : typedText.substring(0, replayIndex);
    if (rt.length === 0) return 100;
    const correct = rt.split("").filter((c, i) => c === (originalChars[i] || "")).length;
    return Math.round((correct / rt.length) * 100);
  }, [replayLog, replayIndex, typedText, originalChars]);

  if (step === 1) {
    return (
      <div className={`flex-1 flex flex-col overflow-y-auto p-4 sm:p-8 w-full transition-all duration-200 ${isTransitioning ? "opacity-0 translate-y-3 scale-98" : "opacity-100 translate-y-0 scale-100 animate-in fade-in duration-300 pointer-events-auto"}`}>
           <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto w-full mt-2 transition-all">
              <div className="flex items-center justify-between mb-6 xl:mb-8">
                <button
                  onClick={onReturnToWrite}
                  className="flex items-center gap-2 text-[13px] font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors rounded-md px-2 py-1 -ml-2 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <ArrowLeft className="w-4 h-4" /> Return to Editor
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                 <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="bg-white dark:bg-[#1c1c1c] border border-black/10 dark:border-white/10 shadow-sm rounded-xl overflow-hidden flex-1 flex flex-col min-h-[460px]">
                        <div className="flex-1 flex flex-col">
                          <div className="p-5 border-b border-black/5 dark:border-white/5 bg-neutral-50/50 dark:bg-white/[0.02]">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                                  Configure Session
                                </h2>
                                <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1">
                                  Setup your practice material or generate with AI.
                                </p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <button
                                  onClick={() => setIsAiModalOpen(true)}
                                  className="px-4 py-2 text-[13px] font-medium rounded-md transition-all bg-white dark:bg-[#333] text-neutral-900 dark:text-white shadow-sm border border-black/10 dark:border-white/10 hover:border-blue-500/50 flex items-center gap-2 group"
                                >
                                  <Sparkles className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" /> AI Generation
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="p-6 space-y-6 flex-1 flex flex-col">
                            <div>
                              <label className="block text-[13px] font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                Session Title (Optional)
                              </label>
                              <SmoothInput
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Speed Drill 1"
                                className="w-full bg-transparent border border-black/20 dark:border-white/20 rounded-md px-4 py-2 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                              />
                            </div>

                            <div className="flex-1 flex flex-col h-full">
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                                  Reference Text
                                </label>
                                <span className="text-[12px] text-neutral-500">{text.split(/\s+/).filter(Boolean).length} words</span>
                              </div>
                              <div className="relative flex-1 flex flex-col">
                                <SmoothTextarea
                                  value={text}
                                  onChange={(e) => setText(e.target.value)}
                                  placeholder="Paste the text you want to use for practice..."
                                  className="w-full flex-1 min-h-[140px] bg-transparent border border-black/20 dark:border-white/20 rounded-md px-4 py-3 text-[14px] xl:text-[16px] leading-relaxed focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                                />
                                {isGenerating && (
                                  <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[2px] flex items-center justify-center rounded-md border border-transparent z-10 animate-in fade-in">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                  </div>
                                )}
                              </div>
                              {generateError && (
                                <div className="mt-2 p-2.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-md text-[13px]">
                                  <div className="flex items-start gap-2">
                                    <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <p>{generateError}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="p-4 border-t border-black/5 dark:border-white/5 bg-neutral-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                             <div className="flex items-center gap-1">
                               <button
                                 onClick={() => setIsAdvModalOpen(true)}
                                 title="Advanced Config"
                                 className={`p-2.5 transition-all duration-300 rounded hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-500 dark:text-neutral-400`}
                               >
                                   <SlidersHorizontal className="w-4 h-4" />
                               </button>
                               <button
                                 onClick={() => setIsTimerModalOpen(true)} style={durationLimit ? { color: themeAccentColor } : {}}
                                 title={durationLimit ? `Timer: ${durationLimit}m` : 'Set Timer'}
                                 className={`p-2.5 transition-all duration-300 rounded hover:bg-neutral-100 dark:hover:bg-white/5 ${durationLimit ? 'text-blue-500 dark:text-blue-400' : 'text-neutral-500 dark:text-neutral-400'}`}
                               >
                                   <Hourglass className="w-4 h-4" />
                               </button>
                               <button
                                 onClick={() => setIsStrictModeModalOpen(true)}
                                 title={isStrictModeEnabled ? 'Strict Mode: ON' : 'Strict Mode: OFF'}
                                 className={`p-2.5 transition-all duration-300 rounded hover:bg-neutral-100 dark:hover:bg-white/5 ${isStrictModeEnabled ? 'text-red-500 dark:text-red-400' : 'text-neutral-500 dark:text-neutral-400'}`}
                               >
                                   <Lock className="w-4 h-4" />
                               </button>
                             </div>
                             <button
                               onClick={handleStartTest}
                               className="px-6 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-medium transition-colors shadow-sm flex items-center gap-2"
                             >
                               <Play className="w-4 h-4 fill-white flex-shrink-0" /> Start Practice
                             </button>
                          </div>
                        </div>
                    </div>
                 </div>

                 {/* Side Section */}
                 <div className="lg:col-span-1 flex flex-col gap-6">
                    {/* Quick Starts */}
                    <div className="bg-white dark:bg-[#1c1c1c] border border-black/10 dark:border-white/10 shadow-sm rounded-xl overflow-hidden">
                       <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center gap-2 bg-neutral-50/50 dark:bg-white/[0.02]">
                         <Zap className="w-4 h-4 text-amber-500" />
                         <span className="text-[13px] font-semibold text-neutral-900 dark:text-white">Quick Presets</span>
                       </div>
                       <div className="p-3 pb-4 space-y-2">
                         <button onClick={() => applyPreset('speed')} disabled={isGenerating} className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-neutral-50 dark:hover:bg-[#252525] group transition-colors disabled:opacity-50">
                           <div className="p-2 rounded-md bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:scale-105 transition-transform flex-shrink-0">
                             <FastForward className="w-4 h-4" />
                           </div>
                           <div>
                             <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">1 Min Speed Sprint <Sparkles className="inline-block w-3 h-3 text-blue-500 mb-0.5" /></p>
                             <p className="text-[11px] text-neutral-500">60s timed • Strict mode • 95% min acc</p>
                           </div>
                         </button>
                         <button onClick={() => applyPreset('legal')} disabled={isGenerating} className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-neutral-50 dark:hover:bg-[#252525] group transition-colors disabled:opacity-50">
                           <div className="p-2 rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 group-hover:scale-105 transition-transform flex-shrink-0">
                             <FileText className="w-4 h-4" />
                           </div>
                           <div>
                             <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">Legal Document <Sparkles className="inline-block w-3 h-3 text-blue-500 mb-0.5" /></p>
                             <p className="text-[11px] text-neutral-500">Professional • Strict mode • 98% min acc</p>
                           </div>
                         </button>
                         <button onClick={() => applyPreset('medical')} disabled={isGenerating} className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-neutral-50 dark:hover:bg-[#252525] group transition-colors disabled:opacity-50">
                           <div className="p-2 rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 group-hover:scale-105 transition-transform flex-shrink-0">
                             <HeartPulse className="w-4 h-4" />
                           </div>
                           <div>
                             <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">Medical Journal <Sparkles className="inline-block w-3 h-3 text-blue-500 mb-0.5" /></p>
                             <p className="text-[11px] text-neutral-500">Complex terms • Standard rules</p>
                           </div>
                         </button>
                         <button onClick={() => applyPreset('story')} disabled={isGenerating} className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-neutral-50 dark:hover:bg-[#252525] group transition-colors disabled:opacity-50">
                           <div className="p-2 rounded-md bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 group-hover:scale-105 transition-transform flex-shrink-0">
                             <BookOpen className="w-4 h-4" />
                           </div>
                           <div>
                             <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">Story Snippet <Sparkles className="inline-block w-3 h-3 text-blue-500 mb-0.5" /></p>
                             <p className="text-[11px] text-neutral-500">Narrative flow and rhythm</p>
                           </div>
                         </button>
                       </div>
                    </div>

                    {/* Stats Box placeholder */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/10 dark:to-blue-900/10 border border-indigo-100 dark:border-indigo-500/20 shadow-sm rounded-xl overflow-hidden p-6 relative">
                       <div className="absolute -right-4 -top-4 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                         <Trophy className="w-32 h-32" />
                       </div>
                       <div className="flex items-center gap-2 mb-4">
                         <Trophy className="w-4 h-4 text-indigo-500" />
                         <span className="text-[13px] font-semibold text-indigo-900 dark:text-indigo-400">Personal Best</span>
                         {personalBest.tests === 0 && (
                           <span className="ml-auto text-[10px] uppercase font-bold tracking-wider text-indigo-400/70 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 rounded-full">New</span>
                         )}
                       </div>

                       <div className="space-y-4">
                         <div>
                            <p className="text-[11px] text-indigo-600/70 dark:text-indigo-400/60 uppercase font-medium tracking-wide mb-1">Highest WPM</p>
                            <p className="text-3xl font-bold text-indigo-950 dark:text-indigo-100 tracking-tight">{personalBest.wpm > 0 ? personalBest.wpm : "--"}</p>
                         </div>
                         <div className="flex gap-4 border-t border-indigo-100 dark:border-indigo-500/20 pt-4">
                            <div>
                               <p className="text-[11px] text-indigo-600/70 dark:text-indigo-400/60 uppercase font-medium tracking-wide mb-1">Acc Avg</p>
                               <p className="text-[16px] font-bold text-indigo-900 dark:text-indigo-200">{personalBest.tests > 0 ? `${personalBest.acc}%` : "-- %"}</p>
                            </div>
                            <div className="ml-auto pr-4">
                               <p className="text-[11px] text-indigo-600/70 dark:text-indigo-400/60 uppercase font-medium tracking-wide mb-1">Tests Done</p>
                               <p className="text-[16px] font-bold text-indigo-900 dark:text-indigo-200">{personalBest.tests}</p>
                            </div>
                         </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        {/* AI Generation Modal */}
        {isAiModalOpen && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/25 dark:bg-black/40 backdrop-blur-[6px] animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ "--accent-color": themeAccentColor } as React.CSSProperties}
              className="flex flex-col bg-[#FCF5F3] dark:bg-[#20202A] rounded-xl shadow-[0_24px_54px_rgba(0,0,0,0.25)] overflow-hidden max-w-[460px] w-full border border-black/5 dark:border-white/10 font-sans"
            >
              {/* Title Bar Context */}
              <div className="h-[38px] flex items-center justify-between pl-4 pr-0 shrink-0 select-none bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                 <div className="flex items-center gap-2.5 text-[#1E1E1E] dark:text-[#EAEAEA]">
                   <Sparkles className="w-4 h-4 text-blue-500" />
                   <span className="text-[12px] font-medium tracking-wide">AI Text Generator</span>
                 </div>
                 <div className="flex items-center h-full">
                   <button onClick={() => setIsAiModalOpen(false)} className="h-full px-4 hover:bg-[#E81123] hover:text-white text-[#1E1E1E] dark:text-[#EAEAEA] transition-colors">
                     <X className="w-4 h-4"/>
                   </button>
                 </div>
              </div>

              {/* Config Content */}
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 font-semibold mb-2">
                    Domain Category
                  </label>
                  <div className="relative">
                    <select
                      value={aiCategory}
                      onChange={(e) => setAiCategory(e.target.value)}
                      className="w-full bg-[#F5EBE9] dark:bg-[#2A2A35]/50 border-none rounded-lg px-4 py-2.5 text-[14px] font-medium text-[#1E1E1E] dark:text-[#EAEAEA] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-colors appearance-none pr-10 cursor-pointer"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat} className="bg-[#FCF5F3] dark:bg-[#20202A]">{cat}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#1E1E1E]/40 dark:text-[#EAEAEA]/30">
                      <Settings2 className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 font-semibold mb-2">
                      Difficulty Level
                    </label>
                    <div className="relative">
                      <select
                        value={aiDifficulty}
                        onChange={(e) => setAiDifficulty(e.target.value)}
                        className="w-full bg-[#F5EBE9] dark:bg-[#2A2A35]/50 border-none rounded-lg px-4 py-2.5 text-[14px] font-medium text-[#1E1E1E] dark:text-[#EAEAEA] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-colors appearance-none pr-10 cursor-pointer"
                      >
                        <option value="beginner" className="bg-[#FCF5F3] dark:bg-[#20202A]">Beginner (&lt;60 WPM)</option>
                        <option value="intermediate" className="bg-[#FCF5F3] dark:bg-[#20202A]">Intermediate (60-90 WPM)</option>
                        <option value="advanced" className="bg-[#FCF5F3] dark:bg-[#20202A]">Advanced (90-120 WPM)</option>
                        <option value="professional" className="bg-[#FCF5F3] dark:bg-[#20202A]">Professional (120+ WPM)</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#1E1E1E]/40 dark:text-[#EAEAEA]/30">
                        <Settings2 className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 font-semibold mb-2">
                      Practice Length
                    </label>
                    <div className="relative">
                      <select
                        value={aiLength}
                        onChange={(e) => setAiLength(e.target.value)}
                        className="w-full bg-[#F5EBE9] dark:bg-[#2A2A35]/50 border-none rounded-lg px-4 py-2.5 text-[14px] font-medium text-[#1E1E1E] dark:text-[#EAEAEA] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-colors appearance-none pr-10 cursor-pointer"
                      >
                        <option value="short" className="bg-[#FCF5F3] dark:bg-[#20202A]">Short ~200 words</option>
                        <option value="medium" className="bg-[#FCF5F3] dark:bg-[#20202A]">Medium ~400 words</option>
                        <option value="long" className="bg-[#FCF5F3] dark:bg-[#20202A]">Long ~800 words</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#1E1E1E]/40 dark:text-[#EAEAEA]/30">
                        <Settings2 className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {generateError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[13px] text-red-600 dark:text-red-400">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p>{generateError}</p>
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-black/5 dark:border-white/5">
                  <button
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-5 py-2 rounded-lg text-[14px] font-medium bg-transparent text-[#1E1E1E]/70 dark:text-[#EAEAEA]/70 hover:text-[#1E1E1E] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="flex items-center justify-center px-6 py-2 rounded-lg text-white text-[14px] font-medium transition-all active:scale-95 shadow-md hover:opacity-90 min-w-[140px]"
                    style={{ backgroundColor: themeAccentColor }}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {isGenerating ? "Generating..." : "Generate Text"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
        {/* Advanced Config Modal */}
        {isAdvModalOpen && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/25 dark:bg-black/40 backdrop-blur-[6px] animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ "--accent-color": themeAccentColor } as React.CSSProperties}
              className="flex flex-col bg-[#F3F3F3] dark:bg-[#202020] rounded-lg shadow-[0_24px_54px_rgba(0,0,0,0.25)] overflow-hidden w-[400px] h-auto max-w-full max-h-[90vh] border border-black/5 dark:border-white/10 font-sans text-[#202020] dark:text-[#EAEAEA] justify-between"
            >
              {/* Title Bar Context */}
              <div className="h-[38px] flex items-center justify-between pl-4 pr-0 shrink-0 select-none bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                 <div className="flex items-center gap-2.5">
                   <SlidersHorizontal className="w-4 h-4" />
                   <span className="text-[12px] font-medium tracking-wide">Test Options</span>
                 </div>
                 <div className="flex items-center h-full">
                    <button onClick={() => setIsAdvModalOpen(false)} className="h-full px-4 hover:bg-[#E81123] hover:text-white transition-colors">
                      <X className="w-4 h-4"/>
                    </button>
                 </div>
              </div>

              {/* Config Content */}
              <div className="p-5 pb-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar space-y-5">
                 {/* Mode Selection */}
                 <div className="flex flex-col gap-1.5">
                   <label className="text-[13px] pl-0.5">Test Mode</label>
                   <div className="relative">
                      <select
                        value={advMode}
                        onChange={e => {
                          setAdvMode(e.target.value as any);
                          if (e.target.value !== 'words') setIsCustomWordActive(false);
                        }}
                        className="w-full appearance-none bg-white dark:bg-[#2A2A35] border border-[#E5DCDA] dark:border-[#1A1A23] rounded-md px-3 py-1.5 text-[13px] outline-none shadow-sm focus:border-[var(--accent-color)]"
                      >
                        <option value="words">Words</option>
                        <option value="quote">Quote</option>
                        <option value="zen">Zen</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                   </div>
                 </div>

                 {/* Words Count Presets */}
                 {advMode === 'words' && (
                   <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-150">
                     <label className="text-[13px] pl-0.5">Word Limit</label>
                     <div className="flex gap-2 items-center">
                       <div className="relative flex-1">
                          <select
                            value={isCustomWordActive ? "custom" : advWordCount}
                            onChange={e => {
                              if (e.target.value === "custom") {
                                setIsCustomWordActive(true);
                              } else {
                                setIsCustomWordActive(false);
                                setAdvWordCount(Number(e.target.value));
                              }
                            }}
                            className="w-full appearance-none bg-white dark:bg-[#2A2A35] border border-[#E5DCDA] dark:border-[#1A1A23] rounded-md px-3 py-1.5 text-[13px] outline-none shadow-sm focus:border-[var(--accent-color)]"
                          >
                            <option value="10">10 words</option>
                            <option value="25">25 words</option>
                            <option value="50">50 words</option>
                            <option value="100">100 words</option>
                            <option value="custom">Custom...</option>
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                       </div>

                       {isCustomWordActive && (
                         <div className="w-[100px] relative animate-in zoom-in-95 duration-150">
                           <input
                             type="number"
                             min="5"
                             max="250"
                             value={customWordCount}
                             onChange={(e) => setCustomWordCount(e.target.value)}
                             className="w-full bg-white dark:bg-[#2A2A35] border border-[#E5DCDA] dark:border-[#1A1A23] rounded-md px-3 py-1.5 text-[13px] outline-none shadow-sm focus:border-[var(--accent-color)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                             placeholder="5-250"
                           />
                         </div>
                       )}
                     </div>
                   </div>
                 )}

                 {/* Modifiers (Checkboxes) */}
                 <div className="flex flex-col gap-2 pt-1">
                   <label className="text-[13px] pl-0.5 font-medium mb-1">Modifiers</label>
                   <div className="flex flex-col gap-3 pl-1">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center transition-colors ${
                          advPunct
                            ? 'bg-[var(--accent-color)] border-[var(--accent-color)]'
                            : 'bg-white dark:bg-[#2A2A35] border-gray-300 dark:border-gray-500 group-hover:border-gray-400'
                        }`} style={advPunct ? { backgroundColor: themeAccentColor, borderColor: themeAccentColor } : {}}>
                          {advPunct && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className="text-[13px]">Include Punctuation</span>
                        {/* Hidden input to handle click logic natively */}
                        <input type="checkbox" className="hidden" checked={advPunct} onChange={() => setAdvPunct(!advPunct)} />
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center transition-colors ${
                          advNums
                            ? 'bg-[var(--accent-color)] border-[var(--accent-color)]'
                            : 'bg-white dark:bg-[#2A2A35] border-gray-300 dark:border-gray-500 group-hover:border-gray-400'
                        }`} style={advNums ? { backgroundColor: themeAccentColor, borderColor: themeAccentColor } : {}}>
                          {advNums && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className="text-[13px]">Include Numbers</span>
                        <input type="checkbox" className="hidden" checked={advNums} onChange={() => setAdvNums(!advNums)} />
                      </label>
                   </div>
                 </div>

                 {/* Difficulty */}
                 <div className="flex flex-col gap-1.5 pt-2">
                   <label className="text-[13px] pl-0.5 font-medium">Difficulty</label>
                   <div className="relative">
                      <select
                        value={advDiff}
                        onChange={e => setAdvDiff(e.target.value as any)}
                        className="w-full appearance-none bg-white dark:bg-[#2A2A35] border border-[#E5DCDA] dark:border-[#1A1A23] rounded-md px-3 py-1.5 text-[13px] outline-none shadow-sm focus:border-[var(--accent-color)]"
                      >
                        <option value="easy">Normal</option>
                        <option value="hard">Hard (Strict Accuracy)</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                   </div>
                 </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2.5 px-5 py-3.5 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/5 dark:border-white/5">
                <button
                  onClick={() => setIsAdvModalOpen(false)}
                  className="px-5 py-1.5 rounded text-[13px] font-medium transition-colors border shadow-sm dark:shadow-none hover:bg-neutral-50 dark:hover:bg-white/10 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#2A2A35]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setIsAdvModalOpen(false)}
                  className="px-6 py-1.5 rounded text-[13px] font-medium transition-all shadow-sm active:scale-95 text-white cursor-pointer"
                  style={{ backgroundColor: themeAccentColor }}
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        {/* Timer Config Modal */}
        {isTimerModalOpen && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/25 dark:bg-black/40 backdrop-blur-[6px] animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ "--accent-color": themeAccentColor } as React.CSSProperties}
              className="flex flex-col bg-[#FCF5F3] dark:bg-[#20202A] rounded-xl shadow-[0_24px_54px_rgba(0,0,0,0.25)] overflow-hidden w-[460px] max-w-full max-h-[90vh] border border-black/5 dark:border-white/10 font-sans justify-between"
            >
              {/* Title Bar Context */}
              <div className="h-[38px] flex items-center justify-between pl-4 pr-0 shrink-0 select-none bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                 <div className="flex items-center gap-2.5 text-[#1E1E1E] dark:text-[#EAEAEA]">
                   <Hourglass className="w-4 h-4" />
                   <span className="text-[12px] font-medium tracking-wide">Configure Timer</span>
                 </div>
                 <div className="flex items-center h-full">
                   <button onClick={() => setIsTimerModalOpen(false)} className="h-full px-4 hover:bg-[#E81123] hover:text-white text-[#1E1E1E] dark:text-[#EAEAEA] transition-colors">
                     <X className="w-4 h-4"/>
                   </button>
                 </div>
              </div>

              {/* Config Content */}
              <div className="p-6 flex-1 flex flex-col justify-between overflow-hidden space-y-4">
                <p className="text-[12px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 font-sans text-center">
                  Configure precise duration goals. Scroll over the boxes or press up/down keys to dial in.
                </p>

                {/* HH : MM : SS . MS Adjustable Row */}
                <div className="flex items-center justify-center gap-2 font-mono text-center select-none py-4 relative">
                  {/* Hours */}
                  <div className="flex flex-col items-center">
                    <SmoothInput
                      type="number"
                      value={timerHrs}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                        setTimerHrs(val);
                        updateDurationFromInputs(val, timerMins, timerSecs, timerMs);
                      }}
                      onWheel={(e) => {
                        e.preventDefault();
                        const step = e.deltaY < 0 ? 1 : -1;
                        const val = Math.max(0, Math.min(23, timerHrs + step));
                        setTimerHrs(val);
                        updateDurationFromInputs(val, timerMins, timerSecs, timerMs);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          const val = Math.max(0, Math.min(23, timerHrs + 1));
                          setTimerHrs(val);
                          updateDurationFromInputs(val, timerMins, timerSecs, timerMs);
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          const val = Math.max(0, Math.min(23, timerHrs - 1));
                          setTimerHrs(val);
                          updateDurationFromInputs(val, timerMins, timerSecs, timerMs);
                        }
                      }}
                      className="w-14 h-14 bg-[#F5EBE9] dark:bg-[#2A2A35]/50 border-none rounded-xl text-2xl font-medium font-sans tracking-tight text-[#1E1E1E] dark:text-[#EAEAEA] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[10px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 uppercase font-semibold tracking-wider mt-2.5">Hours</span>
                  </div>

                  <div className="text-xl font-light text-[#1E1E1E]/30 dark:text-[#EAEAEA]/20 pointer-events-none mb-6">:</div>

                  {/* Minutes */}
                  <div className="flex flex-col items-center">
                    <SmoothInput
                      type="number"
                      value={timerMins}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                        setTimerMins(val);
                        updateDurationFromInputs(timerHrs, val, timerSecs, timerMs);
                      }}
                      onWheel={(e) => {
                        e.preventDefault();
                        const step = e.deltaY < 0 ? 1 : -1;
                        const val = Math.max(0, Math.min(59, timerMins + step));
                        setTimerMins(val);
                        updateDurationFromInputs(timerHrs, val, timerSecs, timerMs);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          const val = Math.max(0, Math.min(59, timerMins + 1));
                          setTimerMins(val);
                          updateDurationFromInputs(timerHrs, val, timerSecs, timerMs);
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          const val = Math.max(0, Math.min(59, timerMins - 1));
                          setTimerMins(val);
                          updateDurationFromInputs(timerHrs, val, timerSecs, timerMs);
                        }
                      }}
                      className="w-14 h-14 bg-[#F5EBE9] dark:bg-[#2A2A35]/50 border-none rounded-xl text-2xl font-medium font-sans tracking-tight text-[#1E1E1E] dark:text-[#EAEAEA] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[10px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 uppercase font-semibold tracking-wider mt-2.5">Mins</span>
                  </div>

                  <div className="text-xl font-light text-[#1E1E1E]/30 dark:text-[#EAEAEA]/20 pointer-events-none mb-6">:</div>

                  {/* Seconds */}
                  <div className="flex flex-col items-center">
                    <SmoothInput
                      type="number"
                      value={timerSecs}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                        setTimerSecs(val);
                        updateDurationFromInputs(timerHrs, timerMins, val, timerMs);
                      }}
                      onWheel={(e) => {
                        e.preventDefault();
                        const step = e.deltaY < 0 ? 1 : -1;
                        const val = Math.max(0, Math.min(59, timerSecs + step));
                        setTimerSecs(val);
                        updateDurationFromInputs(timerHrs, timerMins, val, timerMs);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          const val = Math.max(0, Math.min(59, timerSecs + 1));
                          setTimerSecs(val);
                          updateDurationFromInputs(timerHrs, timerMins, val, timerMs);
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          const val = Math.max(0, Math.min(59, timerSecs - 1));
                          setTimerSecs(val);
                          updateDurationFromInputs(timerHrs, timerMins, val, timerMs);
                        }
                      }}
                      className="w-14 h-14 bg-[#F5EBE9] dark:bg-[#2A2A35]/50 border-none rounded-xl text-2xl font-medium font-sans tracking-tight text-[#1E1E1E] dark:text-[#EAEAEA] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[10px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 uppercase font-semibold tracking-wider mt-2.5">Secs</span>
                  </div>

                  <div className="text-xl font-light text-[#1E1E1E]/30 dark:text-[#EAEAEA]/20 pointer-events-none mb-6">.</div>

                  {/* Milliseconds */}
                  <div className="flex flex-col items-center">
                    <SmoothInput
                      type="number"
                      value={timerMs}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(999, parseInt(e.target.value) || 0));
                        setTimerMs(val);
                        updateDurationFromInputs(timerHrs, timerMins, timerSecs, val);
                      }}
                      onWheel={(e) => {
                        e.preventDefault();
                        const step = e.deltaY < 0 ? 50 : -50;
                        const val = Math.max(0, Math.min(999, timerMs + step));
                        setTimerMs(val);
                        updateDurationFromInputs(timerHrs, timerMins, timerSecs, val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          const val = Math.max(0, Math.min(999, timerMs + 10));
                          setTimerMs(val);
                          updateDurationFromInputs(timerHrs, timerMins, timerSecs, val);
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          const val = Math.max(0, Math.min(999, timerMs - 10));
                          setTimerMs(val);
                          updateDurationFromInputs(timerHrs, timerMins, timerSecs, val);
                        }
                      }}
                      className="w-20 h-14 bg-[#F5EBE9] dark:bg-[#2A2A35]/50 border-none rounded-xl text-2xl font-medium font-sans tracking-tight text-[#1E1E1E] dark:text-[#EAEAEA] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[10px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 uppercase font-semibold tracking-wider mt-2.5">Millis</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-3">
                  <span className="text-[11px] uppercase tracking-wider text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 font-semibold block">Quick Presets</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 30, 45, 60].map((m) => {
                      const isSelected = durationLimit === m.toString();
                      return (
                        <button
                          key={m}
                          onClick={() => setDurationLimit(m.toString())}
                          className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? "text-white shadow-md transform scale-[1.02]"
                              : "bg-[#F5EBE9] dark:bg-[#2A2A35]/50 text-[#1E1E1E]/80 dark:text-[#EAEAEA]/80 hover:bg-[#EAE0DE] dark:hover:bg-[#2A2A35]"
                          }`}
                          style={isSelected ? { backgroundColor: themeAccentColor } : {}}
                        >
                          {m}m
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-center text-[11px] text-[#1E1E1E]/40 dark:text-[#EAEAEA]/30 mt-2">
                  💡 Hover & scroll mouse wheel or use Up/Down keys inside boxes to adjust values instantly.
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2 p-6 border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                <button
                  onClick={() => {
                    setDurationLimit("");
                    setIsTimerModalOpen(false);
                  }}
                  className="px-5 py-2 rounded-lg text-[14px] font-medium bg-transparent text-[#1E1E1E]/70 dark:text-[#EAEAEA]/70 hover:text-[#1E1E1E] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  Clear Time
                </button>
                <button
                  onClick={() => setIsTimerModalOpen(false)}
                  className="flex items-center justify-center px-6 py-2 rounded-lg text-white text-[14px] font-medium transition-all active:scale-95 shadow-md hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: themeAccentColor }}
                >
                  Apply Timer
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        {/* Strict Parameters Modal */}
        {isStrictModeModalOpen && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/25 dark:bg-black/40 backdrop-blur-[6px] animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ "--accent-color": themeAccentColor } as React.CSSProperties}
              className="flex flex-col bg-[#FCF5F3] dark:bg-[#20202A] rounded-xl shadow-[0_24px_54px_rgba(0,0,0,0.25)] overflow-hidden w-[460px] h-[460px] max-w-full max-h-[90vh] border border-black/5 dark:border-white/10 font-sans text-[#1E1E1E] dark:text-[#EAEAEA] justify-between"
            >
              {/* Title Bar Context */}
              <div className="h-[38px] flex items-center justify-between pl-4 pr-0 shrink-0 select-none bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                 <div className="flex items-center gap-2.5 text-[#1E1E1E] dark:text-[#EAEAEA]">
                    <Lock className="w-4 h-4" />
                    <span className="text-[12px] font-medium tracking-wide">Strict Rules Configuration</span>
                 </div>
                 <div className="flex items-center h-full">
                    <button onClick={() => setIsStrictModeModalOpen(false)} className="h-full px-4 hover:bg-[#E81123] hover:text-white text-[#1E1E1E] dark:text-[#EAEAEA] transition-colors">
                      <X className="w-4 h-4"/>
                    </button>
                 </div>
              </div>

              {/* Redesigned Clean Content without heavy background boxes */}
              <div className="p-5 flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar space-y-5">
                {/* Modern Master Toggle */}
                <div
                  className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all shrink-0 ${
                    isStrictModeEnabled
                      ? 'border-[var(--accent-color)]/30 bg-[var(--accent-color)]/5'
                      : 'border-black/5 dark:border-white/5 bg-transparent'
                  }`}
                  onClick={() => setIsStrictModeEnabled(!isStrictModeEnabled)}
                >
                  <div>
                    <h3 className="text-[13.5px] font-bold text-[#1E1E1E] dark:text-white">Strict Rules</h3>
                    <p className="text-[11px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 mt-0.5">Enable extra typing rules to test your skills</p>
                  </div>
                  <div
                    className="shrink-0 w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors duration-200"
                    style={{ backgroundColor: isStrictModeEnabled ? themeAccentColor : "rgba(0,0,0,0.15)" }}
                  >
                    <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-sm transform transition-transform duration-200 ${isStrictModeEnabled ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Sub-parameters List - No heavy boxes, clean separated lines */}
                <div className={`flex-1 flex flex-col space-y-4 transition-all duration-300 ${isStrictModeEnabled ? 'opacity-100' : 'opacity-35 pointer-events-none'}`}>

                  {/* Perfect Run (Sudden Death) */}
                  <div className="flex items-center justify-between py-1 border-b border-black/5 dark:border-white/5 pb-2">
                    <div>
                      <span className="text-[13px] font-bold text-[#1E1E1E] dark:text-white block">Perfect Run</span>
                      <span className="text-[10.5px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 block mt-0.5">Fail instantly if you type even one wrong letter</span>
                    </div>
                    <div
                      onClick={() => isStrictModeEnabled && setStrictSuddenDeath(!strictSuddenDeath)}
                      className="shrink-0 w-8.5 h-4.5 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer"
                      style={{ backgroundColor: strictSuddenDeath ? themeAccentColor : "rgba(0,0,0,0.15)" }}
                    >
                      <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-sm transform transition-transform duration-200 ${strictSuddenDeath ? 'translate-x-[14px]' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  {/* Option 1: Backspace Toggle */}
                  <div className="flex items-center justify-between py-1 border-b border-black/5 dark:border-white/5 pb-2">
                    <div>
                      <span className="text-[13px] font-bold text-[#1E1E1E] dark:text-white block">No Backspace</span>
                      <span className="text-[10.5px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 block mt-0.5">Typos are permanent and cannot be deleted</span>
                    </div>
                    <div
                      onClick={() => isStrictModeEnabled && setStrictDisableBackspace(!strictDisableBackspace)}
                      className="shrink-0 w-8.5 h-4.5 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer"
                      style={{ backgroundColor: strictDisableBackspace ? themeAccentColor : "rgba(0,0,0,0.15)" }}
                    >
                      <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-sm transform transition-transform duration-200 ${strictDisableBackspace ? 'translate-x-[14px]' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  {/* Option 2: Accuracy Limit */}
                  <div className="py-1 border-b border-black/5 dark:border-white/5 pb-2">
                    <div className="flex justify-between items-center mb-1.5">
                      <div>
                        <span className="text-[13px] font-bold text-[#1E1E1E] dark:text-white block">Accuracy Guard</span>
                        <span className="text-[10.5px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 block mt-0.5">Session ends if accuracy drops below target</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                       {['none', '90', '95', '98', 'custom'].map(val => (
                         <button
                           key={val}
                           disabled={!isStrictModeEnabled}
                           onClick={() => setStrictMinAccuracy(val)}
                           style={strictMinAccuracy === val ? { backgroundColor: themeAccentColor } : {}}
                           className={`py-1 text-[11px] font-semibold rounded-lg transition-colors capitalize cursor-pointer ${
                             strictMinAccuracy === val
                               ? 'text-white shadow-sm font-bold'
                               : 'bg-black/5 dark:bg-white/5 text-[#1E1E1E]/70 dark:text-[#EAEAEA]/70 hover:bg-black/10 dark:hover:bg-white/10'
                           }`}
                         >
                            {val === 'none' ? 'Off' : val === 'custom' ? 'Custom' : val + '%'}
                         </button>
                       ))}
                    </div>
                    {strictMinAccuracy === 'custom' && (
                      <div className="flex items-center gap-2 mt-2 animate-in slide-in-from-top-1 duration-150">
                        <span className="text-[11px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40">Set custom accuracy target:</span>
                        <input
                          type="number"
                          min="50"
                          max="100"
                          value={strictCustomAccuracy}
                          onChange={(e) => setStrictCustomAccuracy(e.target.value)}
                          className="w-14 px-1 py-0.5 text-[11px] font-semibold text-center bg-transparent border-b border-black/20 dark:border-white/20 focus:border-[var(--accent-color)] focus:outline-none"
                        />
                        <span className="text-[11px] font-semibold">%</span>
                      </div>
                    )}
                  </div>

                  {/* Option 3: Speed Floor */}
                  <div className="py-1 border-b border-black/5 dark:border-white/5 pb-2">
                    <div className="flex justify-between items-center mb-1.5">
                      <div>
                        <span className="text-[13px] font-bold text-[#1E1E1E] dark:text-white block">Speed Guard</span>
                        <span className="text-[10.5px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 block mt-0.5">Session ends if typing speed falls too low</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                       {['none', '30', '40', '50', 'custom'].map(val => (
                         <button
                           key={val}
                           disabled={!isStrictModeEnabled}
                           onClick={() => setStrictWpmFloor(val)}
                           style={strictWpmFloor === val ? { backgroundColor: themeAccentColor } : {}}
                           className={`py-1 text-[11px] font-semibold rounded-lg transition-colors capitalize cursor-pointer ${
                             strictWpmFloor === val
                               ? 'text-white shadow-sm'
                               : 'bg-black/5 dark:bg-white/5 text-[#1E1E1E]/70 dark:text-[#EAEAEA]/70 hover:bg-black/10 dark:hover:bg-white/10'
                           }`}
                         >
                            {val === 'none' ? 'Off' : val === 'custom' ? 'Custom' : val + ' WPM'}
                         </button>
                       ))}
                    </div>
                    {strictWpmFloor === 'custom' && (
                      <div className="flex items-center gap-2 mt-2 animate-in slide-in-from-top-1 duration-150">
                        <span className="text-[11px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40">Set custom speed target:</span>
                        <input
                          type="number"
                          min="5"
                          max="250"
                          value={strictCustomWpmFloor}
                          onChange={(e) => setStrictCustomWpmFloor(e.target.value)}
                          className="w-14 px-1 py-0.5 text-[11px] font-semibold text-center bg-transparent border-b border-black/20 dark:border-white/20 focus:border-[var(--accent-color)] focus:outline-none"
                        />
                        <span className="text-[11px] font-semibold">WPM</span>
                      </div>
                    )}
                  </div>

                  {/* Option 4: Mistakes Limit */}
                  <div className="py-1 border-b border-black/5 dark:border-white/5 pb-2">
                    <div className="flex justify-between items-center mb-1.5">
                      <div>
                        <span className="text-[13px] font-bold text-[#1E1E1E] dark:text-white block">Mistake Limit</span>
                        <span className="text-[10.5px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 block mt-0.5">Session ends if you make too many errors</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                       {['none', '3', '5', '10', 'custom'].map(val => (
                         <button
                           key={val}
                           disabled={!isStrictModeEnabled}
                           onClick={() => setStrictMaxErrors(val)}
                           style={strictMaxErrors === val ? { backgroundColor: themeAccentColor } : {}}
                           className={`py-1 text-[11px] font-semibold rounded-lg transition-colors capitalize cursor-pointer ${
                             strictMaxErrors === val
                               ? 'text-white shadow-sm'
                               : 'bg-black/5 dark:bg-white/5 text-[#1E1E1E]/70 dark:text-[#EAEAEA]/70 hover:bg-black/10 dark:hover:bg-white/10'
                           }`}
                         >
                            {val === 'none' ? 'Off' : val === 'custom' ? 'Custom' : val}
                         </button>
                       ))}
                    </div>
                    {strictMaxErrors === 'custom' && (
                      <div className="flex items-center gap-2 mt-2 animate-in slide-in-from-top-1 duration-150">
                        <span className="text-[11px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40">Set custom mistakes allowed:</span>
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={strictCustomMaxErrors}
                          onChange={(e) => setStrictCustomMaxErrors(e.target.value)}
                          className="w-14 px-1 py-0.5 text-[11px] font-semibold text-center bg-transparent border-b border-black/20 dark:border-white/20 focus:border-[var(--accent-color)] focus:outline-none"
                        />
                        <span className="text-[11px] font-semibold">mistakes</span>
                      </div>
                    )}
                  </div>

                  {/* Option 5: Inactivity Limit */}
                  <div className="py-1">
                    <div className="flex justify-between items-center mb-1.5">
                      <div>
                        <span className="text-[13px] font-bold text-[#1E1E1E] dark:text-white block">Rest Limit</span>
                        <span className="text-[10.5px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 block mt-0.5">Session ends if you stop typing for too long</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                       {['none', '3', '5', '10', 'custom'].map(val => (
                         <button
                           key={val}
                           disabled={!isStrictModeEnabled}
                           onClick={() => setStrictInactivityTimeout(val)}
                           style={strictInactivityTimeout === val ? { backgroundColor: themeAccentColor } : {}}
                           className={`py-1 text-[11px] font-semibold rounded-lg transition-colors capitalize cursor-pointer ${
                             strictInactivityTimeout === val
                               ? 'text-white shadow-sm font-bold'
                               : 'bg-black/5 dark:bg-white/5 text-[#1E1E1E]/70 dark:text-[#EAEAEA]/70 hover:bg-black/10 dark:hover:bg-white/10'
                           }`}
                         >
                            {val === 'none' ? 'Off' : val === 'custom' ? 'Custom' : val + 's'}
                         </button>
                       ))}
                    </div>
                    {strictInactivityTimeout === 'custom' && (
                      <div className="flex items-center gap-2 mt-2 animate-in slide-in-from-top-1 duration-150">
                        <span className="text-[11px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40">Set custom rest seconds:</span>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={strictCustomInactivity}
                          onChange={(e) => setStrictCustomInactivity(e.target.value)}
                          className="w-14 px-1 py-0.5 text-[11px] font-semibold text-center bg-transparent border-b border-black/20 dark:border-white/20 focus:border-[var(--accent-color)] focus:outline-none"
                        />
                        <span className="text-[11px] font-semibold">seconds</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2 p-5 border-t border-black/5 dark:border-white/5 bg-[#F5EBE9]/50 dark:bg-black/5 shrink-0">
                <button
                  onClick={() => setIsStrictModeModalOpen(false)}
                  className="px-6 py-2 rounded-lg text-white text-[13.5px] font-bold transition-all active:scale-95 shadow-md hover:opacity-90 cursor-pointer w-full text-center"
                  style={{ backgroundColor: themeAccentColor }}
                >
                  Save Rules
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  if (step === 2) {
    return (
       <TypingScreen
          originalText={originalText}
          accentColor={themeAccentColor}
          durationLimit={durationLimit}
          isStrictModeEnabled={isStrictModeEnabled}
          strictSuddenDeath={strictSuddenDeath}
          strictDisableBackspace={strictDisableBackspace}
          strictMinAccuracy={strictMinAccuracy}
          strictCustomAccuracy={strictCustomAccuracy}
          strictWpmFloor={strictWpmFloor}
          strictCustomWpmFloor={strictCustomWpmFloor}
          strictMaxErrors={strictMaxErrors}
          strictCustomMaxErrors={strictCustomMaxErrors}
          strictInactivityTimeout={strictInactivityTimeout}
          strictCustomInactivity={strictCustomInactivity}
          onFinish={(finalWpm, finalAccuracy, elapsedSeconds, finalTypedText, finalWpmHistory, finalReplayLog, finalErrorIndices) => {
             setWpm(finalWpm);
             setAccuracy(finalAccuracy);
             setElapsedTime(elapsedSeconds);
             setTypedText(finalTypedText);
             setReplayLog(finalReplayLog);
              setSessionErrorIndices(finalErrorIndices || []);
             // Our wpmHistory graph logic expects array of objects with wpm properties
             setDetailedHistory(finalWpmHistory.map((val, i) => ({ time: i, wpm: val, rawWpm: val })));
             clearPracticeSession();
             changeStep(3);
             setTimerRunning(false);
          }}
          onBack={() => { clearPracticeSession(); onReturnToWrite(); }}
          onConfigureSession={() => { clearPracticeSession(); changeStep(1); setTimerRunning(false); }}
          onResetCountdowns={() => {}}
          initialSnapshot={pendingSnapshotRef.current}
          onSnapshot={persistTypingSnapshot}
          onSnapshotConsumed={handleSnapshotConsumed}
       />
    );
  }

  if (step === 3) {
    // Advanced Analytics Calculation
    const errorChars = new Map<string, number>();
    for (let i = 0; i < typedText.length; i++) {
        const target = originalText[i];
        const typed = typedText[i];
        if (target !== typed) {
          if (target) {
            errorChars.set(target, (errorChars.get(target) || 0) + 1);
          }
        }
    }

    // problemKeys is read from top-level Memo

    const wpmDelta = personalBest.wpm > 0 ? wpm - personalBest.wpm : 0;
    const accDelta = personalBest.accuracy > 0 ? accuracy - personalBest.accuracy : 0;

    // Grade Calculation Matrix
    let grade = "C";
    let gradeColor = "text-amber-500 shadow-amber-500/20";
    if (wpm >= 100 && accuracy >= 98) {
      grade = "S";
      gradeColor = "text-yellow-400 shadow-yellow-400/30";
    } else if (wpm >= 80 && accuracy >= 95) {
      grade = "A";
      gradeColor = "text-purple-500 shadow-purple-500/30";
    } else if (wpm >= 60 && accuracy >= 90) {
      grade = "B";
      gradeColor = "text-blue-500 shadow-blue-500/30";
    }

    const totalErrors = Array.from(errorChars.values()).reduce((a, b) => a + b, 0);

    let coachMessage = "";
    let coachTitle = "";
    if (accuracy === 100) {
      coachTitle = "Perfect Accuracy";
      coachMessage = "You typed without any errors. Try increasing your speed slightly on your next attempt to challenge yourself.";
    } else if (accuracy >= 95) {
      coachTitle = "Great Precision";
      coachMessage = `Your accuracy is solid. You had some trouble with: ${problemKeys.length > 0 ? problemKeys.map(k=>`[${k}]`).join(', ') : 'a few keys'}. Focus on these to improve further.`;
    } else if (accuracy >= 85) {
      coachTitle = "Focus on Accuracy";
      coachMessage = `Your speed is good, but try slowing down slightly to reduce errors. Specifically on these keys: ${problemKeys.length > 0 ? problemKeys.map(k=>`[${k}]`).join(', ') : ''}.`;
    } else {
      coachTitle = "Too Many Errors";
      coachMessage = `Your accuracy has dropped below the recommended threshold. Slow down and focus entirely on hitting the correct keys. Speed will naturally improve over time.`;
    }

    const wpmColor = wpm > 80 ? 'text-purple-600 dark:text-purple-400' : wpm > 50 ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-900 dark:text-white';
    const wpmBg = wpm > 80 ? 'bg-purple-500' : wpm > 50 ? 'bg-blue-500' : 'bg-neutral-500';    // Derived text for ghost replay
    const replayedText = replayLog.length > 0 
       ? (replayIndex > 0 ? replayLog[Math.min(replayIndex - 1, replayLog.length - 1)].s : "") 
       : typedText.substring(0, replayIndex);

    // Chart Data Generation
    const chartData = detailedHistory.length >= 2
       ? detailedHistory
       : [
           { time: 0, wpm: 0, errors: 0, word: "" },
           { time: Math.floor(elapsedTime || 1), wpm: wpm, errors: 0, word: typedText.trim().split(/\s+/).pop() || "" }
         ];

    // Sparkline configuration
    const effectiveHistory = wpmHistory.length >= 2 ? wpmHistory : [0, wpm];
    const maxWpm = Math.max(...effectiveHistory, 10);
    const minWpm = Math.max(0, Math.min(...effectiveHistory) - 10);
    const wpmRange = Math.max(maxWpm - minWpm, 1);
    const sparklineWidth = 800;
    const sparklineHeight = 70;

    const smoothSparkline = (() => {
      const points = effectiveHistory.map((val, idx) => {
        const x = (idx / (effectiveHistory.length - 1)) * sparklineWidth;
        const y = sparklineHeight - ((val - minWpm) / wpmRange) * sparklineHeight;
        return { x, y };
      });
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cpX1 = p0.x + (p1.x - p0.x) / 3;
        const cpY1 = p0.y;
        const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
        const cpY2 = p1.y;
        d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
      }
      return d;
    })();

    const smoothSparklineArea = `${smoothSparkline} L ${sparklineWidth} ${sparklineHeight} L 0 ${sparklineHeight} Z`;

    const handleGenerateReceipt = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 490;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background warm cafe receipt paper
      ctx.fillStyle = "#FAF8F5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header text
      ctx.font = "bold 13px monospace";
      ctx.fillStyle = "#121212";
      ctx.textAlign = "center";
      ctx.fillText("TYPECAST DRILL LABS", canvas.width / 2, 40);
      ctx.font = "9px monospace";
      ctx.fillText("DRILL RECEIPT / COHESIVE OUT", canvas.width / 2, 56);

      const drawSeparator = (y: number) => {
        ctx.font = "11px monospace";
        ctx.fillText("- - - - - - - - - - - - - - - -", canvas.width / 2, y);
      };

      const drawDoubleSeparator = (y: number) => {
        ctx.font = "11px monospace";
        ctx.fillText("================================", canvas.width / 2, y);
      };

      drawSeparator(72);

      // Table Content
      ctx.font = "11px monospace";
      const startX = 24;
      const endX = canvas.width - 24;

      const drawRow = (label: string, value: string, y: number) => {
        ctx.textAlign = "left";
        ctx.fillText(label, startX, y);
        ctx.textAlign = "right";
        ctx.fillText(value, endX, y);
      };

      let currentY = 96;
      const stampStr = new Date().toISOString().substring(2, 19).replace("T", " ");
      drawRow("TIMESTAMP", stampStr, currentY); currentY += 22;
      drawRow("SESSION TYPE", title.length > 14 ? title.substring(0, 14) + "..." : title, currentY); currentY += 24;

      drawDoubleSeparator(currentY); currentY += 20;

      ctx.font = "bold 12px monospace";
      drawRow("TYPING SPEED", `${wpm} WPM`, currentY); currentY += 22;
      drawRow("ACCURACY", `${accuracy}%`, currentY); currentY += 22;
      drawRow("TIME ELAPSED", `${Math.floor(elapsedTime)}s`, currentY); currentY += 22;

      ctx.font = "9px monospace";
      drawSeparator(currentY); currentY += 18;

      ctx.font = "11px monospace";
      drawRow("TOTAL KEYS", typedText.length.toString(), currentY); currentY += 22;
      drawRow("CORRECT KEYS", (typedText.length - totalErrors).toString(), currentY); currentY += 22;
      drawRow("MISSED KEYS", totalErrors.toString(), currentY); currentY += 22;

      drawDoubleSeparator(currentY); currentY += 22;

      // Draw elegant aesthetic barcode lines
      const barY = currentY;
      const barH = 26;
      ctx.fillStyle = "#121212";
      let cursorX = 60;
      let lineIdx = 0;
      while (cursorX < canvas.width - 60) {
        const thickness = (lineIdx % 3 === 0 ? 3 : lineIdx % 2 === 0 ? 1 : 2);
        ctx.fillRect(cursorX, barY, thickness, barH);
        cursorX += thickness + (lineIdx % 4 === 0 ? 3 : 1);
        lineIdx++;
      }

      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`*WPM-${wpm}_ACC-${accuracy}*`, canvas.width / 2, barY + barH + 11);

      ctx.font = "italic 9px monospace";
      ctx.fillText("Surgical drill state complete.", canvas.width / 2, canvas.height - 34);
      ctx.fillText("* KEEP DRILLING *", canvas.width / 2, canvas.height - 20);

      // Copy png blob
      canvas.toBlob((blob) => {
        if (!blob) return;
        try {
          const item = new ClipboardItem({ "image/png": blob });
          navigator.clipboard.write([item]).then(() => {
            const btn = document.getElementById("copy-receipt-btn");
            if (btn) {
              const originalHTML = btn.innerHTML;
              btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 inline mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> Copied!`;
              setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
            }
          });
        } catch (e) {

          const link = document.createElement("a");
          link.download = `drill_receipt_${wpm}_wpm.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
          const btn = document.getElementById("copy-receipt-btn");
          if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `Saved Receipt!`;
            setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
          }
        }
      }, "image/png");
    };

    const averageWpm = effectiveHistory.reduce((a, b) => a + b, 0) / Math.max(effectiveHistory.length, 1);
    const variance = effectiveHistory.map(x => Math.pow(x - averageWpm, 2)).reduce((a, b) => a + b, 0) / Math.max(effectiveHistory.length, 1);
    const stdDev = Math.sqrt(variance);
    const consistencyScore = Math.max(10, Math.min(100, Math.round(100 - (stdDev / Math.max(1, averageWpm)) * 110)));
    const peakSpeed = Math.max(...effectiveHistory, wpm);
    const hesitationsCount = effectiveHistory.filter((v, idx) => {
      if (idx === 0) return false;
      return v < Math.max(15, averageWpm * 0.65);
    }).length;

    let prescription = "Maintain a rhythmic tempo without rushing high frequency letters.";
    if (problemKeys.length > 0) {
      const topKey = problemKeys[0];
      if (['e', 't', 'a', 'o', 'i', 'n', 's'].includes(topKey.toLowerCase())) {
        prescription = `Focus on key transitions and fluid layout movement for [${problemKeys.slice(0, 3).join(', ')}].`;
      } else if (['q', 'z', 'p', 'x', 'y', 'j', 'k', 'b', 'v', 'c'].includes(topKey.toLowerCase())) {
        prescription = `Slightly slow down when reaching for outer row keys like [${topKey}] to improve accuracy.`;
      } else if (topKey === 'Space') {
        prescription = `Keep a steady thumb rhythm and release pressure on the Spacebar consistently.`;
      } else {
        prescription = `Take your time to practice accurate transitions for [${problemKeys.slice(0, 3).join(', ')}].`;
      }
    }

    const getPerformanceGrade = () => {
      if (accuracy >= 98 && wpm >= 80) return { grade: "S+", color: "text-[#f57644]" };
      if (accuracy >= 96 && wpm >= 60) return { grade: "S", color: "text-emerald-500" };
      if (accuracy >= 94 && wpm >= 50) return { grade: "A", color: "text-teal-500" };
      if (accuracy >= 90 && wpm >= 40) return { grade: "B", color: "text-blue-500" };
      if (accuracy >= 80) return { grade: "C", color: "text-yellow-500" };
      return { grade: "D", color: "text-rose-500" };
    };
    const formGrade = getPerformanceGrade();

    const DetailStat = ({ label, value, accent, tooltip }: { label: string, value: string | number, accent?: boolean, tooltip?: string }) => (
      <div className="flex items-baseline gap-1.5" title={tooltip}>
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{label}</span>
        <span className={`font-medium font-mono text-xs ${accent ? 'text-blue-500 dark:text-blue-400' : 'text-neutral-500 dark:text-neutral-400'}`}>{value}</span>
      </div>
    );

    const KeyStat = ({ label, value, suffix }: { label: string, value: string | number, suffix?: string }) => (
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-bold font-mono text-2xl text-neutral-900 dark:text-neutral-100">{value}{suffix && <span className="text-neutral-500/50 text-xl ml-0.5">{suffix}</span>}</span>
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mt-1">{label}</span>
      </div>
    );

    return (
      <div className={`flex flex-col w-full flex-1 overflow-y-auto max-h-[100dvh] gap-3 md:mx-auto md:max-w-5xl md:gap-5 bg-transparent p-4 sm:p-5 md:p-8 select-none transition-all duration-250 ${isTransitioning ? "opacity-0 translate-y-3 scale-98" : "opacity-100 translate-y-0 scale-100"}`}>

        {/* ── Hero: WPM + Accuracy — the star moment ── */}
        <div className="flex items-end justify-center gap-6 pt-6 sm:gap-10 md:gap-16">
          {/* WPM */}
          <div className="flex flex-col items-center gap-1">
             <div className="font-bold font-mono text-[4rem] text-blue-600 dark:text-blue-400 leading-none sm:text-7xl md:text-[8rem] tracking-tight animate-in zoom-in-[0.9] duration-500 fade-in" style={{ color: themeAccentColor }}>
                {wpm}
             </div>
             <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest sm:text-xs font-semibold animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>wpm</span>
          </div>

          {/* Accuracy */}
          <div className="flex flex-col items-center gap-1">
             <div className="font-bold font-mono text-[4rem] leading-none sm:text-7xl md:text-[8rem] tracking-tight text-neutral-800 dark:text-neutral-200 animate-in zoom-in-[0.9] duration-500 fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                {accuracy}<span className="text-neutral-400/60 text-2xl md:text-5xl ml-1">%</span>
             </div>
             <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest sm:text-xs font-semibold animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>accuracy</span>
          </div>
        </div>

        {/* ── Key stats — each cascades in individually ── */}
        <div className="flex items-center justify-center gap-6 md:gap-12 mt-6 animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: '0.35s', animationFillMode: 'both' }}>
          <KeyStat label="raw" value={Math.round(wpm * (100 / Math.max(accuracy, 1)))} />
          <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800" />
          <KeyStat label="consistency" suffix="%" value={consistencyScore} />
          <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800" />
          <KeyStat label="time" value={Math.floor(elapsedTime) + "s"} />
        </div>

        {/* ── Chart ── */}
        <div className="h-[200px] w-full mt-8 animate-in fade-in duration-700" style={{ animationDelay: '0.55s', animationFillMode: 'both' }}>
              <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="time"
                      interval="preserveStartEnd"
                      tick={{ fontSize: 11, fill: "currentColor", opacity: 0.35 }}
                      tickLine={false}
                    />
                    <YAxis
                      axisLine={false}
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 11, fill: "currentColor", opacity: 0.35 }}
                      tickLine={false}
                      width={36}
                    />
                    <Tooltip
                      cursor={{ stroke: "currentColor", strokeWidth: 1, strokeOpacity: 0.15 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="flex flex-col items-start gap-1 p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-md text-xs font-sans text-neutral-800 dark:text-neutral-200">
                               <div className="font-mono font-bold">
                                 <span style={{ color: themeAccentColor }}>{data.wpm} <span className="text-[10px] text-neutral-400 font-sans">WPM</span></span>
                               </div>
                               {data.word && <span className="text-neutral-500 font-medium">"{data.word}"</span>}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      activeDot={{ r: 5, strokeWidth: 0 }}
                      animationDuration={600}
                      animationEasing="ease-out"
                      dataKey="wpm"
                      dot={{ r: 3, fill: themeAccentColor, strokeWidth: 0 }}
                      stroke={themeAccentColor}
                      strokeWidth={2}
                      type="monotone"
                    />
                  </LineChart>
              </ResponsiveContainer>
        </div>

        {/* ── Divider ── */}
        <div className="mx-auto h-px w-full max-w-4xl bg-neutral-200/50 dark:bg-neutral-800/50 my-6 animate-in fade-in duration-500" style={{ animationDelay: '0.7s', animationFillMode: 'both' }} />

        {/* ── Detail stats ── */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 text-center animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: '0.8s', animationFillMode: 'both' }}>
           <DetailStat label="characters" value={`${typedText.length - totalErrors}/${totalErrors}`} />
           <DetailStat label="grade" value={formGrade.grade} accent />
           <DetailStat label="problems" value={problemKeys.slice(0, 3).join(", ") || "none"} />
           <DetailStat label="mode" value="practice" />
        </div>

        {/* ── Support Prescription (Flair) ── */}
        <div className="mx-auto max-w-2xl mt-4 px-4 text-center animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: '0.9s', animationFillMode: 'both' }}>
             <p className="text-[11px] text-neutral-500 dark:text-neutral-500 leading-relaxed font-medium">
                {prescription}
             </p>
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 pb-12 mt-4 animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: '1s', animationFillMode: 'both' }}>
           <button onClick={() => { changeStep(1); }} className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors text-sm py-1.5 focus:outline-none group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> <span className="font-medium text-xs tracking-wide">return</span>
           </button>

           <button onClick={() => { setTypedText(""); typedTextRef.current = ""; setElapsedTime(0); startTimeRef.current = null; setWpm(0); setWpmHistory([]); setDetailedHistory([]); lastHistoryTime.current = 0; setRenderRowOffset(0); setAccuracy(0); handleStartTest(); }} className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors text-sm py-1.5 focus:outline-none group">
              <RotateCcw size={16} className="group-active:-rotate-180 transition-all duration-300" /> <span className="font-medium text-xs tracking-wide">restart</span>
           </button>

           <button onClick={() => { setShowReplayOverlay(true); setReplayIndex(0); }} className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors text-sm py-1.5 focus:outline-none">
              <PlaySquare size={16} /> <span className="font-medium text-xs tracking-wide">watch replay</span>
           </button>

           <button id="copy-receipt-btn" onClick={handleGenerateReceipt} className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors text-sm py-1.5 focus:outline-none group">
              <FileText size={16} className="group-hover:text-blue-500 transition-colors" /> <span className="font-medium text-xs tracking-wide">download card</span>
           </button>
        </div>

        {/* Floating Frameless Replay Overlay */}
        {showReplayOverlay && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-[#111113] animate-in fade-in duration-300 p-4 sm:p-8">
            <div className="flex-1 w-full max-w-7xl relative flex flex-col justify-center min-h-0 mb-8 mt-4 md:mt-8 px-4 sm:px-8">
              <button
                onClick={() => { setShowReplayOverlay(false); setIsPlayingReplay(false); }}
                className="absolute top-0 right-4 md:right-8 p-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-colors z-10 focus:outline-none"
                title="Close Replay"
              >
                <X className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
              </button>

              {/* Live WPM / Accuracy stats during replay */}
              <div className="absolute top-0 left-4 sm:left-8 flex items-center gap-4 pt-2">
                <div className="flex items-center gap-1.5 tabular-nums">
                  <span className="text-[15px] font-semibold tracking-tight text-neutral-800 dark:text-neutral-100">{liveReplayWpm}</span>
                  <span className="text-[10px] font-medium tracking-widest uppercase text-neutral-400 dark:text-neutral-500">WPM</span>
                </div>
                <div className="w-px h-3.5 bg-neutral-200 dark:bg-neutral-700" />
                <div className="flex items-center gap-1.5 tabular-nums">
                  <span className="text-[15px] font-semibold tracking-tight text-neutral-800 dark:text-neutral-100">{liveReplayAccuracy}%</span>
                  <span className="text-[10px] font-medium tracking-widest uppercase text-neutral-400 dark:text-neutral-500">ACC</span>
                </div>
              </div>

              <div
                ref={replayContainerRef}
                style={{ fontFamily: "var(--app-font-family), monospace" }}
                className="relative w-full max-h-[75vh] overflow-y-auto no-scrollbar text-[24px] xl:text-[32px] md:text-[36px] leading-relaxed break-words whitespace-pre-wrap pt-16 md:pt-14 pb-32 px-2 text-neutral-800 dark:text-neutral-200"
              >
               {wordSegments.map((seg, segIdx) => {
                 if (seg.type === "word") {
                   return (
                     <span key={segIdx} className="inline-block whitespace-nowrap">
                       {seg.indices.map((i) => {
                         const char = originalChars[i];
                         const isTyped = i < replayedText.length;
                         const isError = isTyped && replayedText[i] !== char;
                         const isCursor = i === replayedText.length;

                         return (
                           <span key={i} ref={isCursor ? activeReplayCharRef : null} className="relative inline-block">
                             <span className={isTyped ? "opacity-0" : "text-neutral-300 dark:text-neutral-700 opacity-60"}>
                                {char}
                             </span>
                             {isTyped && (
                                <span className={`absolute top-0 left-0 ${isError ? "text-red-500 bg-red-100 dark:bg-red-500/20 rounded-[2px]" : "text-neutral-900 dark:text-neutral-100"}`}>
                                  {isError ? (typedText[i] === " " ? "_" : typedText[i]) : char}
                                </span>
                             )}
                             {isCursor && (
                                  <span className="absolute top-0 left-0 w-[2.5px] h-[1.1em] bg-blue-500 animate-pulse translate-y-[0.1em]" />
                             )}
                           </span>
                         );
                       })}
                     </span>
                   );
                 } else {
                   return seg.indices.map((i) => {
                     const char = originalChars[i];
                     const isTyped = i < replayedText.length;
                     const isError = isTyped && replayedText[i] !== char;
                     const isCursor = i === replayedText.length;

                     return (
                       <span key={i} ref={isCursor ? activeReplayCharRef : null} className="relative inline-block">
                         <span className={isTyped ? "opacity-0" : "text-neutral-400 dark:text-neutral-600 opacity-40"}>
                            {char}
                         </span>
                         {isTyped && (
                            <span className={`absolute top-0 left-0 ${isError ? "text-red-500 bg-red-100 dark:bg-red-500/20 rounded-[2px]" : "text-neutral-800 dark:text-neutral-200"}`}>
                              {isError ? (typedText[i] === " " ? "_" : typedText[i]) : char}
                            </span>
                         )}
                         {isCursor && (
                              <span className="absolute top-0 left-0 w-[2px] h-[1.2em] bg-blue-500 animate-pulse translate-y-[0.1em]" />
                         )}
                       </span>
                     );
                   });
                 }
               })}
               {/* Render extra characters typed beyond the final document length (e.g. temporary additions later deleted) */}
               {replayedText.length > originalText.length && (
                  <span className="text-red-500">
                    {replayedText.substring(originalText.length).split("").map((char, i) => {
                       const absoluteIdx = originalText.length + i;
                       const isCursor = absoluteIdx === replayedText.length - 1;
                       return (
                         <span key={absoluteIdx} ref={isCursor ? activeReplayCharRef : null} className="relative inline-block">
                           {char === "\n" ? "↵\n" : (char === " " ? "_" : char)}
                           {isCursor && (
                             <span className="absolute top-0 left-0 w-[2.5px] h-[1.1em] bg-blue-500 animate-pulse translate-y-[0.1em]" />
                           )}
                         </span>
                       );
                    })}
                  </span>
               )}
               {replayedText.length === originalText.length && (
                  <span ref={activeReplayCharRef} className="inline-block w-[2px] h-[1.2em] bg-blue-500 animate-pulse ml-[2px] translate-y-[0.1em]" />
               )}
              </div>
            </div>

            {/* Timeline controller with clickable error markers */}
            <div className="relative w-full max-w-2xl flex items-center gap-3 mb-4 px-1">
                 <button
                   onClick={() => {
                      if (replayIndex >= (replayLog.length > 0 ? replayLog.length : typedText.length)) {
                         setReplayIndex(0);
                      }
                      setIsPlayingReplay(!isPlayingReplay);
                   }}
                   className="w-8 h-8 flex shrink-0 items-center justify-center bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-full transition-colors"
                 >
                   {isPlayingReplay ? (
                      <div className="w-2 h-2 bg-current rounded-[1.5px]" />
                   ) : (
                      <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                   )}
                 </button>

                 {/* Current time */}
                 <span className="text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500 shrink-0 w-9 text-right">
                   {(() => {
                     const currentMs = replayLog.length > 0
                       ? replayLog[Math.min(replayIndex, replayLog.length - 1)]?.t ?? 0
                       : Math.floor((replayIndex / Math.max(typedText.length, 1)) * elapsedTime * 1000);
                     const m = Math.floor(currentMs / 60000);
                     const s = Math.floor((currentMs % 60000) / 1000);
                     return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
                   })()}
                 </span>

                 {/* Clickable Custom Progress timeline */}
                 <div className="flex-1 flex items-center relative group h-8">
                   <div
                     className="w-full h-5 relative cursor-pointer flex items-center select-none"
                     onMouseDown={(mouseDownEvent) => {
                       setIsPlayingReplay(false);
                       const rect = mouseDownEvent.currentTarget.getBoundingClientRect();
                       const handleMove = (moveEvent: MouseEvent) => {
                         const percent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
                         setReplayIndex(Math.round(percent * (replayLog.length > 0 ? replayLog.length : typedText.length)));
                       };
                       const handleUp = () => {
                         window.removeEventListener("mousemove", handleMove);
                         window.removeEventListener("mouseup", handleUp);
                       };
                       window.addEventListener("mousemove", handleMove);
                       window.addEventListener("mouseup", handleUp);
                       const initialPercent = Math.max(0, Math.min(1, (mouseDownEvent.clientX - rect.left) / rect.width));
                       setReplayIndex(Math.round(initialPercent * (replayLog.length > 0 ? replayLog.length : typedText.length)));
                     }}
                   >
                     {/* Background Line */}
                     <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full transition-all group-hover:h-1.5" />

                     {/* Active Fill Line */}
                     <div
                       className="absolute left-0 h-1 bg-neutral-900 dark:bg-white rounded-full pointer-events-none transition-all group-hover:h-1.5"
                       style={{ width: `${(replayLog.length > 0 ? replayLog.length : typedText.length) > 0 ? (replayIndex / (replayLog.length > 0 ? replayLog.length : typedText.length)) * 100 : 0}%` }}
                     />

                     {/* Clickable mistake dots */}
                     {errorIndices.map(errIdx => {
                        const totalSteps = replayLog.length > 0 ? replayLog.length : typedText.length;
                        const errorPercent = (errIdx / Math.max(1, totalSteps)) * 100;
                       return (
                         <div
                           key={errIdx}
                           className="absolute w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-neutral-950 transform -translate-x-1/2 hover:scale-150 transition-transform cursor-pointer pointer-events-auto z-20"
                           style={{ left: `${errorPercent}%` }}
                           onMouseDown={(e) => {
                              e.stopPropagation();
                              setIsPlayingReplay(false);
                              setReplayIndex(errIdx);
                           }}
                           title={`Error here - click to jump`}
                         />
                       );
                     })}

                     {/* Active Progress Handle */}
                     <div
                       className="absolute w-3 h-3 bg-neutral-900 dark:bg-white rounded-full shadow-md transform -translate-x-1/2 transition-transform group-hover:scale-125 pointer-events-none z-10"
                       style={{ left: `${(replayLog.length > 0 ? replayLog.length : typedText.length) > 0 ? (replayIndex / (replayLog.length > 0 ? replayLog.length : typedText.length)) * 100 : 0}%` }}
                     />
                   </div>
                 </div>

                 {/* Total time */}
                 <span className="text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500 shrink-0 w-9">
                   {(() => {
                     const totalMs = replayLog.length > 0
                       ? replayLog[replayLog.length - 1].t
                       : Math.floor(elapsedTime * 1000);
                     const m = Math.floor(totalMs / 60000);
                     const s = Math.floor((totalMs % 60000) / 1000);
                     return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
                   })()}
                 </span>

                 <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-1 shrink-0">
                    {[0.5, 1, 1.5, 2].map(speed => (
                       <button
                          key={speed}
                          onClick={() => setReplaySpeed(speed)}
                          className={`w-8 h-8 flex items-center justify-center rounded-full text-[11px] font-bold transition-all ${replaySpeed === speed ? 'bg-white dark:bg-[#2c2c2c] shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                       >
                          {speed}x
                       </button>
                    ))}
                 </div>

            </div>
          </div>
        , document.body)}
      </div>
    );
  }

  return null;
}