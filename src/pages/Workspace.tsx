import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import {
  DefaultTemplate,
  DefaultTemplateRef,
} from "../components/lexkit/DefaultTemplate";
import { SmoothInput, SmoothTextarea } from "../components/ui/SmoothInputs";
import { ThemeProvider, useTheme } from "next-themes";
const ThemeProviderCast: any = ThemeProvider;
import {
  FileCode,
  FileSpreadsheet,
  Settings,
  CheckCircle,
  FileText,
  Download,
  Save,
  Copy,
  Check,
  FileCheck,
  FolderOpen,
  Moon,
  Sun,
  ShieldAlert,
  X,
  Plus,
  Printer,
  Clock,
  User,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  History,
  BarChart2,
  FileDown,
  CaseSensitive,
  Upload,
  Zap,
  ZoomIn,
  ZoomOut,
  Database,
  Search,
  Shield,
  PenTool,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop as CropIcon,
  Sparkles,
  Sliders,
  EyeOff,
  Hourglass,
  Trash2,
  Keyboard,
  Clipboard,
  Pencil,
  LayoutDashboard,
  LogOut,
  Minus
} from "lucide-react";
import { AnimatedPracticeIcon, AnimatedWriteIcon, AnimatedExamIcon } from "../components/AnimatedModeIcons";
import { ExamWizard } from "./ExamMode";
import { SessionRecoveryOverlay } from "../components/typing/SessionRecoveryOverlay";
import { PracticeMode } from "./PracticeMode";
import { DocumentScannerModal } from "../components/DocumentScannerModal";
import { LibraryHub } from "../components/dashboard/LibraryHub";
import { useAuth, getAvatarColor } from "../contexts/AuthContext";
import { AccountPicker } from "../components/AccountPicker";
import type { PracticeConfig } from "../pages/PracticeMode";
import { AuthModal } from "../components/modals/AuthModal";
import { WorkspaceDashboard } from "../components/dashboard/WorkspaceDashboard";
import logoImage from "../assets/images/logo.png";
import { useSettings, THEME_OPTIONS } from "../contexts/SettingsContext";
import { SettingsModal } from "../components/modals/SettingsModal";
import { useSoundEngine } from "../hooks/useSoundEngine";
import { useAmbientEngine } from "../hooks/useAmbientEngine";
import { getSharedAudioContext } from "../lib/audioContext";
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `/assets/pdf.worker.mjs`;
import { ScannerEngine } from "../lib/ScannerEngine";
import { ExportEngine } from "../lib/ExportEngine";
import { ingestDocument, searchIntelligence, syncRagIndex, ScanDocument, getAllScans, deleteScan, updateDocument, restoreScan } from "../lib/rag-search";
import { ScannerProEngine } from "../lib/ScannerProEngine";
const globalScannerEngine = new ScannerEngine();


export function cleanOcrText(text: string): string {
  if (!text) return "";


  let cleaned = text.replace(/\[Page\s+\d+\s+(Snippet|Extraction|Local|Local Extraction).*?\]/gi, "");
  cleaned = cleaned.replace(/\[Page\s+\d+.*?\]/gi, "");


  cleaned = cleaned.replace(/(?:^|\n)#+\s+/g, "\n");


  cleaned = cleaned.replace(/\*\*+(.*?)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*+(.*?)\*/g, "$1");


  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

type AppMode = "Write" | "Practice";

function ThemeToggle({ disabled }: { disabled?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      disabled={disabled}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:scale-105 active:scale-95"
      title="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="w-[18px] h-[18px] text-neutral-300" />
      ) : (
        <Moon className="w-[18px] h-[18px] text-neutral-700" />
      )}
    </button>
  );
}

// Traces a tab's visible outer border (up the left edge, through the top-left curve,
// across the top, through the top-right curve, down the right edge) in a normalized
// 0-100 coordinate space. Used to run the neon accent-glow animation around the whole
// outline instead of just the flat top strip. No bottom segment — tabs have no bottom border.
const TAB_ACCENT_OUTLINE_PATH = "M 0 100 L 0 16 A 16 16 0 0 1 16 0 L 84 0 A 16 16 0 0 1 100 16 L 100 100";

const ScannerLiveIcon = ({ className = "w-4 h-4" }: { className?: string }) => {
  let themeAccentColor = "#3b82f6"; // default blue
  try {
    const { accent } = useSettings();
    const currentThemeObj = THEME_OPTIONS.find((t) => t.id === accent) || THEME_OPTIONS[0];
    themeAccentColor = currentThemeObj.colors[2];
  } catch {}

  return (
    <div className={`relative flex items-center justify-center scanner-icon-wrapper ${className}`}>
      <style>{`
        @keyframes scanMini {
          0%, 100% { transform: translateY(-7px); }
          50% { transform: translateY(7px); }
        }

        .scanner-line {
          opacity: 0;
          transition: opacity 0.5s ease-in-out;
        }

        /* The animation should always run but we only see it when opacity is 1 */
        .scanner-icon-wrapper:hover .scanner-line,
        .is-selected-live .scanner-line {
          opacity: 1;
          animation: scanMini 1.5s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
        }
      `}</style>
      <FileText strokeWidth={1.5} className="w-full h-full text-current opacity-80" />
      <div
        className="scanner-line absolute left-[-15%] right-[-15%] h-[1.5px] z-10 rounded-full pointer-events-none"
        style={{
          backgroundColor: themeAccentColor,
          boxShadow: `0 0 8px ${themeAccentColor}`
        }}
      />
    </div>
  );
};

function safeRandomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function Workspace() {
  const { theme } = useTheme();
  const alert = (message: string) => {
    try {
      window.alert(message);
    } catch (e) {
      console.warn("Alert blocked in sandbox iframe:", message);
    }
  };

  const confirm = (message: string): boolean => {
    try {
      return window.confirm(message);
    } catch (e) {
      console.warn("Confirm blocked in sandbox iframe:", message);
      return true;
    }
  };

  const prompt = (message: string, defaultValue = ""): string | null => {
    try {
      return window.prompt(message, defaultValue);
    } catch (e) {
      console.warn("Prompt blocked in sandbox iframe:", message);
      return defaultValue;
    }
  };

  const { user, signOut, addSession, saveFile: saveFileToCloud, sessions, linkedAccounts, guestUid, switchToAccount, removeLinkedAccount } = useAuth();

  const totalXP = React.useMemo(() => {
    return (sessions || []).reduce((acc, s) => {
      const base = s.type === "Exam" ? 250 : 120;
      const speedBonus = s.speed * (s.type === "Exam" ? 6 : 3);
      const precisionBonus = s.accuracy >= 95 ? 50 : 0;
      return acc + base + speedBonus + precisionBonus;
    }, 0);
  }, [sessions]);

  const level = Math.floor(totalXP / 1000) + 1;
  const displayRankTitle = React.useMemo(() => {
    if (level >= 10) return "Legendary Typist";
    if (level >= 7) return "Grand Archivist";
    if (level >= 4) return "Speed Sage";
    if (level >= 2) return "Adept Scribe";
    return "Novice Copyist";
  }, [level]);
  const { accent, fontCssFamily } = useSettings();
  useSoundEngine();
  useAmbientEngine();
  const currentThemeObj = THEME_OPTIONS.find((t) => t.id === accent) || THEME_OPTIONS[0];
  const themeAccentColor = currentThemeObj.colors[2];
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hoveredMode, setHoveredMode] = useState<AppMode | null>(null);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const pendingSwitchRef = useRef<(() => void) | null>(null);
  const latestPracticeConfigRef = useRef<PracticeConfig | null>(null);

  const [mode, setMode] = useState<AppMode>("Write");
  const [practiceState, setPracticeState] = useState({
    step: 1,
    wpm: 0,
    accuracy: 100,
    weakKeys: [] as string[],
    problemKeys: [] as string[],
    timerRunning: false,
    typedTextLength: 0
  });
  const [drillKeys, setDrillKeys] = useState<string[] | null>(null);
  const [forceStep, setForceStep] = useState<number | null>(null);
  const [isExamMode, setIsExamMode] = useState(false);
  const examReplayLogRef = useRef<{ t: number; s: string }[]>([]);
  const isSavingExamRef = useRef(false);
  const [examStatus, setExamStatus] = useState<
    "idle" | "countdown" | "running" | "timeout"
  >("idle");

  // Crash-recovery: when a saved snapshot shows the exam was mid-flight,
  // we hold examStatus at "idle" (so the timer/fullscreen locks and the
  // ExamOverlay's own ticking interval stay frozen) and instead show a
  // warm 5s "welcome back" overlay. Only once that countdown completes do
  // we flip examStatus to the restored value, so elapsed time never
  // advances while the user is re-orienting.
  const [examRecoveryPending, setExamRecoveryPending] = useState(false);
  const [examRecoverySeconds, setExamRecoverySeconds] = useState(10);
  const pendingExamRestoreRef = useRef<{ status: "countdown" | "running" } | null>(null);

  const completeExamRecovery = async () => {
    const restore = pendingExamRestoreRef.current;
    pendingExamRestoreRef.current = null;
    setExamRecoveryPending(false);
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      // Browsers require a user gesture to re-enter fullscreen; if this
      // silently fails after a reload, the exam still resumes normally —
      // the user can re-enter fullscreen manually via the exam toolbar.
      console.warn("Fullscreen re-request on recovery failed", e);
    }
    setExamStatus(restore?.status ?? "running");
    setTimeout(() => editorRef.current?.focus(), 50);
  };

  // "Start fresh" from the recovery overlay: the user explicitly declined
  // to resume, so we wipe the recovered exam/tab state entirely and drop
  // them into a single blank tab — exactly like a brand-new session.
  const handleExamRecoveryCancel = () => {
    pendingExamRestoreRef.current = null;
    setExamRecoveryPending(false);
    setIsExamMode(false);
    setExamStatus("idle");
    examReplayLogRef.current = [];
    setExamRemainingSeconds(0);
    setExamTotalSeconds(0);
    const uid = user?.uid ?? guestUid;
    try { localStorage.removeItem(`typing_suite_state_${uid}`); } catch {}
    const newId = String(Date.now());
    setTabs([{ id: newId, name: "New Document", content: "", isDirty: false, isAutoNamed: true, examSealed: false }]);
    setActiveTabId(newId);
    setFileName("New Document");
    setIsDirty(false);
    setEditorContent("");
    setEditorKey(k => k + 1);
    if (editorRef.current) editorRef.current.injectMarkdown("");
  };

  useEffect(() => {
    if (!examRecoveryPending) return;
    if (examRecoverySeconds <= 0) {
      completeExamRecovery();
      return;
    }
    const t = setTimeout(() => setExamRecoverySeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [examRecoveryPending, examRecoverySeconds]);

  // Continuous crash-safe autosave for the document editor & exam mode.
  // Runs every ~1s (the user's chosen safest interval) so a power cut or
  // crash never loses more than a second of content, cursor position, or
  // exam progress — independent of the account-switch/explicit save points.
  const liveSnapshotRef = useRef<() => AccountStateSnapshot | null>(() => null);
  useEffect(() => {
    liveSnapshotRef.current = () => {
      if (mode !== "Write") return null;
      if (examRecoveryPending) return null;
      return buildFullAccountSnapshot();
    };
  });
  useEffect(() => {
    const uid = user?.uid ?? guestUid;
    const interval = setInterval(() => {
      const snap = liveSnapshotRef.current();
      if (snap) saveAccountState(uid, snap);
    }, 500);
    return () => clearInterval(interval);
  }, [user?.uid, guestUid]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isCtrlK = isCtrlOrMeta && e.key.toLowerCase() === "k";
      const isEscape = e.key === "Escape";
      const key = e.key.toLowerCase();
      const examLocked = examStatus === "running" || examStatus === "countdown";

      const isCtrlN = isCtrlOrMeta && !e.shiftKey && key === "n";
      const isCtrlShiftN = isCtrlOrMeta && e.shiftKey && key === "n";
      const isCtrlO = isCtrlOrMeta && key === "o";
      const isCtrlS = isCtrlOrMeta && !e.shiftKey && key === "s";
      const isCtrlShiftS = isCtrlOrMeta && e.shiftKey && key === "s";
      const isCtrlP = isCtrlOrMeta && key === "p";
      const isCtrlShiftW = isCtrlOrMeta && e.shiftKey && key === "w";

      if (isCtrlN || isCtrlShiftN || isCtrlO || isCtrlS || isCtrlShiftS || isCtrlP || isCtrlShiftW) {
        e.preventDefault();

        if (examLocked) {
          return;
        }

        if (isCtrlN) {
          handleNewClick();
        } else if (isCtrlShiftN) {
          window.open(window.location.href, "_blank");
        } else if (isCtrlO) {
          openFile();
        } else if (isCtrlShiftS) {
          saveAsFile();
        } else if (isCtrlS) {
          saveFile();
        } else if (isCtrlP) {
          handlePrint();
        } else if (isCtrlShiftW) {
          closeTab(activeTabId);
        }
        return;
      }

      if (mode === "Practice") {
        if (isCtrlK || isEscape) {
          e.preventDefault();
        }
        return;
      }

      if (isEscape && examLocked) {

        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (isCtrlK || isEscape) {
        if (!examLocked) {
          e.preventDefault();
          setIsSettingsOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown, true);
  }, [examStatus, mode]);

  // --- Accent bar idle tracking: dims the tab accent bar after inactivity, ---
  // --- restores it quietly on the next input. Does not touch tab-glow logic. ---
  useEffect(() => {
    const ACCENT_IDLE_THRESHOLD_MS = 30 * 1000; // 30s
    const markActive = () => {
      lastActivityAtRef.current = Date.now();
      setIsAccentBarIdle(false);
    };
    window.addEventListener("mousemove", markActive);
    window.addEventListener("mousedown", markActive);
    window.addEventListener("keydown", markActive);
    const intervalId = window.setInterval(() => {
      const gap = Date.now() - lastActivityAtRef.current;
      if (gap >= ACCENT_IDLE_THRESHOLD_MS) {
        setIsAccentBarIdle(true);
      }
    }, 2000);
    return () => {
      window.removeEventListener("mousemove", markActive);
      window.removeEventListener("mousedown", markActive);
      window.removeEventListener("keydown", markActive);
      window.clearInterval(intervalId);
    };
  }, []);

  const [examRemainingSeconds, setExamRemainingSeconds] = useState(0);
  const [examTotalSeconds, setExamTotalSeconds] = useState(0);
  const [currentFileHandle, setCurrentFileHandle] = useState<any>(null);
  const [fileName, setFileName] = useState("New Document");
  const [isDirty, setIsDirty] = useState(false);




  const [tabs, setTabs] = useState<Array<{ id: string; name: string; content: string; fileHandle?: any; isDirty?: boolean; isAutoNamed?: boolean; examSealed?: boolean; hasGlowedOnce?: boolean; lastActiveAt?: number }>>([
    { id: "1", name: "New Document", content: "", isDirty: false, isAutoNamed: true, examSealed: false, hasGlowedOnce: false }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("1");
  const [glowingTabId, setGlowingTabId] = useState<string | null>(null);
  const [closingTabId, setClosingTabId] = useState<string | null>(null);
  const [isAccentBarIdle, setIsAccentBarIdle] = useState(false);
  const lastActivityAtRef = useRef<number>(Date.now());
  const pendingCloseTabIdRef = useRef<string | null>(null);
  const activeTab = tabs.find(t => t.id === activeTabId);
  const isExamSealed = !!activeTab?.examSealed;
  const sealActiveTab = (sealed: boolean) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, examSealed: sealed } : t));
  };

  const updateActiveTabIsDirty = (dirty: boolean) => {
    setIsDirty(dirty);
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isDirty: dirty } : t));
  };

  const updateActiveTabFileName = (name: string) => {
    setFileName(name);
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, name } : t));
  };

  const updateActiveTabFileHandle = (handle: any) => {
    setCurrentFileHandle(handle);
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, fileHandle: handle } : t));
  };

  const generateSmartLabel = (text: string) => {
    if (!text || !text.trim()) return "New Document";
    const lines = text.split('\n');
    const firstLine = lines.find(line => line.trim().length > 0) || "";


    let cleaned = firstLine.replace(/^[\s#*>\-!\[\]()]+/, '').trim();

    cleaned = cleaned.replace(/[.,!?;:]+$/, '');

    if (!cleaned) return "New Document";

    const limit = 24;
    if (cleaned.length > limit) {

      const lastSpace = cleaned.lastIndexOf(' ', limit);
      if (lastSpace > 12) {
        cleaned = cleaned.substring(0, lastSpace) + "...";
      } else {
        cleaned = cleaned.substring(0, limit) + "...";
      }
    }
    return cleaned;
  };

  const updateActiveTabContent = (content: string) => {
    setEditorContent(content);
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content } : t));
  };

  // --- Tab glow & close helpers ---
  const GLOW_LONG_ABSENCE_MS  = 5 * 60 * 1000;  // 5 min  → always glow
  const GLOW_SHORT_ABSENCE_MS = 45 * 1000;       // 45 sec → glow if tab has content

  const fireTabGlow = (tabId: string) => {
    setGlowingTabId(null);
    requestAnimationFrame(() => setGlowingTabId(tabId));
  };

  const shouldGlowOnReturn = (tab: { isDirty?: boolean; lastActiveAt?: number; content?: string }): boolean => {
    if (!tab.lastActiveAt) return false;
    const gap = Date.now() - tab.lastActiveAt;
    if (gap >= GLOW_LONG_ABSENCE_MS) return true;
    if (gap >= GLOW_SHORT_ABSENCE_MS && (tab.isDirty || (tab.content && tab.content.trim().length > 0))) return true;
    return false;
  };

  const handleCloseAnimationEnd = () => {
    const tid = pendingCloseTabIdRef.current;
    pendingCloseTabIdRef.current = null;
    setClosingTabId(null);
    if (tid) doCloseTab(tid);
  };

  const initiateTabClose = (tabId: string, e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    const tabToClose = tabs.find(t => t.id === tabId);
    if (!tabToClose) return;
    if (tabToClose.isDirty && (tabToClose.content || "").trim() !== "") {
      // Show unsaved prompt first; animation fires after user confirms
      setPendingAction(`animatedCloseTab:${tabId}`);
      setIsUnsavedPopupOpen(true);
      return;
    }
    pendingCloseTabIdRef.current = tabId;
    setClosingTabId(tabId);
  };
  // --------------------------------

  const createNewTab = (name = "New Document", content = "", fileHandle = null) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const currentText = editorRef.current ? editorRef.current.getMarkdown() : editorContent;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: currentText, isDirty: isDirty } : t));

    const newId = String(Date.now());
    const newTab = { id: newId, name, content, fileHandle, isDirty: false, isAutoNamed: true, hasGlowedOnce: false };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    setFileName(name);
    setIsDirty(false);
    setCurrentFileHandle(fileHandle);
    setEditorContent(content);

    setEditorKey(k => k + 1);
    setExamStatus("idle");
    setIsExamMode(false);
  };

  const switchTab = (tabId: string) => {
    if (examStatus === "running" || examStatus === "countdown") {
      alert("Cannot switch tabs during an active exam.");
      return;
    }
    if (tabId === activeTabId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const currentText = editorRef.current ? editorRef.current.getMarkdown() : editorContent;
    // Stamp lastActiveAt on the tab we're leaving
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: currentText, isDirty: isDirty, lastActiveAt: Date.now() } : t));

    const nextTab = tabs.find(t => t.id === tabId);
    if (!nextTab) return;

    // Smart return-glow: fire only after meaningful absence
    if (shouldGlowOnReturn(nextTab)) fireTabGlow(tabId);

    setActiveTabId(tabId);
    setFileName(nextTab.name);
    setIsDirty(!!nextTab.isDirty);
    setCurrentFileHandle(nextTab.fileHandle || null);
    setEditorContent(nextTab.content);
    setExamStatus(nextTab.examSealed ? "timeout" : "idle");
    setIsExamMode(false);

    if (editorRef.current) {
      if (nextTab.name.endsWith(".html")) {
        editorRef.current.injectHTML(nextTab.content);
      } else {
        editorRef.current.injectMarkdown(nextTab.content);
      }
    }
  };

  const doCloseTab = async (tabId: string) => {
    const tabToClose = tabs.find(t => t.id === tabId);
    if (!tabToClose) return;

    let targetActiveId = activeTabId;
    if (tabId === activeTabId) {
      const activeIndex = tabs.findIndex(t => t.id === tabId);
      if (tabs.length > 1) {
        if (activeIndex > 0) {
          targetActiveId = tabs[activeIndex - 1].id;
        } else {
          targetActiveId = tabs[activeIndex + 1].id;
        }
      } else {
        targetActiveId = "";
      }
    }

    const remainingTabs = tabs.filter(t => t.id !== tabId);

    if (remainingTabs.length === 0) {
      const newId = String(Date.now());
      const newTab = { id: newId, name: "New Document", content: "", isDirty: false, examSealed: false };
      setTabs([newTab]);
      setActiveTabId(newId);
      setFileName("New Document");
      setIsDirty(false);
      setCurrentFileHandle(null);
      setEditorContent("");
      setEditorKey(k => k + 1);
      setExamStatus("idle");
      setIsExamMode(false);
    } else {
      setTabs(remainingTabs);
      if (tabId === activeTabId) {
        const nextTab = remainingTabs.find(t => t.id === targetActiveId)!;
        setActiveTabId(targetActiveId);
        setFileName(nextTab.name);
        setIsDirty(!!nextTab.isDirty);
        setCurrentFileHandle(nextTab.fileHandle || null);
        setEditorContent(nextTab.content);
        setExamStatus(nextTab.examSealed ? "timeout" : "idle");
        setIsExamMode(false);

        if (editorRef.current) {
          if (nextTab.name.endsWith(".html")) {
            editorRef.current.injectHTML(nextTab.content);
          } else {
            editorRef.current.injectMarkdown(nextTab.content);
          }
        }
      }
    }
  };

  const closeTab = async (tabId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const tabToClose = tabs.find(t => t.id === tabId);
    if (!tabToClose) return;

    if (tabToClose.isDirty && (tabToClose.content || "").trim() !== "") {
      setPendingAction(`closeTab:${tabId}`);
      setIsUnsavedPopupOpen(true);
      return;
    }

    await doCloseTab(tabId);
  };

  useEffect(() => {
    const handleTabKeyDown = (e: KeyboardEvent) => {
      if (examStatus === "running" || examStatus === "countdown") return;

      const isAltT = e.altKey && e.key.toLowerCase() === "t";
      const isAltW = e.altKey && e.key.toLowerCase() === "w";
      const isAltR = e.altKey && e.key.toLowerCase() === "r";
      const isAltLeft = e.altKey && (e.key === "ArrowLeft" || e.key === "[");
      const isAltRight = e.altKey && (e.key === "ArrowRight" || e.key === "]");

      if (isAltT) {
        e.preventDefault();
        e.stopPropagation();
        createNewTab(`New Document ${tabs.length + 1}`, "");
      } else if (isAltW) {
        e.preventDefault();
        e.stopPropagation();
        closeTab(activeTabId);
      } else if (isAltR) {
        e.preventDefault();
        e.stopPropagation();
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (activeTab) {
          const newName = prompt(`Rename tab "${activeTab.name}" to:`, activeTab.name);
          if (newName && newName.trim()) {
            const cleanedName = newName.trim();
            setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, name: cleanedName, isAutoNamed: false } : t));
            setFileName(cleanedName);
          }
        }
      } else if (isAltLeft) {
        e.preventDefault();
        e.stopPropagation();
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        if (currentIndex > 0) {
          switchTab(tabs[currentIndex - 1].id);
        } else if (tabs.length > 0) {
          switchTab(tabs[tabs.length - 1].id);
        }
      } else if (isAltRight) {
        e.preventDefault();
        e.stopPropagation();
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        if (currentIndex !== -1 && currentIndex < tabs.length - 1) {
          switchTab(tabs[currentIndex + 1].id);
        } else if (tabs.length > 0) {
          switchTab(tabs[0].id);
        }
      }
    };

    window.addEventListener("keydown", handleTabKeyDown);
    return () => window.removeEventListener("keydown", handleTabKeyDown);
  }, [tabs, activeTabId, examStatus]);

  const [isUnsavedPopupOpen, setIsUnsavedPopupOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const hasRealUnsavedContent = () => {
    const content = editorRef.current ? editorRef.current.getMarkdown() : editorContent;
    return isDirty && content.trim() !== "";
  };

  const triggerUnsavedCheck = (action: string, proceed: () => void): boolean => {
    if (hasRealUnsavedContent()) {
      setPendingAction(action);
      setIsUnsavedPopupOpen(true);
      return true;
    }
    proceed();
    return false;
  };

  const executePendingAction = (action: string) => {
    if (action === "new") { createNewFile(); }
    else if (action === "open") { openFile(true); }
    else if (action === "Write") { setMode("Write"); }
    else if (action === "Practice") { setMode("Practice"); }
    else if (action === "switchAccount") {
      if (pendingSwitchRef.current) {
        pendingSwitchRef.current();
        pendingSwitchRef.current = null;
      }
    }
    else if (action.startsWith("closeTab:")) {
      const tabId = action.replace("closeTab:", "");
      doCloseTab(tabId);
    }
    else if (action.startsWith("animatedCloseTab:")) {
      const tabId = action.replace("animatedCloseTab:", "");
      pendingCloseTabIdRef.current = tabId;
      setClosingTabId(tabId);
    }
  };

  const handlePrint = () => {
    const editorEl = document.querySelector('.lexkit-content-editable') as HTMLElement | null;
    const html = editorEl ? editorEl.innerHTML : '';
    const title = fileName || 'Document';
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) { window.print(); return; }
    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    @page { margin: 2cm 2.5cm; size: auto; }
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.65; color: #000; background: #fff; margin: 0; padding: 0; }
    h1 { font-size: 20pt; font-weight: 700; margin: 0.8em 0 0.4em; }
    h2 { font-size: 16pt; font-weight: 600; margin: 0.8em 0 0.4em; }
    h3 { font-size: 13pt; font-weight: 600; margin: 0.6em 0 0.3em; }
    h4, h5, h6 { font-size: 11pt; font-weight: 600; margin: 0.6em 0 0.3em; }
    p { margin: 0 0 0.6em; }
    ul, ol { margin: 0.4em 0 0.6em 1.8em; }
    li { margin-bottom: 0.2em; }
    strong, b { font-weight: 700; }
    em, i { font-style: italic; }
    u { text-decoration: underline; }
    s { text-decoration: line-through; }
    code { font-family: 'Courier New', Courier, monospace; font-size: 9pt; background: #f4f4f4; padding: 1px 4px; border-radius: 3px; }
    pre { font-family: 'Courier New', Courier, monospace; font-size: 9pt; background: #f4f4f4; padding: 12px; border-radius: 4px; white-space: pre-wrap; overflow-wrap: break-word; margin: 0.6em 0; }
    table { border-collapse: collapse; width: 100%; margin: 0.6em 0; }
    td, th { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
    th { background: #f8f8f8; font-weight: 600; }
    a { color: #000; text-decoration: underline; }
    img { max-width: 100%; height: auto; }
    blockquote { border-left: 3px solid #ccc; margin: 0.6em 0; padding-left: 1em; color: #444; }
    hr { border: none; border-top: 1px solid #ddd; margin: 1em 0; }
  </style>
</head>
<body>${html}</body>
</html>`);
    printWin.document.close();
    if (printWin.document.readyState === 'complete') {
      printWin.focus();
      printWin.print();
      printWin.close();
    } else {
      printWin.onload = () => {
        printWin.focus();
        printWin.print();
        printWin.close();
      };
    }
  };
  const [editorKey, setEditorKey] = useState(0);

  const editorRef = useRef<DefaultTemplateRef>(null);
  const saveTimeoutRef = useRef<any>(null);

  // ── Per-account state snapshot ──────────────────────────────────────────────
  interface AccountStateSnapshot {
    editorContent: string;
    mode: "Write" | "Practice";
    practiceText?: string;
    practiceTitle?: string;
    practiceConfig?: PracticeConfig;
    fileName?: string;
    cursor?: { start: number; end: number } | null;
    isExamMode?: boolean;
    examStatus?: "idle" | "countdown" | "running" | "timeout";
    examRemainingSeconds?: number;
    examTotalSeconds?: number;
    examReplayLog?: { t: number; s: string; c?: { start: number; end: number } }[];
    examSealed?: boolean;
    tabs?: Array<{ id: string; name: string; content: string; isDirty?: boolean; isAutoNamed?: boolean; examSealed?: boolean }>;
    activeTabId?: string;
  }
  const saveAccountState = (uid: string, snap: AccountStateSnapshot) => {
    try { localStorage.setItem(`typing_suite_state_${uid}`, JSON.stringify(snap)); } catch {}
  };
  const loadAccountState = (uid: string): AccountStateSnapshot | null => {
    try { const r = localStorage.getItem(`typing_suite_state_${uid}`); return r ? JSON.parse(r) : null; } catch { return null; }
  };

  // Derived synchronously during render (not via a ref set inside a
  // post-paint effect) so PracticeMode mounts with the correct config on the
  // very first render after an account switch, instead of a stale/null value.
  const restoredPracticeConfig = useMemo(() => {
    const uid = user?.uid ?? guestUid;
    const snap = loadAccountState(uid);
    return snap?.practiceConfig ?? null;
  }, [user?.uid, guestUid]);

  // Shared restore logic used by both the initial page-load effect and the
  // account-switch effect. Applies a saved snapshot to all relevant state,
  // or resets to a clean blank slate when no snapshot exists.
  const restoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applySnapshot = (snap: AccountStateSnapshot | null) => {
    if (restoreTimeoutRef.current !== null) {
      clearTimeout(restoreTimeoutRef.current);
      restoreTimeoutRef.current = null;
    }
    if (snap) {
      if (snap.mode === "Practice") {
        // PracticeMode owns its own per-account restore via its own
        // localStorage key; we only need to route to the right screen.
        setCustomPracticeText(snap.practiceText || "");
        setCustomPracticeTitle(snap.practiceTitle || "");
        setMode("Practice");
      } else {
        setMode("Write");
        const content = snap.editorContent || "";
        const restoredName = snap.fileName || "New Document";
        // Restore every tab that was open — dirty scratch docs AND the exam
        // tab — so a crash never silently drops in-progress documents.
        const restoredTabs = (snap.tabs && snap.tabs.length > 0)
          ? snap.tabs
          : [{ id: "1", name: restoredName, content, isDirty: false, isAutoNamed: !snap.fileName, examSealed: !!snap.examSealed }];
        const restoredActiveId = (snap.activeTabId && restoredTabs.some(t => t.id === snap.activeTabId))
          ? snap.activeTabId
          : restoredTabs[0].id;
        const restoredActiveTab = restoredTabs.find(t => t.id === restoredActiveId)!;
        setEditorContent(restoredActiveTab.content);
        setTabs(restoredTabs);
        setActiveTabId(restoredActiveId);
        setFileName(restoredActiveTab.name);
        setIsDirty(!!restoredActiveTab.isDirty);
        restoreTimeoutRef.current = setTimeout(() => {
          restoreTimeoutRef.current = null;
          if (editorRef.current) {
            editorRef.current.injectMarkdown(restoredActiveTab.content);
            if (snap.cursor) {
              // injectMarkdown defers its own DOM update internally, so
              // give it a head start before restoring the exact cursor
              // position, otherwise the selection targets stale/empty text.
              setTimeout(() => editorRef.current?.setSelection(snap.cursor!), 250);
            }
          }
        }, 80);

        const wasExamActive = snap.examStatus === "running" || snap.examStatus === "countdown";
        if (wasExamActive) {
          examReplayLogRef.current = snap.examReplayLog || [];
          setExamTotalSeconds(snap.examTotalSeconds || 0);
          setExamRemainingSeconds(snap.examRemainingSeconds ?? snap.examTotalSeconds ?? 0);
          setIsExamMode(true);
          pendingExamRestoreRef.current = { status: snap.examStatus === "countdown" ? "countdown" : "running" };
          setExamRecoverySeconds(10);
          setExamRecoveryPending(true);
        }
      }
    } else {
      // No saved state — fresh blank slate
      setMode("Write");
      setEditorContent("");
      setTabs([{ id: "1", name: "New Document", content: "", isDirty: false, isAutoNamed: true, examSealed: false }]);
      setActiveTabId("1");
      setFileName("New Document");
      setIsDirty(false);
      restoreTimeoutRef.current = setTimeout(() => {
        restoreTimeoutRef.current = null;
        if (editorRef.current) editorRef.current.injectMarkdown("");
      }, 80);
    }
  };

  // ── Initial page-load restore ────────────────────────────────────────────
  // Runs exactly once on mount. The account-switch effect below deliberately
  // skips the first render (it only reacts to *changes*), so without this
  // dedicated effect a crash/reload would always open a blank slate even
  // though a full snapshot is sitting in localStorage.
  useEffect(() => {
    const uid = user?.uid ?? guestUid;
    applySnapshot(loadAccountState(uid));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Account-switch restore ───────────────────────────────────────────────
  // Runs whenever the active account changes AFTER the initial mount.
  const prevAccountUidRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const newUid = user?.uid ?? guestUid;
    if (prevAccountUidRef.current === undefined) {
      prevAccountUidRef.current = newUid;
      return; // initial mount is handled by the dedicated effect above
    }
    if (newUid === prevAccountUidRef.current) return;
    prevAccountUidRef.current = newUid;
    applySnapshot(loadAccountState(newUid));
  }, [user?.uid, guestUid]);

  // Builds a complete, crash-safe snapshot of everything needed to restore
  // the current session pixel-perfect: document content + cursor, active
  // exam timer/replay state, and file name.
  const buildFullAccountSnapshot = (): AccountStateSnapshot => {
    const content = editorRef.current ? editorRef.current.getMarkdown() : editorContent;
    const cursor = editorRef.current ? editorRef.current.getSelection() : null;
    // Every open tab (dirty scratch work AND the exam tab, if any) must
    // survive a crash, not just the active one — merge the live editor
    // content into the active tab before snapshotting the full array.
    const tabsSnapshot = tabs.map(t => t.id === activeTabId ? { ...t, content, isDirty } : t);
    return {
      editorContent: content,
      mode,
      practiceText: customPracticeText,
      practiceTitle: customPracticeTitle,
      practiceConfig: latestPracticeConfigRef.current ?? undefined,
      fileName,
      cursor,
      isExamMode,
      examStatus,
      examRemainingSeconds,
      examTotalSeconds,
      examReplayLog: examReplayLogRef.current,
      examSealed: isExamSealed,
      tabs: tabsSnapshot,
      activeTabId,
    };
  };

  // handleBeforeSwitch: save current state, gate on unsaved check
  const handleBeforeSwitch = (proceed: () => void) => {
    const currentUid = user?.uid ?? guestUid;
    saveAccountState(currentUid, buildFullAccountSnapshot());
    if (hasRealUnsavedContent()) {
      pendingSwitchRef.current = proceed;
      setPendingAction("switchAccount");
      setIsUnsavedPopupOpen(true);
    } else {
      proceed();
    }
  };

  const [editorContent, setEditorContent] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"file" | "stats" | "ai" | "rag">("file");
  const [recentFiles, setRecentFiles] = useState<Array<{ name: string; content: string; handle?: any }>>([]);
  const [customPracticeText, setCustomPracticeText] = useState("");
  const [customPracticeTitle, setCustomPracticeTitle] = useState("");
  // Bumped only on a genuine explicit load into Practice (e.g. OCR import)
  // so PracticeMode remounts and picks up the freshly-provided initialText.
  // Never bumped on account switches, so PracticeMode's own per-account
  // exact-resume session is left free to restore synchronously instead of
  // being fought over by a competing source of truth here.
  const [practiceLoadNonce, setPracticeLoadNonce] = useState(0);

  const [ragSearchQuery, setRagSearchQuery] = useState("");
  const [ragResults, setRagResults] = useState<ScanDocument[]>([]);
  const [editingDoc, setEditingDoc] = useState<ScanDocument | null>(null);
  const [isRagIndexing, setIsRagIndexing] = useState(false);
  const isRagIndexingRef = useRef(false);

  useEffect(() => {
    syncRagIndex().then(() => setRagResults(getAllScans()));
  }, [user]);

  // Preload critical assets after 3 seconds for instant render/playback
  useEffect(() => {
    const timer = setTimeout(() => {
      const assetsToPreload = [
        "/assets/images/stop-exam.png",
        "/assets/images/times-up.png",
        "/assets/sounds/keyboard/error5/1.wav"
      ];
      
      assetsToPreload.forEach(url => {
        if (url.endsWith('.png')) {
          const img = new Image();
          img.src = url;
        } else {
          const audio = new Audio();
          audio.src = url;
          audio.preload = "auto";
        }
      });
      console.log("Background assets preloaded successfully.");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);


  useEffect(() => {
    let fontStyleTag = document.getElementById("notepad-fonts-custom-style");
    if (!fontStyleTag) {
      fontStyleTag = document.createElement("style");
      fontStyleTag.id = "notepad-fonts-custom-style";
      document.head.appendChild(fontStyleTag);
    }
    fontStyleTag.innerHTML = `
      .lexical-editor-content, .editor-input, [contenteditable] {
        font-family: ${fontCssFamily} !important;
        font-size: 15px !important;
        font-weight: normal !important;
        font-style: normal !important;
      }
    `;
  }, [fontCssFamily]);

  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [ocrResult, setOcrResult] = useState("");
  const [ocrError, setOcrError] = useState("");

  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [editorZoom, setEditorZoom] = useState(1.0);
  const [isDragActive, setIsDragActive] = useState(false);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  const handleTranslate = async (targetLanguage: string) => {
    if (!ocrResult) return;
    try {
      setIsTranslating(true);
      setScannerLogs(prev => [...prev, `Translating to ${targetLanguage}...`]);

      if (typeof navigator !== "undefined" && navigator.vibrate) {
         navigator.vibrate([10]);
      }

      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ocrResult, targetLanguage })
      });
      const data = await res.json();
      if (res.ok && data.text) {
        setOcrResult(data.text);
        setScannerLogs(prev => [...prev, `Successfully translated to ${targetLanguage}.`]);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([30]);
        }
      } else {
        throw new Error(data.details || data.error || "Failed to translate");
      }
    } catch (err: any) {
      console.error(err);
      setOcrError("Failed to translate: " + err.message);
    } finally {
      setIsTranslating(false);
    }
  };


  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [scannerFile, setScannerFile] = useState<File | null>(null);


  const [savedScanExtracts, setSavedScanExtracts] = useState<{ id: string; title: string; content: string; date: string }[]>(() => {
    try {
      const stored = localStorage.getItem("ais_saved_scan_extracts");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const deleteScanExtract = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedScanExtracts(prev => {
      const updated = prev.filter(item => item.id !== id);
      try {
        localStorage.setItem("ais_saved_scan_extracts", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to write to localStorage:", err);
      }
      return updated;
    });

    if (savedScanExtracts.length > 0) {
      const deletedItem = savedScanExtracts.find(item => item.id === id);
      if (deletedItem && deletedItem.content === ocrResult) {
        setOcrResult("");
      }
    }
  };

  useEffect(() => {
    if (ocrResult && ocrResult.trim()) {
      setSavedScanExtracts(prev => {
        const text = ocrResult.trim();
        const exists = prev.some(item => item.content.trim() === text);
        if (exists) return prev;

        const newTitle = scannerFile?.name || `Scan Extract ${new Date().toLocaleDateString()}`;
        const newEntry = {
          id: safeRandomUUID(),
          title: newTitle,
          content: ocrResult,
          date: new Date().toLocaleString()
        };
        const updated = [newEntry, ...prev].slice(0, 50);
        try {
          localStorage.setItem("ais_saved_scan_extracts", JSON.stringify(updated));
        } catch (err) {
          console.error("Failed to save scans to localStorage:", err);
        }
        return updated;
      });
    }
  }, [ocrResult, scannerFile]);
  const [scannerPreviewUrl, setScannerPreviewUrl] = useState<string>("");
  const [scannerPreviewUrl2, setScannerPreviewUrl2] = useState<string>("");
  const [scannerZoom, setScannerZoom] = useState(1.0);
  const [scannerPage, setScannerPage] = useState(1);
  const [scannerTotalPages, setScannerTotalPages] = useState(3);
  const [scannerLogs, setScannerLogs] = useState<string[]>([]);
  const [isScannerAnimating, setIsScannerAnimating] = useState(false);
  const [scannerPdfDoc, setScannerPdfDoc] = useState<any>(null);
  const [scannerStitchedUrl, setScannerStitchedUrl] = useState<string>("");
  const [scannerCrop, setScannerCrop] = useState<Crop>();
  const [cropQueue, setCropQueue] = useState<Array<{ id: string; page: number; crop: Crop; imgUrl: string; base64Data: string }>>([]);
  const [scannerProgress, setScannerProgress] = useState<{ currentIndex: number, total: number, status: 'idle' | 'scanning' | 'success' | 'error' }>({ currentIndex: 0, total: 0, status: 'idle' });
  const scannerImgRef = useRef<HTMLImageElement>(null);


  const [scannerRotation, setScannerRotation] = useState<number>(0);
  const [scannerScaleX, setScannerScaleX] = useState<number>(1);
  const [scannerScaleY, setScannerScaleY] = useState<number>(1);
  const [isCropEnabled, setIsCropEnabled] = useState<boolean>(false);
  const [isEnhancementOpen, setIsEnhancementOpen] = useState<boolean>(false);

  const [selectedScanner, setSelectedScanner] = useState("HP DeskJet 2300 series");
  const [selectedFileType, setSelectedFileType] = useState("PDF");
  const [selectedColourMode, setSelectedColourMode] = useState("Colour");
  const [selectedResolution, setSelectedResolution] = useState("200 dpi");
  const [selectedDestinationFolder, setSelectedDestinationFolder] = useState("");

  useEffect(() => {
    if (!isScannerOpen) return;
    setScannerLogs(prev => [...prev, `[Device Connection] Active Scanner switched to ${selectedScanner}. Ready.`]);
  }, [selectedScanner]);

  useEffect(() => {
    if (!isScannerOpen) return;
    setScannerLogs(prev => [...prev, `[Profiles] Active Output Format calibrated to ${selectedFileType}.`]);
  }, [selectedFileType]);

  useEffect(() => {
    if (!isScannerOpen) return;
    setScannerLogs(prev => [...prev, `[Calibration] Re-adjusting sensor binarization matrices to [${selectedColourMode}] mode.`]);
  }, [selectedColourMode]);

  useEffect(() => {
    if (!isScannerOpen) return;
    setScannerLogs(prev => [...prev, `[Sensing Matrix] Re-pitching optical scanner physical density to [${selectedResolution}].`]);
  }, [selectedResolution]);

  useEffect(() => {
    if (!isScannerOpen) return;
    if (scannerPdfDoc) {
      renderPdfPage(scannerPdfDoc, scannerPage);
    } else if (scannerFile && scannerFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const resultUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const purifiedCanvas = globalScannerEngine.purifyCanvas(canvas, selectedColourMode);
            const dataUrl = purifiedCanvas.toDataURL('image/jpeg', 0.85);
            setScannerPreviewUrl(dataUrl);
            setScannerStitchedUrl(dataUrl);
          }
        };
        img.src = resultUrl;
      };
      reader.readAsDataURL(scannerFile);
    }
  }, [selectedColourMode, selectedResolution, isScannerOpen, scannerPdfDoc, scannerPage, scannerFile]);


  const [fallbackModalOpen, setFallbackModalOpen] = useState(false);
  const [fallbackTitle, setFallbackTitle] = useState("Backup Document");
  const [fallbackType, setFallbackType] = useState<"save" | "print">("save");
  const [fallbackContent, setFallbackContent] = useState("");
  const [fallbackCopied, setFallbackCopied] = useState(false);


  const [scannerProMode, setScannerProMode] = useState<"standard" | "book" | "idcard" | "erasewritings">("standard");
  const [idCardFront, setIdCardFront] = useState<string | null>(null);
  const [idCardBack, setIdCardBack] = useState<string | null>(null);
  const [idCardStep, setIdCardStep] = useState<"front" | "back" | "ready">("front");
  const [eraseTolerance, setEraseTolerance] = useState<number>(1.0);
  const [detectedQrCodes, setDetectedQrCodes] = useState<string[]>([]);

  const applyHandwritingEraser = () => {
    if (!scannerImgRef.current) return;
    setScannerLogs(prev => [...prev, "⚡ Applying Localized AI Handwriting Eraser..."]);

    const canvas = document.createElement("canvas");
    canvas.width = scannerImgRef.current.naturalWidth;
    canvas.height = scannerImgRef.current.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(scannerImgRef.current, 0, 0);

    const clearedCanvas = ScannerProEngine.eraseHandwriting(canvas, eraseTolerance);
    const newB64 = clearedCanvas.toDataURL("image/jpeg", 0.95);
    setScannerPreviewUrl(newB64);
    setScannerStitchedUrl(newB64);

    setScannerLogs(prev => [...prev, "✓ All blue/red ink markings neutralized instantly!"]);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([10, 30]);
    }
  };

  const dewarpBookSpread = () => {
    if (!scannerImgRef.current) return;
    setScannerLogs(prev => [...prev, "📖 Straightening curved text near book spine..."]);

    const canvas = document.createElement("canvas");
    canvas.width = scannerImgRef.current.naturalWidth;
    canvas.height = scannerImgRef.current.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(scannerImgRef.current, 0, 0);

    const dewarped = ScannerProEngine.dewarpBookPage(canvas, 0.12);


    const b64L = dewarped.left.toDataURL("image/jpeg", 0.92);
    const b64R = dewarped.right.toDataURL("image/jpeg", 0.92);

    setCropQueue(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        page: scannerPage,
        crop: { x: 0, y: 0, width: 50, height: 100, unit: "%" } as any,
        imgUrl: b64L,
        base64Data: b64L.split(",")[1]
      },
      {
        id: Math.random().toString(36).substring(7),
        page: scannerPage + 1,
        crop: { x: 50, y: 0, width: 50, height: 100, unit: "%" } as any,
        imgUrl: b64R,
        base64Data: b64R.split(",")[1]
      }
    ]);

    setScannerPage(p => p + 2);
    setScannerLogs(prev => [...prev, "✓ Cylindrical book pages flattened & split into two separate flat captures!"]);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([30]);
    }
  };

  const spliceIDCards = async () => {
    if (!idCardFront || !idCardBack) {
      setScannerLogs(prev => [...prev, "⚠️ Please capture both FRONT and BACK of ID Card first."]);
      return;
    }
    setScannerLogs(prev => [...prev, "📇 Splicing ID Front and Back cleanly onto A4 canvas..."]);

    const fusedCanvas = await ScannerProEngine.spliceIdCard(idCardFront, idCardBack);
    const newB64 = fusedCanvas.toDataURL("image/jpeg", 0.95);

    setScannerPreviewUrl(newB64);
    setScannerStitchedUrl(newB64);
    setIdCardStep("ready");
    setScannerLogs(prev => [...prev, "✓ ID front/back spliced successfully. Ready for OCR!"]);
  };

  const scanQRCodesOnDocument = () => {
    if (!scannerImgRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = scannerImgRef.current.naturalWidth;
    canvas.height = scannerImgRef.current.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(scannerImgRef.current, 0, 0);

    ScannerProEngine.extractQrCodes(canvas).then(codes => {
      if (codes.length > 0) {
        setDetectedQrCodes(codes);
        setScannerLogs(prev => [...prev, `🔍 Scanned ${codes.length} actionable bar/QR symbols.`]);
      } else {
        setScannerLogs(prev => [...prev, "No QR/Barcodes detected on the sheet layout."]);
      }
    });
  };




  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingLog, setIsDrawingLog] = useState(false);

  const handleStartSigning = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawingLog(true);
  };

  const handleDrawSigning = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingLog) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleEndSigning = () => {
    setIsDrawingLog(false);
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const applySignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const base64Png = canvas.toDataURL('image/png');
    if (editorRef.current) {
      const currentText = editorRef.current.getMarkdown() || "";
      editorRef.current.injectMarkdown(currentText + `\n\n### E-Signature Stamp\n![E-Signature](${base64Png})\n`);
      setSignatureModalOpen(false);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  };

  const getStats = () => {
    const cleanText = editorContent.trim();
    const wordsCount = cleanText ? cleanText.split(/\s+/).length : 0;
    const charsCountWithSpaces = editorContent.length;
    const charsCountNoSpaces = editorContent.replace(/\s/g, "").length;
    const sentencesList = cleanText ? cleanText.split(/[.!?]+\s+/) : [];
    const sentencesCount = cleanText ? sentencesList.length : 0;
    const linesCount = cleanText ? cleanText.split("\n").length : 0;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordsCount / 200));

    let readability = "Simple";
    if (wordsCount > 0 && sentencesCount > 0) {
      const avgWordLen = charsCountNoSpaces / wordsCount;
      if (avgWordLen > 5.3) readability = "Complex / Legal";
      else if (avgWordLen > 4.7) readability = "Academic / Pro";
      else if (avgWordLen > 4.1) readability = "Conversational";
    }

    return {
      words: wordsCount,
      charsWithSpaces: charsCountWithSpaces,
      charsNoSpaces: charsCountNoSpaces,
      lines: linesCount,
      readingTime: readingTimeMinutes,
      readability
    };
  };

  const transformCase = (type: "upper" | "lower" | "title" | "sentence") => {
    if (!editorRef.current) return;
    const currentContent = editorRef.current.getMarkdown();
    let transformed = currentContent;
    if (type === "upper") {
      transformed = currentContent.toUpperCase();
    } else if (type === "lower") {
      transformed = currentContent.toLowerCase();
    } else if (type === "title") {
      transformed = currentContent.replace(/\b\w/g, c => c.toUpperCase());
    } else if (type === "sentence") {
      transformed = currentContent.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, m => m.toUpperCase());
    }
    editorRef.current.injectMarkdown(transformed);
    setEditorContent(transformed);
    setIsDirty(true);
  };

  const handlePageChange = async (newPage: number) => {
    setScannerCrop(undefined);
    setScannerPage(newPage);
    if (scannerPdfDoc) {
      setTimeout(() => {
        renderPdfPage(scannerPdfDoc, newPage).catch(e => console.error(e));
      }, 50);
    } else {

    }
  };

  const handleAddToQueue = () => {
    if (!scannerImgRef.current) return;
    const image = scannerImgRef.current;

    const isFullPage = !scannerCrop || !scannerCrop.width;
    let activeCrop = scannerCrop;
    if (!activeCrop || !activeCrop.width) {
       activeCrop = { x: 0, y: 0, width: image.width, height: image.height, unit: 'px' } as Crop;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const canvas = document.createElement('canvas');
    canvas.width = activeCrop.width * scaleX;
    canvas.height = activeCrop.height * scaleY;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      activeCrop.x * scaleX,
      activeCrop.y * scaleY,
      activeCrop.width * scaleX,
      activeCrop.height * scaleY,
      0,
      0,
      activeCrop.width * scaleX,
      activeCrop.height * scaleY
    );


    const purifiedCanvas = globalScannerEngine.purifyCanvas(canvas, selectedColourMode);
    const base64Crop = purifiedCanvas.toDataURL('image/jpeg', 0.9);

    setCropQueue(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      page: scannerPage,
      crop: activeCrop,
      imgUrl: base64Crop,
      base64Data: base64Crop.split(',')[1],
      isFullPage: isFullPage
    }]);
    setScannerCrop(undefined);
  };

  const handleAutoDetectCrops = () => {
    if (!scannerImgRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = scannerImgRef.current.naturalWidth;
    canvas.height = scannerImgRef.current.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(scannerImgRef.current, 0, 0);

    const crops = globalScannerEngine.autoDetectCrops(canvas);

    if (crops.length > 0) {
      setScannerLogs(prev => [...prev, `Auto-detected ${crops.length} distinct items.`]);
      crops.forEach((cvCrop) => {

         const cCanvas = document.createElement('canvas');
         cCanvas.width = cvCrop.width;
         cCanvas.height = cvCrop.height;
         const cCtx = cCanvas.getContext('2d');
         if (cCtx) {
           cCtx.drawImage(canvas, cvCrop.x, cvCrop.y, cvCrop.width, cvCrop.height, 0, 0, cvCrop.width, cvCrop.height);
           const pCanvas = globalScannerEngine.purifyCanvas(cCanvas, selectedColourMode);
           const b64 = pCanvas.toDataURL('image/jpeg', 0.9);

           setCropQueue(prev => [...prev, {
             id: Math.random().toString(36).substring(7),
             page: scannerPage,
             crop: { x: cvCrop.unitX, y: cvCrop.unitY, width: cvCrop.unitWidth, height: cvCrop.unitHeight, unit: '%' } as any,
             imgUrl: b64,
             base64Data: b64.split(',')[1]
           }]);
         }
      });
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([20, 50, 20]);
    } else {
      setScannerLogs(prev => [...prev, "No dense distinct items found automatically."]);
    }
  };

  const executeExtraction = async () => {
    setIsOcrLoading(true);
    setIsScannerAnimating(true);
    setOcrError("");
    setScannerLogs([]);

    const logSteps = [
      "Analyzing selections...",
      "Optimizing visual contrast...",
      "Transcribing text exactly as seen...",
      "Formatting final output..."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < logSteps.length) {
        setScannerLogs(prev => [...prev, logSteps[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 280);

    try {
      let combinedText = "";


      if (cropQueue.length > 0) {
        setScannerLogs(prev => [...prev, `Starting sequential scan of ${cropQueue.length} clips...`]);
        setScannerProgress({ currentIndex: 0, total: cropQueue.length, status: 'scanning' });

        const results = [];
        for (let i = 0; i < cropQueue.length; i++) {
           const cropItem = cropQueue[i];
           setScannerProgress({ currentIndex: i, total: cropQueue.length, status: 'scanning' });

           try {
             setScannerLogs(prev => [...prev, `Uploading page ${cropItem.page} online for Gemini OCR processing...`]);
             const res = await fetch("/api/ocr-extract", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                 image: cropItem.base64Data,
                 mimeType: "image/jpeg"
               })
             });
             const data = await res.json();
             if (!res.ok) {
               throw new Error(data.details || data.error || "OCR failed");
             }
             const text = data.text;
             results.push({ index: i, page: cropItem.page, text: text });

             await new Promise(r => setTimeout(r, 800));
           } catch (e: any) {
             results.push({ index: i, page: cropItem.page, error: e.message });
           }
        }

        setScannerProgress({ currentIndex: cropQueue.length, total: cropQueue.length, status: 'success' });


        results.sort((a, b) => a.index - b.index);

        results.forEach(res => {
          if (res.error) {
            console.error(`Page ${res.page} Error: ${res.error}`);
          } else if (res.text) {
            const cleanText = cleanOcrText(res.text);
            if (cleanText) {
              if (combinedText) {
                combinedText += "\n\n" + cleanText;
              } else {
                combinedText = cleanText;
              }
            }
          }
        });
      } else {

        if (!scannerStitchedUrl && !scannerPreviewUrl && ocrResult) {
           return ocrResult;
        }

        if (!scannerStitchedUrl && !scannerPreviewUrl) {
           throw new Error("No image or document loaded to scan.");
        }


        let base64Data = (scannerStitchedUrl || scannerPreviewUrl).split(",")[1];


        try {
          setScannerLogs(prev => [...prev, `Baking scanning sensors (Resolution: ${selectedResolution}, Mode: ${selectedColourMode})...`]);
          const tempCanvas = document.createElement("canvas");
          const tempImg = new Image();
          await new Promise<void>((resolve, reject) => {
            tempImg.onload = () => resolve();
            tempImg.onerror = () => reject(new Error("Failed to load image for scanning bake"));
            tempImg.src = scannerStitchedUrl || scannerPreviewUrl;
          });

          let dpiScale = 1.0;
          if (selectedResolution === "150 dpi" || selectedResolution === "150dpi") dpiScale = 0.5;
          else if (selectedResolution === "200 dpi" || selectedResolution === "200dpi") dpiScale = 0.75;
          else if (selectedResolution === "300 dpi" || selectedResolution === "300dpi") dpiScale = 1.0;
          else if (selectedResolution === "600 dpi" || selectedResolution === "600dpi") dpiScale = 1.5;

          const is90or270 = (scannerRotation / 90) % 2 !== 0;
          const rawW = is90or270 ? tempImg.naturalHeight : tempImg.naturalWidth;
          const rawH = is90or270 ? tempImg.naturalWidth : tempImg.naturalHeight;

          const canvasW = rawW * dpiScale;
          const canvasH = rawH * dpiScale;

          tempCanvas.width = canvasW;
          tempCanvas.height = canvasH;

          const tempCtx = tempCanvas.getContext("2d");
          if (tempCtx) {

            tempCtx.scale(dpiScale, dpiScale);

            tempCtx.translate(rawW / 2, rawH / 2);
            tempCtx.rotate((scannerRotation * Math.PI) / 180);
            tempCtx.scale(scannerScaleX, scannerScaleY);
            tempCtx.drawImage(tempImg, -tempImg.naturalWidth / 2, -tempImg.naturalHeight / 2);


            const purified = globalScannerEngine.purifyCanvas(tempCanvas, selectedColourMode);
            base64Data = purified.toDataURL("image/jpeg", 0.9).split(",")[1];
          }
        } catch (bakeErr: any) {
          console.error("Resolution Resampling & Mode baking failed:", bakeErr);
          setScannerLogs(prev => [...prev, `[Bake Warning] ${bakeErr.message}`]);
        }

        setScannerLogs(prev => [...prev, "Uploading document online to Gemini API..."]);
        const res = await fetch("/api/ocr-extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64Data,
            mimeType: "image/jpeg"
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.details || data.error || "OCR failed");
        }
        const text = data.text;
        combinedText = cleanOcrText(text);
      }

      setOcrResult((prev) => (prev ? prev + "\n" + combinedText.trim() : combinedText.trim()));
      setScannerLogs(prev => [...prev, "✓ Text transcribed successfully!"]);
      return combinedText.trim();
    } catch (err: any) {
      console.error(err);
      setOcrError(err.message || "A connection error occurred while transcribing your document.");
      return "";
    } finally {
      setIsOcrLoading(false);
      setIsScannerAnimating(false);
      clearInterval(interval);
    }
  };

  const renderPdfPage = async (pdfDoc: any, pageNum: number) => {
    try {
      const getPageCanvas = async (num: number) => {
        if (num < 1 || num > pdfDoc.numPages) return null;
        const page = await pdfDoc.getPage(num);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        return canvas;
      };

      if (pdfDoc.numPages <= 1 || pageNum === 1 || (pageNum === pdfDoc.numPages && pageNum % 2 === 0)) {

         const c1 = await getPageCanvas(pageNum);
         if (c1) {
            const purifiedCanvas = globalScannerEngine.purifyCanvas(c1, selectedColourMode);
            const dataUrl = purifiedCanvas.toDataURL('image/jpeg', 0.85);
            setScannerPreviewUrl(dataUrl);
            setScannerPreviewUrl2("");
            setScannerStitchedUrl(dataUrl);
         }
      } else {

         const leftPageNum = pageNum % 2 === 0 ? pageNum : pageNum - 1;
         const rightPageNum = leftPageNum + 1;

         const [cLeft, cRight] = await Promise.all([
             getPageCanvas(leftPageNum),
             getPageCanvas(rightPageNum)
         ]);

         if (cLeft) setScannerPreviewUrl(globalScannerEngine.purifyCanvas(cLeft, selectedColourMode).toDataURL('image/jpeg', 0.85));
         if (cRight) setScannerPreviewUrl2(globalScannerEngine.purifyCanvas(cRight, selectedColourMode).toDataURL('image/jpeg', 0.85));
         else setScannerPreviewUrl2("");

         const finalCanvas = document.createElement('canvas');
         const finalCtx = finalCanvas.getContext('2d');
         if (finalCtx && (cLeft || cRight)) {
             const wLeft = cLeft ? cLeft.width : 0;
             const hLeft = cLeft ? cLeft.height : 0;
             const wRight = cRight ? cRight.width : 0;
             const hRight = cRight ? cRight.height : 0;

             finalCanvas.width = wLeft + wRight;
             finalCanvas.height = Math.max(hLeft, hRight);

             if (cLeft) {
                 finalCtx.drawImage(cLeft, 0, 0);
             }
             if (cRight) {
                 finalCtx.drawImage(cRight, wLeft, 0);
             }

             const purifiedCanvas = globalScannerEngine.purifyCanvas(finalCanvas, selectedColourMode);
             setScannerStitchedUrl(purifiedCanvas.toDataURL('image/jpeg', 0.85));
         }
      }
    } catch (e) {
      console.error(e);
      setOcrError("Failed to render PDF page.");
    }
  };

  const processUploadedFile = async (file: File) => {
    setScannerFile(file);
    setIsScannerOpen(true);
    setOcrResult("");
    setOcrError("");
    setScannerZoom(1.0);
    setScannerPage(1);
    setScannerTotalPages(1);
    setScannerLogs(["Loading document..."]);
    setScannerCrop(undefined);
    setScannerPdfDoc(null);
    setScannerRotation(0);
    setScannerScaleX(1);
    setScannerScaleY(1);
    setScannerProgress({ currentIndex: 0, total: 0, status: 'idle' });

    const extension = file?.name ? file.name.split(".").pop()?.toLowerCase() : "";

    if (extension === "pdf" || file.type === "application/pdf") {
       const arrayBuffer = await file.arrayBuffer();
       try {
         const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
         setScannerPdfDoc(pdf);
         setScannerTotalPages(pdf.numPages);
         await renderPdfPage(pdf, 1);
         setScannerLogs(["Document loaded successfully. Ready to extract text or crop areas."]);
       } catch (err) {
         setOcrError("Failed to load PDF document.");
       }
    } else if (file?.type && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const resultUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const purifiedCanvas = globalScannerEngine.purifyCanvas(canvas, selectedColourMode);
            const dataUrl = purifiedCanvas.toDataURL('image/jpeg', 0.85);
            setScannerPreviewUrl(dataUrl);
            setScannerStitchedUrl(dataUrl);
          } else {
            setScannerPreviewUrl(resultUrl);
            setScannerStitchedUrl(resultUrl);
          }
          setScannerLogs(prev => [...prev, "Image loaded and purified perfectly. Ready to extract text or crop areas."]);
        };
        img.src = resultUrl;
      };
      reader.readAsDataURL(file);
    } else {

      setScannerPreviewUrl("");
      setScannerStitchedUrl("");
      setIsOcrLoading(true);

      const plaintextExtensions = ["txt", "md", "html", "htm", "css", "json", "js", "ts", "csv", "xml", "yaml", "yml"];
      const isPlaintext = (file?.type && file.type.startsWith("text/")) || plaintextExtensions.includes(extension || "");

      if (isPlaintext) {
        const reader = new FileReader();
        reader.onload = (e) => {
          let text = e.target?.result as string;
          if (extension === "html" || extension === "htm") {
            text = text
              .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, '')
              .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, '')
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          }
          setOcrResult(text);
          setIsOcrLoading(false);
          setScannerLogs(["✓ Text loaded successfully!"]);
        };
        reader.onerror = () => {
           setOcrError("Unable to read the text file contents.");
           setIsOcrLoading(false);
        };
        reader.readAsText(file);
      } else {
         setOcrError("Unsupported format. Please upload an image, text, or PDF document.");
         setIsOcrLoading(false);
      }
    }
  };

  const handleOcrUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processUploadedFile(file);
    }
    event.target.value = '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processUploadedFile(file);
    }
  };

  const handleRagSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setRagSearchQuery(query);
    if (!query.trim()) {
      setRagResults(getAllScans());
    } else {
      setRagResults(searchIntelligence(query));
    }
  };

  const loadOcrIntoEditor = (forcedText?: string) => {
    const textToUse = typeof forcedText === "string" ? forcedText : ocrResult;
    if (!textToUse) return;


    setTabs(prev => prev.map(t =>
      t.id === activeTabId
        ? { ...t, content: textToUse, isDirty: true }
        : t
    ));
    setEditorContent(textToUse);
    setIsDirty(true);

    if (editorRef.current) {
      editorRef.current.injectMarkdown(textToUse);
    }


    setIsScannerOpen(false);
    setSidebarTab("file");

    setMode("Write");
  };

  const [newlySavedDocId, setNewlySavedDocId] = useState<string | null>(null);

  const saveOcrIntoRag = async (forcedText?: string, customTitle?: string) => {
    if (isRagIndexingRef.current) return;
    const textToUse = typeof forcedText === "string" ? forcedText : ocrResult;
    if (!textToUse) return;
    isRagIndexingRef.current = true;
    setIsRagIndexing(true);
    try {
       const generateSmartTitle = (text: string) => {
         const cleaned = text.replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/);
         if (cleaned.length >= 2 && cleaned[0]) {
           return cleaned.slice(0, 6).join(" ") + "...";
         }
         return `Scan Note ${new Date().toLocaleDateString()}`;
       };
       const docTitle = customTitle || generateSmartTitle(textToUse);
       const doc = await ingestDocument(docTitle, textToUse, ["ocr", "scan"]);


        setSavedScanExtracts(prev => {
          const updated = prev.map(item =>
            item.content.trim() === textToUse.trim()
              ? { ...item, title: docTitle }
              : item
          );
          try {
            localStorage.setItem("ais_saved_scan_extracts", JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
          return updated;
        });
       setRagSearchQuery("");
       setRagResults(getAllScans());


       setNewlySavedDocId(doc.id);
       setTimeout(() => setNewlySavedDocId(null), 5000);


       setIsLibraryOpen(true);
       setIsScannerOpen(false);


       try {
         if (typeof navigator !== "undefined" && navigator.vibrate) {
           navigator.vibrate(40);
         }
       } catch {}
    } catch(err: any) {
       console.error("RAG Error:", err);
    } finally {
       isRagIndexingRef.current = false;
       setIsRagIndexing(false);
    }
  };

  const loadOcrIntoPractice = (forcedText?: string) => {
    const textToUse = typeof forcedText === "string" ? forcedText : ocrResult;
    if (!textToUse) return;
    setCustomPracticeText(textToUse);
    setCustomPracticeTitle("Scanned Document Practice");
    setPracticeLoadNonce((n) => n + 1);
    setIsScannerOpen(false);
    setMode("Practice");
  };

  const loadRecentFile = (file: { name: string; content: string; handle?: any }) => {
    if (isDirty) {
      const confirmLoad = confirm("You have unsaved changes. Loaded document will overwrite current. Proceed?");
      if (!confirmLoad) return;
    }
    setFileName(file.name);
    setCurrentFileHandle(file.handle || null);
    if (editorRef.current) {
      editorRef.current.injectMarkdown(file.content);
    }
    setEditorContent(file.content);
    setIsDirty(false);
  };

  const insertDateTimeAtPulse = () => {
    try {
      const text = " " + new Date().toLocaleString() + " ";
      if (editorRef.current) {
        const cur = editorRef.current.getMarkdown();
        editorRef.current.injectMarkdown(cur + text);
        setEditorContent(cur + text);
        setIsDirty(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveFileWithCustomName = async (fullName: string) => {
    try {
      const content = editorRef.current ? editorRef.current.getMarkdown() : "";
      setFileName(fullName);
      setEditorContent(content);


      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, name: fullName, content, isDirty: false, isAutoNamed: false } : t));
      addToRecent(fullName, content);
      setIsDirty(false);

      let blob: Blob;
      const extension = fullName.split('.').pop()?.toLowerCase();

      if (extension === "pdf") {
        const doc = new jsPDF();
        const lines = doc.splitTextToSize(content, 180);
        let y = 10;
        lines.forEach((line: string) => {
          if (y > 280) {
            doc.addPage();
            y = 10;
          }
          doc.text(line, 10, y);
          y += 7;
        });
        blob = doc.output('blob');
      } else if (extension === "docx") {
        const docxFile = new Document({
          sections: [{
            properties: {},
            children: content.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] }))
          }]
        });
        blob = await Packer.toBlob(docxFile);
      } else if (extension === "html") {
        const docHtml = `<html lang="en"><head><meta charset="UTF-8"><title>${fullName}</title></head><body>${content.replace(/\n/g, '<br>')}</body></html>`;
        blob = new Blob([docHtml], { type: "text/html;charset=utf-8" });
      } else {
        blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fullName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (user && saveFileToCloud) {
        await saveFileToCloud(fullName, content);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportMarkdown = () => {
    const content = editorRef.current ? editorRef.current.getMarkdown() : "";
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.endsWith(".md") ? fileName : fileName.replace(/\.[^/.]+$/, "") + ".md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportHTML = () => {
    const content = editorRef.current ? editorRef.current.getHTML() : "";
    const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${fileName}</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 2.5rem; max-width: 800px; margin: 0 auto; color: #1f2937; }
    h1, h2, h3 { color: #111827; margin-top: 1.5em; }
    p { margin-bottom: 1em; }
    pre { background: #f3f4f6; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
    const blob = new Blob([htmlTemplate], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.replace(/\.[^/.]+$/, "") + ".html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportText = () => {
    const content = editorRef.current ? editorRef.current.getMarkdown() : "";
    const cleanText = content.replace(/[#*`_\[\]()]/g, "");
    const blob = new Blob([cleanText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.endsWith(".txt") ? fileName : fileName.replace(/\.[^/.]+$/, "") + ".txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4"
      });

      const content = editorRef.current ? editorRef.current.getMarkdown() : "";
      const cleanFileName = fileName.replace(/\.[^/.]+$/, "");


      const marginX = 54;
      const marginY = 54;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const maxLineWidth = pageWidth - marginX * 2;


      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(17, 24, 39);
      doc.text(cleanFileName, marginX, marginY);


      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(1.5);
      doc.line(marginX, marginY + 14, pageWidth - marginX, marginY + 14);


      doc.setFont("Helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);

      let currentY = marginY + 44;
      const paragraphs = content.split("\n");

      for (let i = 0; i < paragraphs.length; i++) {
        const line = paragraphs[i];
        if (line.trim() === "") {
          currentY += 14;
          continue;
        }


        if (line.trim().startsWith("#")) {
          const headingMatch = line.match(/^#+/);
          const headingLevel = headingMatch ? headingMatch[0].length : 1;
          const textOnly = line.replace(/^#+\s*/, "");

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(headingLevel === 1 ? 16 : headingLevel === 2 ? 14 : 12);
          doc.setTextColor(17, 24, 39);

          const wrappedHeading = doc.splitTextToSize(textOnly, maxLineWidth);
          for (const word of wrappedHeading) {
            if (currentY > pageHeight - marginY) {
              doc.addPage();
              currentY = marginY;
            }
            doc.text(word, marginX, currentY);
            currentY += headingLevel === 1 ? 24 : 20;
          }


          doc.setFont("Helvetica", "normal");
          doc.setFontSize(11);
          doc.setTextColor(55, 65, 81);
        } else {

          const cleanLine = line.replace(/[*_#`\[\]()]/g, "");
          const wrappedParagraph = doc.splitTextToSize(cleanLine, maxLineWidth);
          for (const txt of wrappedParagraph) {
            if (currentY > pageHeight - marginY) {
              doc.addPage();
              currentY = marginY;
            }
            doc.text(txt, marginX, currentY);
            currentY += 16;
          }
        }
      }


      doc.save(`${cleanFileName}.pdf`);
    } catch (err) {
      console.error("PDF Export Fail", err);
      alert("Failed to export PDF Document.");
    }
  };

  const exportDOCX = () => {
    try {
      const content = editorRef.current ? editorRef.current.getHTML() : "";
      const cleanFileName = fileName.replace(/\.[^/.]+$/, "");
      const docHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>${cleanFileName}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 11pt;
              line-height: 1.5;
              padding: 1in;
            }
            h1, h2, h3 { font-family: "Segoe UI", sans-serif; color: #111827; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; }
            h1 { font-size: 18pt; border-bottom: 1px solid #e5e7eb; padding-bottom: 4pt; }
            h2 { font-size: 14pt; }
            p { margin-bottom: 10pt; color: #374151; }
            pre { background: #f3f4f6; padding: 10pt; border-radius: 6px; }
            code { font-family: Consolas, monospace; background: #f3f4f6; font-size: 10pt; }
          </style>
        </head>
        <body>
          <h1>${cleanFileName}</h1>
          ${content}
        </body>
        </html>
      `;
      const blob = new Blob([docHtml], { type: "application/msword;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${cleanFileName}.doc`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Word Export Fail", err);
      alert("Failed to export Word Document.");
    }
  };

  const exportJson = () => {
    try {
      const content = editorRef.current ? editorRef.current.getMarkdown() : "";
      const stats = getStats();
      const jsonDoc = {
        title: fileName,
        content: content,
        lastModified: new Date().toISOString(),
        stats: {
          words: stats.words || 0,
          characters: stats.charsNoSpaces || 0,
          lines: stats.lines || 1
        }
      };
      const blob = new Blob([JSON.stringify(jsonDoc, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName.replace(/\.[^/.]+$/, "") + ".json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("JSON Export Fail", err);
      alert("Failed to export JSON Document.");
    }
  };

  const createNewFile = () => {
    setEditorKey(k => k + 1);
    setFileName("New Document");
    setCurrentFileHandle(null);
    setIsDirty(false);
    setExamStatus("idle");
    setIsExamMode(false);
    setEditorContent("");


    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, name: "New Document", content: "", fileHandle: null, isDirty: false, examSealed: false } : t));
  };

  useEffect(() => {
    if (editorRef.current) {
      if (examStatus === "timeout" || isExamSealed) {
        editorRef.current.setReadOnly(true);
      } else {
        editorRef.current.setReadOnly(false);
      }
    }
    if (examStatus === "running") {
      setTimeout(() => {
        editorRef.current?.focus();
      }, 50);
    }
  }, [examStatus, isExamSealed, editorKey]);

  const [examBreachWarning, setExamBreachWarning] = useState(false);


  useEffect(() => {
    const handleClick = (e: MouseEvent) => {

      const target = (e.target as HTMLElement).closest('button, a, [role="switch"], [role="button"]') as HTMLElement;
      if (target) {

        document.querySelectorAll('.is-selected-live').forEach(el => {
          if (el !== target) {
            el.classList.remove('is-selected-live');
            el.classList.add('is-fading-live');
            setTimeout(() => el.classList.remove('is-fading-live'), 500);
          }
        });

        target.classList.add('is-selected-live');
        target.classList.remove('is-fading-live');


        setTimeout(() => {
          if (target.classList.contains('is-selected-live')) {
            target.classList.remove('is-selected-live');
            target.classList.add('is-fading-live');
            setTimeout(() => target.classList.remove('is-fading-live'), 1000);
          }
        }, 5000);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (examStatus === "countdown" || examStatus === "running") {

        if (document.hidden || document.visibilityState === "hidden") {
          setExamBreachWarning(true);
        }
      }
    };

    const handleWindowBlur = () => {
      if (examStatus === "countdown" || examStatus === "running") {

        setTimeout(() => {
          if (!document.hasFocus() && (examStatus === "countdown" || examStatus === "running")) {
            setExamBreachWarning(true);
          }
        }, 120);
      }
    };

    const handleFullscreenChange = () => {


      if (!document.fullscreenElement && (examStatus === "countdown" || examStatus === "running")) {
        setTimeout(() => {
          if (document.hidden || !document.hasFocus()) {
            setExamBreachWarning(true);
          }
        }, 200);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [examStatus]);

  const handleNewClick = () => {
    if (hasRealUnsavedContent()) {
      setPendingAction("new");
      setIsUnsavedPopupOpen(true);
    } else {
      createNewFile();
    }
  };

  const addToRecent = (name: string, content: string, handle?: any) => {
    setRecentFiles(prev => {
      const filtered = prev.filter(f => f.name !== name);
      return [{ name, content, handle }, ...filtered].slice(0, 10);
    });
  };

  const openFile = async (bypassDirtyCheck = false) => {
    if (!bypassDirtyCheck && hasRealUnsavedContent()) {
      setPendingAction("open");
      setIsUnsavedPopupOpen(true);
      return;
    }

    const loadFileData = async (file: File, fileHandle?: any) => {
      const contents = await file.text();

      const currentActiveTab = tabs.find(t => t.id === activeTabId);
      const isCurrentEmptyAndNotDirty = currentActiveTab && currentActiveTab.content.trim() === "" && !currentActiveTab.isDirty && currentActiveTab.name === "New Document";

      if (isCurrentEmptyAndNotDirty) {
        setFileName(file.name);
        setIsDirty(false);
        setCurrentFileHandle(fileHandle || null);
        setEditorContent(contents);
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, name: file.name, content: contents, fileHandle: fileHandle || null, isDirty: false, isAutoNamed: false } : t));
        if (editorRef.current) {
          if (file.name.endsWith(".html")) {
            editorRef.current.injectHTML(contents);
          } else {
            editorRef.current.injectMarkdown(contents);
          }
        }
      } else {
        const newId = String(Date.now());
        const newTab = { id: newId, name: file.name, content: contents, fileHandle: fileHandle || null, isDirty: false, isAutoNamed: false };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newId);
        setFileName(file.name);
        setIsDirty(false);
        setCurrentFileHandle(fileHandle || null);
        setEditorContent(contents);
        setEditorKey(k => k + 1);
      }

      addToRecent(file.name, contents, fileHandle);

      if (user && saveFileToCloud) {
        await saveFileToCloud(file.name, contents);
      }
    };

    let useFallback = false;

    if ((window as any).showOpenFilePicker) {
      try {

        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: "Text Files",
              accept: { "text/plain": [".txt", ".md", ".html"] },
            },
          ],
        });
        setCurrentFileHandle(fileHandle);
        const file = await fileHandle.getFile();
        await loadFileData(file, fileHandle);
      } catch (err) {
        console.warn("Native file picker failed or was cancelled, using standard HTML input fallback...", err);

        if (err instanceof Error && err.name !== "AbortError") {
          useFallback = true;
        } else if (err instanceof DOMException && err.name === "AbortError") {

          useFallback = false;
        } else {
          useFallback = true;
        }
      }
    } else {
      useFallback = true;
    }

    if (useFallback) {

      const fallbackInput = document.createElement("input");
      fallbackInput.type = "file";
      fallbackInput.accept = ".txt,.md,.html";
      fallbackInput.style.display = "none";

      fallbackInput.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          const file = target.files[0];
          await loadFileData(file);
        }
      };

      document.body.appendChild(fallbackInput);
      fallbackInput.click();
      document.body.removeChild(fallbackInput);
    }
  };

  /** Returns true only if the file was actually written to disk/cloud, false if the user cancelled at any step. */
  const saveFile = async (): Promise<boolean> => {
    try {
      const content = editorRef.current ? editorRef.current.getMarkdown() : "";
      if (currentFileHandle) {
        const writable = await currentFileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        setIsDirty(false);
        setEditorContent(content);


        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content, isDirty: false, isAutoNamed: false } : t));

        addToRecent(fileName, content, currentFileHandle);

        if (user && saveFileToCloud) {
          await saveFileToCloud(fileName, content);
        }
        return true;
      } else {

        return await saveAsFile();
      }
    } catch (err) {
      console.warn("Failed to write to existing file handle, trying Save As fallback...", err);
      return await saveAsFile();
    }
  };

  /** Returns true only if the file was actually written to disk/cloud, false if the user cancelled at any step. */
  const saveAsFile = async (): Promise<boolean> => {
    try {
      const content = editorRef.current ? editorRef.current.getMarkdown() : "";
      let useDownloadFallback = false;


      if ((window as any).showSaveFilePicker) {
        try {

          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: "Text/Markdown Files",
                accept: { "text/plain": [".txt", ".md", ".html"] },
              },
              {
                description: "Word Document",
                accept: { "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"], "application/msword": [".doc"] },
              },
              {
                description: "PDF Document",
                accept: { "application/pdf": [".pdf"] },
              }
            ],
          });
          setCurrentFileHandle(fileHandle);
          setFileName(fileHandle.name);

          const extension = fileHandle.name.split('.').pop()?.toLowerCase();
          let blob: Blob;

          if (extension === "pdf") {
            const doc = new jsPDF();
            const lines = doc.splitTextToSize(content, 180);
            let y = 10;
            lines.forEach((line: string) => {
              if (y > 280) {
                doc.addPage();
                y = 10;
              }
              doc.text(line, 10, y);
              y += 7;
            });
            blob = doc.output('blob');
          } else if (extension === "docx") {
            const docxFile = new Document({
              sections: [{
                properties: {},
                children: content.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] }))
              }]
            });
            blob = await Packer.toBlob(docxFile);
          } else if (extension === "doc") {
            const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>${content.replace(/\n/g, '<br>')}</body></html>`;
            blob = new Blob([docHtml], { type: "application/msword" });
          } else {
            blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
          }

          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          setEditorContent(content);


          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, name: fileHandle.name, content, fileHandle, isDirty: false, isAutoNamed: false } : t));

          addToRecent(fileHandle.name, content, fileHandle);
          setIsDirty(false);

          if (user && saveFileToCloud) {
            await saveFileToCloud(fileHandle.name, content);
          }
          return true;
        } catch (pickerErr) {
          console.warn("Native file picker was blocked or failed, using download fallback", pickerErr);
          useDownloadFallback = true;
        }
      } else {
        useDownloadFallback = true;
      }

      if (useDownloadFallback) {

        const newName = prompt("Enter a filename to save this document (Supported: .txt, .md, .doc, .docx, .pdf):", fileName);
        if (newName) {
          const formattedName = newName.includes(".") ? newName : newName + ".md";
          setFileName(formattedName);
          setEditorContent(content);


          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, name: formattedName, content, isDirty: false, isAutoNamed: false } : t));

          addToRecent(formattedName, content);
          setIsDirty(false);

          let blob: Blob;
          const extension = formattedName.split('.').pop()?.toLowerCase();
          if (extension === "pdf") {
            const doc = new jsPDF();
            const lines = doc.splitTextToSize(content, 180);
            let y = 10;
            lines.forEach((line: string) => {
              if (y > 280) {
                doc.addPage();
                y = 10;
              }
              doc.text(line, 10, y);
              y += 7;
            });
            blob = doc.output('blob');
          } else if (extension === "docx") {
            const docxFile = new Document({
              sections: [{
                properties: {},
                children: content.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] }))
              }]
            });
            blob = await Packer.toBlob(docxFile);
          } else if (extension === "doc") {
            const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>${content.replace(/\n/g, '<br>')}</body></html>`;
            blob = new Blob([docHtml], { type: "application/msword" });
          } else {
            blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = formattedName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          if (user && saveFileToCloud) {
            await saveFileToCloud(formattedName, content);
          }


          setFallbackTitle("Document Saved & Exported");
          setFallbackType("save");
          setFallbackContent(content);
          setFallbackModalOpen(true);
          return true;
        }
        // User cancelled the filename prompt — nothing was saved.
        return false;
      }
      return false;
    } catch (err) {
      console.warn("Save As cancelled or failed", err);
      return false;
    }
  };

  const handleExamStart = async (minutes: number) => {
    try {
      if (!document.fullscreenElement) {
         await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request failed", e);
    }
    setExamRemainingSeconds(minutes * 60);
    setExamTotalSeconds(minutes * 60);
    setExamStatus("countdown");
    setMode("Write");
    examReplayLogRef.current = [];
    isSavingExamRef.current = false;
  };

  const handleLoadCloudFile = (file: any) => {
    setFileName(file.title);
    setIsDirty(false);
    setEditorContent(file.content);


    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, name: file.title, content: file.content, isDirty: false } : t));

    addToRecent(file.title, file.content);
    if (editorRef.current) {
      editorRef.current.injectMarkdown(file.content);
    }
  };


  const handleExamTimeout = () => {
    if (examStatus === "timeout" || isExamSealed || isSavingExamRef.current) return;
    isSavingExamRef.current = true;
    
    setExamStatus("timeout");
    setIsDirty(true);
    sealActiveTab(true);

    if (user && addSession) {
      const content = editorRef.current ? editorRef.current.getMarkdown() : "";
      const chars = content.length;

      // Calculate actual duration spent
      const durationSeconds = examTotalSeconds - examRemainingSeconds;
      const durationMinutes = Math.max(0.1, durationSeconds / 60);
      const wpm = Math.round((chars / 5) / durationMinutes);

      addSession(
        wpm || 0,
        99,
        "Exam",
        Math.floor(durationSeconds),
        `Exam - ${fileName}`,
        content,
        JSON.stringify(examReplayLogRef.current)
      ).catch(e => {
        console.error("Cloud exam run sync failed:", e);
        isSavingExamRef.current = false;
      });
    }
  };

  const handleExamFinishEarly = async () => {
    if (examStatus !== "running" || isExamSealed || isSavingExamRef.current) return;

    // Stop timer and seal exam immediately regardless of login state
    setExamStatus("timeout");
    sealActiveTab(true);
    setIsDirty(true);

    const content = editorRef.current?.getMarkdown() || "";
    const chars = content.length;
    const durationSeconds = examTotalSeconds - examRemainingSeconds;
    const durationMinutes = Math.max(0.1, durationSeconds / 60);
    const wpm = Math.round((chars / 5) / durationMinutes);

    if (user && addSession) {
      isSavingExamRef.current = true;
      try {
        await addSession(
          wpm || 0,
          99,
          "Exam",
          Math.floor(durationSeconds),
          `Exam - ${fileName}`,
          content,
          JSON.stringify(examReplayLogRef.current)
        );
      } catch (e) {
        console.error("Manual exam finish sync failed:", e);
        isSavingExamRef.current = false;
      }
    }
  };

  const [isHamOpen, setIsHamOpen] = useState(false);
  const hamButtonRef = useRef<HTMLButtonElement | null>(null);
  const [hamCoords, setHamCoords] = useState<{ top: number; left: number } | null>(null);

  const [hamTab, setHamTab] = useState<"file" | "edit" | "format" | "view" | "export">("file");
  const [isActCenterOpen, setIsActCenterOpen] = useState(false);
  const actCenterButtonRef = useRef<HTMLButtonElement | null>(null);
  const [actCenterCoords, setActCenterCoords] = useState<{ top: number; left: number; right: number } | null>(null);
  const [actCenterTab, setActCenterTab] = useState<"ai" | "rag" | "profile">("ai");
  const [isWordWrap, setIsWordWrap] = useState(true);
  const [isStatusBarVisible, setIsStatusBarVisible] = useState(true);
  const [isExportSubmenuOpen, setIsExportSubmenuOpen] = useState(false);

  useEffect(() => {
    const updateCoords = () => {
      if (isHamOpen && hamButtonRef.current) {
        // Anchor to the toolbar bar itself (not the button) so the menu is
        // perfectly flush with the toolbar's true left edge and bottom edge,
        // like a native Windows menu bar -- no gap regardless of internal
        // toolbar padding/margins.
        const toolbarBar = hamButtonRef.current.closest(".lexkit-toolbar") as HTMLElement | null;
        const rect = (toolbarBar ?? hamButtonRef.current).getBoundingClientRect();
        setHamCoords({
          top: rect.bottom,
          left: rect.left,
        });
      }
      if ((isActCenterOpen || isAccountPickerOpen) && actCenterButtonRef.current) {
        const toolbarBar = actCenterButtonRef.current.closest(".lexkit-toolbar") as HTMLElement | null;
        const barRect = toolbarBar?.getBoundingClientRect();
        const rect = actCenterButtonRef.current.getBoundingClientRect();
        setActCenterCoords({
          top: barRect ? barRect.bottom : rect.bottom,
          left: rect.left,
          right: barRect ? barRect.right : rect.right,
        });
      }
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    return () => window.removeEventListener('resize', updateCoords);
  }, [isHamOpen, isActCenterOpen, isAccountPickerOpen]);

  const closeMenusAndExecute = (action: () => void) => {

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      if (editorRef.current) {
        const text = editorRef.current.getMarkdown() || "";
        updateActiveTabContent(text);
      }
    }
    setIsHamOpen(false);
    setIsActCenterOpen(false);
    setTimeout(action, 50);
  };

  const hamAddon = (
    <div className="relative">
      <button
        ref={hamButtonRef}
        onClick={() => setIsHamOpen(!isHamOpen)}
        className={`lexkit-toolbar-button relative w-10 h-12 my-[-8px] flex items-center justify-center rounded-none transition-colors border-x border-transparent ${isHamOpen ? 'bg-black/10 dark:bg-white/10 shadow-inner' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
        title="Workspace Menu (Alt+F)"
      >
        <div className="flex flex-col gap-1 w-4">
          <div className="h-[1.5px] bg-current w-full" />
          <div className="h-[1.5px] bg-current w-full" />
          <div className="h-[1.5px] bg-current w-full" />
        </div>
      </button>

      <AnimatePresence>
      {isHamOpen && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setIsHamOpen(false)} />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
            style={{
              position: 'fixed',
              top: hamCoords ? `${hamCoords.top}px` : '110px',
              left: hamCoords ? `${hamCoords.left}px` : '0px',
            }}
            className="w-64 rigorous-menu bg-white dark:bg-[#1A1A1A] shadow-md border border-neutral-300 dark:border-neutral-800 border-t-0 rounded-none z-[100] flex flex-col py-0.5 overflow-visible"
          >
            {/* Tabs Header */}
            <div className="flex items-center gap-0.5 px-1 pb-1.5 border-b border-black/5 dark:border-white/5 my-1">
              <button
                onClick={() => setHamTab("file")}
                className={`flex-1 py-1 text-[13px] font-medium rounded-none transition-colors ${hamTab === "file" ? "bg-black/5 dark:bg-white/10 text-neutral-900 dark:text-white font-semibold" : "text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10"}`}
              >
                File
              </button>
              <button
                onClick={() => setHamTab("edit")}
                className={`flex-1 py-1 text-[13px] font-medium rounded-none transition-colors ${hamTab === "edit" ? "bg-black/5 dark:bg-white/10 text-neutral-900 dark:text-white font-semibold" : "text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10"}`}
              >
                Edit
              </button>
              <button
                onClick={() => setHamTab("format")}
                className={`flex-1 py-1 text-[13px] font-medium rounded-none transition-colors ${hamTab === "format" ? "bg-black/5 dark:bg-white/10 text-neutral-900 dark:text-white font-semibold" : "text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10"}`}
              >
                Format
              </button>
              <button
                onClick={() => setHamTab("view")}
                className={`flex-1 py-1 text-[13px] font-medium rounded-none transition-colors ${hamTab === "view" ? "bg-black/5 dark:bg-white/10 text-neutral-900 dark:text-white font-semibold" : "text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10"}`}
              >
                View
              </button>
              <button
                onClick={() => setHamTab("export")}
                className={`flex-1 py-1 text-[13px] font-medium rounded-none transition-colors ${hamTab === "export" ? "bg-black/5 dark:bg-white/10 text-neutral-900 dark:text-white font-semibold" : "text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10"}`}
              >
                Export
              </button>
            </div>

            {/* FILE TAB */}
            {hamTab === "file" && (
              <div className="flex flex-col py-1">
                <button onClick={() => closeMenusAndExecute(handleNewClick)} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>New</span> <span className="text-[10px] opacity-40">Ctrl+N</span>
                </button>
                <button onClick={() => closeMenusAndExecute(() => window.open(window.location.href, "_blank"))} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>New Window</span> <span className="text-[10px] opacity-40">Ctrl+Shift+N</span>
                </button>
                <button onClick={() => closeMenusAndExecute(openFile)} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Open...</span> <span className="text-[10px] opacity-40">Ctrl+O</span>
                </button>
                <button onClick={() => closeMenusAndExecute(saveFile)} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Save</span> <span className="text-[10px] opacity-40">Ctrl+S</span>
                </button>
                <button onClick={() => closeMenusAndExecute(() => {
                  const newName = prompt("Save As:", fileName);
                  if (newName) saveFileWithCustomName(newName);
                })} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Save As...</span> <span className="text-[10px] opacity-40">Ctrl+Shift+S</span>
                </button>
                <button onClick={() => closeMenusAndExecute(saveFile)} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Save All</span> <span className="text-[10px] opacity-40">Ctrl+Alt+S</span>
                </button>
                <div className="h-px bg-black/5 dark:bg-white/5 my-1.5 mx-3" />
                <button onClick={() => closeMenusAndExecute(handlePrint)} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors">
                  <span>Page Setup...</span>
                </button>
                <button onClick={() => closeMenusAndExecute(handlePrint)} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Print...</span> <span className="text-[10px] opacity-40">Ctrl+P</span>
                </button>
                <div className="h-px bg-black/5 dark:bg-white/5 my-1.5 mx-3" />
                <button onClick={() => closeMenusAndExecute(() => closeTab(activeTabId))} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Close tab</span> <span className="text-[10px] opacity-40">Alt+W</span>
                </button>
                <button onClick={() => closeMenusAndExecute(() => window.close())} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Exit</span> <span className="text-[10px] opacity-40">Ctrl+Shift+W</span>
                </button>
              </div>
            )}

            {/* EDIT TAB */}
            {hamTab === "edit" && (
              <div className="flex flex-col py-1">
                <button onClick={() => closeMenusAndExecute(() => document.execCommand('undo'))} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Undo</span> <span className="text-[10px] opacity-40">Ctrl+Z</span>
                </button>
                <button onClick={() => closeMenusAndExecute(() => document.execCommand('redo'))} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Redo</span> <span className="text-[10px] opacity-40">Ctrl+Y</span>
                </button>
                <div className="h-px bg-black/5 dark:bg-white/5 my-1.5 mx-3" />
                <button onClick={() => closeMenusAndExecute(() => document.execCommand('cut'))} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Cut</span> <span className="text-[10px] opacity-40">Ctrl+X</span>
                </button>
                <button onClick={() => closeMenusAndExecute(() => document.execCommand('copy'))} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Copy</span> <span className="text-[10px] opacity-40">Ctrl+C</span>
                </button>
                <button onClick={() => closeMenusAndExecute(() => document.execCommand('paste'))} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Paste</span> <span className="text-[10px] opacity-40">Ctrl+V</span>
                </button>
                <button onClick={() => closeMenusAndExecute(() => document.execCommand('delete'))} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Delete</span> <span className="text-[10px] opacity-40">Del</span>
                </button>
                <div className="h-px bg-black/5 dark:bg-white/5 my-1.5 mx-3" />
                <button onClick={() => closeMenusAndExecute(() => {
                  const sel = window.getSelection()?.toString();
                  if (sel) window.open(`https://www.google.com/search?q=${encodeURIComponent(sel)}`, '_blank');
                  else alert("Select some text first!");
                })} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Search with Google</span> <span className="text-[10px] opacity-40">Ctrl+E</span>
                </button>
                <button onClick={() => closeMenusAndExecute(() => {
                  const term = prompt("Find what:");
                  if (term) (window as any).find(term);
                })} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Find...</span> <span className="text-[10px] opacity-40">Ctrl+F</span>
                </button>
                <button onClick={() => closeMenusAndExecute(() => {
                    const term = prompt("Find what:");
                    if (!term) return;
                    const replacement = prompt(`Replace "${term}" with:`);
                    if (replacement === null) return;
                    const md = editorRef.current?.getMarkdown() ?? "";
                    const updated = md.split(term).join(replacement);
                    editorRef.current?.injectMarkdown(updated);
                  })} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Replace...</span> <span className="text-[10px] opacity-40">Ctrl+H</span>
                </button>
                <button onClick={() => closeMenusAndExecute(() => {
                  const num = prompt("Enter line number to jump to:");
                })} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Go To...</span> <span className="text-[10px] opacity-40">Ctrl+G</span>
                </button>
                <div className="h-px bg-black/5 dark:bg-white/5 my-1.5 mx-3" />
                <button onClick={() => closeMenusAndExecute(() => document.execCommand('selectAll'))} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Select All</span> <span className="text-[10px] opacity-40">Ctrl+A</span>
                </button>
                <button onClick={() => closeMenusAndExecute(insertDateTimeAtPulse)} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Time/Date</span> <span className="text-[10px] opacity-40">F5</span>
                </button>
              </div>
            )}

            {/* FORMAT TAB */}
            {hamTab === "format" && (
              <div className="flex flex-col py-1">
                <button onClick={() => setIsWordWrap(!isWordWrap)} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-2">
                  <div className={`w-3 h-3 border rounded-[2px] flex items-center justify-center ${isWordWrap ? 'bg-black border-black dark:bg-white dark:border-white' : 'border-neutral-400 dark:border-neutral-500'}`}>
                    {isWordWrap && <svg viewBox="0 0 14 14" fill="none" className="w-2.5 h-2.5 text-white dark:text-black stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 7 6 10 11 4" /></svg>}
                  </div>
                  <span>Word Wrap</span>
                </button>
                <button onClick={() => closeMenusAndExecute(() => setIsSettingsOpen(true))} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Font...</span>
                </button>
              </div>
            )}

            {/* VIEW TAB */}
            {hamTab === "view" && (
              <div className="flex flex-col py-1">
                <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-400 mb-0.5 mt-1">Zoom</div>
                <button onClick={() => closeMenusAndExecute(() => setEditorZoom(z => Math.min(3, z + 0.1)))} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Zoom In</span> <span className="text-[10px] opacity-40">Ctrl+Plus</span>
                </button>
                <button onClick={() => closeMenusAndExecute(() => setEditorZoom(z => Math.max(0.2, z - 0.1)))} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Zoom Out</span> <span className="text-[10px] opacity-40">Ctrl+Minus</span>
                </button>
                <button onClick={() => closeMenusAndExecute(() => setEditorZoom(1.0))} className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between">
                  <span>Restore Default Zoom</span> <span className="text-[10px] opacity-40">Ctrl+0</span>
                </button>

                <div className="h-px bg-black/5 dark:bg-white/5 my-2 mx-3" />

                <button
                  onClick={() => setIsStatusBarVisible(!isStatusBarVisible)}
                  className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-2"
                >
                   <div className={`w-3 h-3 border rounded-none flex items-center justify-center ${isStatusBarVisible ? 'bg-black border-black dark:bg-white dark:border-white' : 'border-neutral-400 dark:border-neutral-500'}`}>
                    {isStatusBarVisible && <svg viewBox="0 0 14 14" fill="none" className="w-2.5 h-2.5 text-white dark:text-black stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 7 6 10 11 4" /></svg>}
                  </div>
                  <span>Status Bar</span>
                </button>
              </div>
            )}

            {/* EXPORT TAB */}
            {hamTab === "export" && (
              <div className="flex flex-col py-1">
                <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-0.5 mt-1">Export As</div>
                <button
                  onClick={() => closeMenusAndExecute(() => {
                    const wm = prompt("Optional Watermark text (leave empty for none):", "CONFIDENTIAL");
                    ExportEngine.exportSinglePDF(fileName, editorContent || "", wm || undefined);
                  })}
                  className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  PDF Document (.pdf)
                </button>
                <button
                  onClick={() => closeMenusAndExecute(() => {
                    ExportEngine.exportToDocx(fileName, editorContent || "");
                  })}
                  className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  Word Document (.docx)
                </button>
                <button
                  onClick={() => closeMenusAndExecute(exportMarkdown)}
                  className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  Markdown File (.md)
                </button>
                <button
                  onClick={() => closeMenusAndExecute(exportText)}
                  className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  Plain Text (.txt)
                </button>
                <button
                  onClick={() => closeMenusAndExecute(exportHTML)}
                  className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  Web Page (.html)
                </button>
                <button
                  onClick={() => closeMenusAndExecute(exportJson)}
                  className="w-full text-left px-4 py-1.5 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white text-[14px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  JSON Schema (.json)
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
      </AnimatePresence>
    </div>
  );

  const actCenterAddon = (
    <div className="relative flex items-center h-full">
      <button onClick={() => setIsScannerOpen(true)} className="lexkit-toolbar-button relative w-8 h-12 my-[-8px] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-none transition-colors" title="AI Scanner">
        <ScannerLiveIcon className="w-4 h-4" />
      </button>
      <button onClick={() => setIsLibraryOpen(true)} className="lexkit-toolbar-button relative w-8 h-12 my-[-8px] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-none transition-colors" title="Library">
        <Database className="w-4 h-4" />
      </button>
      <div className="flex items-center justify-center px-1.5 h-full select-none">
        <button
          ref={actCenterButtonRef}
          onClick={() => {
            if (examStatus === "running" || examStatus === "countdown") {
              alert("Cannot switch accounts during an active exam.");
              return;
            }
            // Read directly from localStorage so React state timing can never cause a miss
            const linkedUids: string[] = JSON.parse(localStorage.getItem("typing_suite_linked_accounts") || "[]");
            const allUsers: any[] = JSON.parse(localStorage.getItem("typing_suite_users") || "[]");
            const hasLinked = linkedUids.some((uid) => allUsers.find((u) => u.uid === uid));
            if (user || hasLinked) {
              setIsAccountPickerOpen(true);
            } else {
              setIsAuthModalOpen(true);
            }
          }}
          disabled={examStatus === "running" || examStatus === "countdown"}
          className={`relative w-7 h-7 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all active:scale-95 shrink-0 ${(examStatus === "running" || examStatus === "countdown") ? "opacity-30 grayscale cursor-not-allowed" : "cursor-pointer"}`}
          title={(examStatus === "running" || examStatus === "countdown") ? "Locked while an exam is in progress" : "Profile"}
        >
          {user ? (
            user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-full h-full rounded-full object-cover border border-neutral-200/50 dark:border-neutral-700/50 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div 
                className="w-full h-full rounded-full text-white flex items-center justify-center text-[10px] font-bold tracking-tight shadow-sm border border-black/5 dark:border-white/5"
                style={{ backgroundColor: themeAccentColor || "#4F46E5" }}
              >
                {user.displayName ? user.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "US"}
              </div>
            )
          ) : (
            <div className="w-full h-full rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 border border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
              <User className="w-3.5 h-3.5" />
            </div>
          )}
        </button>
      </div>

      <AnimatePresence>
      {false && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setIsActCenterOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            style={{
              position: 'fixed',
              top: actCenterCoords ? `${actCenterCoords.top + 6}px` : '110px',
              right: actCenterCoords ? `${window.innerWidth - actCenterCoords.right}px` : '16px',
            }}
            className="w-[320px] max-h-[calc(100vh-120px)] overflow-y-auto bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-neutral-200/60 dark:border-white/10 z-[100] flex flex-col p-5 custom-scrollbar"
          >
            {actCenterTab === "rag" && (
               <div>
                  <h4 className="text-[10px] uppercase tracking-widest font-extrabold text-neutral-400 dark:text-neutral-500 mb-3.5 flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" /> Saved Library
                  </h4>
                  {savedScanExtracts.length > 0 ? (
                    <div className="flex flex-col gap-2.5">
                       {savedScanExtracts.map(doc => (
                         <div
                           key={doc.id}
                           className="p-3.5 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900/50 dark:hover:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/80 rounded-xl group cursor-pointer transition-all duration-200 shadow-sm hover:shadow"
                           onClick={() => {
                             if (editorRef.current) {
                                const currentText = editorRef.current.getMarkdown();
                                editorRef.current.injectMarkdown(currentText + "\n\n" + doc.content);
                             }
                             setIsActCenterOpen(false);
                          }}>
                            <h5 className="text-[13px] font-bold text-neutral-800 dark:text-neutral-100 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors truncate">{doc.title}</h5>
                            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1.5 line-clamp-2 leading-relaxed opacity-85">{doc.content}</p>
                         </div>
                       ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium text-center py-4">No saved extracts. Scan documents to save them here.</p>
                  )}
               </div>
            )}
            {actCenterTab === "profile" && (
               <div className="flex flex-col gap-4 items-center">
                  {!user ? (
                    <div className="flex flex-col items-center text-center py-2">
                      <div className="w-16 h-16 rounded-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/50 dark:border-white/5 text-neutral-400 dark:text-neutral-500 flex items-center justify-center mb-4 shadow-sm">
                        <User size={26} strokeWidth={1.5} />
                      </div>
                      <h4 className="text-[16px] font-semibold text-neutral-800 dark:text-neutral-200 tracking-tight">Guest</h4>
                      <button
                        onClick={() => { setIsActCenterOpen(false); setIsAuthModalOpen(true); }}
                        className="mt-6 w-full py-2.5 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-950 rounded-xl text-[12px] font-bold tracking-wide transition-all shadow-md active:scale-[0.98] cursor-pointer"
                      >
                        Sign In Securely
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col gap-4">
                      {/* User Header Section */}
                      <div className="flex flex-col items-center text-center pb-2.5">
                        <div className="relative mb-3 flex justify-center">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName || "User"}
                              className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-neutral-950 shadow-md ring-2 ring-neutral-200/20 dark:ring-white/10"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-neutral-400 to-neutral-600 text-white flex items-center justify-center text-xl font-black shadow-md">
                              {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
                            </div>
                          )}
                        </div>
                        
                        <h4 className="text-[16px] font-bold text-neutral-800 dark:text-neutral-100 tracking-tight">
                          {user.displayName || "User"}
                        </h4>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium truncate max-w-[240px] mt-0.5">
                          {user.email}
                        </p>
                        
                        <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-2 bg-neutral-100 dark:bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-200/40 dark:border-neutral-800/40 select-none">
                          {displayRankTitle}
                        </span>
                      </div>

                      {/* Visual separator */}
                      <div className="w-full h-px bg-neutral-100 dark:bg-neutral-800/60" />

                      {/* Menu List */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => { setIsActCenterOpen(false); setIsDashboardOpen(true); }}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white rounded-xl text-[13px] font-semibold tracking-wide transition-all duration-200 cursor-pointer shadow-sm border border-neutral-100 dark:border-neutral-800 hover:border-neutral-200/60 dark:hover:border-neutral-700/60"
                        >
                          <LayoutDashboard size={16} className="text-neutral-400 group-hover:text-current" />
                          <span>Workspace Dashboard</span>
                        </button>
                        
                        <button
                          onClick={() => { setIsActCenterOpen(false); signOut(); }}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-[13px] font-semibold tracking-wide transition-all duration-200 cursor-pointer border border-red-500/10 hover:border-red-500/20"
                        >
                          <LogOut size={16} className="text-red-400" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
               </div>
            )}
          </motion.div>
        </>
      )}
      </AnimatePresence>
    </div>
  );

  return (
    <ThemeProviderCast attribute="class" defaultTheme="system" enableSystem>
      <div className="flex flex-col h-screen w-full bg-[#f3f3f3] dark:bg-[#202020] font-sans overflow-hidden text-neutral-900 dark:text-neutral-100">
        {/* Title Bar (Mimicking native OS title bar with WinUI 3 style) */}
        <div className="h-14 bg-white/70 dark:bg-black/50 backdrop-blur-2xl flex items-center justify-between pl-2 pr-4 border-b border-black/5 dark:border-white/5 select-none relative z-10 transition-colors">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <img
                  src={logoImage}
                  alt="RoyScript logo"
                  className="h-[30px] md:h-[36px] w-auto select-none"
                  draggable={false}
                />
                <span className="font-bold text-xl md:text-[26px] tracking-[-0.04em] text-neutral-900 dark:text-neutral-50 font-sans antialiased select-none leading-none">
                  RoyScript
                </span>
                <span
                  className="font-black text-[17px] md:text-[18px] tracking-[0.05em] uppercase font-sans antialiased select-none transition-all duration-300 leading-none"
                  style={{
                    color: themeAccentColor
                  }}
                >
                  TSR
                </span>
              </div>
              {user && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-700 mx-2 font-light text-xl">/</span>
                  <div className="flex flex-col ml-1">
                    <span className="text-[13px] leading-tight text-neutral-800 dark:text-neutral-200 font-medium tracking-tight truncate max-w-[200px] font-sans">
                      {user.displayName || "User"}
                    </span>
                    <span className="text-[10px] leading-tight text-neutral-400 dark:text-neutral-500 font-medium tracking-normal font-sans">
                      {displayRankTitle}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Beautifully Unified Floating Pill Controller - Top-Center (Dynamic Island Style) */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-neutral-100/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-full p-1.5 border border-neutral-200/50 dark:border-neutral-800/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] z-20 transition-all duration-300">
            {/* Mode Selector Segment */}
            <div className="flex items-center gap-1">
              {(["Write", "Practice"] as AppMode[]).map((m) => {
                const isPractice = m === "Practice";
                return (
                <button
                  key={m}
                  onMouseEnter={() => setHoveredMode(m)}
                  onMouseLeave={() => setHoveredMode(null)}
                  title={m === "Practice" ? "Start Practice" : "Write Mode"}
                  className={`py-1.5 text-[13px] px-3 tracking-wide font-bold rounded-full transition-all duration-300 ease-out cursor-pointer relative flex items-center justify-center ${
                    mode === m
                      ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                  onClick={() => {
                    if (
                      examStatus === "running" ||
                      examStatus === "countdown"
                    ) {
                      alert("Cannot switch modes during an active exam.");
                      return;
                    }
                    setMode(m);
                  }}
                  disabled={
                    examStatus === "running" || examStatus === "countdown"
                  }
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {m === "Practice" ? (
                       <AnimatedPracticeIcon
                         active={mode === m && practiceState.step === 2}
                         isHovered={hoveredMode === m}
                         className={`transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${mode === m ? "w-[28px] h-[28px]" : "w-[20px] h-[20px]"}`}
                       />
                    ) : (
                       <AnimatedWriteIcon
                         active={mode === m}
                         isHovered={hoveredMode === m}
                         className={`transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${mode === m ? "w-[28px] h-[28px]" : "w-[20px] h-[20px]"}`}
                       />
                    )}
                  </div>
                </button>
                );
              })}
            </div>

            {/* Elegant micro-separator */}
            <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-600/50 mx-2" />

            {/* Exam Toggler Segment */}
            <div className="flex items-center gap-1 border-transparent">
              <button
                onMouseEnter={() => setHoveredMode("Exam" as any)}
                onMouseLeave={() => setHoveredMode(null)}
                title="Toggle Exam Mode"
                className={`py-1.5 px-3 text-[13px] tracking-wide font-bold rounded-full transition-all duration-300 ease-out cursor-pointer relative flex items-center justify-center ${
                  isExamMode || examStatus !== "idle"
                    ? "bg-white dark:bg-neutral-800 shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                onClick={() => {
                  if (examStatus === "running" || examStatus === "countdown") {
                    alert("Cannot disable Exam Mode while exam is active.");
                    return;
                  }
                  if (examStatus !== "idle" || isExamMode) {
                    setExamStatus(isExamSealed ? "timeout" : "idle");
                    setIsExamMode(false);
                    return;
                  }
                  // An exam is a formal, sealed artifact — it must never
                  // share a tab/document identity with whatever the user
                  // was already writing, dirty or not. Every exam always
                  // opens in its own brand-new tab, unconditionally, so
                  // existing tabs (and their crash-recovery snapshots)
                  // are left completely untouched.
                  createNewTab(`Exam ${tabs.length + 1}`, "");
                  setIsExamMode(true);
                }}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <AnimatedExamIcon
                    active={isExamMode || examStatus !== "idle"}
                    isHovered={hoveredMode === ("Exam" as any)}
                    examStatus={examStatus}
                    className={`transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isExamMode || examStatus !== "idle" ? "w-[28px] h-[28px]" : "w-[20px] h-[20px]"}`}
                  />
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {examStatus === "running" && (() => {
              let stage1Threshold = 60;
              let stage2Threshold = 30;

              if (examTotalSeconds > 0) {
                if (examTotalSeconds <= 60) {
                  stage1Threshold = 15;
                  stage2Threshold = 8;
                } else if (examTotalSeconds <= 120) {
                  stage1Threshold = 30;
                  stage2Threshold = 15;
                } else {
                  stage1Threshold = Math.min(60, Math.floor(examTotalSeconds * 0.20));
                  stage2Threshold = Math.min(30, Math.floor(examTotalSeconds * 0.10));
                }
              }

              let showHurryText = false;
              if (examStatus === "running" && examRemainingSeconds > 0 && examTotalSeconds > 0) {
                const ratio = examRemainingSeconds / examTotalSeconds;
                
                // Alert starts appearing when 30% of time is left
                // For very short exams, we also ensure it doesn't show in the first 5 seconds
                const hasPassedInitialBuffer = examTotalSeconds - examRemainingSeconds > 5;
                
                if (ratio <= 0.30 && hasPassedInitialBuffer) {
                  // Percentage-based adaptive frequency:
                  // High ratio (0.3) -> Interval of 60s
                  // Low ratio (0.0) -> Interval of 5s
                  const minInterval = 5;
                  const maxInterval = 60;
                  const threshold = 0.30;
                  
                  // Normalized ratio from 0 (at end) to 1 (at start of alert threshold)
                  const normRatio = Math.max(0, Math.min(1, ratio / threshold));
                  
                  // Quadratic progression for a "graph-like" acceleration effect
                  const dynamicInterval = minInterval + (maxInterval - minInterval) * Math.pow(normRatio, 2);
                  
                  // Final check against absolute time for safety in very short exams
                  let finalInterval = dynamicInterval;
                  if (examRemainingSeconds <= 30) finalInterval = Math.min(finalInterval, 8);
                  if (examRemainingSeconds <= 10) finalInterval = Math.min(finalInterval, 4);

                  const cycle = examRemainingSeconds % Math.floor(finalInterval);
                  showHurryText = cycle >= 0 && cycle < 2;
                }
              }

              const isStage3 = examRemainingSeconds <= 10 && examRemainingSeconds > 0;
              const mStr = Math.floor(examRemainingSeconds / 60).toString().padStart(2, "0");
              const sStr = (examRemainingSeconds % 60).toString().padStart(2, "0");

              return (
                <div className="flex items-center mr-2 select-none relative h-[32px] overflow-visible">
                  <motion.div
                    animate={isStage3 ? { rotate: [0, -10, 10, -5, 5, 0] } : { rotate: 0 }}
                    transition={isStage3 ? { duration: 0.8, repeat: Infinity, repeatDelay: 1 } : {}}
                    style={{ originX: 0.5, originY: 0.1 }}
                    className="mr-2.5 flex items-center justify-center text-neutral-500 dark:text-neutral-400"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="13" r="8"></circle>
                      <polyline points="12 9 12 13 14 15"></polyline>
                      <path d="M5 3L2 6"></path>
                      <path d="M19 3L22 6"></path>
                    </svg>
                  </motion.div>

                  <div
                    className="relative w-[100px] h-full flex items-center justify-start pointer-events-none"
                    style={{ perspective: "1000px" }}
                  >
                    <AnimatePresence mode="wait">
                      {showHurryText ? (
                        <motion.div
                          key="hurry"
                          initial={{ opacity: 0, rotateX: -90, y: 15 }}
                          animate={{ opacity: 1, rotateX: 0, y: 0 }}
                          exit={{ opacity: 0, rotateX: 90, y: -15 }}
                          transition={{ type: "spring", stiffness: 350, damping: 25 }}
                          className="absolute inset-0 flex items-center font-sans tracking-tight text-[17px] font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap origin-center"
                          style={{ backfaceVisibility: "hidden" }}
                        >
                          <motion.span
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                            className="text-red-600 dark:text-red-500 font-bold tracking-tight"
                          >
                            Hurry Up!
                          </motion.span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="timer"
                          initial={{ opacity: 0, rotateX: -90, y: 15 }}
                          animate={{ opacity: 1, rotateX: 0, y: 0 }}
                          exit={{ opacity: 0, rotateX: 90, y: -15 }}
                          transition={{ type: "spring", stiffness: 350, damping: 25 }}
                          className="absolute inset-0 flex items-center font-sans text-[19px] font-medium tracking-tight tabular-nums origin-center text-neutral-900 dark:text-neutral-50"
                          style={{ backfaceVisibility: "hidden" }}
                        >
                          {mStr}:{sStr}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })()}
            {examStatus === "running" && (
              <button
                onClick={handleExamFinishEarly}
                className="mr-4 hover:scale-105 active:scale-95 transition-all cursor-pointer bg-transparent border-none p-0 flex items-center justify-center"
                title="Stop Exam"
              >
                <img
                  src="/assets/images/stop-exam.png"
                  alt="Stop Exam"
                  className="h-14 w-auto object-contain"
                  style={{
                    imageRendering: '-webkit-optimize-contrast',
                    transform: 'translateZ(0)',
                  }}
                  onError={(e) => {
                    // Fallback if image fails or is empty
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = 'Stop Exam';
                    e.currentTarget.parentElement!.className = "mr-4 px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold rounded-lg hover:scale-105 active:scale-95 transition-all shadow-sm";
                  }}
                />
              </button>
            )}
            <ThemeToggle disabled={examStatus === "running" || examStatus === "countdown"} />
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-all duration-200 ease-out disabled:opacity-50 cursor-pointer hover:scale-105 active:scale-95"
              title="Settings"
              disabled={examStatus === "running" || examStatus === "countdown"}
            >
              <Settings className="w-[18px] h-[18px] text-neutral-700 dark:text-neutral-300" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Sidebar (File Operations & Editor Tools) has been completely removed to match Notepad Level Zen Mode */}

          {/* Main Area */}
          <div className="flex-1 flex flex-col bg-white dark:bg-[#1a1a1a] relative overflow-hidden transition-colors shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)] z-0">
            {mode === "Write" && (
              <div className="h-10 bg-neutral-100 dark:bg-[#161616] flex items-center justify-between pr-3 shrink-0 select-none">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1 h-full pt-1.5">
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTabId;
                  const examLockedUI = (examStatus === "running" || examStatus === "countdown") && !isActive;
                  return (
                    <div
                      key={tab.id}
                      onClick={() => !examLockedUI && switchTab(tab.id)}
                      onDoubleClick={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         if (examStatus === "running" || examStatus === "countdown") return;
                         const newName = prompt(`Rename tab "${tab.name}" to:`, tab.name);
                         if (newName && newName.trim()) {
                            const cleanedName = newName.trim();
                            setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, name: cleanedName, isAutoNamed: false } : t));
                            if (tab.id === activeTabId) {
                              setFileName(cleanedName);
                            }
                         }
                      }}
                      onMouseUp={(e) => {
                        if (e.button === 1) { // Middle click
                          e.preventDefault();
                          e.stopPropagation();
                          if (examStatus === "running" || examStatus === "countdown") {
                            alert("Cannot close tabs during an active exam.");
                            return;
                          }
                          initiateTabClose(tab.id, e as any);
                        }
                      }}
                      title={examLockedUI ? "Locked while an exam is in progress" : undefined}
                      className={`group relative h-full w-44 rounded-t-lg border-x border-b-0 px-3 flex items-center justify-between gap-2.5 transition-all text-[12.5px] font-sans ${
                        examLockedUI ? "opacity-40 grayscale-[40%] cursor-not-allowed pointer-events-none" : "cursor-pointer"
                      } ${
                        isActive
                          ? "bg-white dark:bg-[#1a1a1a] border-neutral-200 dark:border-white/10 text-neutral-800 dark:text-neutral-100 font-semibold"
                          : "bg-neutral-50/50 dark:bg-[#1c1c1c] border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Accent glow: neon tube traced around the tab's full outer outline
                          (up the left edge, through the top-left curve, across the top,
                          through the top-right curve, down the right edge) instead of a
                          flat top strip. Same 4-phase timeline as before. */}
                      {isActive && closingTabId !== tab.id && (
                        <svg
                          className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          style={{
                            opacity: (glowingTabId !== tab.id && isAccentBarIdle) ? 0 : 1,
                            transition: 'opacity 0.6s ease',
                          }}
                        >
                          {/* "off" state: a fresh tab that has never played its first-keystroke
                              cycle stays dark until then, matching the neon-tube spec. */}
                          {tab.hasGlowedOnce && glowingTabId !== tab.id && (
                            <path
                              d={TAB_ACCENT_OUTLINE_PATH}
                              fill="none"
                              stroke={themeAccentColor}
                              strokeWidth={2}
                              vectorEffect="non-scaling-stroke"
                            />
                          )}
                          {glowingTabId === tab.id && (
                            <>
                              <path
                                d={TAB_ACCENT_OUTLINE_PATH}
                                fill="none"
                                stroke={themeAccentColor}
                                strokeWidth={2}
                                vectorEffect="non-scaling-stroke"
                                pathLength={1}
                                className="tab-neon-trail-path"
                              />
                              <path
                                d={TAB_ACCENT_OUTLINE_PATH}
                                fill="none"
                                strokeWidth={2.5}
                                vectorEffect="non-scaling-stroke"
                                pathLength={1}
                                className="tab-neon-pulse-path"
                                onAnimationEnd={() => setGlowingTabId(null)}
                              />
                            </>
                          )}
                        </svg>
                      )}
                      {/* Close drain: unrelated to the accent glow, stays a simple top strip */}
                      {closingTabId === tab.id && (
                        <div className="absolute top-0 inset-x-0 h-[2px] overflow-hidden pointer-events-none">
                          <div
                            className="tab-close-drain"
                            style={{ background: themeAccentColor }}
                            onAnimationEnd={handleCloseAnimationEnd}
                          />
                        </div>
                      )}

                      {/* Clean FileIcon */}
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <FileText className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-600 shrink-0" />

                        {/* Title text */}
                        <span
                          className="truncate select-none translate-y-[-0.5px] cursor-text"
                          title="Double click to rename"
                        >
                          {tab.name}
                        </span>
                      </div>

                      {/* Close button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (examStatus === "running" || examStatus === "countdown") {
                            alert("Cannot close tabs during an active exam.");
                            return;
                          }
                          initiateTabClose(tab.id, e);
                        }}
                        className="p-0.5 rounded-full hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-600 dark:group-hover:text-neutral-400 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}

                {/* (+) Add Tab Button */}
                <button
                  onClick={() => {
                    if (examStatus === "running" || examStatus === "countdown") {
                      alert("Cannot open new tabs during an active exam.");
                      return;
                    }
                    createNewTab(`New Document ${tabs.length + 1}`, "");
                  }}
                  disabled={examStatus === "running" || examStatus === "countdown"}
                  className={`p-1.5 ml-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors self-center shrink-0 active:scale-95 ${(examStatus === "running" || examStatus === "countdown") ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                  title={(examStatus === "running" || examStatus === "countdown") ? "Locked while an exam is in progress" : "New Tab: Alt+T | Close: Alt+W | Switch: Alt+Left/Right"}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Extra info/status in right side of tab bar */}
              <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400 dark:text-neutral-500 mr-2 select-none">
                <span>{tabs.length} {tabs.length === 1 ? "tab" : "tabs"}</span>
              </div>
            </div>
            )}

            {mode === "Write" && (
              <div
                style={{ fontSize: `${editorZoom}rem` }}
                className={`relative w-full h-full overflow-hidden flex flex-col ${isExamSealed ? "sealed-editor-container" : ""}`}
              >
                <DefaultTemplate
                  key={editorKey}
                  ref={editorRef}
                  toolbarLeftAddon={hamAddon}
                  toolbarRightAddon={actCenterAddon}
                  readOnly={examStatus === "timeout" || isExamSealed}
                  className={`w-full flex-1 min-h-0 border-none rounded-none !bg-transparent transition-opacity duration-300 ${examStatus === "timeout" || isExamSealed ? "opacity-55 grayscale-[50%]" : ""} ${!isWordWrap ? "no-word-wrap" : ""}`}
                  onReady={(m) => {
                    if (m) {
                      // Retrieve the active tab's properties and inject on mount
                      const activeTab = tabs.find(t => t.id === activeTabId);
                      if (activeTab) {
                        if (activeTab.name.endsWith(".html")) {
                          m.injectHTML(activeTab.content);
                        } else {
                          m.injectMarkdown(activeTab.content);
                        }
                        setEditorContent(activeTab.content);
                      } else {
                        setEditorContent(m.getMarkdown() || "");
                      }
                    }
                  }}
                  onChange={() => {
                    // First-keystroke glow: fire once per tab lifetime, only when real content exists
                    const activeTab = tabs.find(t => t.id === activeTabId);
                    if (activeTab && !activeTab.hasGlowedOnce) {
                      const text = editorRef.current?.getMarkdown?.() ?? "";
                      if (text.trim().length > 0) {
                        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, hasGlowedOnce: true } : t));
                        fireTabGlow(activeTabId);
                      }
                    }

                    // Update main unsaved dirty state instantly for snappy UI feedback
                    setIsDirty(true);

                    // Update state immediately for live stats (WPM, Char counts, etc)
                    if (editorRef.current) {
                        const content = editorRef.current.getMarkdown() || "";
                        setEditorContent(content);
                        
                        // Capture replay event for exams INSTANTLY (not debounced)
                        if (examStatus === "running") {
                            const selection = editorRef.current.getSelection();
                            examReplayLogRef.current.push({
                                t: Date.now(),
                                s: content,
                                c: selection ? { start: selection.start, end: selection.end } : undefined
                            });
                        }
                    }

                    if (saveTimeoutRef.current) {
                      clearTimeout(saveTimeoutRef.current);
                    }

                    saveTimeoutRef.current = setTimeout(() => {
                      saveTimeoutRef.current = null;
                      if (editorRef.current) {
                        const text = editorRef.current.getMarkdown() || "";
                        updateActiveTabContent(text);
                        updateActiveTabIsDirty(true);

                        const activeTab = tabs.find(t => t.id === activeTabId);
                        if (activeTab && activeTab.isAutoNamed) {
                          const newFilename = generateSmartLabel(text);
                          if (newFilename !== activeTab.name) {
                            updateActiveTabFileName(newFilename);
                          }
                        }
                      } else {
                        updateActiveTabIsDirty(true);
                      }
                    }, 250);
                  }}
                  examActive={examStatus === "running" || examStatus === "countdown"}
                />

                {/* Ultimate read-only glass shield to absolutely prevent editing */}
                {(examStatus === "timeout" || isExamSealed) && (
                  <div
                    className="absolute inset-0 z-50 cursor-not-allowed"
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onMouseDownCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onTouchStartCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onPaste={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    title="Exam is sealed in read-only mode."
                  />
                )}

                {/* Developer Status Bar (Phase 4) */}
                {isStatusBarVisible && (
                  <div className="h-8 shrink-0 bg-[#f9f9f9] dark:bg-[#141414] text-neutral-500 dark:text-neutral-400 flex items-center justify-between px-4 text-[12.5px] font-sans tracking-normal select-none border-t border-black/[0.08] dark:border-white/[0.06] z-10 w-full relative transition-colors duration-300">
                    <div className="flex items-center gap-4">
                      <div className="px-2 py-0.5 flex items-center gap-1 cursor-default font-medium">
                        <div className="flex items-center">
                          <span>Ln {getStats().lines || 1}, Col {getStats().charsNoSpaces || 1}</span>
                          <span className="mx-3 opacity-20 text-[10px]">|</span>
                          <span className="opacity-85">Chars {getStats().charsWithSpaces || 0}, Words {getStats().words || 0}</span>
                        </div>
                      </div>
                      {(examStatus === "running" || examStatus === "countdown") && (
                        <div className="px-2 py-0.5 flex items-center gap-1 cursor-default font-medium">
                          <span>WPM: {
                            Math.round(((editorContent?.length || 0) / 5) / (Math.max(0.1, (examTotalSeconds - examRemainingSeconds) / 60))) || 0
                          }</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 cursor-default font-medium">
                        Zoom {Math.round(editorZoom * 100)}%
                      </div>
                      <div className="px-2 py-0.5 cursor-default font-medium">Windows (CRLF)</div>
                      <div className="px-2 py-0.5 cursor-default font-medium">UTF-8</div>
                    </div>
                  </div>
                )}
              </div>
            )}
             {mode === "Practice" && (
              <PracticeMode
                key={`${user?.uid ?? guestUid}:${practiceLoadNonce}`}
                accountUid={user?.uid ?? guestUid}
                onReturnToWrite={() => setMode("Write")}
                initialText={customPracticeText || undefined}
                initialTitle={customPracticeTitle || undefined}
                initialConfig={restoredPracticeConfig ?? undefined}
                onConfigChange={(cfg) => { latestPracticeConfigRef.current = cfg; }}
                activeEditorText={editorContent}
                onUpdateEditorText={(newVal) => {
                  setEditorContent(newVal);
                  if (editorRef.current) {
                    editorRef.current.injectMarkdown(newVal);
                  }
                }}
                initialDrillKeys={drillKeys}
                onDrillTriggeredDone={() => setDrillKeys(null)}
                forceStep={forceStep}
                onForceStepDone={() => setForceStep(null)}
                onStateChange={(state) => {
                  setPracticeState(state);
                }}
              />
            )}
          </div>

          {/* High-Fidelity Interactive Document Scanner Modal */}
          <DocumentScannerModal
            isScannerOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onFileUpload={processUploadedFile}
            scannerFile={scannerFile}
            scannerPreviewUrl={scannerPreviewUrl}
            scannerPreviewUrl2={scannerPreviewUrl2}
            setScannerPreviewUrl={setScannerPreviewUrl}
            scannerZoom={scannerZoom}
            setScannerZoom={setScannerZoom}
            scannerPage={scannerPage}
            setScannerPage={setScannerPage}
            scannerTotalPages={scannerTotalPages}
            setScannerTotalPages={setScannerTotalPages}
            scannerLogs={scannerLogs}
            setScannerLogs={setScannerLogs}
            isOcrLoading={isOcrLoading}
            scannerPdfDoc={scannerPdfDoc}
            scannerCrop={scannerCrop}
            setScannerCrop={setScannerCrop}
            cropQueue={cropQueue}
            setCropQueue={setCropQueue}
            scannerStitchedUrl={scannerStitchedUrl}
            scannerImgRef={scannerImgRef}
            scannerProMode={scannerProMode}
            setScannerProMode={setScannerProMode}
            idCardFront={idCardFront}
            setIdCardFront={setIdCardFront}
            idCardBack={idCardBack}
            setIdCardBack={setIdCardBack}
            idCardStep={idCardStep}
            setIdCardStep={setIdCardStep}
            eraseTolerance={eraseTolerance}
            setEraseTolerance={setEraseTolerance}
            detectedQrCodes={detectedQrCodes}
            applyHandwritingEraser={applyHandwritingEraser}
            dewarpBookSpread={dewarpBookSpread}
            spliceIDCards={spliceIDCards}
            handleAddToQueue={handleAddToQueue}
            handleAutoDetectCrops={handleAutoDetectCrops}
            handlePageChange={handlePageChange}
            executeExtraction={executeExtraction}
            scannerProgress={scannerProgress}
            userName={user?.displayName || "User"}
            isPrivacyMode={isPrivacyMode}
            setIsPrivacyMode={setIsPrivacyMode}
            ocrResult={ocrResult}
            setOcrResult={setOcrResult}
            ocrError={ocrError}
            isTranslating={isTranslating}
            handleTranslate={handleTranslate}
            scanQRCodesOnDocument={scanQRCodesOnDocument}
            loadOcrIntoEditor={loadOcrIntoEditor}
            saveOcrIntoRag={saveOcrIntoRag}
            loadOcrIntoPractice={loadOcrIntoPractice}
            isRagIndexing={isRagIndexing}
            themeAccentColor={themeAccentColor}
            scannerRotation={scannerRotation}
            setScannerRotation={setScannerRotation}
            scannerScaleX={scannerScaleX}
            setScannerScaleX={setScannerScaleX}
            scannerScaleY={scannerScaleY}
            setScannerScaleY={setScannerScaleY}
            isCropEnabled={isCropEnabled}
            setIsCropEnabled={setIsCropEnabled}
            isEnhancementOpen={isEnhancementOpen}
            setIsEnhancementOpen={setIsEnhancementOpen}
            selectedScanner={selectedScanner}
            setSelectedScanner={setSelectedScanner}
            selectedFileType={selectedFileType}
            setSelectedFileType={setSelectedFileType}
            selectedColourMode={selectedColourMode}
            setSelectedColourMode={setSelectedColourMode}
            selectedResolution={selectedResolution}
            setSelectedResolution={setSelectedResolution}
            selectedDestinationFolder={selectedDestinationFolder}
            setSelectedDestinationFolder={setSelectedDestinationFolder}
            onDiscardCurrentDocument={() => {
              setScannerFile(null);
              setScannerPreviewUrl("");
              setScannerPreviewUrl2("");
              setScannerPdfDoc(null);
              setScannerStitchedUrl("");
              setScannerTotalPages(1);
              setScannerPage(1);
              setScannerProgress({ currentIndex: 0, total: 0, status: 'idle' });
              setOcrResult("");
            }}
          />

          {/* Majestic Full-Screen Library Hub */}
          <LibraryHub
            isOpen={isLibraryOpen}
            onClose={() => setIsLibraryOpen(false)}
            onLoadIntoTypewriter={(content) => loadOcrIntoEditor(content)}
            onLoadIntoPractice={(content) => loadOcrIntoPractice(content)}
            onLoadIntoExam={(content, title) => {
              setFileName(title);
              setEditorContent(content);
              if (editorRef.current) {
                editorRef.current.injectMarkdown(content);
              }
              setIsDirty(true);
              setIsExamMode(true);
              setMode("Write");
            }}
            userName={user?.displayName || "User"}
            themeAccentColor={currentThemeObj?.colors[2] || "#0a84ff"}
          />

          {/* Unsaved Changes \u2014 Native OS Alert Dialog */}
          {isUnsavedPopupOpen && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40">
              <div
                className="bg-white dark:bg-[#1c1c1c] rounded-[10px] shadow-[0_32px_80px_rgba(0,0,0,0.40)] w-[420px] overflow-hidden"
                style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', sans-serif" }}
              >
                <div className="px-6 pt-6 pb-4 flex items-start gap-3.5">
                  <div className="flex-shrink-0 pt-0.5">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-neutral-300 dark:text-neutral-600">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M12 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="12" cy="17" r="1" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] font-medium text-neutral-900 dark:text-neutral-100 leading-snug tracking-[-0.008em] mb-1.5">
                      Do you want to save changes to &ldquo;{(pendingAction?.startsWith("closeTab:") || pendingAction?.startsWith("animatedCloseTab:")) ? (tabs.find(t => t.id === pendingAction?.replace(/^(closeTab:|animatedCloseTab:)/, ""))?.name ?? fileName) : fileName}&rdquo;?
                    </h2>
                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400 leading-[1.5]">
                      Your changes will be lost if you don&apos;t save them.
                    </p>
                  </div>
                </div>
                <div className="px-5 pb-5 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsUnsavedPopupOpen(false);
                      setPendingAction(null);
                      pendingSwitchRef.current = null;
                    }}
                    className="px-4 py-[5px] rounded-[6px] text-[13px] font-normal text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setIsUnsavedPopupOpen(false);
                      const action = pendingAction;
                      setPendingAction(null);
                      if (action) {
                        setIsDirty(false);
                        executePendingAction(action);
                      }
                    }}
                    className="px-4 py-[5px] rounded-[6px] text-[13px] font-normal text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    Don&apos;t Save
                  </button>
                  <button
                    onClick={async () => {
                      const didSave = await saveFile();
                      if (!didSave) return;
                      setIsUnsavedPopupOpen(false);
                      const action = pendingAction;
                      setPendingAction(null);
                      if (action) executePendingAction(action);
                    }}
                    className="px-4 py-[5px] rounded-[6px] text-[13px] font-medium text-white bg-[#0A84FF] hover:bg-[#0060D4] active:bg-[#004EA2] transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Exam Breach Warning Overlay */}
          <AnimatePresence>
          {examBreachWarning && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/25 dark:bg-black/40 backdrop-blur-[6px] animate-in fade-in duration-200">
               <motion.div
                 initial={{ opacity: 0, scale: 0.98, y: 10 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.98, y: 10 }}
                 transition={{ duration: 0.2, ease: "easeOut" }}
                 className="flex flex-col bg-[#FCF5F3] dark:bg-[#1A1A23] rounded-[24px] shadow-[0_24px_54px_rgba(0,0,0,0.4)] overflow-hidden max-w-[420px] w-full border-none font-sans"
               >
                 <div className="px-8 pt-8 pb-6 flex flex-col items-center text-center">
                   <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center mb-6">
                     <motion.div
                       animate={{ opacity: [1, 0.4, 1] }}
                       transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                     >
                       <EyeOff className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                     </motion.div>
                   </div>
                   <h2 className="text-[20px] font-semibold tracking-tight text-[#1E1E1E] dark:text-[#EAEAEA] mb-3">
                     We lost you!
                   </h2>
                   <p className="text-[14px] text-[#1E1E1E]/70 dark:text-[#EAEAEA]/70 leading-relaxed max-w-[320px]">
                     You moved away from the main screen, and we cannot see what you are doing right now.
                     <br/><br/>
                     The clock is still ticking. Pick what you want to do next.
                   </p>
                 </div>

                 <div className="px-8 pb-8 flex flex-col gap-3">
                    <button
                      onClick={async () => {
                        try {
                          await document.documentElement.requestFullscreen();
                        } catch (e) {
                           console.warn("Fullscreen request failed", e);
                        }
                        setExamBreachWarning(false);
                      }}
                      className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-[15px] font-medium transition-all active:scale-[0.98] shadow-md cursor-pointer"
                    >
                      Go Back to Work
                    </button>
                    <button
                     onClick={() => {
                       setExamBreachWarning(false);
                       handleExamFinishEarly();
                     }}
                     className="w-full py-3.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-[#1E1E1E] dark:text-[#EAEAEA] text-[15px] font-medium transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Stop and Finish
                    </button>
                 </div>
               </motion.div>
             </div>
          )}
          </AnimatePresence>

          {/* Exam Wizard Overlay */}
          {isExamMode && examStatus === "idle" && !isExamSealed && !examRecoveryPending && (
            <ExamWizard
              onStart={handleExamStart}
              onCancel={() => setIsExamMode(false)}
            />
          )}

          {/* Crash-recovery "welcome back" overlay — freezes the exam
              (and its remaining time) until the user has re-oriented. */}
          {examRecoveryPending && (
            <SessionRecoveryOverlay
              remaining={examRecoverySeconds}
              accentColor="#3b82f6"
              title="Welcome back."
              message="Your exam was saved exactly as you left it."
              onResume={() => setExamRecoverySeconds(0)}
              onCancel={handleExamRecoveryCancel}
            />
          )}

          {/* Exam Countdown & Running UI Overlays */}
          {!examRecoveryPending && (examStatus === "countdown" ||
            examStatus === "running" ||
            examStatus === "timeout") && (
            <ExamOverlay
              status={examStatus}
              remainingSeconds={examRemainingSeconds}
              setRemainingSeconds={setExamRemainingSeconds}
              onCountdownEnd={() => setExamStatus("running")}
              onTimeout={handleExamTimeout}
              onFinish={() => {
                setExamStatus("idle");
                setIsExamMode(false);
              }}
              onClearApp={() => {
                createNewFile();
                if (editorRef.current) {
                  editorRef.current.setReadOnly(false);
                }
              }}
              editorRef={editorRef}
              onTriggerFallback={(title: string, type: "save" | "print", content: string) => {
                setFallbackTitle(title);
                setFallbackType(type);
                setFallbackContent(content);
                setFallbackModalOpen(true);
              }}
            />
          )}

          {/* User Cloud Workspace Overlays */}
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onBeforeSubmit={() => {
              // Snapshot current guest state before signIn/signUp changes the uid
              const currentUid = user?.uid ?? guestUid;
              saveAccountState(currentUid, buildFullAccountSnapshot());
            }}
          />

          <WorkspaceDashboard
            isOpen={isDashboardOpen}
            onClose={() => setIsDashboardOpen(false)}
            onLoadFileToEditor={handleLoadCloudFile}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onBeforeSwitch={handleBeforeSwitch}
          />

          <AccountPicker
            isOpen={isAccountPickerOpen}
            onClose={() => setIsAccountPickerOpen(false)}
            anchorCoords={actCenterCoords}
            linkedAccounts={linkedAccounts}
            currentUid={user?.uid ?? null}
            guestUid={guestUid}
            isLoggedIn={!!user}
            onBeforeSwitch={handleBeforeSwitch}
            onSwitch={switchToAccount}
            onRemove={removeLinkedAccount}
            onAddAccount={() => setIsAuthModalOpen(true)}
            onOpenDashboard={() => setIsDashboardOpen(true)}
          />

          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />

          {/* Edit Document Modal */}
          {editingDoc && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-[#1a1a1a] rounded-[24px] shadow-2xl overflow-hidden max-w-[600px] w-full border border-neutral-200 dark:border-white/10 text-neutral-800 dark:text-neutral-200 p-6 flex flex-col gap-4 text-left"
              >
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 pb-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    Edit Document
                  </h3>
                  <button
                    onClick={() => setEditingDoc(null)}
                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4 text-neutral-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-extrabold text-neutral-400 mb-1.5">
                      Document Title
                    </label>
                    <SmoothInput
                      type="text"
                      value={editingDoc.title}
                      onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-extrabold text-neutral-400 mb-1.5">
                      Document Content
                    </label>
                    <SmoothTextarea
                      value={editingDoc.content}
                      onChange={(e) => setEditingDoc({ ...editingDoc, content: e.target.value })}
                      rows={10}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono resize-none leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-white/10">
                  <button
                    onClick={() => setEditingDoc(null)}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!editingDoc.title.trim()) {
                        return;
                      }
                      try {
                        await updateDocument(editingDoc.id, editingDoc.title, editingDoc.content);
                        setRagResults(getAllScans());
                        setEditingDoc(null);
                      } catch (err: any) {
                        console.error("Failed to edit document:", err);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* High-Fidelity Interactive Signature Modal */}
          {signatureModalOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/25 dark:bg-black/40 backdrop-blur-[6px] animate-in fade-in duration-200">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-[#1a1a1a] rounded-[24px] shadow-2xl overflow-hidden max-w-[440px] w-full border border-neutral-200 dark:border-white/10 text-neutral-800 dark:text-neutral-200"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-neutral-200 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                      <PenTool className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-[16px] font-semibold tracking-tight text-neutral-900 dark:text-white">
                        E-Signature Pad
                      </h2>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 translate-y-[-1px]">
                        Draw your signature to place on the document
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSignatureModalOpen(false)}
                    className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Draw Canvas Area */}
                <div className="p-6 space-y-4 text-center">
                  <div className="relative bg-neutral-100 dark:bg-neutral-950 p-2 rounded-2xl border border-neutral-200 dark:border-white/5">
                    <canvas
                      ref={sigCanvasRef}
                      width={390}
                      height={180}
                      className="bg-white rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 block cursor-crosshair shadow-sm select-none touch-none"
                      onMouseDown={handleStartSigning}
                      onMouseMove={handleDrawSigning}
                      onMouseUp={handleEndSigning}
                      onMouseLeave={handleEndSigning}
                      onTouchStart={handleStartSigning}
                      onTouchMove={handleDrawSigning}
                      onTouchEnd={handleEndSigning}
                    />
                    <div className="absolute bottom-4 right-4 text-[9px] font-medium font-mono text-neutral-400 select-none bg-neutral-50/80 px-1.5 py-0.5 rounded backdrop-blur-[2px]">
                      Ink: Blue
                    </div>
                  </div>

                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-normal">
                    Sign cleanly using your finger, stylus, or cursor mouse. A transparent high-res signature will append to the current cursor line.
                  </p>
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-4 border-t border-neutral-200 dark:border-white/10 flex justify-end gap-3 bg-neutral-50 dark:bg-black/30">
                  <button
                    onClick={clearSignature}
                    className="px-4 py-2 rounded-xl text-[12px] font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-800 dark:hover:text-white transition-all cursor-pointer"
                  >
                    Clear Ink
                  </button>
                  <button
                    onClick={applySignature}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold tracking-wide transition-all active:scale-[0.98] shadow-sm cursor-pointer"
                  >
                    Apply Signature
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Sandboxed Fallback Copy/Print Modal */}
          {fallbackModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/25 dark:bg-black/40 backdrop-blur-[6px] animate-in fade-in duration-200">
               <motion.div
                 initial={{ opacity: 0, scale: 0.98, y: 10 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.98, y: 10 }}
                 transition={{ duration: 0.2, ease: "easeOut" }}
                 style={{ "--accent-color": themeAccentColor } as React.CSSProperties}
                 className="flex flex-col bg-[#FCF5F3] dark:bg-[#1A1A23] rounded-[24px] shadow-[0_24px_54px_rgba(0,0,0,0.4)] overflow-hidden max-w-[460px] w-full border-none font-sans"
               >
                 <div className="px-8 pt-8 pb-4 flex flex-col items-center text-center">
                   <div
                     className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                     style={{ backgroundColor: `${themeAccentColor}20`, color: themeAccentColor }}
                   >
                     {fallbackType === "print" ? (
                       <Printer className="w-8 h-8" />
                     ) : (
                       <FileCheck className="w-8 h-8" />
                     )}
                   </div>
                   <h2 className="text-[22px] font-semibold tracking-tight text-[#1E1E1E] dark:text-[#EAEAEA] mb-3">
                     {fallbackTitle}
                   </h2>
                   <p className="text-[14px] text-[#1E1E1E]/70 dark:text-[#EAEAEA]/70 leading-relaxed font-medium">
                     {fallbackType === "print" ? (
                       <span>
                         Here is a safe snapshot of your work. Copy it to your local editor to print securely.
                       </span>
                     ) : (
                       <span>
                         Here is a complete snapshot of your work. Copy it to your local editor for secure backup.
                       </span>
                     )}
                   </p>
                 </div>

                 <div className="px-8 pb-6">
                   <div className="relative group overflow-hidden rounded-2xl bg-black/[0.03] dark:bg-white/[0.02] border-none shadow-inner cursor-not-allowed" title="Editing is disabled — Secure read-only snapshot.">
                     <textarea
                       readOnly
                       value={fallbackContent || "(Empty Document)"}
                       className="w-full h-[160px] p-5 bg-transparent border-none text-[13px] leading-relaxed resize-none text-[#1E1E1E]/80 dark:text-[#EAEAEA]/80 whitespace-pre-wrap outline-none focus:ring-0 custom-scrollbar cursor-not-allowed select-text font-mono"
                       title="Editing is disabled — Secure read-only snapshot."
                     />
                   </div>
                 </div>

                 <div className="px-8 pb-8 flex flex-col gap-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(fallbackContent);
                        setFallbackCopied(true);
                        setTimeout(() => setFallbackCopied(false), 2000);
                      }}
                      className="w-full py-3.5 rounded-xl text-white text-[15px] font-medium transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 cursor-pointer hover:opacity-90"
                      style={{
                        backgroundColor: fallbackCopied ? "#10b981" : themeAccentColor,
                      }}
                    >
                      {fallbackCopied ? (
                        <>
                          <Check className="w-5 h-5 text-white" /> Copied safely
                        </>
                      ) : (
                        <>
                          <Copy className="w-5 h-5 text-white" /> Copy to clipboard
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setFallbackModalOpen(false)}
                      className="w-full py-3.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-[#1E1E1E] dark:text-[#EAEAEA] text-[15px] font-medium transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Close this window
                    </button>
                 </div>
               </motion.div>
            </div>
          )}


        </div>
      </div>
    </ThemeProviderCast>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ease-out select-none ${disabled ? "opacity-35 cursor-not-allowed text-neutral-500" : "text-neutral-700 dark:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer hover:translate-x-1"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function ExamOverlay({
  status,
  remainingSeconds,
  setRemainingSeconds,
  onCountdownEnd,
  onTimeout,
  onFinish,
  onClearApp,
  editorRef,
  onTriggerFallback,
}: any) {
  const [countdown, setCountdown] = useState(5);
  const [isPopupVisible, setIsPopupVisible] = useState(true);

  let themeAccentColor = "#3b82f6"; // fallback default blue
  try {
    const { accent } = useSettings();
    const currentThemeObj = THEME_OPTIONS.find((t: any) => t.id === accent) || THEME_OPTIONS[0];
    themeAccentColor = currentThemeObj.colors[2];
  } catch {}

  useEffect(() => {
    if (status !== "timeout") {
      setIsPopupVisible(true);
    } else if (status === "timeout" && isPopupVisible) {
      try {
        const audioCtx = getSharedAudioContext();
        if (!audioCtx) return;
        if (audioCtx.state === "suspended") {
          void audioCtx.resume();
        }

        const playChime = (freq: number, start: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
          gain.gain.linearRampToValueAtTime(0, start + 0.5);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(start);
          osc.stop(start + 0.5);
        };

        const now = audioCtx.currentTime;
        playChime(659.25, now);       // E5
        playChime(880.00, now + 0.15); // A5
        playChime(1046.50, now + 0.3); // C6
      } catch (e) {
         console.warn("Web Audio API not supported", e);
      }
    }
  }, [status, isPopupVisible]);

  const onCountdownEndRef = useRef(onCountdownEnd);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onCountdownEndRef.current = onCountdownEnd;
    onTimeoutRef.current = onTimeout;
  }, [onCountdownEnd, onTimeout]);

  useEffect(() => {
    if (status === "countdown") {
      const timer = setInterval(() => {
        setCountdown((prev: number) => {
          if (prev <= 1) {
            clearInterval(timer);
            setTimeout(() => {
              onCountdownEndRef.current();
            }, 700);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status]);

  useEffect(() => {
    if (status === "running") {
      const timer = setInterval(() => {
        setRemainingSeconds((prev: number) => {
          if (prev <= 1) {
            clearInterval(timer);
            onTimeoutRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, setRemainingSeconds]);

  const exportContentWithFormat = async (filename: string, content: string) => {
    let blob: Blob;
    const extension = filename.split('.').pop()?.toLowerCase();

    if (extension === "pdf") {
      const doc = new jsPDF();
      const lines = doc.splitTextToSize(content, 180);
      let y = 10;
      lines.forEach((line: string) => {
        if (y > 280) {
          doc.addPage();
          y = 10;
        }
        doc.text(line, 10, y);
        y += 7;
      });
      blob = doc.output('blob');
    } else if (extension === "docx") {
      const docxFile = new Document({
        sections: [{
          properties: {},
          children: content.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] }))
        }]
      });
      blob = await Packer.toBlob(docxFile);
    } else if (extension === "doc") {
      const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>${content.replace(/\n/g, '<br>')}</body></html>`;
      blob = new Blob([docHtml], { type: "application/msword" });
    } else {
      blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return blob;
  };

  const handleSave = async () => {
    try {
      const content = editorRef.current ? editorRef.current.getMarkdown() : "";
      const newName = prompt("Enter a filename to save your exam submission (Supported: .txt, .md, .doc, .docx, .pdf):", "exam_submission.docx");
      if (newName) {
        let finalName = newName.includes(".") ? newName : newName + ".docx";
        await exportContentWithFormat(finalName, content);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to save exam content:", e);
      return false;
    }
  };

  return (
    <>
      <AnimatePresence>
        {status === "countdown" && (
          <motion.div
            initial={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{
              opacity: 0,
              backdropFilter: "blur(0px)",
              transition: { duration: 0.5, ease: "easeInOut" }
            }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 z-[99]"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                transition: {
                  type: "spring",
                  stiffness: 350,
                  damping: 20
                }
              }}
              exit={{
                scale: 1.6,
                opacity: 0,
                transition: { duration: 0.4, ease: "easeOut" }
              }}
              className="text-[140px] font-bold font-mono tracking-tighter select-none"
              style={{
                color: themeAccentColor,
                textShadow: `0 0 40px ${themeAccentColor}66`
              }}
            >
              {countdown > 0 ? countdown : "GO!"}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {status === "timeout" && isPopupVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 dark:bg-black/40 backdrop-blur-[6px] animate-in fade-in duration-200">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ "--accent-color": themeAccentColor } as React.CSSProperties}
            className="flex flex-col bg-[#FCF5F3] dark:bg-[#1A1A23] rounded-[24px] shadow-[0_24px_54px_rgba(0,0,0,0.4)] overflow-hidden max-w-[420px] w-full border-none font-sans"
          >
            <div className="px-8 pt-8 pb-6 flex flex-col items-center text-center">
               <motion.div
                 animate={{ y: [-4, 4, -4] }}
                 transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                 className="relative w-48 h-48 mb-4 pointer-events-none"
               >
                 <div className="absolute inset-6 bg-black opacity-10 dark:opacity-[0.03] blur-[30px] rounded-full" />
                 <img src="/assets/images/times-up.png" alt="Time is up" className="w-full h-full object-contain relative z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]" />
               </motion.div>
               <h2 className="text-[22px] font-semibold tracking-tight text-[#1E1E1E] dark:text-[#EAEAEA] mb-3">
                 Time is up. Great work!
               </h2>
               <p className="text-[14px] text-[#1E1E1E]/70 dark:text-[#EAEAEA]/70 leading-relaxed max-w-[320px]">
                 Your session has concluded. Take a deep breath — you've done your best!
                 <br/><br/>
                 <span className="font-medium text-[#1E1E1E] dark:text-[#EAEAEA]">Your document is now locked. Please save a copy of your work to ensure it is kept safe.</span>
               </p>
             </div>
             <div className="px-8 pb-8 flex flex-col gap-3">
                <button
                  onClick={async () => {
                    try {
                      await handleSave();
                    } catch (e) {
                      console.log("Save cancelled or failed", e);
                    }
                    const content = editorRef.current ? editorRef.current.getMarkdown() : "";
                    onTriggerFallback("Saved Work Backup", "save", content);
                    onClearApp();
                    onFinish();
                  }}
                  className="w-full py-3.5 rounded-xl text-white text-[15px] font-medium transition-all active:scale-[0.98] shadow-md cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: themeAccentColor }}
                >
                  Save and Start Fresh
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                        const content = editorRef.current ? editorRef.current.getMarkdown() : "";
                        onTriggerFallback("Quick Print", "print", content);
                        const editorEl = document.querySelector('.lexkit-content-editable') as HTMLElement | null;
                        const html = editorEl ? editorEl.innerHTML : content;
                        const printWin = window.open('', '_blank', 'width=900,height=700');
                        if (!printWin) { window.print(); return; }
                        printWin.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Document</title><style>@page{margin:2cm 2.5cm;size:auto;}*,*::before,*::after{box-sizing:border-box;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11pt;line-height:1.65;color:#000;background:#fff;margin:0;padding:0;}h1{font-size:20pt;font-weight:700;margin:.8em 0 .4em;}h2{font-size:16pt;font-weight:600;margin:.8em 0 .4em;}h3,h4,h5,h6{font-size:11pt;font-weight:600;margin:.6em 0 .3em;}p{margin:0 0 .6em;}ul,ol{margin:.4em 0 .6em 1.8em;}li{margin-bottom:.2em;}strong,b{font-weight:700;}em,i{font-style:italic;}u{text-decoration:underline;}s{text-decoration:line-through;}code{font-family:'Courier New',monospace;font-size:9pt;background:#f4f4f4;padding:1px 4px;border-radius:3px;}pre{font-family:'Courier New',monospace;font-size:9pt;background:#f4f4f4;padding:12px;border-radius:4px;white-space:pre-wrap;overflow-wrap:break-word;margin:.6em 0;}table{border-collapse:collapse;width:100%;margin:.6em 0;}td,th{border:1px solid #ccc;padding:6px 10px;text-align:left;}th{background:#f8f8f8;font-weight:600;}a{color:#000;text-decoration:underline;}img{max-width:100%;height:auto;}blockquote{border-left:3px solid #ccc;margin:.6em 0;padding-left:1em;color:#444;}hr{border:none;border-top:1px solid #ddd;margin:1em 0;}</style></head><body>${html}</body></html>`);
                        printWin.document.close();
                        if (printWin.document.readyState === 'complete') { printWin.focus(); printWin.print(); printWin.close(); }
                        else { printWin.onload = () => { printWin.focus(); printWin.print(); printWin.close(); }; }
                    }}
                    className="flex-1 py-3.5 flex items-center justify-center gap-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-[#1E1E1E] dark:text-[#EAEAEA] text-[14px] font-medium transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Printer className="w-4 h-4 opacity-50" /> Print It
                  </button>
                  <button
                    onClick={() => {
                        setIsPopupVisible(false);
                        onFinish();
                    }}
                    className="flex-1 py-3.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-[#1E1E1E] dark:text-[#EAEAEA] text-[14px] font-medium transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Just Look
                  </button>
                </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
