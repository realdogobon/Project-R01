import React, { useState, useTransition, useMemo } from "react";
import { useAuth, TypingSession, CloudFile, LinkedAccountInfo, getAvatarColor } from "../../contexts/AuthContext";
import { useSettings, THEME_OPTIONS } from "../../contexts/SettingsContext";
import { useResizable } from "../../hooks/useResizable";
import { SmoothInput } from "../ui/SmoothInputs";
import {
  X, FileText, BarChart2, Trash2, Share2,
  Calendar, Clipboard, ChevronRight, Archive,
  Award, TrendingUp, Sparkles, Flame, Check, HelpCircle,
  User, Trophy, Target, Shield, Zap, CheckCircle, Save, LogOut, Cloud, RefreshCw, PartyPopper, PlaySquare, Pause, RotateCcw,
  ArrowLeft, Plus, Minus, Lock, UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ExportEngine } from "../../lib/ExportEngine";

interface WorkspaceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadFileToEditor: (file: CloudFile) => void;
  onOpenAuth?: () => void;
  onBeforeSwitch?: (proceed: () => void) => void;
}

export function WorkspaceDashboard({ isOpen, onClose, onLoadFileToEditor, onOpenAuth, onBeforeSwitch }: WorkspaceDashboardProps) {
  const { user, sessions, files, deleteFile, deleteSession, signOut, updateProfile, guestUid, linkedAccounts, switchToAccount, removeLinkedAccount } = useAuth();
  const { accent } = useSettings();

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileUpdateMsg, setProfileUpdateMsg] = useState<string | null>(null);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletedAccount, setIsDeletedAccount] = useState(false);

  // Account switcher state
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const [switchTargetUid, setSwitchTargetUid] = useState<string | null>(null);
  const [switchPassword, setSwitchPassword] = useState("");
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isRemoveMode, setIsRemoveMode] = useState(false);

  React.useEffect(() => {
    if (user) {
      setEditName(user.displayName || "");
      setEditEmail(user.email || "");
      setEditMobile(user.mobile || "");
    } else {
      setEditName("");
      setEditEmail("");
      setEditMobile("");
    }
  }, [user]);
  
  // Set default active tab to "overview"
  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "files" | "achievements">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [shareToastText, setShareToastText] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);

  // Sorting and filtering states for Practice Logs (Sessions)
  const [sessionSort, setSessionSort] = useState<"newest" | "oldest" | "speed" | "accuracy">("newest");
  const [sessionFilter, setSessionFilter] = useState<"all" | "Practice" | "Exam">("all");

  // Sorting states for Cloud Drafts (Files)
  const [fileSort, setFileSort] = useState<"newest" | "oldest" | "alpha" | "alpha-desc">("newest");

  // Replay states
  const [replaySession, setReplaySession] = useState<TypingSession | null>(null);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const replayContainerRef = React.useRef<HTMLDivElement>(null);
  const activeReplayCharRef = React.useRef<HTMLSpanElement>(null);

  const dashboardReplayEvents = useMemo(() => {
    if (!replaySession || !replaySession.replayEvents) return null;
    try {
      const parsed = JSON.parse(replaySession.replayEvents);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
         // Handle both {t, s, c} and {timestamp, text, selection} formats
         return (parsed as any[]).map(e => ({
            t: e.t ?? e.timestamp ?? 0,
            s: e.s ?? e.text ?? "",
            c: e.c ?? e.selection ?? undefined
         }));
      }
      if (Array.isArray(parsed)) {
         return (parsed as string[]).map((s, i) => ({ t: i * 50, s }));
      }
      return null;
    } catch (e) {
      console.error("Failed to parse replay events", e);
      return null;
    }
  }, [replaySession]);

  const dashboardReplayLog = useMemo(() => {
    return dashboardReplayEvents ? dashboardReplayEvents.map(e => e.s) : [];
  }, [dashboardReplayEvents]);

  const replayedState = useMemo(() => {
    if (dashboardReplayEvents && dashboardReplayEvents.length > 0) {
      const idx = Math.min(replayIndex, dashboardReplayEvents.length - 1);
      return dashboardReplayEvents[idx];
    }
    return null;
  }, [dashboardReplayEvents, replayIndex]);

  const replayedText = useMemo(() => {
    if (replayedState) return replayedState.s;
    return (replaySession?.content || "").substring(0, replayIndex);
  }, [replayedState, replayIndex, replaySession]);

  const replayedCursor = useMemo(() => {
    if (replayedState && replayedState.c) return replayedState.c.end;
    return replayedText.length;
  }, [replayedState, replayedText]);

  const dashboardErrorIndices = useMemo(() => {
    if (!replaySession) return [];

    const logs = dashboardReplayLog;
    const mistakeStepIndices: number[] = [];

    // For Exam sessions, `content` holds the actual final typed text.
    // For Practice sessions, `content` holds the original/target passage,
    // so the real "final typed text" must come from the last replay-log
    // snapshot instead (mirrors the logic used in PracticeMode's own replay).
    const finalTypedText = replaySession.type === "Exam"
      ? (replaySession.content || "")
      : (logs.length > 0 ? logs[logs.length - 1] : (replaySession.content || ""));

    if (logs.length > 0) {
      for (let i = 1; i < logs.length; i++) {
        const prev = logs[i - 1];
        const curr = logs[i];

        if (curr.length < prev.length) {
          mistakeStepIndices.push(i);
          continue;
        }

        for (let j = 0; j < curr.length; j++) {
          if (curr[j] !== finalTypedText[j]) {
            mistakeStepIndices.push(i);
            break;
          }
        }
      }
      return mistakeStepIndices;
    }

    // Fallback: no replay log available, do a static end-state diff against
    // the original content (only meaningful for Practice sessions where
    // `content` is the target passage).
    if (replaySession.type === "Exam" || !replaySession.content) return [];
    const errors: number[] = [];
    const originalChars = replaySession.content.split("");
    for (let i = 0; i < finalTypedText.length; i++) {
      if (finalTypedText[i] !== originalChars[i]) {
        errors.push(i);
      }
    }
    return errors;
  }, [replaySession, dashboardReplayLog]);
  // Simulated states for level up animation sequence
  const [isSimulatingLevelUp, setIsSimulatingLevelUp] = useState(false);
  const [simulatedLevel, setSimulatedLevel] = useState<number | null>(null);
  const [simulatedProgress, setSimulatedProgress] = useState<number | null>(null);
  const [showLevelUpAnim, setShowLevelUpAnim] = useState(false);

  // Experience level calculation values
  const totalXP = useMemo(() => {
    return sessions.reduce((acc, s) => {
      const base = s.type === "Exam" ? 250 : 120;
      const speedBonus = s.speed * (s.type === "Exam" ? 6 : 3);
      const precisionBonus = s.accuracy >= 95 ? 50 : 0;
      return acc + base + speedBonus + precisionBonus;
    }, 0);
  }, [sessions]);

  const XP_PER_LEVEL = 1000;
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const currentLevelXP = totalXP % XP_PER_LEVEL;
  const progressPercent = Math.min(100, Math.round((currentLevelXP / XP_PER_LEVEL) * 100));

  const [prevLevel, setPrevLevel] = useState(level);

  // Check if we need to show level up animation on mount
  React.useEffect(() => {
    if (!user) return;
    const key = `typing_suite_last_seen_level_${user.uid}`;
    const lastSeenStr = localStorage.getItem(key);
    const lastSeenLevel = lastSeenStr ? parseInt(lastSeenStr) : level;

    if (!lastSeenStr || level <= lastSeenLevel) {
      if (level !== lastSeenLevel) {
        localStorage.setItem(key, level.toString());
      }
      return;
    }

    // Only play animation if the dashboard is currently visible
    if (!isOpen) return;

    setIsSimulatingLevelUp(true);
    setSimulatedLevel(level - 1);
    
    let current = 0;
    const interval = setInterval(() => {
      current = Math.min(100, current + 2);
      setSimulatedProgress(current);
      
      if (current >= 100) {
        clearInterval(interval);
        
        setSimulatedLevel(level);
        setShowLevelUpAnim(true);
        
        localStorage.setItem(key, level.toString());
        
        setTimeout(() => {
          setShowLevelUpAnim(false);
          setTimeout(() => {
            setIsSimulatingLevelUp(false);
            setSimulatedLevel(null);
            setSimulatedProgress(null);
          }, 600);
        }, 10000);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [level, user?.uid, isOpen]);

  // Effect for replay animation
  React.useEffect(() => {
    if (!replaySession || !isPlayingReplay) return;
    
    const maxIndex = dashboardReplayLog.length > 0 ? dashboardReplayLog.length : (replaySession.content || "").length;
    if (replayIndex >= maxIndex) {
      setIsPlayingReplay(false);
      return;
    }
    
    let delay = 50 / replaySpeed;
    
    if (dashboardReplayEvents && dashboardReplayEvents.length > 1 && replayIndex < dashboardReplayEvents.length - 1) {
       // Real-time playback based on timestamps
       const current = dashboardReplayEvents[replayIndex];
       const next = dashboardReplayEvents[replayIndex + 1];
       const diff = next.t - current.t;
       
       // Cap huge gaps (e.g. if user took a long break)
       delay = Math.min(2000, Math.max(10, diff)) / replaySpeed;
    } else if (dashboardReplayLog.length === 0) {
       // Simulation logic for character-by-character typing
       delay = Math.max(10, (12000 / Math.max(1, replaySession.speed)) / replaySpeed);
    }
    
    const timeoutId = setTimeout(() => {
      setReplayIndex(prev => prev + 1);
    }, delay);
    
    return () => clearTimeout(timeoutId);
  }, [replayIndex, isPlayingReplay, replaySession, replaySpeed, dashboardReplayLog, dashboardReplayEvents]);

  // Effect for auto scroll replay — keeps active char centered vertically
  React.useEffect(() => {
    if (activeReplayCharRef.current && replayContainerRef.current) {
      const container = replayContainerRef.current;
      const activeChar = activeReplayCharRef.current;

      const charRelTop = activeChar.offsetTop - container.scrollTop;
      const containerH = container.clientHeight;

      if (charRelTop < containerH * 0.25 || charRelTop > containerH * 0.65) {
        const targetScrollTop = activeChar.offsetTop - containerH * 0.4;
        container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
      }
    }
  }, [replayIndex]);

  const displayLevel = simulatedLevel !== null ? simulatedLevel : level;
  const displayProgress = simulatedProgress !== null ? simulatedProgress : progressPercent;

  const replayWordSegments = useMemo(() => {
    if (!replaySession || !replaySession.content) return { chars: [], segments: [] };
    const originalChars = replaySession.content.split("");
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
    return { chars: originalChars, segments };
  }, [replaySession]);

  // Live WPM and accuracy during replay (placed after replayWordSegments and replayedText are declared)
  const liveReplayWpm = useMemo(() => {
    if (!dashboardReplayEvents || dashboardReplayEvents.length < 2 || replayIndex === 0) return 0;
    const firstT = dashboardReplayEvents[0].t;
    const currentT = dashboardReplayEvents[Math.min(replayIndex, dashboardReplayEvents.length - 1)].t;
    const elapsedMin = Math.max(0.001, (currentT - firstT) / 60000);
    return Math.round((replayedText.length / 5) / elapsedMin);
  }, [dashboardReplayEvents, replayIndex, replayedText]);

  const liveReplayAccuracy = useMemo(() => {
    if (replayedText.length === 0) return 100;
    const chars = replayWordSegments.chars;
    const correct = replayedText.split("").filter((c, i) => c === (chars[i] || "")).length;
    return Math.round((correct / replayedText.length) * 100);
  }, [replayedText, replayWordSegments]);

  const displayRankTitle = useMemo(() => {
    const lvl = simulatedLevel !== null ? simulatedLevel : level;
    if (lvl >= 10) return "Legendary Typist";
    if (lvl >= 7) return "Grand Archivist";
    if (lvl >= 4) return "Speed Sage";
    if (lvl >= 2) return "Adept Scribe";
    return "Novice Copyist";
  }, [level, simulatedLevel]);

  // Load Window Resize State to match Library and Scanner windows 1:1
  const { width, height, x, y, startResize } = useResizable({
    persistKey: "workspace_dashboard_v4",
    initialWidth: 1060,
    initialHeight: 700,
    minWidth: 550,
    minHeight: 480
  });

  const isWide = width >= 620;

  // Fetch the current active accent color dynamically
  const currentThemeObj = THEME_OPTIONS.find((t) => t.id === accent) || THEME_OPTIONS[0];
  const themeAccentColor = currentThemeObj?.colors[2] || "#C28181";

  const triggerToast = (text: string) => {
    setShareToastText(text);
    setTimeout(() => {
      setShareToastText(null);
    }, 2500);
  };

  const copyToClipboard = (text: string) => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(text)
          .then(() => triggerToast("Copied successfully!"))
          .catch(() => fallbackCopy(text));
      } else {
        fallbackCopy(text);
      }
    } catch (e) {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (successful) {
        triggerToast("Copied successfully!");
      } else {
        triggerToast("Failed to copy. Please copy manually.");
      }
    } catch (err) {
      console.error("Fallback copy failed", err);
      triggerToast("Clipboard access restricted in sandbox.");
    }
  };

  const handleShareSession = (session: TypingSession) => {
    const text = `RoyScript TSR Suite - Practice Result\n-----------------------------------\nSpeed: ${session.speed} WPM\nAccuracy: ${session.accuracy}%\nMode: ${session.type} Run\nDuration: ${Math.floor(session.duration / 60)}m ${session.duration % 60}s\nPassage: "${session.passageTitle}"\nDate: ${new Date(session.date).toLocaleString()}\n-----------------------------------\nVerified on RoyScript TSR Suite.`;
    copyToClipboard(text);
  };

  const handleShareFile = (file: CloudFile) => {
    const text = `RoyScript TSR Suite - Cloud Document\n-----------------------------------\nTitle: ${file.title}\nDocument ID: ${file.id}\nLast Modified: ${new Date(file.updatedAt).toLocaleString()}\n-----------------------------------\nSynchronized securely on RoyScript TSR.`;
    copyToClipboard(text);
  };

  // Bento Quick Statistics
  const peakWPM = useMemo(() => {
    return sessions.length > 0 ? Math.max(...sessions.map(s => s.speed)) : 0;
  }, [sessions]);

  const avgWPM = useMemo(() => {
    if (sessions.length === 0) return 0;
    return Math.round(sessions.reduce((acc, s) => acc + s.speed, 0) / sessions.length);
  }, [sessions]);

  const avgAccuracy = useMemo(() => {
    if (sessions.length === 0) return 0;
    return Math.round(sessions.reduce((acc, s) => acc + s.accuracy, 0) / sessions.length);
  }, [sessions]);

  const totalWordsTyped = useMemo(() => {
    return sessions.reduce((acc, s) => {
      if (s.content) {
        return acc + s.content.trim().split(/\s+/).filter(Boolean).length;
      }
      return acc + Math.round(s.speed * (s.duration / 60));
    }, 0);
  }, [sessions]);

  // Premium Achievement Badges (Uses vector-style icons instead of emojis)
  const badges = useMemo(() => {
    return [
      {
        id: "speed_30",
        title: "Swift Runner",
        desc: "Exceeded 30 WPM speed run",
        unlocked: peakWPM >= 30,
        icon: Zap,
        rule: "WPM >= 30"
      },
      {
        id: "speed_60",
        title: "Sonic Gazelle",
        desc: "Broke the 60 WPM barrier",
        unlocked: peakWPM >= 60,
        icon: Flame,
        rule: "WPM >= 60"
      },
      {
        id: "speed_100",
        title: "Warp Master",
        desc: "Phenomenal 100+ WPM score",
        unlocked: peakWPM >= 100,
        icon: Trophy,
        rule: "WPM >= 100"
      },
      {
        id: "accuracy_100",
        title: "Sniper Target",
        desc: "A perfect 100% precision score",
        unlocked: sessions.some(s => s.accuracy === 100),
        icon: Target,
        rule: "100% Accuracy"
      },
      {
        id: "scribe_5",
        title: "Archivist",
        desc: "Archived 5+ cloud documents",
        unlocked: files.length >= 5,
        icon: Shield,
        rule: "Cloud Files >= 5"
      },
      {
        id: "veteran_10",
        title: "Super Trainer",
        desc: "Completed over 10 practice trials",
        unlocked: sessions.length >= 10,
        icon: Award,
        rule: "Runs >= 10"
      }
    ];
  }, [peakWPM, sessions, files]);

  // Filtering and sorting lists by search query, filters, and criteria
  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        (s.passageTitle || "").toLowerCase().includes(query) ||
        (s.type || "").toLowerCase().includes(query) ||
        s.speed.toString().includes(query)
      );
    }

    // 2. Type Filter
    if (sessionFilter !== "all") {
      result = result.filter(s => s.type === sessionFilter);
    }

    // 3. Sort
    result.sort((a, b) => {
      if (sessionSort === "newest") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sessionSort === "oldest") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sessionSort === "speed") {
        return b.speed - a.speed;
      }
      if (sessionSort === "accuracy") {
        return b.accuracy - a.accuracy;
      }
      return 0;
    });

    return result;
  }, [sessions, searchQuery, sessionFilter, sessionSort]);

  const filteredFiles = useMemo(() => {
    let result = [...files];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f =>
        (f.title || "").toLowerCase().includes(query) ||
        (f.content || "").toLowerCase().includes(query)
      );
    }

    // 2. Sort
    result.sort((a, b) => {
      if (fileSort === "newest") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (fileSort === "oldest") {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      if (fileSort === "alpha") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (fileSort === "alpha-desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      return 0;
    });

    return result;
  }, [files, searchQuery, fileSort]);

  // Hook Order safety guard: render return must happen after hooks definition
  if (!isOpen || !user) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-6 bg-black/25 dark:bg-black/40 backdrop-blur-[6px] animate-in fade-in duration-200 font-sans cursor-default"
      onDoubleClick={onClose}
    >
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.12);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          width: window.innerWidth < 640 ? '100%' : width,
          height: window.innerWidth < 640 ? '100%' : height,
          left: window.innerWidth < 640 ? 0 : x,
          top: window.innerWidth < 640 ? 0 : y
        }}
        exit={{
          opacity: 0,
          scale: 0.6,
          x: 100,
          y: 400,
          filter: "blur(12px)",
          transition: { duration: 0.3, ease: "easeIn" }
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        transition={{ duration: 0.25, type: 'spring', damping: 25, stiffness: 200 }}
        style={{ position: window.innerWidth < 640 ? 'fixed' : 'absolute' }}
        className="bg-[#FCF5F3] dark:bg-[#20202A] sm:rounded-[14px] shadow-2xl flex flex-col overflow-hidden border-none sm:border border-black/5 dark:border-white/5 text-neutral-900 dark:text-neutral-100"
      >
        {/* Resize & Drag Handles (Only on Desktop) */}
        <div className="hidden sm:block">
          <div className="absolute top-0 left-0 w-full h-1 cursor-n-resize z-[160]" onMouseDown={(e) => startResize('n', e)} />
          <div className="absolute bottom-0 left-0 w-full h-1 cursor-s-resize z-[160]" onMouseDown={(e) => startResize('s', e)} />
          <div className="absolute top-0 left-0 h-full w-1 cursor-w-resize z-[160]" onMouseDown={(e) => startResize('w', e)} />
          <div className="absolute top-0 right-0 h-full w-1 cursor-e-resize z-[160]" onMouseDown={(e) => startResize('e', e)} />

          <div className="absolute top-[38px] left-0 w-2 h-[calc(100%-46px)] cursor-move z-[155]" onMouseDown={(e) => startResize('move', e)} />
          <div className="absolute top-[38px] right-0 w-2 h-[calc(100%-46px)] cursor-move z-[155]" onMouseDown={(e) => startResize('move', e)} />
          <div className="absolute bottom-0 left-[8px] w-[calc(100%-16px)] h-2 cursor-move z-[155]" onMouseDown={(e) => startResize('move', e)} />

          <div className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-[170]" onMouseDown={(e) => startResize('nw', e)} />
          <div className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-[170]" onMouseDown={(e) => startResize('ne', e)} />
          <div className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-[170]" onMouseDown={(e) => startResize('sw', e)} />
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-[170]" onMouseDown={(e) => startResize('se', e)} />
        </div>

        <AnimatePresence>
          {shareToastText && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-12 left-1/2 -translate-x-1/2 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg px-4 py-2.5 text-xs font-semibold shadow-xl z-[200] flex items-center gap-2 border border-white/10 dark:border-black/5"
            >
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>{shareToastText}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Account Switcher Panel ──────────────────────────────────────── */}
        <AnimatePresence>
          {isAccountSwitcherOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setIsAccountSwitcherOpen(false); setIsRemoveMode(false); setSwitchTargetUid(null); setSwitchPassword(""); setSwitchError(null); }}
                className="absolute inset-0 z-[120] bg-black/10 dark:bg-black/35 backdrop-blur-[1px]"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 240 }}
                className="absolute left-0 top-[38px] bottom-0 w-[310px] sm:w-[340px] bg-white dark:bg-[#1E1E24] border-r border-black/5 dark:border-white/5 z-[130] flex flex-col shadow-2xl overflow-hidden select-none"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-black/5 dark:border-white/5 shrink-0">
                  <button
                    onClick={() => { setIsAccountSwitcherOpen(false); setIsRemoveMode(false); setSwitchTargetUid(null); setSwitchPassword(""); setSwitchError(null); }}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                  </button>
                  <span className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-100 tracking-tight">Accounts</span>
                  <button
                    onClick={() => { setIsRemoveMode(r => !r); setSwitchTargetUid(null); setSwitchPassword(""); setSwitchError(null); }}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer ${isRemoveMode ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"}`}
                  >
                    {isRemoveMode ? "Done" : "Remove"}
                  </button>
                </div>

                {/* Account list */}
                <div className="flex-1 overflow-y-auto py-2">
                  {linkedAccounts.map((acct) => {
                    const isCurrent = user?.uid === acct.uid;
                    const isTarget = switchTargetUid === acct.uid;
                    const initials = acct.displayName?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "??";
                    const avatarColor = getAvatarColor(acct.uid);
                    return (
                      <div key={acct.uid}>
                        <button
                          disabled={isCurrent || isRemoveMode}
                          onClick={() => {
                            if (isCurrent) return;
                            // OAuth accounts (no local password): gate + switch immediately
                            if (!acct.requiresPassword) {
                              const doIt = async () => {
                                setIsSwitching(true);
                                try {
                                  await switchToAccount(acct.uid);
                                  setIsAccountSwitcherOpen(false);
                                } catch (err: any) {
                                  setSwitchError(err.message);
                                } finally {
                                  setIsSwitching(false);
                                }
                              };
                              onBeforeSwitch ? onBeforeSwitch(doIt) : doIt();
                              return;
                            }
                            // Password-protected: just reveal the prompt; gate happens at submit
                            setSwitchTargetUid(isTarget ? null : acct.uid);
                            setSwitchPassword("");
                            setSwitchError(null);
                          }}
                          className={`w-full flex items-center gap-3 px-5 py-3 transition-colors ${isCurrent ? "cursor-default" : "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"}`}
                        >
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            {acct.photoURL ? (
                              <img src={acct.photoURL} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover" alt={acct.displayName} />
                            ) : (
                              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white" style={{ backgroundColor: avatarColor }}>
                                {initials}
                              </div>
                            )}
                            {isCurrent && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1E1E24] flex items-center justify-center">
                                <Check className="w-2 h-2 text-white" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0 text-left">
                            <p className={`text-[13px] font-medium truncate ${isCurrent ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-700 dark:text-neutral-300"}`}>
                              {acct.displayName}
                            </p>
                            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">{acct.email}</p>
                          </div>
                          {/* Remove button — no circle, no bg, just the icon */}
                          {isRemoveMode && !isCurrent && (
                            <button
                              onClick={(e) => { e.stopPropagation(); removeLinkedAccount(acct.uid); }}
                              className="text-red-500 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </button>

                        {/* Inline password prompt */}
                        {isTarget && !isRemoveMode && (
                          <div className="mx-5 mb-3 p-3 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-200/60 dark:border-white/8">
                            <div className="flex items-center gap-2 mb-2">
                              <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Enter password for <strong className="text-neutral-700 dark:text-neutral-300">{acct.displayName}</strong></p>
                            </div>
                            <input
                              type="password"
                              autoFocus
                              value={switchPassword}
                              onChange={(e) => { setSwitchPassword(e.target.value); setSwitchError(null); }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && switchPassword) {
                                  const pwd = switchPassword;
                                  const doSwitch = async () => {
                                    setIsSwitching(true);
                                    setSwitchError(null);
                                    try {
                                      await switchToAccount(acct.uid, pwd);
                                      setIsAccountSwitcherOpen(false);
                                      setSwitchTargetUid(null);
                                      setSwitchPassword("");
                                    } catch (err: any) {
                                      setSwitchError(err.message || "Incorrect password.");
                                    } finally {
                                      setIsSwitching(false);
                                    }
                                  };
                                  onBeforeSwitch ? onBeforeSwitch(doSwitch) : doSwitch();
                                }
                              }}
                              placeholder="Password"
                              className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-[12px] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors"
                            />
                            {switchError && <p className="text-[11px] text-red-500 mt-1.5">{switchError}</p>}
                            <button
                              disabled={!switchPassword || isSwitching}
                              onClick={() => {
                                const pwd = switchPassword;
                                const doSwitch = async () => {
                                  setIsSwitching(true);
                                  setSwitchError(null);
                                  try {
                                    await switchToAccount(acct.uid, pwd);
                                    setIsAccountSwitcherOpen(false);
                                    setSwitchTargetUid(null);
                                    setSwitchPassword("");
                                  } catch (err: any) {
                                    setSwitchError(err.message || "Incorrect password.");
                                  } finally {
                                    setIsSwitching(false);
                                  }
                                };
                                onBeforeSwitch ? onBeforeSwitch(doSwitch) : doSwitch();
                              }}
                              className="mt-2 w-full py-1.5 rounded-lg text-[12px] font-medium text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{ backgroundColor: themeAccentColor }}
                            >
                              {isSwitching ? "Switching…" : "Switch →"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Guest account row — always at bottom, no remove button */}
                  <div className="border-t border-black/5 dark:border-white/5 mt-1 pt-1">
                    <button
                      disabled={!user}
                      onClick={() => {
                        if (!user) return;
                        const doIt = async () => {
                          await switchToAccount(guestUid);
                          setIsAccountSwitcherOpen(false);
                        };
                        onBeforeSwitch ? onBeforeSwitch(doIt) : doIt();
                      }}
                      className={`w-full flex items-center gap-3 px-5 py-3 transition-colors ${!user ? "cursor-default" : "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"}`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                          <User className="w-4.5 h-4.5 text-neutral-400 dark:text-neutral-500" />
                        </div>
                        {!user && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1E1E24] flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-[13px] font-medium ${!user ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-700 dark:text-neutral-300"}`}>Guest</p>
                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">Local device only</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 pt-3 border-t border-black/5 dark:border-white/5 shrink-0">
                  <button
                    onClick={() => { setIsAccountSwitcherOpen(false); onClose(); if (onOpenAuth) onOpenAuth(); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-[12px] font-semibold transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add another account
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isProfileSettingsOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsProfileSettingsOpen(false)}
                className="absolute inset-0 z-[120] bg-black/10 dark:bg-black/35 backdrop-blur-[1px]"
              />
              {/* Sideways sliding panel */}
              <motion.div
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="absolute left-0 top-[38px] bottom-0 w-[310px] sm:w-[340px] bg-white dark:bg-[#1E1E24] border-r border-black/5 dark:border-white/5 z-[130] flex flex-col p-6 shadow-2xl overflow-y-auto select-none"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Profile Settings</h3>
                  </div>
                  <button
                    onClick={() => setIsProfileSettingsOpen(false)}
                    className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Fields */}
                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full text-xs px-3 py-2 bg-neutral-50 dark:bg-black/10 border border-neutral-200 dark:border-white/5 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 text-neutral-800 dark:text-neutral-200"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full text-xs px-3 py-2 bg-neutral-50 dark:bg-black/10 border border-neutral-200 dark:border-white/5 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 text-neutral-800 dark:text-neutral-200"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">Mobile Number</label>
                    <input
                      type="text"
                      value={editMobile}
                      onChange={(e) => setEditMobile(e.target.value)}
                      placeholder="Mobile Number"
                      className="w-full text-xs px-3 py-2 bg-neutral-50 dark:bg-black/10 border border-neutral-200 dark:border-white/5 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 text-neutral-800 dark:text-neutral-200"
                    />
                  </div>
                </div>

                {/* Save, Sync and Delete Account Section at Bottom */}
                <div className="pt-6 mt-auto flex flex-col gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          if (!editName.trim()) return;
                          setIsSavingProfile(true);
                          try {
                            await updateProfile(editName, editEmail, editMobile);
                            setProfileUpdateMsg("✓ Saved successfully");
                            setTimeout(() => setProfileUpdateMsg(null), 2500);
                          } catch (e) {
                            setProfileUpdateMsg("✗ Update failed");
                            setTimeout(() => setProfileUpdateMsg(null), 2500);
                          } finally {
                            setIsSavingProfile(false);
                          }
                        }}
                        disabled={isSavingProfile}
                        className="px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer"
                      >
                        {isSavingProfile ? "Saving..." : "Save Changes"}
                      </button>

                      {!user?.uid?.startsWith("mock_google_uid_") && (
                        <button
                          onClick={() => {
                            if (user) {
                              localStorage.setItem("typing_suite_sync_source_uid", user.uid);
                            }
                            onClose();
                            if (onOpenAuth) onOpenAuth();
                          }}
                          className="px-4 py-2 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-semibold tracking-wide border border-neutral-200/50 dark:border-white/5 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                          <span>Sync to Cloud</span>
                        </button>
                      )}
                    </div>

                    {profileUpdateMsg && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in duration-200">
                        {profileUpdateMsg}
                      </span>
                    )}

                    {user?.uid?.startsWith("mock_google_uid_") && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium select-none">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Profile linked with Cloud (Google)</span>
                      </div>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    {isDeletedAccount ? (
                      <motion.div
                        key="deleted"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-6 gap-3 text-emerald-600 dark:text-emerald-400"
                      >
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                        >
                          <CheckCircle className="w-10 h-10" />
                        </motion.div>
                        <motion.span
                          initial={{ y: 5, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="text-xs font-semibold tracking-wide"
                        >
                          Account Deleted
                        </motion.span>
                      </motion.div>
                    ) : showDeleteConfirm ? (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="py-2 flex flex-col gap-2"
                      >
                        <h4 className="text-xs font-semibold text-red-600 dark:text-red-400">Permanently Delete Account?</h4>
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-relaxed mb-1">
                          This action is irreversible. All practice history, cloud drafts, and records will be deleted forever.
                        </p>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={async () => {
                              setIsDeletedAccount(true);
                              // Wait a bit for the animation before actually deleting and logging out
                              setTimeout(() => {
                                // Reset local users, clear sessions and files, and sign out
                                const localUsers = JSON.parse(localStorage.getItem("typing_suite_users") || "[]");
                                const remainingUsers = localUsers.filter((u: any) => u.uid !== user?.uid);
                                localStorage.setItem("typing_suite_users", JSON.stringify(remainingUsers));
                                
                                // Delete all sessions and files from localStorage if sandbox
                                localStorage.removeItem(`typing_suite_sessions_${user?.uid}`);
                                localStorage.removeItem(`typing_suite_files_${user?.uid}`);
                                
                                // Sign out and close the panels
                                signOut();
                                setIsProfileSettingsOpen(false);
                                setShowDeleteConfirm(false);
                                setIsDeletedAccount(false);
                              }, 1500);
                            }}
                            className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
                          >
                            Yes, delete forever
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="button"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full text-left py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Your Account</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Title Bar (Matches Library & Scanner Windows 1:1) */}
        <div
          className="h-[38px] flex items-center justify-between pl-4 pr-0 shrink-0 select-none bg-white/50 dark:bg-black/20 backdrop-blur-md border-b border-black/5 dark:border-white/5 cursor-move"
          onMouseDown={(e) => startResize('move', e)}
        >
          <div className="flex items-center gap-2.5 text-[#1E1E1E] dark:text-[#EAEAEA]">
            <User className="w-4 h-4" style={{ color: themeAccentColor }} />
            <span className="text-[12px] font-medium tracking-wide">Workspace Dashboard</span>
          </div>
          <div className="flex items-center h-full">
            <button
              onClick={onClose}
              className="h-full px-4 hover:bg-[#E81123] hover:text-white text-[#1E1E1E] dark:text-[#EAEAEA] transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dual Panel Body Layout (Matches LibraryHub 1:1 style) */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          
          {/* Left Column Sidebar (Width: 310px) */}
          <div className="w-full lg:w-[310px] flex flex-col px-7 pb-6 overflow-y-auto shrink-0 border-b lg:border-b-0 lg:border-r border-black/5 dark:border-white/5 select-none">
            <h1 className="text-[26px] font-semibold text-[#1E1E1E] dark:text-[#FFFFFF] mt-3 mb-4 tracking-tight">Dashboard</h1>

            {/* Profile Info section inside Left column */}
            <div className="flex items-center gap-3 py-4 mb-4 border-b border-black/5 dark:border-white/5">
              {user ? (
                <>
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      className="w-10 h-10 rounded-full object-cover border border-neutral-200/50 dark:border-neutral-700/50 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm border border-black/5 dark:border-white/5 shrink-0" 
                      style={{ backgroundColor: themeAccentColor || "#4F46E5" }}
                    >
                      {user.displayName ? user.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "US"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] font-medium text-neutral-800 dark:text-neutral-100 truncate">
                      {user.displayName || "Anonymous Typist"}
                    </h3>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
                      {displayRankTitle}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/50 dark:border-white/5 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] font-medium text-neutral-800 dark:text-neutral-100 truncate">
                      Guest
                    </h3>
                  </div>
                </>
              )}
            </div>

            {/* Menu Section styled exactly like Collections in Library window */}
            <div className="flex flex-col gap-3 mb-5 pl-0.5">
              <label className="text-[13px] text-[#202020] dark:text-[#EAEAEA]">Menu</label>

              {[
                { id: "overview", label: "Profile Overview" },
                { id: "sessions", label: "Session History", badge: sessions.length },
                { id: "files", label: "Cloud Drafts", badge: files.length },
                { id: "achievements", label: "Achievements", badge: badges.filter(b => b.unlocked).length }
              ].map(item => {
                const isActive = activeTab === item.id;
                return (
                  <label
                    key={item.id}
                    className={`flex items-center justify-between cursor-pointer group p-1 -ml-1 rounded transition-colors ${isActive ? '' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                    onClick={() => {
                      setActiveTab(item.id as any);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isActive
                          ? 'border-neutral-800 dark:border-neutral-200'
                          : 'border-neutral-300 dark:border-neutral-600 group-hover:border-neutral-400 dark:group-hover:border-neutral-500'
                      }`}>
                        {isActive && (
                          <div className="w-[10px] h-[10px] rounded-full bg-neutral-800 dark:bg-neutral-200 animate-in zoom-in-75 duration-150" />
                        )}
                      </div>
                      <span className="text-[13px] text-[#1E1E1F] dark:text-[#EAEAEA]">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="text-[11px] font-mono text-gray-400 dark:text-zinc-500 px-1.5">
                        {item.badge}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Profile Settings and Sign Out at the Bottom */}
            <div className="mt-auto pt-5 border-t border-black/5 dark:border-white/5 flex flex-col gap-2 select-none">
              {user ? (
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => {
                      setIsProfileSettingsOpen(true);
                      setShowDeleteConfirm(false);
                    }}
                    className="w-full flex items-center justify-between p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200" />
                      <span className="text-[13px] font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200">
                        Profile Settings
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 transition-transform group-hover:translate-x-0.5" />
                  </button>

                  <button
                    onClick={() => {
                      setIsAccountSwitcherOpen(true);
                      setSwitchTargetUid(null);
                      setSwitchPassword("");
                      setSwitchError(null);
                      setIsRemoveMode(false);
                    }}
                    className="w-full flex items-center justify-between p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserPlus className="w-4 h-4 text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200" />
                      <span className="text-[13px] font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200">
                        Switch Account
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 transition-transform group-hover:translate-x-0.5" />
                  </button>

                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-2.5 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500/80 dark:text-red-400/80" />
                    <span className="text-[13px] font-medium">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
                    You are currently practicing as a guest. All drafts and logs remain offline.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenAuth) onOpenAuth();
                    }}
                    className="w-full text-center py-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    Sign In Securely
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column Canvas Area (Flex-1) Matches Library Canvas 1:1 */}
          <div className="flex-1 bg-[#F9F9F9] dark:bg-[#1A1A22] rounded-tl-[10px] border-t border-l border-black/5 dark:border-white/5 relative flex flex-col shadow-[-4px_-4px_16px_rgba(0,0,0,0.02)] overflow-hidden">
            
            {/* 1. PROFILE OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto custom-scrollbar select-none">
                
                {/* Large Display Panel */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-16 sm:gap-24 mb-8 w-full">
                  <div className="text-center">
                    <span 
                      className="text-[72px] sm:text-[84px] font-medium leading-none tracking-tight block"
                      style={{ color: themeAccentColor || "#C28181" }}
                    >
                      {avgWPM}
                    </span>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mt-3">
                      Average WPM
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="inline-flex items-baseline justify-center">
                      <span className="text-[72px] sm:text-[84px] font-medium text-neutral-800 dark:text-neutral-100 leading-none tracking-tight">
                        {avgAccuracy}
                      </span>
                      <span className="text-[28px] font-normal text-neutral-400 dark:text-neutral-500 ml-1">%</span>
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mt-3">
                      Average Accuracy
                    </p>
                  </div>
                </div>

                {/* Secondary 2x2 Symmetrical Metrics Grid (Perfect Alignment) */}
                <div className="grid grid-cols-2 gap-y-6 py-6 border-y border-neutral-200/45 dark:border-neutral-800/40 my-6 max-w-sm w-full mx-auto relative shrink-0">
                  {/* Vertical Divider exactly down the middle */}
                  <div className="absolute left-1/2 top-4 bottom-4 w-px bg-neutral-200/40 dark:bg-neutral-800/40 -translate-x-1/2" />
                  
                  {/* Row 1, Col 1: Peak Speed */}
                  <div className="text-center pr-6">
                    <span className="text-[22px] font-semibold text-neutral-800 dark:text-neutral-100 font-mono block">
                      {peakWPM}
                    </span>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mt-1">
                      Peak Speed
                    </p>
                  </div>

                  {/* Row 1, Col 2: Words Typed */}
                  <div className="text-center pl-6">
                    <span className="text-[22px] font-semibold text-neutral-800 dark:text-neutral-100 font-mono block">
                      {totalWordsTyped}
                    </span>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mt-1">
                      Words Typed
                    </p>
                  </div>

                  {/* Row 2, Col 1: Trials */}
                  <div className="text-center pr-6">
                    <span className="text-[22px] font-semibold text-neutral-800 dark:text-neutral-100 font-mono block">
                      {sessions.length}
                    </span>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mt-1">
                      Trials Completed
                    </p>
                  </div>

                  {/* Row 2, Col 2: Drafts */}
                  <div className="text-center pl-6">
                    <span className="text-[22px] font-semibold text-neutral-800 dark:text-neutral-100 font-mono block">
                      {files.length}
                    </span>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mt-1">
                      Cloud Drafts
                    </p>
                  </div>
                </div>

                {/* Level / Progress Line Panel */}
                <div 
                  className="max-w-md w-full mt-6 px-1 select-none shrink-0"
                >
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                      <div className="w-7 h-7 relative overflow-visible shrink-0 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                          {!showLevelUpAnim ? (
                            <motion.div
                              key="ladder"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.3 }}
                              className="w-full h-full flex items-center justify-center"
                            >
                              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="overflow-visible text-neutral-700 dark:text-neutral-300">
                                {/* Ladder rails */}
                                <line x1="9" y1="2" x2="9" y2="26" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-neutral-300 dark:text-neutral-700" />
                                <line x1="19" y1="2" x2="19" y2="26" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-neutral-300 dark:text-neutral-700" />
                                
                                {/* Rungs */}
                                {[6, 11, 16, 21].map(y => (
                                  <line key={y} x1="9" y1={y} x2="19" y2={y} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-neutral-300 dark:text-neutral-700" />
                                ))}

                                {/* Boy climbing */}
                                {(() => {
                                  const boyY = 20 - (displayProgress / 100) * 16;
                                  return (
                                    <g style={{ transform: `translateY(${boyY}px)`, transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                                      {/* Head */}
                                      <circle cx="14" cy="2" r="2.2" fill="currentColor" />
                                      {/* Cap */}
                                      <path d="M 11.8 2 A 2.2 2.2 0 0 1 16.2 2 Z" fill={themeAccentColor} />
                                      {/* Torso */}
                                      <rect x="12.5" y="4" width="3" height="5.5" rx="1" fill={themeAccentColor} />
                                      {/* Arms reaching to rails */}
                                      <path d="M 12.5 5 Q 9 3.5 9 5" stroke={themeAccentColor} strokeWidth="1" strokeLinecap="round" fill="none" />
                                      <path d="M 15.5 5 Q 19 3.5 19 5" stroke={themeAccentColor} strokeWidth="1" strokeLinecap="round" fill="none" />
                                      {/* Legs */}
                                      <path d="M 13 9.5 L 11 11.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                                      <path d="M 15 9.5 L 17 11.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                                    </g>
                                  );
                                })()}
                              </svg>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="trophy"
                              initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                              animate={{ opacity: 1, scale: 1.1, rotate: 0 }}
                              exit={{ opacity: 0, scale: 0.6 }}
                              transition={{ type: "spring", stiffness: 200, damping: 12 }}
                              className="w-full h-full flex items-center justify-center"
                            >
                              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="overflow-visible text-neutral-700 dark:text-neutral-300">
                                {/* Small pedestal */}
                                <rect x="7" y="24" width="14" height="2.5" rx="0.5" fill="currentColor" className="text-neutral-300 dark:text-neutral-700" />
                                
                                {/* Boy holding trophy */}
                                <g>
                                  {/* Head */}
                                  <circle cx="14" cy="11" r="2.2" fill="currentColor" />
                                  {/* Cap */}
                                  <path d="M 11.8 11 A 2.2 2.2 0 0 1 16.2 11 Z" fill={themeAccentColor} />
                                  {/* Torso */}
                                  <rect x="12.5" y="13.2" width="3" height="6" rx="1" fill={themeAccentColor} />
                                  {/* Arms raised holding trophy */}
                                  <path d="M 12.5 14.5 Q 9 12 7 8" stroke={themeAccentColor} strokeWidth="1" strokeLinecap="round" fill="none" />
                                  <path d="M 15.5 14.5 Q 19 12 21 8" stroke={themeAccentColor} strokeWidth="1" strokeLinecap="round" fill="none" />
                                  {/* Legs */}
                                  <line x1="13" y1="19.2" x2="12" y2="24" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                                  <line x1="15" y1="19.2" x2="16" y2="24" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />

                                  {/* Trophy */}
                                  <g transform="translate(10.5, 3)">
                                    {/* Cup */}
                                    <path d="M 1 1 H 6 V 3.5 C 6 4.8 4.8 5.5 3.5 5.5 C 2.2 5.5 1 4.8 1 3.5 Z" fill="#FBBF24" />
                                    {/* Base */}
                                    <line x1="3.5" y1="5.5" x2="3.5" y2="7" stroke="#D97706" strokeWidth="0.8" />
                                    <line x1="2" y1="7" x2="5" y2="7" stroke="#D97706" strokeWidth="0.8" />
                                  </g>
                                </g>

                                {/* Animated Sparkles */}
                                <g className="animate-pulse">
                                  <circle cx="6" cy="4" r="1" fill="#FBBF24" className="animate-ping" style={{ animationDuration: '1.2s' }} />
                                  <circle cx="22" cy="5" r="0.8" fill="#FBBF24" />
                                  <circle cx="14" cy="1" r="1.2" fill="#FBBF24" className="animate-ping" style={{ animationDuration: '1.8s' }} />
                                </g>
                              </svg>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      Level {displayLevel} • {displayRankTitle}
                    </span>
                    <span className="text-[10px] font-mono font-medium text-neutral-400 dark:text-neutral-500">
                      {isSimulatingLevelUp && displayProgress < 100 ? "Leveling..." : `${displayLevel === level ? currentLevelXP : 0} / ${XP_PER_LEVEL} XP`}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-full overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${displayProgress}%` }}
                      transition={isSimulatingLevelUp ? { duration: 0.1, ease: "linear" } : { duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: themeAccentColor }}
                    />
                  </div>

                  <AnimatePresence>
                    {showLevelUpAnim && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -5 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -5 }}
                        className="mt-3 overflow-hidden flex items-center justify-center"
                      >
                        <div className="flex items-center gap-2.5 relative">
                          <PartyPopper className="w-4 h-4 text-neutral-500 dark:text-neutral-400 animate-bounce relative z-10" />
                          <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-600 dark:text-neutral-300 relative z-10 drop-shadow-sm">
                            Outstanding progress! You've leveled up.
                          </span>
                          <PartyPopper className="w-4 h-4 text-neutral-500 dark:text-neutral-400 animate-bounce relative z-10" />
                          
                          <Sparkles className="w-3 h-3 text-neutral-400/60 dark:text-neutral-500/60 absolute -top-3 -left-2 animate-pulse" />
                          <Sparkles className="w-2.5 h-2.5 text-neutral-400/60 dark:text-neutral-500/60 absolute top-0.5 -right-3 animate-ping" />
                          <Sparkles className="w-2 h-2 text-neutral-400/60 dark:text-neutral-500/60 absolute -bottom-2 left-6 animate-pulse" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            )}

            {/* 2. PRACTICE LOGS TAB */}
            {activeTab === "sessions" && (
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="mb-4 flex flex-col gap-3 shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-[18px] font-semibold tracking-tight text-neutral-800 dark:text-neutral-100">Session History</h2>
                      <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                        Historic speedrun records and performance timeline.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <SmoothInput
                        type="text"
                        placeholder="Search records..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-3 py-1.5 text-[13px] text-[#202020] dark:text-[#EAEAEA] outline-none transition-all focus:bg-black/[0.08] dark:focus:bg-white/[0.08]"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-neutral-700 z-10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filtering and Sorting controls */}
                  <div className="flex flex-wrap items-center gap-2 py-2 border-t border-b border-neutral-200/20 dark:border-neutral-800/20">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mr-1 select-none">Filters:</span>

                    {/* Filter Type */}
                    <select
                      value={sessionFilter}
                      onChange={(e) => setSessionFilter(e.target.value as any)}
                      className="bg-neutral-100 dark:bg-neutral-900/50 border border-neutral-200/40 dark:border-neutral-800/45 rounded-lg px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 outline-none cursor-pointer hover:bg-neutral-200/40 dark:hover:bg-neutral-800/60 transition-all"
                    >
                      <option value="all">All Modes</option>
                      <option value="Practice">Practice Run</option>
                      <option value="Exam">Exam Run</option>
                    </select>

                    {/* Sort Criteria */}
                    <select
                      value={sessionSort}
                      onChange={(e) => setSessionSort(e.target.value as any)}
                      className="bg-neutral-100 dark:bg-neutral-900/50 border border-neutral-200/40 dark:border-neutral-800/45 rounded-lg px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 outline-none cursor-pointer hover:bg-neutral-200/40 dark:hover:bg-neutral-800/60 transition-all"
                    >
                      <option value="newest">Newest on Top</option>
                      <option value="oldest">Oldest on Top</option>
                      <option value="speed">Highest Speed</option>
                      <option value="accuracy">Highest Accuracy</option>
                    </select>

                    <div className="ml-auto text-[10px] font-mono font-medium text-neutral-400 dark:text-neutral-500">
                      Found {filteredSessions.length} record{filteredSessions.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* Logs Content List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
                  {filteredSessions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
                      <BarChart2 className="w-12 h-12 text-gray-300 dark:text-zinc-700 mb-4" strokeWidth={1.25} />
                      <h3 className="text-gray-800 dark:text-gray-200 font-semibold text-base mb-1 tracking-tight">No logs found</h3>
                      <p className="text-gray-400 dark:text-gray-500 text-[12px] max-w-xs leading-relaxed">
                        {searchQuery ? "Try altering your query to find older speedrun logs." : "Your training and exam statistics will automatically compile and render here."}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col border border-neutral-200/30 dark:border-neutral-800/30 rounded-xl overflow-hidden bg-neutral-50/20 dark:bg-neutral-900/5 divide-y divide-neutral-200/35 dark:divide-neutral-800/35">
                      {/* Column Header */}
                      <div className={`${isWide ? "flex" : "hidden"} items-center px-4 py-2 bg-neutral-100/50 dark:bg-neutral-900/30 text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 select-none`}>
                        <div className="w-[125px] shrink-0">Timestamp</div>
                        <div className="w-[90px] shrink-0">Run Type</div>
                        <div className="flex-1 min-w-0 pr-4">Passage Title / Summary</div>
                        <div className="w-[85px] shrink-0 text-center">Speed</div>
                        <div className="w-[85px] shrink-0 text-center">Accuracy</div>
                        <div className="w-[85px] shrink-0 text-center">Duration</div>
                        <div className="w-[70px] shrink-0 text-right">Actions</div>
                      </div>

                      {/* Log rows */}
                      {filteredSessions.map((session) => (
                        <div
                          key={session.id}
                          className={`flex ${isWide ? "flex-row items-center py-2.5" : "flex-col py-3.5"} px-4 text-[12px] hover:bg-neutral-100/30 dark:hover:bg-neutral-900/25 transition-all group`}
                        >
                          {/* 1. Timestamp */}
                          <div className={`w-[125px] shrink-0 text-[11px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 ${isWide ? "mb-0" : "mb-2"}`}>
                            <Calendar className={`w-3.5 h-3.5 opacity-60 ${isWide ? "hidden" : ""}`} />
                            <span>{new Date(session.date).toLocaleDateString()}</span>
                            <span className="opacity-60">{new Date(session.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>

                          {/* 2. Type */}
                          <div className={`w-[90px] shrink-0 ${isWide ? "mb-0" : "mb-2"}`}>
                            <span className="text-[9px] font-medium tracking-normal px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/40 dark:border-white/5 font-mono">
                              {session.type} Run
                            </span>
                          </div>

                          {/* 3. Title */}
                          <div className={`flex-1 min-w-0 ${isWide ? "pr-4 mb-0" : "mb-2.5"}`}>
                            <h4 className="font-medium text-neutral-700 dark:text-neutral-200 truncate select-all" title={session.passageTitle}>
                              {session.passageTitle || "Raw keystroke trial"}
                            </h4>
                          </div>

                          {/* 4. Speed */}
                          <div className={`w-[85px] shrink-0 text-center flex ${isWide ? "block mb-0 py-0 border-b-0" : "items-center justify-between mb-1 py-1 border-b border-neutral-200/10 dark:border-neutral-800/10"}`}>
                            <span className={`${isWide ? "hidden" : ""} text-[9px] uppercase tracking-wider font-bold text-neutral-400`}>Speed</span>
                            <span className="font-semibold font-mono text-[13px] text-neutral-800 dark:text-neutral-200">
                              {session.speed} <span className="text-[10px] font-normal text-neutral-400 dark:text-neutral-500">WPM</span>
                            </span>
                          </div>

                          {/* 5. Accuracy */}
                          <div className={`w-[85px] shrink-0 text-center flex ${isWide ? "block mb-0 py-0 border-b-0" : "items-center justify-between mb-1 py-1 border-b border-neutral-200/10 dark:border-neutral-800/10"}`}>
                            <span className={`${isWide ? "hidden" : ""} text-[9px] uppercase tracking-wider font-bold text-neutral-400`}>Accuracy</span>
                            <span className="font-semibold font-mono text-[13px] text-neutral-800 dark:text-neutral-200">
                              {session.accuracy}%
                            </span>
                          </div>

                          {/* 6. Duration */}
                          <div className={`w-[85px] shrink-0 text-center flex ${isWide ? "block mb-0 py-0" : "items-center justify-between mb-3.5 py-1"}`}>
                            <span className={`${isWide ? "hidden" : ""} text-[9px] uppercase tracking-wider font-bold text-neutral-400`}>Duration</span>
                            <span className="font-mono text-neutral-500">
                              {Math.floor(session.duration / 60)}m {session.duration % 60}s
                            </span>
                          </div>

                          {/* 7. Actions */}
                          <div className={`w-[70px] shrink-0 text-right flex items-center justify-end gap-1.5 min-h-[24px]`}>
                            {deletingSessionId === session.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    deleteSession(session.id);
                                    setDeletingSessionId(null);
                                  }}
                                  className="px-2 py-0.5 text-[9px] font-bold text-white bg-red-500 hover:bg-red-600 rounded transition-colors cursor-pointer"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => setDeletingSessionId(null)}
                                  className="px-2 py-0.5 text-[9px] font-semibold text-neutral-500 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setReplaySession(session);
                                    setReplayIndex(0);
                                    setIsPlayingReplay(true);
                                  }}
                                  className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                                  title="Watch Replay"
                                >
                                  <PlaySquare className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleShareSession(session)}
                                  className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                                  title="Copy Practice Receipt"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingSessionId(session.id)}
                                  className="p-1 rounded hover:bg-red-500/10 text-neutral-400 hover:text-red-500 cursor-pointer"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer for Practice Logs */}
                <div className="h-14 shrink-0 flex items-center justify-between border-t border-neutral-200/30 dark:border-neutral-800/30 pt-4 mt-auto">
                  <div />
                  {sessions.length > 0 && (
                    <div className="flex items-center gap-2 shrink-0">
                      {isConfirmingClearAll ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              for (const s of sessions) {
                                await deleteSession(s.id);
                              }
                              setIsConfirmingClearAll(false);
                              triggerToast("Cleared all practice logs successfully!");
                            }}
                            className="px-3 py-1.5 text-[11px] font-bold text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors cursor-pointer"
                          >
                            Confirm Clear
                          </button>
                          <button
                            onClick={() => setIsConfirmingClearAll(false)}
                            className="px-3 py-1.5 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 border border-neutral-200/40 dark:border-neutral-800/40 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsConfirmingClearAll(true)}
                          className="px-3 py-1.5 border border-neutral-200/40 dark:border-neutral-800/40 hover:bg-red-50 dark:hover:bg-red-950/20 text-neutral-500 hover:text-red-500 text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          <span>Clear All Logs</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. CLOUD DRAFTS TAB */}
            {activeTab === "files" && (
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="mb-4 flex flex-col gap-3 shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-[18px] font-semibold tracking-tight text-neutral-800 dark:text-neutral-100">Cloud Drafts</h2>
                      <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                        Your secured documents synced directly to cloud storage.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <SmoothInput
                        type="text"
                        placeholder="Search drafts..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-3 py-1.5 text-[13px] text-[#202020] dark:text-[#EAEAEA] outline-none transition-all focus:bg-black/[0.08] dark:focus:bg-white/[0.08]"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-neutral-700 z-10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filtering and Sorting control row */}
                  <div className="flex flex-wrap items-center gap-2 py-2 border-t border-b border-neutral-200/20 dark:border-neutral-800/20">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mr-1 select-none">Filters:</span>

                    {/* Sort Dropdown */}
                    <select
                      value={fileSort}
                      onChange={(e) => setFileSort(e.target.value as any)}
                      className="bg-neutral-100 dark:bg-neutral-900/50 border border-neutral-200/40 dark:border-neutral-800/45 rounded-lg px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 outline-none cursor-pointer hover:bg-neutral-200/40 dark:hover:bg-neutral-800/60 transition-all"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="alpha">Title (A - Z)</option>
                      <option value="alpha-desc">Title (Z - A)</option>
                    </select>

                    <div className="ml-auto text-[10px] font-mono font-medium text-neutral-400 dark:text-neutral-500">
                      Found {filteredFiles.length} draft{filteredFiles.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* Files List Layout */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2.5">
                  {filteredFiles.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
                      <FileText className="w-12 h-12 text-gray-300 dark:text-zinc-700 mb-4" strokeWidth={1.25} />
                      <h3 className="text-gray-800 dark:text-gray-200 font-semibold text-base mb-1 tracking-tight">No cloud documents</h3>
                      <p className="text-gray-400 dark:text-gray-500 text-[12px] max-w-xs leading-relaxed">
                        {searchQuery ? "No matching documents found in drafts." : "Save documents inside the primary workspace writing modes to secure cloud copies."}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col border border-neutral-200/30 dark:border-neutral-800/30 rounded-xl overflow-hidden bg-neutral-50/20 dark:bg-neutral-900/5 divide-y divide-neutral-200/35 dark:divide-neutral-800/35">
                      {/* Column Header */}
                      <div className={`${isWide ? "flex" : "hidden"} items-center px-4 py-2 bg-neutral-100/50 dark:bg-neutral-900/30 text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 select-none`}>
                        <div className="w-[125px] shrink-0">Last Modified</div>
                        <div className="w-[44px] shrink-0 text-center">Type</div>
                        <div className="flex-1 min-w-0 pr-4 pl-4">Draft Title</div>
                        <div className="w-[200px] shrink-0 text-right">Actions</div>
                      </div>

                      {/* File rows */}
                      {filteredFiles.map((file) => (
                        <div
                          key={file.id}
                          className={`flex ${isWide ? "flex-row items-center py-2.5" : "flex-col py-3"} px-4 text-[12px] hover:bg-neutral-100/30 dark:hover:bg-neutral-900/25 transition-all group`}
                        >
                          {/* 1. Date */}
                          <div className={`w-[125px] shrink-0 text-[11px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 ${isWide ? "mb-0" : "mb-1.5"}`}>
                            <Calendar className="w-2.5 h-2.5 opacity-60" />
                            <span>{new Date(file.updatedAt).toLocaleDateString()}</span>
                            <span className="opacity-60">{new Date(file.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>

                          {/* 2. Type indicator icon */}
                          <div className={`w-[44px] shrink-0 ${isWide ? "flex" : "hidden"} items-center justify-center`}>
                            <FileText className="w-3.5 h-3.5 opacity-70" style={{ color: themeAccentColor }} />
                          </div>

                          {/* 3. Title */}
                          <div className={`flex-1 min-w-0 ${isWide ? "pr-4 pl-4 mb-0" : "mb-3.5"}`}>
                            <h4 className="font-medium text-neutral-700 dark:text-neutral-200 truncate select-all" title={file.title}>
                              {file.title}
                            </h4>
                          </div>

                          {/* 4. Actions */}
                          <div className={`${isWide ? "w-[200px]" : "w-full"} shrink-0 text-right flex items-center justify-end gap-1.5 min-h-[24px]`}>
                            {deletingFileId === file.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    deleteFile(file.id);
                                    setDeletingFileId(null);
                                  }}
                                  className="px-2 py-0.5 text-[9px] font-bold text-white bg-red-500 hover:bg-red-600 rounded transition-colors cursor-pointer"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => setDeletingFileId(null)}
                                  className="px-2 py-0.5 text-[9px] font-semibold text-neutral-500 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5 w-full">
                                <button
                                  onClick={() => {
                                    onLoadFileToEditor(file);
                                    onClose();
                                  }}
                                  className="px-2.5 py-1 rounded-md text-white font-semibold text-[10px] tracking-wider uppercase flex items-center gap-1 transition-all cursor-pointer hover:brightness-105 active:scale-95"
                                  style={{ backgroundColor: themeAccentColor }}
                                >
                                  Open <ChevronRight className="w-3 h-3" />
                                </button>

                                <button
                                  onClick={() => handleShareFile(file)}
                                  className="p-1 rounded border border-neutral-200/40 dark:border-neutral-800/40 hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                                  title="Copy Share details"
                                >
                                  <Share2 className="w-3 h-3" />
                                </button>

                                <button
                                  onClick={() => setDeletingFileId(file.id)}
                                  className="p-1 rounded border border-neutral-200/40 dark:border-neutral-800/40 hover:bg-red-500/10 text-neutral-400 hover:text-red-500 cursor-pointer"
                                  title="Delete Draft"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer matching Scanner/Library Footer layout */}
                <div className="h-14 shrink-0 flex items-center justify-between border-t border-neutral-200/30 dark:border-neutral-800/30 pt-4 mt-auto">
                  <div />
                  {files.length > 0 && (
                    <button
                      onClick={async () => {
                        triggerToast("Compressing and packaging documents...");
                        const docs = files.map(f => ({
                          id: f.id,
                          title: f.title,
                          content: f.content,
                          owner_id: user?.uid || "local",
                          tags: [],
                          createdAt: new Date(f.updatedAt)
                        }));
                        await ExportEngine.exportToZip(docs, `Workspace_Backup_${Date.now()}.zip`);
                        triggerToast("ZIP Archive generated!");
                      }}
                      className="px-3 py-1.5 border border-neutral-200/40 dark:border-neutral-800/40 hover:bg-black/5 dark:hover:bg-white/10 text-[#202020] dark:text-[#EAEAEA] text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" style={{ color: themeAccentColor }} />
                      <span>Export Backup ZIP</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 4. ACHIEVEMENTS TAB */}
            {activeTab === "achievements" && (
              <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                <div className="mb-6">
                  <h2 className="text-[18px] font-semibold tracking-tight text-neutral-800 dark:text-neutral-100">Milestones & Achievements</h2>
                  <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mt-1">
                    Your professional writing speedrun achievements and rewards.
                  </p>
                </div>

                {/* Achievements List */}
                <div className="space-y-3">
                  {badges.map((b) => {
                    const BadgeIcon = b.icon;
                    return (
                      <div
                        key={b.id}
                        className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all duration-300 ${
                          b.unlocked
                            ? "bg-neutral-50/50 dark:bg-neutral-900/10 border-neutral-200/30 dark:border-neutral-800/30 opacity-100"
                            : "bg-neutral-50/20 dark:bg-neutral-900/5 border-transparent opacity-40"
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                            b.unlocked
                              ? "bg-neutral-100/50 dark:bg-[#20202A]/50 text-neutral-800 dark:text-neutral-100 border-neutral-200/40 dark:border-neutral-800/40"
                              : "bg-neutral-100/20 dark:bg-neutral-900/20 text-neutral-400 border-transparent"
                          }`}>
                            <BadgeIcon className="w-4 h-4" style={{ color: b.unlocked ? themeAccentColor : undefined }} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-[13px] font-medium text-neutral-800 dark:text-neutral-100 tracking-tight">
                              {b.title}
                            </h3>
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                              {b.desc}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {b.unlocked ? (
                            <div className="shrink-0 flex items-center justify-center pr-1" title="Milestone Completed">
                              <svg
                                className="w-5 h-5 text-emerald-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <motion.path
                                  d="M5 13l4 4L19 7"
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
                                />
                              </svg>
                            </div>
                          ) : (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                              {b.rule}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

          </div>

        </div>

        {/* Floating Replay Overlay */}
        <AnimatePresence>
          {replaySession && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, pointerEvents: "none" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-0 z-[200] bg-white/95 dark:bg-[#1A1A22]/95 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto"
            >
              <button
                onClick={() => setReplaySession(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Live WPM / Accuracy stats during replay */}
              <div className="flex items-center gap-4 mb-3">
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
                style={{ fontFamily: "var(--font-mono, ui-monospace), 'JetBrains Mono', monospace", fontVariantLigatures: "none" }}
                className="relative w-full max-w-4xl max-h-[65vh] overflow-y-auto no-scrollbar text-[24px] xl:text-[32px] md:text-[36px] leading-relaxed break-words whitespace-pre-wrap px-8 py-12 text-neutral-800 dark:text-neutral-200"
              >
                {replayWordSegments.segments.map((seg, segIdx) => {
                  if (seg.type === "word") {
                    return (
                      <span key={segIdx} className="inline-block whitespace-nowrap">
                        {seg.indices.map((i) => {
                          const char = replayWordSegments.chars[i];
                          const isTyped = i < replayedText.length;
                          // In Exam mode, we compare current state 'replayedText' with final state 'passage'
                          const isError = isTyped && replayedText[i] !== char;
                          const isCursor = i === replayedCursor;

                          return (
                            <span key={i} ref={isCursor ? activeReplayCharRef : null} className="relative inline-block">
                              <span className={isTyped ? "opacity-0" : "text-neutral-300 dark:text-neutral-700 opacity-60"}>
                                {char}
                              </span>
                              {isTyped && (
                                <span className={`absolute top-0 left-0 ${isError ? "text-red-500" : "text-neutral-900 dark:text-neutral-100"}`}>
                                  {replayedText[i]}
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
                      const char = replayWordSegments.chars[i];
                      const isTyped = i < replayedText.length;
                      const isError = isTyped && replayedText[i] !== char;
                      const isCursor = i === replayedCursor;

                      return (
                        <span key={i} ref={isCursor ? activeReplayCharRef : null} className="relative inline-block">
                          <span className={isTyped ? "opacity-0" : "text-neutral-400 dark:text-neutral-600 opacity-40"}>
                            {char}
                          </span>
                          {isTyped && (
                            <span className={`absolute top-0 left-0 ${isError ? "text-red-500" : "text-neutral-800 dark:text-neutral-200"}`}>
                              {replayedText[i]}
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
                {/* Render extra characters if user typed beyond final content length (e.g. temporary additions that were deleted) */}
                {replayedText.length > replayWordSegments.chars.length && (
                  <span className="text-red-500">
                    {replayedText.substring(replayWordSegments.chars.length).split("").map((char, i) => {
                       const absoluteIdx = replayWordSegments.chars.length + i;
                       const isCursor = absoluteIdx === replayedCursor;
                       return (
                         <span key={absoluteIdx} ref={isCursor ? activeReplayCharRef : null} className="relative inline-block">
                           {char === "\n" ? "↵\n" : char}
                           {isCursor && (
                             <span className="absolute top-0 left-0 w-[2.5px] h-[1.1em] bg-blue-500 animate-pulse translate-y-[0.1em]" />
                           )}
                         </span>
                       );
                    })}
                  </span>
                )}
                
                {replayedCursor >= replayedText.length && replayedCursor >= replayWordSegments.chars.length && (
                  <span ref={activeReplayCharRef} className="inline-block w-[2px] h-[1.2em] bg-blue-500 animate-pulse ml-[2px] translate-y-[0.1em]" />
                )}
              </div>

              {/* Timeline controller */}
              <div className="absolute bottom-8 w-full max-w-xl flex items-center gap-3 px-1">
                 <button
                   onClick={() => {
                      const totalSteps = dashboardReplayLog.length > 0 ? dashboardReplayLog.length : (replaySession?.content || "").length;
                      if (replayIndex >= totalSteps - 1) {
                         setReplayIndex(0);
                      }
                      setIsPlayingReplay(!isPlayingReplay);
                   }}
                   className="w-8 h-8 flex shrink-0 items-center justify-center bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-full transition-colors cursor-pointer"
                 >
                    {isPlayingReplay ? <Pause size={14} fill="currentColor" /> : <PlaySquare size={14} fill="currentColor" />}
                 </button>

                 {/* Current time */}
                 <span className="text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500 shrink-0 w-9 text-right">
                   {(() => {
                     if (!dashboardReplayEvents || dashboardReplayEvents.length === 0) return "00:00";
                     const firstT = dashboardReplayEvents[0].t;
                     const currentT = dashboardReplayEvents[Math.min(replayIndex, dashboardReplayEvents.length - 1)].t;
                     const diff = Math.max(0, currentT - firstT);
                     const m = Math.floor(diff / 60000);
                     const s = Math.floor((diff % 60000) / 1000);
                     return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
                   })()}
                 </span>

                 <div className="flex-1 group relative flex items-center h-4 cursor-pointer" onMouseDown={(mouseDownEvent) => {
                    setIsPlayingReplay(false);
                    const rect = mouseDownEvent.currentTarget.getBoundingClientRect();
                    const totalSteps = dashboardReplayLog.length > 0 ? dashboardReplayLog.length : (replaySession?.content || "").length;
                    const handleMove = (moveEvent: MouseEvent) => {
                      const percent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
                      setReplayIndex(Math.floor(percent * (totalSteps - 1)));
                    };
                    const handleUp = () => {
                      window.removeEventListener("mousemove", handleMove);
                      window.removeEventListener("mouseup", handleUp);
                    };
                    window.addEventListener("mousemove", handleMove);
                    window.addEventListener("mouseup", handleUp);
                    const initialPercent = Math.max(0, Math.min(1, (mouseDownEvent.clientX - rect.left) / rect.width));
                    setReplayIndex(Math.floor(initialPercent * (totalSteps - 1)));
                 }}>
                   <div className="relative w-full flex items-center">
                     <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full transition-all group-hover:h-1.5" />
                     {(() => {
                        const totalSteps = dashboardReplayLog.length > 0 ? dashboardReplayLog.length : (replaySession?.content || "").length;
                        const maxIdx = Math.max(1, totalSteps - 1);
                        const progress = (replayIndex / maxIdx) * 100;
                        return (
                          <>
                            <div
                              className="absolute left-0 h-1 bg-neutral-900 dark:bg-white rounded-full pointer-events-none transition-all group-hover:h-1.5"
                              style={{ width: `${progress}%` }}
                            />
                            
                            {/* Mistake markers */}
                            {dashboardErrorIndices.map(errIdx => {
                               const errorPercent = (errIdx / maxIdx) * 100;
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
                                   title={`Correction/Mistake - click to jump`}
                                 />
                               );
                            })}

                            <div
                              className="absolute w-3 h-3 bg-neutral-900 dark:bg-white rounded-full shadow-md transform -translate-x-1/2 transition-transform group-hover:scale-125 pointer-events-none z-10"
                              style={{ left: `${progress}%` }}
                            />
                          </>
                        );
                     })()}
                   </div>
                 </div>

                 {/* Total time */}
                 <span className="text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500 shrink-0 w-9">
                   {(() => {
                     if (!dashboardReplayEvents || dashboardReplayEvents.length === 0) return "00:00";
                     const firstT = dashboardReplayEvents[0].t;
                     const lastT = dashboardReplayEvents[dashboardReplayEvents.length - 1].t;
                     const diff = Math.max(0, lastT - firstT);
                     const m = Math.floor(diff / 60000);
                     const s = Math.floor((diff % 60000) / 1000);
                     return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
                   })()}
                 </span>

                 <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-1 shrink-0">
                    {[0.5, 1, 1.5, 2].map(speed => (
                       <button
                          key={speed}
                          onClick={() => setReplaySpeed(speed)}
                          className={`w-8 h-8 flex items-center justify-center rounded-full text-[11px] font-bold transition-all cursor-pointer ${replaySpeed === speed ? 'bg-white dark:bg-[#2c2c2c] shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                       >
                          {speed}x
                       </button>
                    ))}
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
