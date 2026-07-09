import React, { useEffect, useRef, useState, useMemo } from "react";
import { useSettings } from "../../contexts/SettingsContext";
import { Volume2, VolumeX, Play, Pause, SkipBack, SkipForward, Moon } from "lucide-react";

export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

interface DasKeyboardProps {
  onKeyVirtualDown?: (code: string) => void;
  onKeyVirtualUp?: (code: string) => void;
  virtualShiftActive?: boolean;
  virtualCapsLockActive?: boolean;
}


const U = 44;

type KeyDef = { code: string; label: string[]; x: number; y: number; w: number; h?: number; altLabel?: boolean; align?: "left" | "center" | "left-stacked" };

const DAS_LAYOUT: KeyDef[] = [

  { code: "Escape", label: ["Esc"], x: 0, y: 1, w: 1, align: "left" },
  { code: "F1", label: ["F1"], x: 2, y: 1, w: 1, align: "left" },
  { code: "F2", label: ["F2"], x: 3, y: 1, w: 1, align: "left" },
  { code: "F3", label: ["F3"], x: 4, y: 1, w: 1, align: "left" },
  { code: "F4", label: ["F4"], x: 5, y: 1, w: 1, align: "left" },
  { code: "F5", label: ["F5"], x: 6.5, y: 1, w: 1, align: "left" },
  { code: "F6", label: ["F6"], x: 7.5, y: 1, w: 1, align: "left" },
  { code: "F7", label: ["F7"], x: 8.5, y: 1, w: 1, align: "left" },
  { code: "F8", label: ["F8"], x: 9.5, y: 1, w: 1, align: "left" },
  { code: "F9", label: ["F9"], x: 11, y: 1, w: 1, align: "left" },
  { code: "F10", label: ["F10"], x: 12, y: 1, w: 1, align: "left" },
  { code: "F11", label: ["F11"], x: 13, y: 1, w: 1, align: "left" },
  { code: "F12", label: ["F12"], x: 14, y: 1, w: 1, align: "left" },
  { code: "PrintScreen", label: ["Prt", "Sc"], x: 15.5, y: 1, w: 1, altLabel: true, align: "left-stacked" },
  { code: "ScrollLock", label: ["Scr", "Lk"], x: 16.5, y: 1, w: 1, align: "left-stacked" },
  { code: "Pause", label: ["Pause"], x: 17.5, y: 1, w: 1, align: "center" },


  { code: "Backquote", label: ["~", "`"], x: 0, y: 2.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Digit1", label: ["!", "1"], x: 1, y: 2.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Digit2", label: ["@", "2"], x: 2, y: 2.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Digit3", label: ["#", "3"], x: 3, y: 2.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Digit4", label: ["$", "4"], x: 4, y: 2.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Digit5", label: ["%", "5"], x: 5, y: 2.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Digit6", label: ["^", "6"], x: 6, y: 2.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Digit7", label: ["&", "7"], x: 7, y: 2.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Digit8", label: ["*", "8"], x: 8, y: 2.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Digit9", label: ["(", "9"], x: 9, y: 2.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Digit0", label: [")", "0"], x: 10, y: 2.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Minus", label: ["_", "-"], x: 11, y: 2.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Equal", label: ["+", "="], x: 12, y: 2.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Backspace", label: ["Backspace"], x: 13, y: 2.5, w: 2, align: "center" },

  { code: "Insert", label: ["Ins"], x: 15.5, y: 2.5, w: 1, align: "left-stacked" },
  { code: "Home", label: ["Home"], x: 16.5, y: 2.5, w: 1, align: "left-stacked" },
  { code: "PageUp", label: ["Page", "Up"], x: 17.5, y: 2.5, w: 1, align: "left-stacked" },

  { code: "NumLock", label: ["Num", "Lk"], x: 19, y: 2.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "NumpadDivide", label: ["/"], x: 20, y: 2.5, w: 1, align: "left" },
  { code: "NumpadMultiply", label: ["*"], x: 21, y: 2.5, w: 1, align: "center" },
  { code: "NumpadSubtract", label: ["-"], x: 22, y: 2.5, w: 1, align: "center" },


  { code: "Tab", label: ["Tab"], x: 0, y: 3.5, w: 1.5, align: "left" },
  { code: "KeyQ", label: ["Q"], x: 1.5, y: 3.5, w: 1, align: "left" },
  { code: "KeyW", label: ["W"], x: 2.5, y: 3.5, w: 1, align: "left" },
  { code: "KeyE", label: ["E"], x: 3.5, y: 3.5, w: 1, align: "left" },
  { code: "KeyR", label: ["R"], x: 4.5, y: 3.5, w: 1, align: "left" },
  { code: "KeyT", label: ["T"], x: 5.5, y: 3.5, w: 1, align: "left" },
  { code: "KeyY", label: ["Y"], x: 6.5, y: 3.5, w: 1, align: "left" },
  { code: "KeyU", label: ["U"], x: 7.5, y: 3.5, w: 1, align: "left" },
  { code: "KeyI", label: ["I"], x: 8.5, y: 3.5, w: 1, align: "left" },
  { code: "KeyO", label: ["O"], x: 9.5, y: 3.5, w: 1, align: "left" },
  { code: "KeyP", label: ["P"], x: 10.5, y: 3.5, w: 1, align: "left" },
  { code: "BracketLeft", label: ["{", "["], x: 11.5, y: 3.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "BracketRight", label: ["}", "]"], x: 12.5, y: 3.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Backslash", label: ["|", "\\"], x: 13.5, y: 3.5, w: 1.5, altLabel: true, align: "left-stacked" },

  { code: "Delete", label: ["Del"], x: 15.5, y: 3.5, w: 1, align: "left-stacked" },
  { code: "End", label: ["End"], x: 16.5, y: 3.5, w: 1, align: "left-stacked" },
  { code: "PageDown", label: ["Page", "Down"], x: 17.5, y: 3.5, w: 1, align: "left-stacked" },

  { code: "Numpad7", label: ["7", "Home"], x: 19, y: 3.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Numpad8", label: ["8", "↑"], x: 20, y: 3.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Numpad9", label: ["9", "PgUp"], x: 21, y: 3.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "NumpadAdd", label: ["+"], x: 22, y: 3.5, w: 1, h: 2, align: "left" },


  { code: "CapsLock", label: ["Caps Lock"], x: 0, y: 4.5, w: 1.75, align: "left" },
  { code: "KeyA", label: ["A"], x: 1.75, y: 4.5, w: 1, align: "left" },
  { code: "KeyS", label: ["S"], x: 2.75, y: 4.5, w: 1, align: "left" },
  { code: "KeyD", label: ["D"], x: 3.75, y: 4.5, w: 1, align: "left" },
  { code: "KeyF", label: ["F"], x: 4.75, y: 4.5, w: 1, align: "left" },
  { code: "KeyG", label: ["G"], x: 5.75, y: 4.5, w: 1, align: "left" },
  { code: "KeyH", label: ["H"], x: 6.75, y: 4.5, w: 1, align: "left" },
  { code: "KeyJ", label: ["J"], x: 7.75, y: 4.5, w: 1, align: "left" },
  { code: "KeyK", label: ["K"], x: 8.75, y: 4.5, w: 1, align: "left" },
  { code: "KeyL", label: ["L"], x: 9.75, y: 4.5, w: 1, align: "left" },
  { code: "Semicolon", label: [":", ";"], x: 10.75, y: 4.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Quote", label: ['"', "'"], x: 11.75, y: 4.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Enter", label: ["Enter"], x: 12.75, y: 4.5, w: 2.25, align: "left" },

  { code: "Numpad4", label: ["4", "←"], x: 19, y: 4.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Numpad5", label: ["5"], x: 20, y: 4.5, w: 1, align: "left-stacked" },
  { code: "Numpad6", label: ["6", "→"], x: 21, y: 4.5, w: 1, altLabel: true, align: "left-stacked" },


  { code: "ShiftLeft", label: ["Shift"], x: 0, y: 5.5, w: 2.25, align: "left" },
  { code: "KeyZ", label: ["Z"], x: 2.25, y: 5.5, w: 1, align: "left" },
  { code: "KeyX", label: ["X"], x: 3.25, y: 5.5, w: 1, align: "left" },
  { code: "KeyC", label: ["C"], x: 4.25, y: 5.5, w: 1, align: "left" },
  { code: "KeyV", label: ["V"], x: 5.25, y: 5.5, w: 1, align: "left" },
  { code: "KeyB", label: ["B"], x: 6.25, y: 5.5, w: 1, align: "left" },
  { code: "KeyN", label: ["N"], x: 7.25, y: 5.5, w: 1, align: "left" },
  { code: "KeyM", label: ["M"], x: 8.25, y: 5.5, w: 1, align: "left" },
  { code: "Comma", label: ["<", ","], x: 9.25, y: 5.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Period", label: [">", "."], x: 10.25, y: 5.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Slash", label: ["?", "/"], x: 11.25, y: 5.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "ShiftRight", label: ["Shift"], x: 12.25, y: 5.5, w: 2.75, align: "left" },

  { code: "ArrowUp", label: ["▲"], x: 16.5, y: 5.5, w: 1, align: "center" },

  { code: "Numpad1", label: ["1", "End"], x: 19, y: 5.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Numpad2", label: ["2", "↓"], x: 20, y: 5.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "Numpad3", label: ["3", "PgDn"], x: 21, y: 5.5, w: 1, altLabel: true, align: "left-stacked" },
  { code: "NumpadEnter", label: ["Enter"], x: 22, y: 5.5, w: 1, h: 2, align: "left" },


  { code: "ControlLeft", label: ["Ctrl"], x: 0, y: 6.5, w: 1.25, align: "left" },
  { code: "MetaLeft", label: ["Win"], x: 1.25, y: 6.5, w: 1.25, align: "left" },
  { code: "AltLeft", label: ["Alt"], x: 2.5, y: 6.5, w: 1.25, align: "left" },
  { code: "Space", label: [""], x: 3.75, y: 6.5, w: 6.25, align: "center" },
  { code: "AltRight", label: ["Alt"], x: 10, y: 6.5, w: 1.25, align: "left" },
  { code: "MetaRight", label: ["Win"], x: 11.25, y: 6.5, w: 1.25, align: "left" },
  { code: "ContextMenu", label: ["≡"], x: 12.5, y: 6.5, w: 1.25, align: "center" },
  { code: "ControlRight", label: ["Ctrl"], x: 13.75, y: 6.5, w: 1.25, align: "left" },

  { code: "ArrowLeft", label: ["◀"], x: 15.5, y: 6.5, w: 1, align: "center" },
  { code: "ArrowDown", label: ["▼"], x: 16.5, y: 6.5, w: 1, align: "center" },
  { code: "ArrowRight", label: ["▶"], x: 17.5, y: 6.5, w: 1, align: "center" },

  { code: "Numpad0", label: ["0", "Ins"], x: 19, y: 6.5, w: 2, altLabel: true, align: "left-stacked" },
  { code: "NumpadDecimal", label: [".", "Del"], x: 21, y: 6.5, w: 1, altLabel: true, align: "left-stacked" },
];


const KeyCap = React.memo(({
  keyData,
  onDown,
  renderLabel,
  activeSwitch
}: {
  keyData: KeyDef;
  onDown: (code: string) => void;
  renderLabel: (key: KeyDef) => React.ReactNode;
  activeSwitch: string;
}) => {
  const w = keyData.w * U - 4;
  const h = (keyData.h || 1) * U - 4;
  const x = keyData.code === "Escape" ? keyData.x * U - 1.0 : keyData.x * U;
  const y = keyData.y * U;





  const tactileEasing = useMemo(() => {
    switch (activeSwitch) {
      case "blue":

        return "cubic-bezier(0.5, 0, 0.7, 0.15)";
      case "brown":

        return "cubic-bezier(0.35, 0, 0.45, 1)";
      case "red":

        return "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      default:
        return "cubic-bezier(0.1, 0.8, 0.3, 1)";
    }
  }, [activeSwitch]);

  const tactileDuration = useMemo(() => {
    switch (activeSwitch) {
      case "blue": return "55ms";
      case "brown": return "45ms";
      case "red": return "35ms";
      default: return "40ms";
    }
  }, [activeSwitch]);

  return (
    <div
      id={`das-key-${keyData.code}`}
      onMouseDown={(e) => {
        e.preventDefault();
        onDown(keyData.code);
      }}
      className="absolute cursor-pointer touch-none select-none appearance-none group z-20 data-[pressed=true]:z-10 data-[pressed=true]:translate-y-[6px] transition-transform duration-[150ms] ease-[cubic-bezier(0.175,0.885,0.32,1.275)]"
      style={{
        width: w,
        height: h,
        left: x,
        top: y,

        transitionDuration: "var(--active-duration, 150ms)",
        transitionTimingFunction: "var(--active-easing, ease-out)",
      } as React.CSSProperties}
    >

      <style dangerouslySetInnerHTML={{ __html: `
        #das-key-${keyData.code}[data-pressed="true"] {
          --active-duration: ${tactileDuration};
          --active-easing: ${tactileEasing};
        }
      `}} />
      {/* Backlight Underglow (Surgical Point-Source LED) */}
      <div
        className="absolute inset-x-[-3px] top-[-4px] bottom-[2px] -z-10 rounded-[6px] opacity-25 group-data-[pressed=true]:opacity-50 transition-all duration-150 ease-out"
        style={{
          background: "radial-gradient(circle at 50% 15%, rgba(255, 255, 255, 0.4) 0%, transparent 80%)",
          filter: "blur(3px)",
          boxShadow: `
            0 -2px 10px rgba(255, 255, 255, 0.08),
            0 0 15px rgba(255, 255, 255, 0.05)
          `
        }}
      />

      <div
        className="absolute left-[50%] top-[15%] -translate-x-1/2 -translate-y-1/2 w-4 h-3 -z-10 opacity-30 group-data-[pressed=true]:opacity-60 transition-opacity duration-150"
        style={{
          background: "radial-gradient(circle at center, white 0%, transparent 85%)",
          filter: "blur(1.5px)"
        }}
      />

      {/* Heavy-Duty Industrial Skirt (Sidewall) */}
      <div
        className="absolute inset-x-0 bottom-[-6px] h-[10px] bg-[#0a0a0c] rounded-b-[4px] border-x border-b border-black/50 z-0 group-data-[pressed=true]:hidden"
        style={{
          opacity: 0.98,
          boxShadow: "0 4px 6px rgba(0,0,0,0.4)"
        }}
      />

      <div
        className={cn(
          "absolute inset-0 flex items-start justify-center overflow-hidden rounded-[2px] border border-black/90 transition-all duration-75 transform-gpu h-full z-10",
          "bg-[#1c1c1e]",
          "shadow-[0_8px_0_#080808,0_12px_18px_rgba(0,0,0,0.8)]",
          "group-data-[pressed=true]:shadow-[inset_0_3px_5px_rgba(0,0,0,0.9),0_0_12px_rgba(255,255,255,0.1)]",
          "group-data-[error=true]:shadow-[0_0_15px_2px_rgba(255,0,0,0.9),0_2px_4px_rgba(0,0,0,0.9)]"
        )}
      >
        <div className="absolute right-0 bottom-0 z-0 h-[1.5px] w-6 translate-x-2 transition-all duration-75 transform-gpu bg-[#000] rotate-[65deg] group-data-[pressed=true]:rotate-[55deg]" />
        <div className="absolute bottom-0 left-0 z-0 h-[1.5px] w-6 -translate-x-2 transition-all duration-75 transform-gpu bg-[#000] -rotate-[65deg] group-data-[pressed=true]:-rotate-[55deg]" />

        {/* PBT Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay z-20"
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

        <div
          className="absolute z-10 transition-all duration-75 border-black/90 border"
          style={{
            borderRadius: "1.5px",
            top: "1px",
            bottom: keyData.code === "Space" ? "1px" : "4.5px",
            left: "3.5px",
            right: "3.5px",
            background: "linear-gradient(180deg, #2c2c2f 0%, #161618 100%)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            borderLeft: "1px solid rgba(255,255,255,0.03)",
            borderRight: "1px solid rgba(255,255,255,0.03)",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.02), inset 0 -1.5px 3px rgba(0,0,0,0.7)"
          }}
        >
          {renderLabel(keyData)}
        </div>
      </div>
    </div>
  );
});

KeyCap.displayName = "KeyCap";

export const DasKeyboard = React.memo(({
  onKeyVirtualDown,
  onKeyVirtualUp,
  virtualShiftActive = false,
  virtualCapsLockActive = false,
}: DasKeyboardProps) => {
  const {
    soundVolume,
    setSoundVolume,
    soundEnabled,
    setSoundEnabled,
    activeSwitch,
    zenNoiseEnabled,
    setZenNoiseEnabled,
    zenNoiseType,
    setZenNoiseType,
    zenNoiseVolume,
    setZenNoiseVolume
  } = useSettings();

  const [locks, setLocks] = useState({ NumLock: true, ScrollLock: false, CapsLock: false });

  // Initialize rotation based on the current active volume (Zen if enabled, else Keyboard)
  const [rotation, setRotation] = useState(() => {
    const initialVol = zenNoiseEnabled ? zenNoiseVolume : soundVolume;
    return initialVol * 360;
  });
  const dragStartY = useRef(0);
  const dragStartVolume = useRef(0);

  // Sync virtual locks
  useEffect(() => {
    // Handle Virtual Shift
    const shiftLeft = document.getElementById('das-key-ShiftLeft');
    const shiftRight = document.getElementById('das-key-ShiftRight');
    if (shiftLeft && shiftRight) {
      if (virtualShiftActive) {
        shiftLeft.setAttribute("data-pressed", "true");
        shiftRight.setAttribute("data-pressed", "true");
      } else {
        shiftLeft.removeAttribute("data-pressed");
        shiftRight.removeAttribute("data-pressed");
      }
    }

    // Handle Virtual CapsLock
    const capsLock = document.getElementById('das-key-CapsLock');
    if (capsLock) {
      if (virtualCapsLockActive) {
        capsLock.setAttribute("data-pressed", "true");
      } else {
        capsLock.removeAttribute("data-pressed");
      }
    }
  }, [virtualShiftActive, virtualCapsLockActive]);

// --- Indicator Sync Heartbeat ---
  useEffect(() => {
    const handleSync = (e: KeyboardEvent | MouseEvent | FocusEvent) => {
      // We check modifier state from the event if available,
      // or from a dummy event if it's a focus event (though limited support)
      const target = (e as any).getModifierState ? (e as any) : null;

      if (target) {
        const isNumActive = target.getModifierState('NumLock');
        const isScrollActive = target.getModifierState('ScrollLock');
        const isCapsActive = target.getModifierState('CapsLock');

        setLocks((prev) => {
          let num = isNumActive;
          let scroll = isScrollActive;
          let caps = isCapsActive;

          // If the keydown event is for the lock keys, toggle the corresponding state
          if (e.type === "keydown" && !(e as KeyboardEvent).repeat) {
            const ke = e as KeyboardEvent;
            if (ke.code === "CapsLock") {
              caps = !prev.CapsLock;
            } else if (ke.code === "NumLock") {
              num = !prev.NumLock;
            } else if (ke.code === "ScrollLock") {
              scroll = !prev.ScrollLock;
            }
          }

          return {
            NumLock: num,
            ScrollLock: scroll,
            CapsLock: caps || virtualCapsLockActive
          };
        });
      }
    };

    const syncOnFocus = () => {
      // Force a sync check on next interaction or using a temporary listener
      // Browsers are strict about getModifierState outside of real events
      window.addEventListener('mousemove', handleSync as any, { once: true });
    };

    window.addEventListener("keydown", handleSync as any);
    window.addEventListener("keyup", handleSync as any);
    window.addEventListener("mousedown", handleSync as any);
    window.addEventListener("focus", syncOnFocus);

    return () => {
      window.removeEventListener("keydown", handleSync as any);
      window.removeEventListener("keyup", handleSync as any);
      window.removeEventListener("mousedown", handleSync as any);
      window.removeEventListener("focus", syncOnFocus);
    };
  }, [virtualCapsLockActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const el = document.getElementById(`das-key-${e.code}`);
      if (el) el.setAttribute("data-pressed", "true");
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const el = document.getElementById(`das-key-${e.code}`);
      if (el) {
        // Only remove if it's not a virtual locked key
        if (!(virtualCapsLockActive && e.code === "CapsLock") &&
            !(virtualShiftActive && (e.code === "ShiftLeft" || e.code === "ShiftRight"))) {
          el.removeAttribute("data-pressed");
        }
      }
    };

    const handleErrorBump = (e: Event) => {
      const evt = e as CustomEvent<{ code: string }>;
      const code = evt.detail?.code;
      if (code) {
        const el = document.getElementById(`das-key-${code}`);
        if (el) {
          el.setAttribute("data-error", "true");
          setTimeout(() => {
            el.removeAttribute("data-error");
          }, 250);
        }
      }
    };

    const handleWindowInteraction = (e: MouseEvent | KeyboardEvent) => {};
    const handleFocus = () => {};

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleWindowInteraction);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("typing-error", handleErrorBump);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleWindowInteraction);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("typing-error", handleErrorBump);
    };
  }, [virtualCapsLockActive, virtualShiftActive]);

  // Volume wheel dragging logic
  const handleKnobMouseDown = (e: React.MouseEvent) => {
    dragStartY.current = e.clientY;
    dragStartVolume.current = zenNoiseEnabled ? zenNoiseVolume : soundVolume;
    document.addEventListener("mousemove", handleKnobMouseMove);
    document.addEventListener("mouseup", handleKnobMouseUp);
  };

  const handleKnobMouseMove = (e: MouseEvent) => {
    const deltaY = e.clientY - dragStartY.current;
    const volumeChange = -deltaY / 150;
    const newVolume = Math.min(1, Math.max(0, dragStartVolume.current + volumeChange));

    if (zenNoiseEnabled) {
      setZenNoiseVolume(newVolume);
    } else {
      setSoundVolume(newVolume);
    }
    setRotation(newVolume * 360);
  };

  const handleKnobMouseUp = () => {
    document.removeEventListener("mousemove", handleKnobMouseMove);
    document.removeEventListener("mouseup", handleKnobMouseUp);
  };

  const handleKnobWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.02 : 0.02;
    const currentVol = zenNoiseEnabled ? zenNoiseVolume : soundVolume;
    const newVolume = Math.min(1, Math.max(0, currentVol + delta));

    if (zenNoiseEnabled) {
      setZenNoiseVolume(newVolume);
    } else {
      setSoundVolume(newVolume);
    }
    setRotation(newVolume * 360);
  };

  const skipZen = (direction: "prev" | "next") => {
    const types = ["rain", "celestial", "forest", "none"];
    const idx = types.indexOf(zenNoiseType);
    let nextIdx = direction === "next" ? idx + 1 : idx - 1;
    if (nextIdx >= types.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = types.length - 1;
    setZenNoiseType(types[nextIdx]);
  };

  // Dimensions of the chassis based on Unit layout
  const chassisWidth = 23 * U + 54;
  const chassisHeight = 8.1 * U + 32;

  // Custom SVG path for the extended top right corner of the Das Keyboard 4
  const slopeStart = 17.3 * U + 12;
  const slopeEnd = 18.7 * U + 12;
  const topY = 0;
  const bottomY = chassisHeight;
  const midY = 0.8 * U;
  const radius = 18;
  const sR = 12; // slope radius

  const knobYCenter = 85;
  const notchRadius = 45;
  const notchCutIn = 14; // How deep the notch bites into the chassis edge

  const chassisPath = `
    M ${radius} ${midY}
    L ${slopeStart - sR} ${midY}
    Q ${slopeStart} ${midY} ${slopeStart + (slopeEnd - slopeStart) * 0.1} ${midY - (midY - topY) * 0.1}
    L ${slopeEnd - (slopeEnd - slopeStart) * 0.1} ${topY + (midY - topY) * 0.1}
    Q ${slopeEnd} ${topY} ${slopeEnd + sR} ${topY}
    L ${chassisWidth - radius} ${topY}
    A ${radius} ${radius} 0 0 1 ${chassisWidth} ${topY + radius}
    L ${chassisWidth} ${knobYCenter - notchRadius}
    A ${notchRadius} ${notchRadius} 0 0 0 ${chassisWidth - notchCutIn} ${knobYCenter}
    A ${notchRadius} ${notchRadius} 0 0 0 ${chassisWidth} ${knobYCenter + notchRadius}
    L ${chassisWidth} ${bottomY - radius}
    A ${radius} ${radius} 0 0 1 ${chassisWidth - radius} ${bottomY}
    L ${radius} ${bottomY}
    A ${radius} ${radius} 0 0 1 0 ${bottomY - radius}
    L 0 ${midY + radius}
    A ${radius} ${radius} 0 0 1 ${radius} ${midY}
    Z
  `;

  // Notch Rim Light Path (The sharp crimson reflection on the chassis inner edge)
  const notchRimPath = `
    M ${chassisWidth} ${knobYCenter - notchRadius}
    A ${notchRadius} ${notchRadius} 0 0 0 ${chassisWidth - notchCutIn} ${knobYCenter}
    A ${notchRadius} ${notchRadius} 0 0 0 ${chassisWidth} ${knobYCenter + notchRadius}
  `;

  // Custom helper to render keycap labels with absolute 1:1 typographic fidelity
  const renderKeyLabel = (key: KeyDef) => {
    const textColorClasses = "text-white das-etched-text group-data-[pressed=true]:brightness-125 group-data-[error=true]:text-[#ff5252] group-data-[error=true]:drop-shadow-[0_0_6px_rgba(255,82,82,0.8)]";

    // Special check for PrtSc, ScrollLock, Pause, Insert, Home, PageUp, Delete, End, PageDown
    const isControlKey = ["PrintScreen", "ScrollLock", "Pause", "Insert", "Home", "PageUp", "Delete", "End", "PageDown"].includes(key.code);
    if (isControlKey) {
      if (key.code === "Pause" || key.code === "Insert" || key.code === "Delete" || key.code === "Home" || key.code === "End") {
        let displayLabel = key.label[0];
        if (key.code === "Insert") displayLabel = "Ins";
        if (key.code === "Delete") displayLabel = "Del";
        return (
          <div
            className={`flex items-center justify-center h-full w-full pt-[2px] text-center text-[9px] font-semibold tracking-tight leading-none select-none das-etched-text ${textColorClasses}`}
          >
            {displayLabel}
          </div>
        );
      }

      // Vertical stacked legends (PrintScreen, ScrollLock, PageUp, PageDown)
      let topLabel = "";
      let bottomLabel = "";
      if (key.code === "PrintScreen") { topLabel = "Prt"; bottomLabel = "Sc"; }
      else if (key.code === "ScrollLock") { topLabel = "Scr"; bottomLabel = "Lk"; }
      else if (key.code === "PageUp") { topLabel = "Page"; bottomLabel = "Up"; }
      else if (key.code === "PageDown") { topLabel = "Page"; bottomLabel = "Down"; }

      return (
        <div
          className={`flex flex-col items-center justify-center h-full w-full pt-[2px] text-center leading-[1.1] select-none das-etched-text ${textColorClasses}`}
        >
          <span className="text-[9px] font-semibold tracking-tight">{topLabel}</span>
          <span className="text-[9px] font-semibold tracking-tight mt-[1px]">{bottomLabel}</span>
        </div>
      );
    }

    // Special icon for Context Menu
    if (key.code === "ContextMenu") {
      return (
        <div className={`flex items-center justify-center w-full h-full ${textColorClasses}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" className="stroke-current stroke-2 fill-none opacity-90">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </div>
      );
    }

    // Arrow keys
    if (key.code === "ArrowUp") {
      return (
        <div className={`flex items-center justify-center w-full h-full ${textColorClasses}`}>
          <svg width="9" height="9" viewBox="0 0 10 10" className="fill-current opacity-90">
            <path d="M5,1 L9,8 L1,8 Z" />
          </svg>
        </div>
      );
    }
    if (key.code === "ArrowDown") {
      return (
        <div className={`flex items-center justify-center w-full h-full ${textColorClasses}`}>
          <svg width="9" height="9" viewBox="0 0 10 10" className="fill-current opacity-90">
            <path d="M5,9 L1,2 L9,2 Z" />
          </svg>
        </div>
      );
    }
    if (key.code === "ArrowLeft") {
      return (
        <div className={`flex items-center justify-center w-full h-full ${textColorClasses}`}>
          <svg width="9" height="9" viewBox="0 0 10 10" className="fill-current opacity-90">
            <path d="M1,5 L8,9 L8,1 Z" />
          </svg>
        </div>
      );
    }
    if (key.code === "ArrowRight") {
      return (
        <div className={`flex items-center justify-center w-full h-full ${textColorClasses}`}>
          <svg width="9" height="9" viewBox="0 0 10 10" className="fill-current opacity-90">
            <path d="M9,5 L2,1 L2,9 Z" />
          </svg>
        </div>
      );
    }

    // Esc & Function keys (Esc, F1 - F12) -> Perfectly Centered
    if (key.code === "Escape" || key.code.startsWith("F") && !isNaN(Number(key.code.substring(1)))) {
      const displayLabel = key.code === "Escape" ? "Esc" : key.label[0];
      return (
        <div
          className={`flex items-center justify-center w-full h-full pt-[2px] text-center text-[10px] font-semibold tracking-tight select-none das-etched-text ${textColorClasses}`}
        >
          {displayLabel}
        </div>
      );
    }

    // Letters (Uppercase, top-left aligned)
    if (key.code.startsWith("Key")) {
      return (
        <div
          className={`flex items-start justify-start w-full h-full pt-[3px] pl-[5px] text-[11px] font-medium tracking-wide das-etched-text ${textColorClasses}`}
        >
          {key.label[0]}
        </div>
      );
    }

    // Stacked legends (Numbers row & punctuation & numpad)
    if (key.align === "left-stacked") {
      const topLabel = key.label[0];
      const bottomLabel = key.label[1] || "";

      // Numpad stacked and main number row stacked
      return (
        <div
          className={`flex flex-col items-start justify-start h-full w-full pt-[2.5px] pl-[4px] leading-[1.1] select-none das-etched-text ${textColorClasses}`}
        >
          <span className="text-[9.5px] font-semibold opacity-95">{topLabel}</span>
          <span className="text-[9px] font-medium opacity-85">{bottomLabel}</span>
        </div>
      );
    }

    // Windows Key (Branded Das Keyboard Chevron)
    if (key.code === "MetaLeft" || key.code === "MetaRight") {
      return (
        <div className="flex items-center justify-center w-full h-full pb-[2px]">
          <svg viewBox="0 0 100 100" width="12" height="12" className="text-[#e52525] fill-current flex-shrink-0 group-data-[pressed=true]:drop-shadow-[0_0_8px_rgba(229,37,37,0.6)]">
            {/* Top slanted block */}
            <path d="M 35 5 L 59 23 L 59 43 L 35 25 Z" />
            {/* Bottom chevron */}
            <path d="M 35 35 L 75 65 L 35 95 L 35 83 L 59 65 L 35 47 Z" />
          </svg>
        </div>
      );
    }

    // Numpad Enter, Numpad Add -> Centered both horizontally and vertically
    if (key.code === "NumpadEnter" || key.code === "NumpadAdd") {
      let displayLabel = key.label[0];
      if (key.code === "NumpadEnter") displayLabel = "Enter";
      return (
        <div
          className={`flex items-center justify-center w-full h-full pb-[2px] text-[10px] font-medium tracking-tight leading-none select-none das-etched-text ${textColorClasses}`}
        >
          {displayLabel}
        </div>
      );
    }

    // Modifiers (Vertically centered, left-aligned)
    const verticallyCenteredLeft = ["Tab", "CapsLock", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "Enter", "Backspace"];
    if (verticallyCenteredLeft.includes(key.code)) {
      let displayLabel = key.label[0];
      if (key.code === "CapsLock") displayLabel = "Caps Lock";
      if (key.code === "ShiftLeft" || key.code === "ShiftRight") displayLabel = "Shift";
      if (key.code === "ControlLeft" || key.code === "ControlRight") displayLabel = "Ctrl";
      if (key.code === "AltLeft" || key.code === "AltRight") displayLabel = "Alt";
      if (key.code === "Backspace") displayLabel = "Backspace";
      if (key.code === "Enter") displayLabel = "Enter";

      return (
        <div
          className={`flex items-center justify-start w-full h-full pl-[6px] pb-[2px] text-[10px] font-medium tracking-tight text-left leading-none select-none das-etched-text ${textColorClasses}`}
        >
          {displayLabel}
        </div>
      );
    }

    // Default top-left aligned fallback
    let fallbackLabel = key.label[0];
    return (
      <div
        className={`flex items-start justify-start w-full h-full pt-[4px] pl-[5px] text-[10px] font-medium tracking-tight leading-none select-none das-etched-text ${textColorClasses}`}
      >
        {fallbackLabel}
      </div>
    );
  };

  return (
    <div
      className="flex flex-col items-center justify-center select-none w-full overflow-visible pb-12 pt-8"
      style={{
        fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
        "--font-sans": '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif'
      } as React.CSSProperties}
    >
      {/* Container scales based on screen size but maintains absolute inner aspect ratio */}
      <div
        className="relative origin-top transition-transform duration-300 scale-[0.6] sm:scale-[0.65] md:scale-[0.7] lg:scale-[0.75] xl:scale-[0.8]"
        style={{
          width: chassisWidth,
          height: chassisHeight,
        }}
      >

        {/* Chassis SVG Background for Pixel-Perfect Drop Shadows and Gradients */}
        <div className="absolute inset-0 pointer-events-none drop-shadow-2xl">
          <svg width={chassisWidth} height={chassisHeight} viewBox={`0 0 ${chassisWidth} ${chassisHeight}`}>
            <defs>
              <linearGradient id="chassisGrad" x1="0" y1="0" x2="0.2" y2="1">
                <stop offset="0%" stopColor="#2e2e32" />
                <stop offset="15%" stopColor="#242428" />
                <stop offset="45%" stopColor="#1e1e22" />
                <stop offset="100%" stopColor="#161618" />
              </linearGradient>
              <linearGradient id="surfaceSheen" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="30%" stopColor="rgba(255,255,255,0.03)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="70%" stopColor="rgba(255,255,255,0.03)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
              <linearGradient id="chassisBevel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#45454b" />
                <stop offset="100%" stopColor="#050507" />
              </linearGradient>
              <filter id="shadow">
                <feDropShadow dx="0" dy="12" stdDeviation="16" floodOpacity="0.55" />
              </filter>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="blur" in2="SourceGraphic" operator="over" />
              </filter>
              {/* Powder Coated Texture Filter - Refined for high-end anodized finish */}
              <filter id="powderTexture" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="2.8" numOctaves="3" stitchTiles="stitch" result="noise" />
                <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 -1 0.12" result="lowOpacityNoise" />
                <feComposite operator="in" in="lowOpacityNoise" in2="SourceGraphic" />
              </filter>
            </defs>
            {/* Main Body with Shadow - No translation to prevent corner artifacts */}
            <path d={chassisPath} fill="url(#chassisGrad)" filter="url(#shadow)" stroke="#161618" strokeWidth="0.5" strokeLinejoin="round" />

            {/* Precision Inner-Glow Edge */}
            <path d={chassisPath} fill="transparent" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" strokeLinejoin="round" pointerEvents="none" />
            {/* Surface Sheen - Horizontal light refraction */}
            <path d={chassisPath} fill="url(#surfaceSheen)" pointerEvents="none" />
            {/* Anodized Aluminum Texture Overlay */}
            <path d={chassisPath} fill="#fff" filter="url(#powderTexture)" opacity="0.22" pointerEvents="none" />
            <path d={chassisPath} fill="#000" filter="url(#powderTexture)" opacity="0.12" pointerEvents="none" />
            {/* Precision Edge Highlight (Outer Rim Only) */}
            <mask id="outerEdgeOnly">
              <rect x="-50" y="-50" width={chassisWidth + 100} height={chassisHeight + 100} fill="white" />
              <path d={chassisPath} fill="black" />
            </mask>
            <path d={chassisPath} fill="transparent" stroke="rgba(255,255,255,0.14)" strokeWidth="0.5" strokeLinejoin="round" mask="url(#outerEdgeOnly)" transform="translate(0, -0.4)" />
            <path d={chassisPath} fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeLinejoin="round" mask="url(#outerEdgeOnly)" transform="translate(0.3, -0.5)" />
          </svg>
        </div>

        {/* --- TOP RIGHT MEDIA PANEL & LOGO --- */}
        <div className="absolute right-[12px] top-[24px] flex items-start gap-[12px] z-10 select-none">

          {/* Logo and Controls Container */}
          <div className="flex flex-col gap-[14px] mt-[4px]">

            {/* Logo */}
            <div className="flex items-center gap-[6px] ml-[2px]">
               <svg width="24" height="24" viewBox="0 0 100 100" className="text-[#e52525] fill-current flex-shrink-0 drop-shadow-[0_0_8px_rgba(229,37,37,0.3)]">
                 {/* Top slanted block */}
                 <path d="M 35 5 L 59 23 L 59 43 L 35 25 Z" />
                 {/* Bottom chevron */}
                 <path d="M 35 35 L 75 65 L 35 95 L 35 83 L 59 65 L 35 47 Z" />
               </svg>
               <span className="text-[20px] tracking-[-0.04em] text-[#dcdcdc] leading-none ml-[2px] drop-shadow-[0_0_5px_rgba(255,255,255,0.1)]" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", fontWeight: 300 }}>
                 <span className="text-[#e52525] font-semibold">das</span>keyboard
               </span>
            </div>

            {/* Buttons Grid */}
            <div className="flex flex-col gap-[8px] ml-[28px]">

              {/* Row 1: Sleep, LEDs, Mute */}
              <div className="flex items-center justify-between w-[116px]">
                {/* Sleep Key Hole */}
                <div className="w-[24px] h-[24px] rounded-[6px] bg-[#0d0d0f] shadow-[inset_0_1px_3px_rgba(0,0,0,0.9),0_0.5px_0_rgba(255,255,255,0.05)] flex items-center justify-center p-[1px] -translate-x-[1.5px]">
                  <button
                    onClick={() => setZenNoiseEnabled(!zenNoiseEnabled)}
                    className="group w-full h-full rounded-[4px] border border-[#1a1a1c] flex items-center justify-center bg-gradient-to-b from-[#222225] to-[#18181a] hover:from-[#2a2a2e] hover:to-[#1e1e22] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] transition-all"
                    title="Sleep / Ambient Soundscapes"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-500 group-hover:text-white transition-colors" style={{ transform: "rotate(-15deg)" }}>
                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                    </svg>
                  </button>
                </div>

                {/* Status Pinhole LEDs */}
                <div className="flex gap-[10px] pt-[2px] justify-center items-end">
                  {/* NumLock */}
                  <div className="flex flex-col items-center gap-[2.5px]">
                    <div className="flex items-center justify-center h-[9px]">
                      <span className="text-[9px] font-sans font-semibold text-neutral-400/90 tracking-normal leading-none">1</span>
                    </div>
                    <div className="relative w-[9px] h-[7px] flex items-center justify-center">
                      <svg width="8" height="6" viewBox="0 0 10 8" className="overflow-visible pointer-events-none">
                        {locks.NumLock ? (
                          <circle
                            cx="5"
                            cy="4"
                            r="1.6"
                            fill="#ffffff"
                            style={{
                              filter: "drop-shadow(0 0 1.2px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 4.5px rgba(147, 197, 253, 0.9))"
                            }}
                          />
                        ) : (
                          <circle
                            cx="5"
                            cy="4"
                            r="1.6"
                            fill="#030304"
                            stroke="#131316"
                            strokeWidth="0.4"
                          />
                        )}
                      </svg>
                    </div>
                  </div>
                  {/* CapsLock */}
                  <div className="flex flex-col items-center gap-[2.5px]">
                    <div className="flex items-center justify-center h-[9px]">
                      <span className="text-[9px] font-sans font-semibold text-neutral-400/90 tracking-normal leading-none">A</span>
                    </div>
                    <div className="relative w-[9px] h-[7px] flex items-center justify-center">
                      <svg width="8" height="6" viewBox="0 0 10 8" className="overflow-visible pointer-events-none">
                        {locks.CapsLock ? (
                          <circle
                            cx="5"
                            cy="4"
                            r="1.6"
                            fill="#ffffff"
                            style={{
                              filter: "drop-shadow(0 0 1.2px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 4.5px rgba(147, 197, 253, 0.9))"
                            }}
                          />
                        ) : (
                          <circle
                            cx="5"
                            cy="4"
                            r="1.6"
                            fill="#030304"
                            stroke="#131316"
                            strokeWidth="0.4"
                          />
                        )}
                      </svg>
                    </div>
                  </div>
                  {/* ScrollLock */}
                  <div className="flex flex-col items-center gap-[2.5px]">
                    <div className="flex items-center justify-center w-[9px] h-[9px]">
                      <svg width="9" height="9" viewBox="0 0 10 10" className="text-neutral-400/90 overflow-visible pointer-events-none">
                        <path d="M 5,0 L 5,6.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        <path d="M 2.5,3.7 L 5,6.2 L 7.5,3.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <path d="M 1.5,8.8 L 8.5,8.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="relative w-[9px] h-[7px] flex items-center justify-center">
                      <svg width="8" height="6" viewBox="0 0 10 8" className="overflow-visible pointer-events-none">
                        {locks.ScrollLock ? (
                          <circle
                            cx="5"
                            cy="4"
                            r="1.6"
                            fill="#ffffff"
                            style={{
                              filter: "drop-shadow(0 0 1.2px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 4.5px rgba(147, 197, 253, 0.9))"
                            }}
                          />
                        ) : (
                          <circle
                            cx="5"
                            cy="4"
                            r="1.6"
                            fill="#030304"
                            stroke="#131316"
                            strokeWidth="0.4"
                          />
                        )}
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Mute Key Hole */}
                <div className="w-[24px] h-[24px] rounded-full bg-[#0d0d0f] shadow-[inset_0_1px_3px_rgba(0,0,0,0.9),0_0.5px_0_rgba(255,255,255,0.05)] flex items-center justify-center p-[1px] translate-x-[1.5px]">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="group w-full h-full rounded-full border border-[#1a1a1c] flex items-center justify-center bg-gradient-to-b from-[#222225] to-[#18181a] hover:from-[#2a2a2e] hover:to-[#1e1e22] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] transition-all"
                    title="Mute Typing Audio"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" className="fill-current text-neutral-500 group-hover:text-white transition-colors" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                      {!soundEnabled ? (
                        <>
                          <line x1="22" y1="9" x2="16" y2="15" />
                          <line x1="16" y1="9" x2="22" y2="15" />
                        </>
                      ) : (
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Row 2: Media Recessed Basin */}
              <div className="w-[116px] h-[22px] rounded-[6px] bg-[#0d0d0f] shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.9),0_0.5px_0_rgba(255,255,255,0.05)] flex items-center justify-center p-[1.5px] overflow-hidden">
                <div className="flex w-full h-full rounded-[4px] overflow-hidden bg-[#1a1a1c]">
                  <button
                    onClick={() => skipZen("prev")}
                    className="group flex-1 border-r border-[#0d0d0f] flex items-center justify-center text-neutral-500 hover:text-white transition-all bg-gradient-to-b from-[#222225] to-[#18181a] hover:from-[#2a2a2e] hover:to-[#1e1e22] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
                    title="Previous Ambient Track"
                  >
                    <svg width="10" height="7" viewBox="0 0 12 8" className="fill-current">
                      <rect x="1.5" y="1" width="1.2" height="6" rx="0.2" />
                      <path d="M6.5,1 L6.5,7 L3,4 Z" />
                      <path d="M10.5,1 L10.5,7 L7,4 Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setZenNoiseEnabled(!zenNoiseEnabled)}
                    className="group flex-1 border-r border-[#0d0d0f] flex items-center justify-center text-neutral-500 hover:text-white transition-all bg-gradient-to-b from-[#222225] to-[#18181a] hover:from-[#2a2a2e] hover:to-[#1e1e22] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
                    title="Play / Pause Ambient Soundscape"
                  >
                    <svg width="10" height="7" viewBox="0 0 12 8" className="fill-current">
                      <path d="M1.5,1 L1.5,7 L5.5,4 Z" />
                      <rect x="7.5" y="1" width="1.2" height="6" rx="0.2" />
                      <rect x="9.5" y="1" width="1.2" height="6" rx="0.2" />
                    </svg>
                  </button>
                  <button
                    onClick={() => skipZen("next")}
                    className="group flex-1 flex items-center justify-center text-neutral-500 hover:text-white transition-all bg-gradient-to-b from-[#222225] to-[#18181a] hover:from-[#2a2a2e] hover:to-[#1e1e22] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
                    title="Next Ambient Track"
                  >
                    <svg width="10" height="7" viewBox="0 0 12 8" className="fill-current">
                      <rect x="9.3" y="1" width="1.2" height="6" rx="0.2" />
                      <path d="M1.5,1 L1.5,7 L5,4 Z" />
                      <path d="M5.5,1 L5.5,7 L9,4 Z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Volume Knob - Precision 1:1 Physical Simulation */}
          <div className="mt-[22px] -mr-[32px] flex items-center justify-center relative">
            <div className="relative group w-[82px] h-[82px] flex items-center justify-center cursor-ns-resize"
                 onMouseDown={handleKnobMouseDown}
                 onWheel={handleKnobWheel}>

              {/* Rotational Neon Light-Pipe Assembly (Sync with knob motion for physical 1:1 feel) */}
              <div className="absolute inset-0 pointer-events-none" style={{ transform: `rotate(${rotation}deg)`, transition: "transform 0.1s cubic-bezier(0.15, 0.45, 0.3, 1)" }}>
                {/* Deep Recessed Well (Simulating the physical trench/chasm in the chassis) */}
                <div className="absolute inset-[-3px] rounded-full bg-[#08080a] shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)] opacity-95" />

                {/* Translucent Crimson Acrylic Ring Bead (3D light-pipe body with depth and substance) */}
                <div
                  className="absolute inset-[-2.5px] rounded-full"
                  style={{
                    background: "conic-gradient(from 0deg, #b30000 0%, #ff0000 12%, #ff4444 25%, #ff8888 35%, #ff0000 48%, #800000 60%, #b30000 72%, #ff0000 85%, #ff4444 92%, #b30000 100%)",
                    WebkitMask: "radial-gradient(circle, transparent 37.0px, #fff 37.5px, #fff 41.5px, transparent 42.2px)",
                    mask: "radial-gradient(circle, transparent 37.0px, #fff 37.5px, #fff 41.5px, transparent 42.2px)",
                    filter: "drop-shadow(0 0 2.5px rgba(255, 0, 0, 0.9)) drop-shadow(0 0 0.8px rgba(255, 80, 80, 0.8))",
                    opacity: 1.0
                  }}
                />

                {/* Concentric Neon Core (Super high-intensity focal light line running through center of the acrylic) */}
                <div
                  className="absolute inset-[-2px] rounded-full"
                  style={{
                    background: "conic-gradient(from 0deg, #ff0000 0%, #ff5555 25%, #ffe6e6 35%, #ff5555 45%, #ff0000 60%, #aa0000 75%, #ff0000 90%, #ff0000 100%)",
                    WebkitMask: "radial-gradient(circle, transparent 37.8px, #fff 38.2px, #fff 40.6px, transparent 41.1px)",
                    mask: "radial-gradient(circle, transparent 37.8px, #fff 38.2px, #fff 40.6px, transparent 41.1px)",
                    opacity: 1.0
                  }}
                />

                {/* Refractive Inner Specular Rim (Simulating the polished silver edge highlight of the chassis bezel cut) */}
                <div
                  className="absolute inset-[-3.2px] rounded-full"
                  style={{
                    background: "conic-gradient(from 135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 20%, transparent 40%, transparent 70%, rgba(255,255,255,0.1) 85%, rgba(255,255,255,0.5) 100%)",
                    WebkitMask: "radial-gradient(circle, transparent 41.2px, #fff 41.5px, #fff 42.2px, transparent 42.5px)",
                    mask: "radial-gradient(circle, transparent 41.2px, #fff 41.5px, #fff 42.2px, transparent 42.5px)",
                    opacity: 0.9
                  }}
                />
              </div>

              {/* Main Knob Chassis - Anisotropic Satin Finished Aluminum */}
              <div
                className="w-[78px] h-[78px] rounded-full relative overflow-hidden border border-[#050506] shadow-[0_12px_35px_rgba(0,0,0,1),inset_0_1.5px_2px_rgba(255,255,255,0.15)]"
                style={{
                  background: "conic-gradient(from 0deg at 50% 50%, #060608 0%, #151518 15%, #333336 25%, #151518 35%, #060608 50%, #151518 65%, #333336 75%, #151518 85%, #060608 100%)",
                  transform: `rotate(${rotation}deg)`,
                  transition: "transform 0.1s cubic-bezier(0.15, 0.45, 0.3, 1)"
                }}
              >
                {/* Subtle Specular Rim (Ultra-thin light catcher) */}
                <div className="absolute inset-0 rounded-full border-[0.5px] border-white/20 opacity-30 pointer-events-none" />

                {/* Top Surface Concave Profile - Deep Matte Charcoal Recess */}
                <div className="absolute inset-[6px] rounded-full bg-gradient-to-tr from-[#010102] to-[#1a1a1d] shadow-[inset_0_15px_30px_rgba(0,0,0,1)]" />

                {/* Pro Red Indicator Dot (Recessed Backlit Ruby Jewel) */}
                <div className="absolute top-[10px] left-1/2 -ml-[3.5px] w-[7px] h-[7px] rounded-full bg-[#ff0000] border border-black/90 shadow-[0_0_12px_rgba(255,0,0,1),inset_0_1.2px_2px_rgba(255,255,255,0.4)]" />

                {/* Metallic Shimmer Light Catcher (Soft Specular Sheen) */}
                <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4) 0%, transparent 60%)" }} />
              </div>

              {/* Outer Rim Specular Polish (Final Edge Detail) */}
              <div className="absolute inset-[-0.5px] rounded-full border-[0.5px] border-white/15 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* --- KEYCAPS AREA --- */}
        <div className="absolute inset-0" style={{ top: 22, left: 29, overflow: "visible" }}>
          {/* --- RECESSED WELLS/BASINS BACKGROUND (Surgical Precision) --- */}
          <svg className="absolute inset-0 pointer-events-none w-full h-full" style={{ zIndex: 0, overflow: "visible" }}>
            <defs>
              {/* Well floor dark gradient */}
              <linearGradient id="wellFloorGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#040405" />
                <stop offset="30%" stopColor="#070709" />
                <stop offset="100%" stopColor="#0c0c0e" />
              </linearGradient>

              {/* Inner shadow filter for recessed look */}
              <filter id="recessedWellShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feOffset dx="0" dy="2" />
                <feGaussianBlur stdDeviation="3.5" result="offset-blur" />
                <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                <feFlood floodColor="#000000" floodOpacity="0.95" result="color" />
                <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                <feComposite operator="over" in="shadow" in2="SourceGraphic" />
              </filter>
            </defs>

            {/* Esc pocket */}
            <rect
              x={0 * U - 8}
              y={1 * U - 5}
              width={1 * U + 12}
              height={1 * U + 12}
              rx={7}
              ry={7}
              fill="url(#wellFloorGrad)"
              filter="url(#recessedWellShadow)"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />

            {/* F1-F4 Pod */}
            <rect
              x={2 * U - 8}
              y={1 * U - 5}
              width={4 * U + 12}
              height={1 * U + 12}
              rx={7}
              ry={7}
              fill="url(#wellFloorGrad)"
              filter="url(#recessedWellShadow)"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />

            {/* F5-F8 Pod */}
            <rect
              x={6.5 * U - 8}
              y={1 * U - 5}
              width={4 * U + 12}
              height={1 * U + 12}
              rx={7}
              ry={7}
              fill="url(#wellFloorGrad)"
              filter="url(#recessedWellShadow)"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />

            {/* F9-F12 Pod */}
            <rect
              x={11 * U - 8}
              y={1 * U - 5}
              width={4 * U + 12}
              height={1 * U + 12}
              rx={7}
              ry={7}
              fill="url(#wellFloorGrad)"
              filter="url(#recessedWellShadow)"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />

            {/* PrtSc, ScrollLock, Pause Pod */}
            <rect
              x={15.5 * U - 8}
              y={1 * U - 5}
              width={3 * U + 12}
              height={1 * U + 12}
              rx={7}
              ry={7}
              fill="url(#wellFloorGrad)"
              filter="url(#recessedWellShadow)"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />

            {/* Main Block Pod */}
            <rect
              x={0 * U - 8}
              y={2.5 * U - 8}
              width={15 * U + 12}
              height={5 * U + 12}
              rx={8}
              ry={8}
              fill="url(#wellFloorGrad)"
              filter="url(#recessedWellShadow)"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />

            {/* Nav Cluster Pod */}
            <rect
              x={15.5 * U - 8}
              y={2.5 * U - 5}
              width={3 * U + 12}
              height={2 * U + 12}
              rx={8}
              ry={8}
              fill="url(#wellFloorGrad)"
              filter="url(#recessedWellShadow)"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />

            {/* Arrow Keys Pod (Inverted T single path with 8px left/right padding) */}
            <path
              d="M 726,237 L 766,237 Q 774,237 774,245 L 774,273 Q 774,281 782,281 L 810,281 Q 818,281 818,289 L 818,329 Q 818,337 810,337 L 682,337 Q 674,337 674,329 L 674,289 Q 674,281 682,281 L 710,281 Q 718,281 718,273 L 718,245 Q 718,237 726,237 Z"
              fill="url(#wellFloorGrad)"
              filter="url(#recessedWellShadow)"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />

            {/* Numpad Pod */}
            <rect
              x={19 * U - 8}
              y={2.5 * U - 5}
              width={4 * U + 12}
              height={5 * U + 12}
              rx={8}
              ry={8}
              fill="url(#wellFloorGrad)"
              filter="url(#recessedWellShadow)"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />
          </svg>

          {DAS_LAYOUT.map((key) => (
            <KeyCap
              key={key.code}
              keyData={key}
              activeSwitch={activeSwitch}
              onDown={(code) => {
                onKeyVirtualDown?.(code);
                if (code === "NumLock") setLocks(prev => ({ ...prev, NumLock: !prev.NumLock }));
                if (code === "ScrollLock") setLocks(prev => ({ ...prev, ScrollLock: !prev.ScrollLock }));
                if (code === "CapsLock") setLocks(prev => ({ ...prev, CapsLock: !prev.CapsLock }));
                setTimeout(() => onKeyVirtualUp?.(code), 100);

                // Virtual click effect
                const el = document.getElementById(`das-key-${code}`);
                if (el) {
                  el.setAttribute("data-pressed", "true");
                  setTimeout(() => el.removeAttribute("data-pressed"), 100);
                }
              }}
              renderLabel={renderKeyLabel}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

DasKeyboard.displayName = "DasKeyboard";
