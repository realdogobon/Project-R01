import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { History, Play, X } from "lucide-react";

interface SessionRecoveryOverlayProps {
  remaining: number;
  accentColor?: string;
  title?: string;
  message?: string;
  onResume?: () => void;
  onCancel?: () => void;
}

const APPLE_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Helvetica, Arial, sans-serif";

export function SessionRecoveryOverlay({
  remaining,
  accentColor = "#8e8e93",
  title = "Welcome back.",
  message = "Picking up right where you left off.",
  onResume,
  onCancel,
}: SessionRecoveryOverlayProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.35, ease: "easeOut" } }}
        exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } }}
        className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-black/60 backdrop-blur-2xl z-[99] px-6 text-center select-none"
        style={{ fontFamily: APPLE_FONT }}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 6 }}
          animate={{ scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 26 } }}
          className="flex flex-col items-center gap-3 max-w-sm"
        >
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          >
            <History className="w-7 h-7 text-neutral-400 dark:text-neutral-500" strokeWidth={1.75} />
          </motion.div>

          <h2 className="text-[19px] font-semibold text-neutral-900 dark:text-neutral-50 tracking-tight leading-snug">
            {title}
          </h2>
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400 leading-relaxed -mt-1">
            {message}
          </p>

          <motion.div
            key={remaining}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 320, damping: 22 } }}
            className="mt-1 text-3xl font-light tabular-nums text-neutral-400 dark:text-neutral-500 select-none"
          >
            {remaining > 0 ? remaining : "···"}
          </motion.div>

          <div className="flex items-center gap-2.5 mt-3">
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
              Start fresh
            </button>
            <button
              onClick={onResume}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-white dark:text-neutral-900 bg-neutral-900 dark:bg-white hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              <Play className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />
              Resume now
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
