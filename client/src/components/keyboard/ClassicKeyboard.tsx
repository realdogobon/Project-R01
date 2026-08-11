import React from "react";
import {
  SunDim,
  Sun,
  LayoutGrid,
  Search,
  Mic,
  Moon,
  SkipBack,
  Play,
  SkipForward,
  VolumeX,
  Volume1,
  Volume2,
  Frame,
  Lightbulb,
  ArrowLeft,
  ChevronUp,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Command
} from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import { MONKEYTYPE_THEMES } from "../../constants/themes";

export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export type KeyboardThemeName = string;

export interface KeyVariantDefinition {
  bg: string;
  text: string;
}

export interface KeyboardThemeDefinition {
  keyVariantOverrides: Record<string, "accent" | "dark" | "light">;
  variants: Record<"accent" | "dark" | "light", KeyVariantDefinition>;
}

export const CLASSIC_DARK_KEYS = [
  "F5", "F6", "F7", "F8", "F9", "F13", "Delete", "F14", "Backspace", "PageUp",
  "Tab", "Backslash", "PageDown", "CapsLock", "Enter", "Home", "ShiftLeft", "ShiftRight",
  "End", "ControlLeft", "AltLeft", "MetaLeft", "MetaRight", "Fn", "ControlRight"
];

export const MINT_DARK_KEYS = [
  "F5", "F6", "F7", "F8", "F9", "F13", "Delete", "F14", "Backspace", "PageUp",
  "Tab", "PageDown", "CapsLock", "Home", "ShiftLeft", "ShiftRight", "End",
  "ControlLeft", "AltLeft", "MetaLeft", "MetaRight", "Fn", "ControlRight"
];

export const KEYBOARD_THEMES: Record<string, KeyboardThemeDefinition> = {
  classic: {
    variants: {
      accent: { bg: "#F57644", text: "rgba(0,0,0,0.5)" },
      dark: { bg: "#737373", text: "rgba(255,255,255,0.7)" },
      light: { bg: "#F5F5F5", text: "rgba(0,0,0,0.7)" },
    },
    keyVariantOverrides: buildOverrides({ accent: ["Escape"], dark: CLASSIC_DARK_KEYS }),
  },
  mint: {
    variants: {
      accent: { bg: "#86C8AC", text: "rgba(255,255,255,0.7)" },
      dark: { bg: "#447B82", text: "rgba(255,255,255,0.7)" },
      light: { bg: "#EEEEEE", text: "#447B82" },
    },
    keyVariantOverrides: buildOverrides({
      accent: ["Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"],
      dark: MINT_DARK_KEYS,
    }),
  },
  royal: {
    variants: {
      accent: { bg: "#E4D440", text: "rgba(0,0,0,0.7)" },
      dark: { bg: "#3A3B35", text: "rgba(255,255,255,0.7)" },
      light: { bg: "#324974", text: "rgba(255,255,255,0.7)" },
    },
    keyVariantOverrides: buildOverrides({
      accent: ["Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"],
      dark: MINT_DARK_KEYS,
    }),
  },
  dolch: {
    variants: {
      accent: { bg: "#D73E42", text: "rgba(0,0,0,0.7)" },
      dark: { bg: "#3E3B4C", text: "rgba(255,255,255,0.7)" },
      light: { bg: "#4F5E78", text: "rgba(255,255,255,0.7)" },
    },
    keyVariantOverrides: buildOverrides({
      accent: ["Escape", "Enter", "Space"],
      dark: [...MINT_DARK_KEYS, "Backquote", "Backslash"],
    }),
  },
  sand: {
    variants: {
      accent: { bg: "#C94E41", text: "rgba(255,255,255,0.7)" },
      dark: { bg: "#893D36", text: "rgba(255,255,255,0.7)" },
      light: { bg: "#EFEFEF", text: "rgba(0,0,0,0.7)" },
    },
    keyVariantOverrides: buildOverrides({
      accent: ["Escape", "Enter"],
      dark: MINT_DARK_KEYS,
    }),
  },
  scarlet: {
    variants: {
      accent: { bg: "#E1E1E1", text: "#8F4246" },
      dark: { bg: "#D5868A", text: "rgba(255,255,255,0.7)" },
      light: { bg: "#E4D7D7", text: "#8F4246" },
    },
    keyVariantOverrides: buildOverrides({
      accent: ["Escape", "Enter"],
      dark: MINT_DARK_KEYS,
    }),
  },
};

function buildOverrides(mapping: { accent?: string[]; dark?: string[] }): Record<string, "accent" | "dark" | "light"> {
  const overrides: Record<string, "accent" | "dark" | "light"> = {};
  mapping.accent?.forEach((k) => { overrides[k] = "accent"; });
  mapping.dark?.forEach((k) => { overrides[k] = "dark"; });
  return overrides;
}

export function getKeyboardThemeDefinition(themeName: string): KeyboardThemeDefinition {
  if (themeName in KEYBOARD_THEMES) {
    return KEYBOARD_THEMES[themeName];
  }

  const mtTheme = MONKEYTYPE_THEMES[themeName];
  if (mtTheme) {
    return {
      variants: {
        accent: { bg: mtTheme.main, text: mtTheme.bg },
        dark: { bg: mtTheme.sub, text: mtTheme.bg },
        light: { bg: mtTheme.subAlt, text: mtTheme.text },
      },
      keyVariantOverrides: buildOverrides({
        accent: ["Escape", "Enter", "Space"],
        dark: MINT_DARK_KEYS,
      }),
    };
  }

  return KEYBOARD_THEMES.classic;
}

export function resolveKeyVariant(themeName: string, keyCode: string): "accent" | "dark" | "light" {
  return getKeyboardThemeDefinition(themeName).keyVariantOverrides[keyCode] || "light";
}

export function toRgba(color: string, alpha: number): string {
  if (!color.startsWith("#")) return color;
  const hex = color.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const KEY_LABELS: Record<string, [string, string?]> = {
  Backquote: ["`", "~"],
  Digit1: ["1", "!"],
  Digit2: ["2", "@"],
  Digit3: ["3", "#"],
  Digit4: ["4", "$"],
  Digit5: ["5", "%"],
  Digit6: ["6", "^"],
  Digit7: ["7", "&"],
  Digit8: ["8", "*"],
  Digit9: ["9", "("],
  Digit0: ["0", ")"],
  Minus: ["-", "_"],
  Equal: ["=", "+"],
  KeyQ: ["q"], KeyW: ["w"], KeyE: ["e"], KeyR: ["r"], KeyT: ["t"],
  KeyY: ["y"], KeyU: ["u"], KeyI: ["i"], KeyO: ["o"], KeyP: ["p"],
  BracketLeft: ["[", "{"], BracketRight: ["]", "}"], Backslash: ["\\", "|"],
  KeyA: ["a"], KeyS: ["s"], KeyD: ["d"], KeyF: ["f"], KeyG: ["g"],
  KeyH: ["h"], KeyJ: ["j"], KeyK: ["k"], KeyL: ["l"],
  Semicolon: [";", ":"], Quote: ["'", '"'],
  KeyZ: ["z"], KeyX: ["x"], KeyC: ["c"], KeyV: ["v"], KeyB: ["b"],
  KeyN: ["n"], KeyM: ["m"], Comma: [",", "<"], Period: [".", ">"], Slash: ["/", "?"]
};

export interface ClassicKeyboardProps {
  themeName?: KeyboardThemeName;
  onKeyVirtualDown?: (code: string) => void;
  onKeyVirtualUp?: (code: string) => void;
}

const KEY_ICONS: Record<string, React.ReactNode> = {
  F1: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  ),
  F2: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M5.64 18.36l-1.42 1.42M19.78 4.22l-1.42 1.42" />
    </svg>
  ),
  F3: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  F4: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  F5: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
    </svg>
  ),
  F6: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),
  F7: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
      <polygon points="11 19 2 12 11 5 11 19" />
      <polygon points="22 19 13 12 22 5 22 19" />
    </svg>
  ),
  F8: (
    <svg viewBox="0 0 24 24" fill="currentColor" strokeWidth="0" className="h-2.5 w-2.5">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  F9: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
      <polygon points="13 19 22 12 13 5 13 19" />
      <polygon points="2 19 11 12 2 5 2 19" />
    </svg>
  ),
  F10: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  ),
  F11: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  ),
  F12: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  ),
  F13: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </svg>
  ),
  F14: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
    </svg>
  ),
  Backspace: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  MetaLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
    </svg>
  ),
  MetaRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
    </svg>
  ),
  ArrowUp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),
  ArrowLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ArrowDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  ArrowRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
};

const KeyboardKey = React.memo(({
  code,
  label,
  w,
  themeName,
  onKeyVirtualDown,
  onKeyVirtualUp,
}: {
  code: string;
  label?: string;
  w: number;
  themeName: KeyboardThemeName;
  onKeyVirtualDown?: (code: string) => void;
  onKeyVirtualUp?: (code: string) => void;
}) => {
  const keyVariantSlot = resolveKeyVariant(themeName, code);
  const keyVariant = getKeyboardThemeDefinition(themeName).variants[keyVariantSlot];
  const labels = KEY_LABELS[code];

  const icon = KEY_ICONS[code];
  const hasIconAndLabel = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"].includes(code);

  let keyContent: React.ReactNode;

  if (hasIconAndLabel) {
    keyContent = (
      <>
        {icon}
        <span className="opacity-95">{label || code}</span>
      </>
    );
  } else if (icon) {
    keyContent = <span className="m-auto opacity-95">{icon}</span>;
  } else if (labels && labels[1]) {
    keyContent = (
      <>
        <span className="opacity-95">{labels[1]}</span>
        <span className="opacity-95">{labels[0]}</span>
      </>
    );
  } else {
    const rawVal = label !== undefined ? label : (labels ? labels[0] : code);
    const finalVal = (rawVal.length === 1 && /[a-z]/i.test(rawVal)) ? rawVal.toUpperCase() : rawVal;

    keyContent = (
      <span className="m-auto opacity-95">
        {finalVal}
      </span>
    );
  }

  return (
    <button
      id={`kbd-${code}`}
      type="button"
      data-pressed="false"
      data-error="false"
      onPointerDown={(e) => {
        e.preventDefault();
        onKeyVirtualDown?.(code);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onKeyVirtualUp?.(code);
      }}
      onPointerLeave={(e) => {
        e.preventDefault();
        if (e.currentTarget.dataset.pressed === "true") {
          onKeyVirtualUp?.(code);
        }
      }}
      className="group flex cursor-pointer touch-none appearance-none items-end border-0 bg-transparent p-0 text-left focus:outline-none outline-none transform-gpu"
      style={{ height: "50px", width: `${w}px` }}
    >
      <div
        className={cn(
          "relative flex items-start justify-center overflow-hidden rounded-[4px] rounded-t-[12px] border border-black/40 transition-all duration-100 transform-gpu",
          "h-[50px] group-data-[pressed=true]:h-[45px]",
          "group-data-[error=true]:border-red-500/30 group-data-[error=true]:z-20 group-data-[error=true]:animate-[error-shake_0.2s_ease-in-out_forwards]",
          "group-data-[error=false]:hover:brightness-[1.12]"
        )}
        style={{
          width: `${w}px`,
          backgroundColor: toRgba(keyVariant.bg, 0.8),
        }}
      >
        <div
          className={cn(
            "relative z-10 h-[37px] rounded-[6px] border border-black/40 border-t-0 transition-all duration-100 transform-gpu",
            "flex select-none flex-col items-center justify-between gap-0.5 p-1 font-medium text-[9px]"
          )}
          style={{
            width: `${w - 13}px`,
            backgroundColor: keyVariant.bg,
            color: keyVariant.text,
          }}
        >
          {keyContent}
        </div>

        <div
          className={cn(
            "absolute right-0 bottom-0 z-0 h-px w-8 translate-x-3.5 bg-black/30 transition-all duration-100 transform-gpu rotate-[70deg] group-data-[pressed=true]:rotate-[60deg]"
          )}
        />
        <div
          className={cn(
            "absolute bottom-0 left-0 z-0 h-px w-8 -translate-x-3.5 bg-black/30 transition-all duration-100 transform-gpu -rotate-[70deg] group-data-[pressed=true]:-rotate-[60deg]"
          )}
        />
      </div>
    </button>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.themeName === nextProps.themeName &&
    prevProps.code === nextProps.code &&
    prevProps.w === nextProps.w &&
    prevProps.label === nextProps.label
  );
});

KeyboardKey.displayName = "KeyboardKey";

export const KEYBOARD_STATIC_ROWS = [
  [
    { code: "Escape", label: "Esc", w: 50 },
    { code: "F1", label: "F1", w: 50 },
    { code: "F2", label: "F2", w: 50 },
    { code: "F3", label: "F3", w: 50 },
    { code: "F4", label: "F4", w: 50 },
    { code: "F5", label: "F5", w: 50 },
    { code: "F6", label: "F6", w: 50 },
    { code: "F7", label: "F7", w: 50 },
    { code: "F8", label: "F8", w: 50 },
    { code: "F9", label: "F9", w: 50 },
    { code: "F10", label: "F10", w: 50 },
    { code: "F11", label: "F11", w: 50 },
    { code: "F12", label: "F12", w: 50 },
    { code: "F13", label: "F13", w: 50 },
    { code: "Delete", label: "Del", w: 50 },
    { code: "F14", label: "F14", w: 50 }
  ],
  [
    { code: "Backquote", w: 50 },
    { code: "Digit1", w: 50 }, { code: "Digit2", w: 50 },
    { code: "Digit3", w: 50 }, { code: "Digit4", w: 50 },
    { code: "Digit5", w: 50 }, { code: "Digit6", w: 50 },
    { code: "Digit7", w: 50 }, { code: "Digit8", w: 50 },
    { code: "Digit9", w: 50 }, { code: "Digit0", w: 50 },
    { code: "Minus", w: 50 }, { code: "Equal", w: 50 },
    { code: "Backspace", label: "Backspace", w: 100 },
    { code: "PageUp", label: "PgUp", w: 50 }
  ],
  [
    { code: "Tab", label: "Tab", w: 75 },
    { code: "KeyQ", w: 50 }, { code: "KeyW", w: 50 },
    { code: "KeyE", w: 50 }, { code: "KeyR", w: 50 },
    { code: "KeyT", w: 50 }, { code: "KeyY", w: 50 },
    { code: "KeyU", w: 50 }, { code: "KeyI", w: 50 },
    { code: "KeyO", w: 50 }, { code: "KeyP", w: 50 },
    { code: "BracketLeft", w: 50 }, { code: "BracketRight", w: 50 },
    { code: "Backslash", w: 75 },
    { code: "PageDown", label: "PgDn", w: 50 }
  ],
  [
    { code: "CapsLock", label: "Caps Lock", w: 100 },
    { code: "KeyA", w: 50 }, { code: "KeyS", w: 50 },
    { code: "KeyD", w: 50 }, { code: "KeyF", w: 50 },
    { code: "KeyG", w: 50 }, { code: "KeyH", w: 50 },
    { code: "KeyJ", w: 50 }, { code: "KeyK", w: 50 },
    { code: "KeyL", w: 50 }, { code: "Semicolon", w: 50 },
    { code: "Quote", w: 50 },
    { code: "Enter", label: "Return", w: 100 },
    { code: "Home", label: "Home", w: 50 }
  ],
  [
    { code: "ShiftLeft", label: "Shift", w: 123 },
    { code: "KeyZ", w: 50 }, { code: "KeyX", w: 50 },
    { code: "KeyC", w: 50 }, { code: "KeyV", w: 50 },
    { code: "KeyB", w: 50 }, { code: "KeyN", w: 50 },
    { code: "KeyM", w: 50 }, { code: "Comma", w: 50 },
    { code: "Period", w: 50 }, { code: "Slash", w: 50 },
    { code: "ShiftRight", label: "Shift", w: 77 },
    { code: "ArrowUp", label: "▲", w: 50 },
    { code: "End", label: "End", w: 50 }
  ],
  [
    { code: "ControlLeft", label: "Ctrl", w: 62 },
    { code: "AltLeft", label: "Option", w: 62 },
    { code: "MetaLeft", label: "Cmd", w: 62 },
    { code: "Space", label: "", w: 314 },
    { code: "MetaRight", label: "Cmd", w: 50 },
    { code: "Fn", label: "Fn", w: 50 },
    { code: "ControlRight", label: "Ctrl", w: 50 },
    { code: "ArrowLeft", label: "◀", w: 50 },
    { code: "ArrowDown", label: "▼", w: 50 },
    { code: "ArrowRight", label: "▶", w: 50 }
  ]
];

export const ClassicKeyboard = React.memo(({
  themeName = "classic",
  onKeyVirtualDown,
  onKeyVirtualUp,
}: ClassicKeyboardProps) => {

  React.useEffect(() => {
    const setKeyDataState = (code: string, state: boolean) => {
      const el = document.getElementById(`kbd-${code}`);
      if (el) {
        el.dataset.pressed = state ? "true" : "false";
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      setKeyDataState(e.code, true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeyDataState(e.code, false);
    };

    const handleTypingError = (e: Event) => {
      const customEvent = e as CustomEvent<{code: string}>;
      const code = customEvent.detail?.code;
      if (code) {
        const el = document.getElementById(`kbd-${code}`);
        if (el) {
          el.dataset.error = "true";
          setTimeout(() => {
            if (el) el.dataset.error = "false";
          }, 200);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("typing-error", handleTypingError);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("typing-error", handleTypingError);
    };
  }, []);

  return (
    <div
      data-keyboard-root
      // `zoom` (not `transform: scale`) on purpose: zoom actually resizes the
      // element's layout box, so the parent wrapper's `width:max-content`
      // sizing matches what's visually painted. See DasKeyboard.tsx for the
      // matching Das-keyboard scale, computed off these same numbers.
      className="flex flex-col select-none [zoom:0.72] sm:[zoom:0.76] md:[zoom:0.8] lg:[zoom:0.84] xl:[zoom:0.88]"
      style={{
        fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
        "--font-sans": '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif'
      } as React.CSSProperties}
    >
      <div className="h-fit w-fit rounded-[16px] border-2 border-black bg-black/70 p-3 dark:border-white/20 dark:bg-white/20 shadow-[0_18px_38px_-16px_rgba(0,0,0,0.42)] mx-auto">
        <div className="h-[278px] rounded-[5px] rounded-t-[8px] border border-black bg-black/80 dark:border-zinc-500 dark:bg-zinc-700">
          <div className="-translate-y-1 -space-y-1 overflow-hidden rounded-[5px]">
            {KEYBOARD_STATIC_ROWS.map((row, rIndex) => (
              <div key={rIndex} className="flex">
                {row.map((k) => (
                  <KeyboardKey
                    key={k.code}
                    code={k.code}
                    label={k.label}
                    w={k.w}
                    themeName={themeName}
                    onKeyVirtualDown={onKeyVirtualDown}
                    onKeyVirtualUp={onKeyVirtualUp}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.themeName === nextProps.themeName;
});

ClassicKeyboard.displayName = "ClassicKeyboard";
