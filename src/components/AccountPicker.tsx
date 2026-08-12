import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Minus, Plus, Lock, LayoutGrid, User } from "lucide-react";
import { LinkedAccountInfo, getAvatarColor } from "../contexts/AuthContext";

interface AccountPickerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Toolbar coords to anchor the picker to (flush with the toolbar's bottom-right corner). */
  anchorCoords?: { top: number; left: number; right: number } | null;
  linkedAccounts: LinkedAccountInfo[];
  /** uid of the currently active account; null when on guest */
  currentUid: string | null;
  /** the device-local guest uid, used to switch back to guest */
  guestUid: string;
  /** true only when a real (non-guest) account is active */
  isLoggedIn: boolean;
  onBeforeSwitch: (proceed: () => void) => void;
  onSwitch: (uid: string, password?: string) => Promise<void>;
  onRemove: (uid: string) => void;
  onAddAccount: () => void;
  onOpenDashboard: () => void;
}

export function AccountPicker({
  isOpen,
  onClose,
  anchorCoords,
  linkedAccounts,
  currentUid,
  guestUid,
  isLoggedIn,
  onBeforeSwitch,
  onSwitch,
  onRemove,
  onAddAccount,
  onOpenDashboard,
}: AccountPickerProps) {
  const [targetUid, setTargetUid] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  const reset = () => {
    setTargetUid(null);
    setPassword("");
    setError(null);
    setIsSwitching(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const doSwitch = (uid: string, pwd?: string) => {
    onBeforeSwitch(async () => {
      setIsSwitching(true);
      try {
        await onSwitch(uid, pwd);
        handleClose();
      } catch (err: any) {
        setError(err.message || "Incorrect password.");
      } finally {
        setIsSwitching(false);
      }
    });
  };

  // Only show accounts that are NOT the currently active one
  const others = linkedAccounts.filter((a) => a.uid !== currentUid);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Transparent click-away catcher — no dark overlay */}
          <div className="fixed inset-0 z-[399]" onClick={handleClose} />

          {/* Anchored to the toolbar's bottom-right corner, styled like the native File/Edit menus */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
            style={{
              position: "fixed",
              top: anchorCoords ? `${anchorCoords.top}px` : "56px",
              right: anchorCoords ? `${window.innerWidth - anchorCoords.right}px` : "16px",
            }}
            className="w-64 rigorous-menu bg-white dark:bg-[#1A1A1A] shadow-md border border-neutral-300 dark:border-neutral-800 border-t-0 rounded-none z-[400] flex flex-col py-0.5 overflow-visible select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1.5">
              {/* Linked accounts (excluding current) */}
              {others.map((acct) => {
                const isTarget = targetUid === acct.uid;
                const initials = (acct.displayName || "?")
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                const color = getAvatarColor(acct.uid);

                return (
                  <div key={acct.uid}>
                    {/* Account row */}
                    <div
                      className="group relative flex items-center gap-3 px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() => {
                        if (acct.requiresPassword) {
                          setTargetUid(isTarget ? null : acct.uid);
                          setPassword("");
                          setError(null);
                        } else {
                          doSwitch(acct.uid);
                        }
                      }}
                    >
                      {/* Avatar */}
                      {acct.photoURL ? (
                        <img
                          src={acct.photoURL}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                          alt={acct.displayName}
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {initials}
                        </div>
                      )}

                      {/* Name + email */}
                      <div className="flex-1 min-w-0 pr-5">
                        <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-100 leading-tight truncate">
                          {acct.displayName || acct.email}
                        </p>
                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-tight truncate">
                          {acct.email}
                        </p>
                      </div>

                      {/* Remove — appears on hover, no chrome at all */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(acct.uid);
                          if (targetUid === acct.uid) reset();
                        }}
                        className="absolute right-3.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto text-red-500 transition-opacity cursor-pointer p-0.5"
                        title="Remove account"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Inline password prompt */}
                    {isTarget && acct.requiresPassword && (
                      <div className="px-4 pb-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            Password for{" "}
                            <strong className="text-neutral-700 dark:text-neutral-300">
                              {acct.displayName}
                            </strong>
                          </p>
                        </div>
                        <input
                          type="password"
                          autoFocus
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && password)
                              doSwitch(acct.uid, password);
                            if (e.key === "Escape") reset();
                          }}
                          placeholder="Password"
                          className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-[12px] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors"
                        />
                        {error && (
                          <p className="text-[11px] text-red-500 mt-1">{error}</p>
                        )}
                        <button
                          disabled={!password || isSwitching}
                          onClick={() => doSwitch(acct.uid, password)}
                          className="mt-2 w-full py-1.5 rounded-lg text-[12px] font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          {isSwitching ? "Switching…" : "Switch →"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Guest row — only when a real account is active */}
              {isLoggedIn && (
                <div
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => doSwitch(guestUid)}
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-100 leading-tight">
                      Guest
                    </p>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-tight">
                      Local device only
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-black/[0.06] dark:bg-white/[0.06]" />

            {/* Bottom actions */}
            <div className="py-1.5">
              {/* Dashboard — only when real account is active */}
              {isLoggedIn && (
                <button
                  onClick={() => {
                    handleClose();
                    onOpenDashboard();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-1.5 text-[14px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer text-left"
                >
                  <LayoutGrid className="w-4 h-4 shrink-0" />
                  Dashboard
                </button>
              )}

              {/* Add Account */}
              <button
                onClick={() => {
                  handleClose();
                  onAddAccount();
                }}
                className="w-full flex items-center gap-3 px-4 py-1.5 text-[14px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer text-left"
              >
                <Plus className="w-4 h-4 shrink-0" />
                Add Account
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
