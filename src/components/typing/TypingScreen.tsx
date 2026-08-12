import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { ClassicKeyboard, cn } from "../keyboard/ClassicKeyboard";
import { DasKeyboard } from "../keyboard/das/DasKeyboard";
import { useSettings } from "../../contexts/SettingsContext";
import { useSoundEngine } from "../../hooks/useSoundEngine";
import { ArrowLeft, RotateCcw, ShieldAlert, X, ArrowRight } from "lucide-react";
import { TypingEngine, ReplayEvent } from "../../lib/typing-engine";
import { SessionRecoveryOverlay } from "./SessionRecoveryOverlay";

const KEY_CHAR_MAP: Record<string, { normal: string; shifted: string }> = {

  KeyQ: { normal: "q", shifted: "Q" },
  KeyW: { normal: "w", shifted: "W" },
  KeyE: { normal: "e", shifted: "E" },
  KeyR: { normal: "r", shifted: "R" },
  KeyT: { normal: "t", shifted: "T" },
  KeyY: { normal: "y", shifted: "Y" },
  KeyU: { normal: "u", shifted: "U" },
  KeyI: { normal: "i", shifted: "I" },
  KeyO: { normal: "o", shifted: "O" },
  KeyP: { normal: "p", shifted: "P" },
  KeyA: { normal: "a", shifted: "A" },
  KeyS: { normal: "s", shifted: "S" },
  KeyD: { normal: "d", shifted: "D" },
  KeyF: { normal: "f", shifted: "F" },
  KeyG: { normal: "g", shifted: "G" },
  KeyH: { normal: "h", shifted: "H" },
  KeyJ: { normal: "j", shifted: "J" },
  KeyK: { normal: "k", shifted: "K" },
  KeyL: { normal: "l", shifted: "L" },
  KeyZ: { normal: "z", shifted: "Z" },
  KeyX: { normal: "x", shifted: "X" },
  KeyC: { normal: "c", shifted: "C" },
  KeyV: { normal: "v", shifted: "V" },
  KeyB: { normal: "b", shifted: "B" },
  KeyN: { normal: "n", shifted: "N" },
  KeyM: { normal: "m", shifted: "M" },


  Digit1: { normal: "1", shifted: "!" },
  Digit2: { normal: "2", shifted: "@" },
  Digit3: { normal: "3", shifted: "#" },
  Digit4: { normal: "4", shifted: "$" },
  Digit5: { normal: "5", shifted: "%" },
  Digit6: { normal: "6", shifted: "^" },
  Digit7: { normal: "7", shifted: "&" },
  Digit8: { normal: "8", shifted: "*" },
  Digit9: { normal: "9", shifted: "(" },
  Digit0: { normal: "0", shifted: ")" },


  Minus: { normal: "-", shifted: "_" },
  Equal: { normal: "=", shifted: "+" },
  BracketLeft: { normal: "[", shifted: "{" },
  BracketRight: { normal: "]", shifted: "}" },
  Backslash: { normal: "\\", shifted: "|" },
  Semicolon: { normal: ";", shifted: ":" },
  Quote: { normal: "'", shifted: '"' },
  Comma: { normal: ",", shifted: "<" },
  Period: { normal: ".", shifted: ">" },
  Slash: { normal: "/", shifted: "?" },
  Backquote: { normal: "`", shifted: "~" },
};

function getVirtualKeyChar(code: string, shift: boolean, capslock: boolean): string | null {
  const mapping = KEY_CHAR_MAP[code];
  if (!mapping) return null;

  const isLetter = code.startsWith("Key");
  if (isLetter) {
    const uppercase = shift !== capslock;
    return uppercase ? mapping.shifted : mapping.normal;
  } else {
    return shift ? mapping.shifted : mapping.normal;
  }
}

interface KeyboardSectionProps {
  themeName: string;
  accentColor: string;
  onKeyVirtualDown: (code: string) => void;
  onKeyVirtualUp: (code: string) => void;
  virtualShiftActive: boolean;
  virtualCapsLockActive: boolean;
  /** When true, render the TAB+ENTER hint inside this section (Das only). */
  showRestartHint?: boolean;
}

const KeyboardSection = memo(function KeyboardSection({
  themeName,
  accentColor,
  onKeyVirtualDown,
  onKeyVirtualUp,
  virtualShiftActive,
  virtualCapsLockActive,
  showRestartHint,
}: KeyboardSectionProps) {
  const { keyboardModel } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDas = keyboardModel === "das_keyboard_4";
  // Measured actual pixel width of the scroll container, handed down to
  // DasKeyboard so it can size itself to fit — see DasKeyboard.tsx for why
  // this replaced fixed per-breakpoint zoom values (they couldn't adapt to
  // the real available space and either clipped on small screens or
  // under-sized Das on large ones). Classic doesn't need this: its own
  // Tailwind zoom breakpoints already fit max-w-5xl comfortably.
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);

  // The keyboard's rendered width can exceed the viewport on narrower
  // screens (or the Das board specifically, which is intentionally sized
  // ~1.5x the Classic board's real-world width). `max-w-5xl` here matches
  // the width the rest of this screen already uses (see the header/text
  // sections above), so on any viewport wide enough for those, the
  // keyboard fits too and never scrolls. When it genuinely doesn't fit
  // (e.g. small screens), `overflow-x-auto` lets it scroll instead of
  // clipping — and this effect centers the scroll position on mount/resize
  // so the excess is split evenly left/right instead of all getting cut
  // off the right edge (which is what a fixed scrollLeft of 0 does by
  // default when content is wider than its container).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const center = () => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    };
    center();
    window.addEventListener("resize", center);
    return () => window.removeEventListener("resize", center);
  }, [keyboardModel]);

  // Tracks the scroll container's real width so Das can compute a zoom
  // that's guaranteed to fit it (see DasKeyboard.tsx). Runs regardless of
  // which keyboard is active so the value is already fresh if the user
  // switches to Das.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setAvailableWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={scrollRef}
      // mb-4/mb-6 anchors both keyboards the same fixed distance from the
      // bottom edge instead of letting each one's own height passively
      // decide where it lands. Previously Classic (the shorter board) sat
      // flush against the viewport's bottom edge while Das (taller) ended
      // up floating noticeably higher — the fixed offset here keeps both
      // boards' bottom edge lined up, whichever one is active.
      // Das has 32px of internal top padding in DasKeyboardApp (logo/media bar
      // space) so its visual top edge already has breathing room — using pt-6
      // here would add another 24px gap between the TAB+ENTER hint and the
      // board. Classic uses pt-6 because it has no such internal top offset.
      className={cn("w-full mx-auto mb-2 sm:mb-3 shrink-0 overflow-x-auto", isDas ? "pt-2 max-w-[1600px]" : "pt-6 max-w-5xl")}
    >
      <div className="flex justify-center min-w-fit" style={{ width: "max-content", minWidth: "100%" }}>
      {isDas ? (
        <DasKeyboard
          onKeyVirtualDown={onKeyVirtualDown}
          onKeyVirtualUp={onKeyVirtualUp}
          availableWidth={availableWidth}
        />
      ) : (
        // Both keyboards share the same box top offset from this parent,
        // but Das has an extra top strip (logo/media keys/knob) before its
        // first key row, while Classic's first key row sits right at its
        // box's top edge. That makes Classic's visible keys start lower
        // relative to Das's visible keys despite equal box tops, so nudge
        // Classic's box up slightly to line up the two boards' key rows.
        <div className="-mt-5">
          <ClassicKeyboard
            themeName={themeName}
            onKeyVirtualDown={onKeyVirtualDown}
            onKeyVirtualUp={onKeyVirtualUp}
          />
        </div>
      )}
      </div>
    </div>
  );
});

export interface TypingScreenProps {
  originalText: string;
  accentColor: string;
  durationLimit: string;
  isStrictModeEnabled: boolean;
  strictSuddenDeath: boolean;
  strictDisableBackspace: boolean;
  strictMinAccuracy: string;
  strictCustomAccuracy: string | number;
  strictWpmFloor: string;
  strictCustomWpmFloor: string | number;
  strictMaxErrors: string;
  strictCustomMaxErrors: string | number;
  strictInactivityTimeout: string;
  strictCustomInactivity: string | number;
  onFinish: (
    wpm: number,
    accuracy: number,
    elapsedSeconds: number,
    finalTypedText: string,
    wpmHistory: number[],
    replayLog: ReplayEvent[],
    errorIndices: number[]
  ) => void;
  onBack: () => void;
  onConfigureSession: () => void;
  onResetCountdowns: () => void;
  initialSnapshot?: {
    wordIndex: number;
    typed: string;
    wordInputs: string[];
    replayLog: ReplayEvent[];
    wpmHistory: number[];
    errorIndices: number[];
    correctChars: number;
    incorrectChars: number;
    elapsedSeconds: number;
  } | null;
  onSnapshot?: (snapshot: {
    wordIndex: number;
    typed: string;
    wordInputs: string[];
    replayLog: ReplayEvent[];
    wpmHistory: number[];
    errorIndices: number[];
    correctChars: number;
    incorrectChars: number;
    elapsedSeconds: number;
  }) => void;
  onSnapshotConsumed?: () => void;
}

const StaticWords = memo(function StaticWords({ words }: { words: string[] }) {
  return (
    <>
      {words.map((word, wIdx) => {
         return (
           <div key={wIdx} id={`typing-word-${wIdx}`} className="relative inline-block typing-word">
              {word.split("").map((c, cIdx) => (
                 <span key={cIdx} id={`typing-char-${wIdx}-${cIdx}`} className="typing-char-pending font-normal" style={{ color: "var(--typing-text-pending, #a3a3a3)", opacity: 0.5 }}>
                    {c}
                 </span>
              ))}
              <span id={`typing-extras-${wIdx}`} className="inline-flex relative"></span>
           </div>
         );
      })}
    </>
  );
}, (prev, next) => prev.words === next.words);

export function TypingScreen({
  originalText,
  accentColor,
  durationLimit,
  isStrictModeEnabled,
  strictSuddenDeath,
  strictDisableBackspace,
  strictMinAccuracy,
  strictCustomAccuracy,
  strictWpmFloor,
  strictCustomWpmFloor,
  strictMaxErrors,
  strictCustomMaxErrors,
  strictInactivityTimeout,
  strictCustomInactivity,
  onFinish,
  onBack,
  onConfigureSession,
  initialSnapshot,
  onSnapshot,
  onSnapshotConsumed,
}: TypingScreenProps) {
  const { accent: currentTheme, liveStats, showKeyboard, errorSoundProfile, keyboardModel } = useSettings();
  const { playSound, playErrorSound } = useSoundEngine();

  // Parse constraints
  const limitMin = durationLimit ? parseFloat(durationLimit) : 0;
  const initialRemainingSeconds = limitMin > 0 ? limitMin * 60 : null;


  const strictWpmLimitNum = isStrictModeEnabled && strictWpmFloor !== "none"
    ? (strictWpmFloor === "custom" ? Number(strictCustomWpmFloor) : Number(strictWpmFloor))
    : NaN;

  const strictAccLimitNum = isStrictModeEnabled && strictMinAccuracy !== "none"
    ? (strictMinAccuracy === "custom" ? Number(strictCustomAccuracy) : Number(strictMinAccuracy))
    : NaN;

  const strictErrLimitNum = isStrictModeEnabled && strictMaxErrors !== "none"
    ? (strictMaxErrors === "custom" ? Number(strictCustomMaxErrors) : Number(strictMaxErrors))
    : NaN;

  const strictInactivityNum = isStrictModeEnabled && strictInactivityTimeout !== "none"
    ? (strictInactivityTimeout === "custom" ? Number(strictCustomInactivity) : Number(strictInactivityTimeout))
    : NaN;


  const isRecoveredSessionRef = useRef(!!initialSnapshot);

  const [testSessionId, setTestSessionId] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(
    isRecoveredSessionRef.current ? 10 : (limitMin > 0 ? 5 : null)
  );
  const [strictViolation, setStrictViolation] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(true);


  const [virtualShiftActive, setVirtualShiftActive] = useState(false);
  const [virtualCapsLockActive, setVirtualCapsLockActive] = useState(false);
  const [refocusPulse, setRefocusPulse] = useState(false);


  const inputRef = useRef<HTMLInputElement>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TypingEngine | null>(null);

  // Text preview box: how many whole lines it shows, and the pixel height
  // of one line — both computed from real measurements instead of a fixed
  // hardcoded box height. The old fixed 280px box wasn't a clean multiple
  // of the actual rendered line height, so a partial last line always
  // peeked through and got clipped by overflow-hidden (looked like it was
  // struck through the middle). Worse, that fixed box lived inside a flex
  // column shared with the keyboard below it — a taller keyboard (Das)
  // left the box less room, so the same "fixed" box didn't actually render
  // at a consistent size across keyboards. Measuring the real available
  // space and always sizing the box to an exact whole-line multiple (with
  // a preferred max of 6, but adapting down on short screens) fixes both:
  // no line is ever half-shown, and the result no longer silently depends
  // on which keyboard happens to be selected.
  const textAreaOuterRef = useRef<HTMLDivElement>(null);
  const statsRowRef = useRef<HTMLDivElement>(null);
  const lineProbeRef = useRef<HTMLSpanElement>(null);
  const PREFERRED_MAX_LINES = 6;
  const MIN_LINES = 3;
  const [lineHeightPx, setLineHeightPx] = useState(44);
  const [visibleLines, setVisibleLines] = useState(PREFERRED_MAX_LINES);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);


  const lastActiveVirtualKeyRef = useRef<string | null>(null);
  const virtualRepeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const virtualRepeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);


  const words = useMemo(() => originalText.trim().split(/\s+/).filter((w) => w.length > 0), [originalText]);


  const handleTick = useCallback((wpm: number, acc: number, remaining: number | null) => {
      const wpmEl = document.getElementById("typing-live-wpm");
      if (wpmEl) wpmEl.innerText = wpm.toString();

      const accEl = document.getElementById("typing-live-acc");
      if (accEl) accEl.innerText = acc.toString();

      const timeValEl = document.getElementById("typing-live-time-val");
      if (timeValEl) {
          const val = remaining !== null ? remaining : parseInt(timeValEl.getAttribute("data-elapsed") || "0") + 1;
          timeValEl.setAttribute("data-elapsed", val.toString());

          let formatted = val.toString();
          let unit = "s";
          if (val >= 60) {
             const m = Math.floor(val / 60);
             const s = val % 60;
             formatted = `${m}:${s.toString().padStart(2, '0')}`;
             unit = "m";
          }

          timeValEl.innerText = formatted;
          const timeUnitEl = document.getElementById("typing-live-time-unit");
          if (timeUnitEl) timeUnitEl.innerText = unit;
      }
  }, []);

  const resetTest = useCallback(() => {
    if (engineRef.current) {
        engineRef.current.unmount();
        engineRef.current = null;
    }

    setTestSessionId((prev) => prev + 1);
    setStrictViolation(null);
    setCountdown(limitMin > 0 ? 5 : null);


    const wpmEl = document.getElementById("typing-live-wpm");
    if (wpmEl) wpmEl.innerText = "0";
    const accEl = document.getElementById("typing-live-acc");
    if (accEl) accEl.innerText = "100";
    const timeValEl = document.getElementById("typing-live-time-val");
    if (timeValEl) {
       timeValEl.setAttribute("data-elapsed", "0");
       timeValEl.innerText = limitMin > 0 ? (limitMin * 60).toString() : "0";
    }

    if (wordsContainerRef.current) {
       wordsContainerRef.current.style.transform = `translate3d(0, 0, 0)`;


       const pendingColor = "var(--typing-text-pending, #a3a3a3)";
       const chars = wordsContainerRef.current.querySelectorAll('.typing-word span[id^="typing-char-"]');
       chars.forEach(span => {
           span.className = "typing-char-pending font-normal";
           (span as HTMLElement).style.color = pendingColor;
           (span as HTMLElement).style.opacity = "0.5";
       });

       const extras = wordsContainerRef.current.querySelectorAll('.typing-word span[id^="typing-extras-"]');
       extras.forEach(extra => {
           extra.innerHTML = "";
       });

       const wordsElems = wordsContainerRef.current.querySelectorAll('.typing-word');
       wordsElems.forEach(w => {
           w.className = "relative inline-block typing-word";
       });
    }

    setTimeout(() => {
        if (inputRef.current) {
            inputRef.current.value = "";
            inputRef.current.focus();
        }
    }, 50);
  }, [limitMin]);


  const callbacksRef = useRef({ onFinish, playSound, playErrorSound, setStrictViolation, handleTick, errorSoundProfile, onSnapshot, onSnapshotConsumed });
  useEffect(() => { callbacksRef.current = { onFinish, playSound, playErrorSound, setStrictViolation, handleTick, errorSoundProfile, onSnapshot, onSnapshotConsumed }; });


  useEffect(() => {
    if (countdown !== null) return;

    if (!engineRef.current && inputRef.current && cursorRef.current && wordsContainerRef.current) {
      const engine = new TypingEngine({
         words,
         durationLimitMin: limitMin,
         strictDisableBackspace,
         strictMinWpm: strictWpmLimitNum,
         strictMinAcc: strictAccLimitNum,
         strictMaxErrors: strictErrLimitNum,
         strictSuddenDeath: isStrictModeEnabled && strictSuddenDeath,
         strictInactivityTimeout: strictInactivityNum,
         onFinish: (wpm, acc, elapsed, typedTxt, wpmHist, replayLog, errorIndices) => {
             callbacksRef.current.onFinish(wpm, acc, elapsed, typedTxt, wpmHist, replayLog, errorIndices);
         },
         onSound: (type, key) => {
             if (type === "error") {
                if (callbacksRef.current.errorSoundProfile && callbacksRef.current.errorSoundProfile !== "off") {
                   callbacksRef.current.playErrorSound();
                }
                window.dispatchEvent(new CustomEvent('typing-error', { detail: { code: key } }));
             } else {
                callbacksRef.current.playSound(type, key === " " ? "Space" : key);
             }
         },
         onStrictViolation: (reason) => {
             callbacksRef.current.setStrictViolation(reason);
         },
         onTick: (wpm, acc, remaining) => {
             callbacksRef.current.handleTick(wpm, acc, remaining);
         }
      });

      engine.mount(inputRef.current, cursorRef.current, wordsContainerRef.current);

      if (testSessionId === 0 && initialSnapshot) {
         engine.hydrate(initialSnapshot);
         callbacksRef.current.onSnapshotConsumed?.();
         // Immediately sync ALL DOM stat displays to the recovered values so
         // nothing ever flashes a stale zero — onTick only fires after the
         // first second, but the user must see correct numbers the instant
         // the overlay clears. Mirror exactly what handleTick does.
         const elapsed = initialSnapshot.elapsedSeconds;
         const timeEl = document.getElementById("typing-live-time-val");
         if (timeEl) {
           timeEl.setAttribute("data-elapsed", String(elapsed));
           let formatted = String(elapsed);
           let unit = "s";
           if (elapsed >= 60) {
             const m = Math.floor(elapsed / 60);
             const s = elapsed % 60;
             formatted = `${m}:${s.toString().padStart(2, "0")}`;
             unit = "m";
           }
           timeEl.innerText = formatted;
           const timeUnitEl = document.getElementById("typing-live-time-unit");
           if (timeUnitEl) timeUnitEl.innerText = unit;
         }
         const wpmEl = document.getElementById("typing-live-wpm");
         if (wpmEl) {
           const lastWpm = initialSnapshot.wpmHistory.length > 0
             ? initialSnapshot.wpmHistory[initialSnapshot.wpmHistory.length - 1]
             : 0;
           wpmEl.innerText = String(lastWpm);
         }
         const accEl = document.getElementById("typing-live-acc");
         if (accEl) {
           const total = initialSnapshot.correctChars + initialSnapshot.incorrectChars;
           const acc = total > 0 ? Math.round((initialSnapshot.correctChars / total) * 100) : 100;
           accEl.innerText = String(acc);
         }
      }

      engineRef.current = engine;
    }

    return () => {
       if (engineRef.current) {
           // Flush one final snapshot before tearing down so an account
           // switch (or any unmount) mid-keystroke never loses progress to
           // the periodic 3s autosave window below.
           if (callbacksRef.current.onSnapshot && !engineRef.current.isFinished()) {
              callbacksRef.current.onSnapshot(engineRef.current.getSnapshot());
           }
           engineRef.current.unmount();
           engineRef.current = null;
       }
    };
  }, [countdown, testSessionId, words, limitMin, strictDisableBackspace, strictWpmLimitNum, strictAccLimitNum, strictErrLimitNum, isStrictModeEnabled, strictSuddenDeath, strictInactivityNum]);

  useEffect(() => {
    if (!onSnapshot) return;
    const interval = setInterval(() => {
       if (engineRef.current && !engineRef.current.isFinished()) {
          onSnapshot(engineRef.current.getSnapshot());
       }
    }, 500);
    return () => clearInterval(interval);
  }, [onSnapshot, testSessionId]);


  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => (prev && prev > 1 ? prev - 1 : 0));
      }, 1000);
    } else if (countdown === 0) {
      const waitTimer = setTimeout(() => {
        setCountdown(null);
        setTimeout(() => inputRef.current?.focus(), 10);
      }, 800);
      return () => {
        clearInterval(countdownRef.current!);
        clearTimeout(waitTimer);
      };
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [countdown]);


  useEffect(() => {
     let tabPressed = false;
     const onGlobalKey = (e: KeyboardEvent) => {
        if (e.key === "Tab") {
           e.preventDefault();
           tabPressed = true;
           setTimeout(() => { tabPressed = false; }, 1000);
        } else if (e.key === "Enter" && tabPressed) {
           e.preventDefault();
           tabPressed = false;
           resetTest();
        }
     };
     window.addEventListener("keydown", onGlobalKey);
     return () => window.removeEventListener("keydown", onGlobalKey);
  }, [resetTest]);


  useEffect(() => {
    if (isFocused || countdown !== null || strictViolation !== null) return;

    const handleGlobalKeyFocus = (e: KeyboardEvent) => {

      if (["Alt", "Control", "Meta", "Shift", "CapsLock", "ScrollLock", "NumLock", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
         return;
      }

      e.preventDefault();
      // No stopPropagation — that would kill the capture phase and prevent
      // Keyboard.tsx's window-bubble keydown listener from firing, making the
      // key press animation dead until the user clicks back in. The typing
      // engine reads from the <input> element's own events, not window-keydown,
      // so letting this propagate does not cause a double-character input.
      inputRef.current?.focus();
    };

    window.addEventListener("keydown", handleGlobalKeyFocus, true);
    return () => window.removeEventListener("keydown", handleGlobalKeyFocus, true);
  }, [isFocused, countdown, strictViolation]);

  // After a tab switch the input loses focus (isFocused=false) and stays that
  // way until the user manually clicks or presses a key. Auto-refocus when the
  // tab becomes visible again so the Das keyboard is immediately live — RGB
  // loop, button clicks, and key animations all depend on a focused input.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && countdown === null && strictViolation === null) {
        inputRef.current?.focus();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [countdown, strictViolation]);

  // After switching keyboard models (via the Settings modal), the input is
  // blurred because the modal had focus. Re-focus it as soon as the Das
  // keyboard renders so button clicks and key animations work without the user
  // needing to click into the text area first.
  useEffect(() => {
    if (keyboardModel === "das_keyboard_4" && countdown === null && strictViolation === null) {
      // Small delay lets the keyboard finish mounting/animating in before we
      // steal focus — avoids a race with the modal's exit animation.
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [keyboardModel, countdown, strictViolation]);

  const handleInputFocus = useCallback(() => {
    setIsFocused(true);
    setRefocusPulse(true);
    setTimeout(() => setRefocusPulse(false), 300);
  }, []);

  const simulateVirtualKey = useCallback((code: string) => {
    const inputEl = inputRef.current;
    if (!inputEl) return;


    if (!isFocused) {
      inputEl.focus();
    }

    let keyVal = "";
    if (code === "Space") keyVal = " ";
    else if (code === "Backspace") keyVal = "Backspace";
    else if (code === "Enter") keyVal = "Enter";
    else if (code === "Tab") keyVal = "Tab";
    else if (code === "Escape") keyVal = "Escape";
    else if (code === "ShiftLeft" || code === "ShiftRight") {
      setVirtualShiftActive(prev => !prev);
      playSound("down", code);
      return;
    } else if (code === "CapsLock") {
      setVirtualCapsLockActive(prev => !prev);
      playSound("down", code);
      return;
    } else {
      const char = getVirtualKeyChar(code, virtualShiftActive, virtualCapsLockActive);
      if (char) {
        keyVal = char;
      }
    }


    playSound("down", code);


    const finalKey = keyVal || code;
    const keyDownEvt = new KeyboardEvent("keydown", {
      key: finalKey,
      code: code,
      bubbles: true,
      cancelable: true
    });
    inputEl.dispatchEvent(keyDownEvt);


    if (virtualShiftActive && !["ShiftLeft", "ShiftRight", "CapsLock", "Backspace", "Tab", "Enter"].includes(code)) {
      setVirtualShiftActive(false);
    }
  }, [isFocused, virtualShiftActive, virtualCapsLockActive, playSound]);

  const handleVirtualKeyRelease = useCallback((code: string) => {
    const inputEl = inputRef.current;
    if (!inputEl) return;

    if (["ShiftLeft", "ShiftRight", "CapsLock"].includes(code)) {
      playSound("up", code);
      return;
    }

    let keyVal = "";
    if (code === "Space") keyVal = " ";
    else if (code === "Backspace") keyVal = "Backspace";
    else if (code === "Enter") keyVal = "Enter";
    else if (code === "Tab") keyVal = "Tab";
    else if (code === "Escape") keyVal = "Escape";
    else {
      const char = getVirtualKeyChar(code, virtualShiftActive, virtualCapsLockActive);
      if (char) {
        keyVal = char;
      }
    }


    playSound("up", code);

    const finalKey = keyVal || code;
    const keyUpEvt = new KeyboardEvent("keyup", {
      key: finalKey,
      code: code,
      bubbles: true,
      cancelable: true
    });
    inputEl.dispatchEvent(keyUpEvt);
  }, [virtualShiftActive, virtualCapsLockActive, playSound]);


  const clearRepeatTimers = useCallback(() => {
    if (virtualRepeatTimerRef.current) {
      clearTimeout(virtualRepeatTimerRef.current);
      virtualRepeatTimerRef.current = null;
    }
    if (virtualRepeatIntervalRef.current) {
      clearInterval(virtualRepeatIntervalRef.current);
      virtualRepeatIntervalRef.current = null;
    }
    lastActiveVirtualKeyRef.current = null;
  }, []);

  const handleKeyVirtualDown = useCallback((code: string) => {
    clearRepeatTimers();
    lastActiveVirtualKeyRef.current = code;


    simulateVirtualKey(code);


    if (["ShiftLeft", "ShiftRight", "CapsLock"].includes(code)) {
      return;
    }


    virtualRepeatTimerRef.current = setTimeout(() => {

      virtualRepeatIntervalRef.current = setInterval(() => {
        simulateVirtualKey(code);
      }, 50);
    }, 400);
  }, [clearRepeatTimers, simulateVirtualKey]);

  const handleKeyVirtualUp = useCallback((code: string) => {
    if (lastActiveVirtualKeyRef.current === code) {
      clearRepeatTimers();
    }
    handleVirtualKeyRelease(code);
  }, [clearRepeatTimers, handleVirtualKeyRelease]);


  useEffect(() => {
    return () => {
      if (virtualRepeatTimerRef.current) clearTimeout(virtualRepeatTimerRef.current);
      if (virtualRepeatIntervalRef.current) clearInterval(virtualRepeatIntervalRef.current);
    };
  }, []);

  // Recomputes how many whole text-preview lines fit in the real available
  // space (see refs above). Re-runs whenever the outer wrapper's height
  // changes for any reason — window resize, fullscreen toggle, or the
  // keyboard below it changing size (Das vs Classic) — so the box always
  // shows a clean, non-cut set of lines instead of a fixed guess.
  useEffect(() => {
    const outer = textAreaOuterRef.current;
    if (!outer) return;
    const recompute = () => {
      const probeH = lineProbeRef.current?.offsetHeight || 0;
      const lineH = probeH > 0 ? probeH + 4 : 44;
      const statsH = statsRowRef.current?.offsetHeight || 0;
      const available = outer.clientHeight - statsH;
      const fitLines = Math.floor(available / lineH);
      const clamped = Math.max(MIN_LINES, Math.min(PREFERRED_MAX_LINES, fitLines || MIN_LINES));
      setLineHeightPx(lineH);
      setVisibleLines(clamped);
    };
    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(outer);
    return () => observer.disconnect();
  }, []);


  return (
    <div
      className={cn(
        "flex-1 flex flex-col w-full bg-[#f8f9fa] dark:bg-[#111213] min-h-[calc(100vh-100px)] text-neutral-800 dark:text-neutral-200 select-none px-6 pt-6 pb-4 sm:px-12 sm:pt-8 sm:pb-5 relative justify-between animate-in fade-in duration-350 transition-all",
        refocusPulse && "brightness-[1.03] dark:brightness-[1.07] scale-[1.002] duration-150"
      )}
      style={{
        "--typing-accent": accentColor,
        "--typing-text-correct": "currentColor",
      } as React.CSSProperties}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest("select, option, button, a") && countdown === null && strictViolation === null) {
          inputRef.current?.focus();
        }
      }}
    >
      <input
        ref={inputRef}
        id="typing-screen-input"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        className="fixed top-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
        onBlur={() => setIsFocused(false)}
        onFocus={handleInputFocus}
        spellCheck={false}
        defaultValue=""
        tabIndex={-1}
        disabled={countdown !== null || strictViolation !== null}
        autoFocus
      />

      <AnimatePresence>
        {countdown !== null && isRecoveredSessionRef.current && (
          <SessionRecoveryOverlay
            remaining={countdown}
            accentColor={accentColor}
            title="Welcome back."
            message="Your practice session was saved exactly as you left it."
            onResume={() => setCountdown(0)}
            onCancel={() => onConfigureSession?.()}
          />
        )}
        {countdown !== null && !isRecoveredSessionRef.current && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeInOut" } }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#f8f9fa]/96 dark:bg-[#111213]/97 z-[99]"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 350, damping: 20 } }}
              exit={{ scale: 1.6, opacity: 0, transition: { duration: 0.4, ease: "easeOut" } }}
              className="text-[120px] font-extrabold text-[var(--typing-accent)] font-mono select-none"
              style={{ textShadow: `0 0 30px ${accentColor}66` }}
            >
              {countdown > 0 ? countdown : "GO!"}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-center w-full max-w-5xl mx-auto transition-opacity duration-500 text-[11px] font-semibold gap-4 select-none mb-6 shrink-0 opacity-50 hover:opacity-100">
        <div className="flex items-center gap-4 text-neutral-500 dark:text-neutral-400 font-mono">
          <button onClick={onBack} className="flex items-center gap-1.5 hover:text-[var(--typing-accent)] cursor-pointer p-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> return to editor
          </button>
          <span className="text-neutral-300 dark:text-neutral-800">|</span>
          <button onClick={onConfigureSession} className="flex items-center gap-1.5 hover:text-[var(--typing-accent)] cursor-pointer p-1 transition-colors">
            configure session
          </button>
        </div>
      </div>

      <div ref={textAreaOuterRef} className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center relative my-2 min-h-0">

        {/* Hidden single-line probe: same font/size/line-height as the real
            preview text, used only to measure the true rendered line
            height so the box below can be sized to an exact whole-line
            multiple (see the ResizeObserver effect above). */}
        <span
          ref={lineProbeRef}
          aria-hidden="true"
          className="absolute -z-10 opacity-0 pointer-events-none text-2xl leading-relaxed"
          style={{ fontFamily: "var(--app-font-family, monospace)" }}
        >
          Mg
        </span>

        <div ref={statsRowRef} className="mb-4 flex min-h-8 items-center justify-between opacity-100 transition-opacity duration-200">
          <div className="flex-1" />
          <div className="flex items-baseline gap-6 font-mono">
            <span className="tabular-nums flex items-baseline">
                <span id="typing-live-time-val" data-elapsed="0" className="font-bold text-neutral-800 dark:text-neutral-200 text-lg">
                   {limitMin > 0 ? limitMin * 60 : 0}
                </span>
                <span id="typing-live-time-unit" className="text-neutral-400 dark:text-neutral-500 text-sm lowercase font-semibold ml-0.5 select-none font-mono">
                   s
                </span>
            </span>
            {liveStats && (
              <>
                <span className="tabular-nums flex items-baseline">
                  <span id="typing-live-wpm" className="font-bold text-neutral-800 dark:text-neutral-200 text-lg">0</span>
                  <span className="ml-0.5 text-neutral-400 dark:text-neutral-500 text-xs lowercase font-semibold select-none">wpm</span>
                </span>
                <span className="tabular-nums flex items-baseline">
                  <span id="typing-live-acc" className="font-bold text-neutral-800 dark:text-neutral-200 text-lg">100</span>
                  <span className="ml-0.5 text-neutral-400 dark:text-neutral-500 text-xs lowercase font-semibold select-none">% acc</span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="relative w-full overflow-hidden transition-[height] duration-150 ease-out" style={{ height: lineHeightPx * visibleLines }} onClick={() => inputRef.current?.focus()}>
          <div ref={wordsContainerRef} className="relative w-full text-2xl leading-relaxed flex flex-wrap gap-x-2.5 gap-y-1 transition-transform duration-100 ease-out will-change-transform" style={{ fontFamily: "var(--app-font-family, monospace)" }}>


            <div
               key={`cursor-${testSessionId}`}
               id="typing-hardware-cursor"
               ref={cursorRef}
               className={cn("absolute top-0 left-0 w-0.5 h-[1.2em] rounded-full z-30 pointer-events-none bg-[var(--typing-accent)] typing-cursor", (isFocused && countdown === null) ? "opacity-100" : "opacity-0")}
               style={{ transition: "opacity 0.1s" }}
            />

            {/* Static Single-Pass Word Render */}
            <StaticWords key={testSessionId} words={words} />
          </div>

          <AnimatePresence>
            {!isFocused && countdown === null && (
              <motion.div
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-40 flex cursor-pointer flex-col items-center justify-center gap-3 bg-white/45 dark:bg-[#111213]/45"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs bg-neutral-100/50 dark:bg-neutral-900/50 px-3 py-1 rounded-full shadow-sm border border-neutral-200 dark:border-white/10">
                  <span>Click or press any key to focus</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Hint renders here for Classic (or when keyboard is hidden).
          For Das it moves inside KeyboardSection so it sits right at the
          keyboard's top border and the text area reclaims the freed space. */}
      {!(showKeyboard && keyboardModel === "das_keyboard_4") && (
        <div className="flex justify-center items-center mt-2 mb-1 select-none opacity-40 hover:opacity-85 transition-opacity duration-200">
          <span className="text-[10px] font-mono tracking-widest text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 uppercase">
            <span className="px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 font-extrabold shadow-sm">Tab</span>
            <span>+</span>
            <span className="px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 font-extrabold shadow-sm">Enter</span>
            <span className="ml-1 text-neutral-450 dark:text-neutral-500">to restart test</span>
          </span>
        </div>
      )}

      {showKeyboard && (
        <KeyboardSection
          themeName={currentTheme}
          accentColor={accentColor}
          onKeyVirtualDown={handleKeyVirtualDown}
          onKeyVirtualUp={handleKeyVirtualUp}
          virtualShiftActive={virtualShiftActive}
          virtualCapsLockActive={virtualCapsLockActive}
          showRestartHint={keyboardModel === "das_keyboard_4"}
        />
      )}

      {/* Tailwind Utility Safelist for DOM Engine */}
      <div className="hidden text-neutral-900 dark:text-neutral-100 text-red-500 font-bold font-normal transition-colors duration-60 after:absolute after:right-0 after:bottom-0 after:left-0 after:h-[2px] after:rounded-full after:bg-red-500/50" aria-hidden="true" />

      {strictViolation && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-[#111213]/95 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="flex flex-col items-center max-w-md text-center px-6 py-4 animate-in fade-in zoom-in-95 duration-350">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-10 h-10 text-red-500 mb-4 animate-bounce">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>

            {/* Title / Heading */}
            <h3 className="text-[12px] font-bold tracking-wider uppercase text-neutral-400 dark:text-neutral-500 font-sans">
              Rule Violated
            </h3>


            <p className="text-[16px] md:text-[18px] font-medium text-neutral-800 dark:text-neutral-200 mt-2 font-sans tracking-tight max-w-sm leading-relaxed">
              {strictViolation}
            </p>

            {/* Interactive Minimalist Restart Option - Just text + SVG with seamless hover */}
            <div className="flex items-center gap-6 mt-8">
              <button
                onClick={() => { setStrictViolation(null); onConfigureSession(); }}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-200 focus:outline-none cursor-pointer"
              >
                <span>Edit Rules</span>
              </button>

              <div className="h-4 w-[1px] bg-neutral-200 dark:bg-neutral-800" />

              <button
                onClick={() => { setStrictViolation(null); resetTest(); }}
                className="flex items-center gap-2 text-[13px] font-bold text-neutral-800 dark:text-neutral-100 hover:opacity-85 transition-opacity focus:outline-none cursor-pointer group"
              >
                <span>Try Again</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 group-hover:rotate-45 transition-transform duration-200">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
