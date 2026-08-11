import React, { createContext, useContext, useState, useEffect } from "react";

// ─── Crypto Utilities ─────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256 hashes are exactly 64 lowercase hex chars */
function isHashed(stored: string): boolean {
  return /^[0-9a-f]{64}$/.test(stored);
}

/**
 * Verifies a password against a stored value that may be legacy plaintext
 * or a SHA-256 hex digest. Never accepts the raw hash as a password.
 */
async function verifyPassword(input: string, stored: string): Promise<boolean> {
  if (isHashed(stored)) {
    // Stored is already hashed — only accept the correct plaintext
    const hashed = await hashPassword(input);
    return hashed === stored;
  }
  // Legacy plaintext — accept direct match (and caller will migrate)
  return input === stored;
}

/** Stable deterministic color for an account's avatar */
export function getAvatarColor(uid: string): string {
  const palette = [
    "#4F46E5", "#7C3AED", "#DB2777", "#DC2626",
    "#D97706", "#059669", "#0891B2", "#1D4ED8",
  ];
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = uid.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

/** Returns or creates a persistent guest uid for this device */
function getOrCreateGuestUid(): string {
  let uid = localStorage.getItem("typing_suite_guest_uid");
  if (!uid) {
    uid = "guest_" + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("typing_suite_guest_uid", uid);
  }
  return uid;
}

function readLinkedUids(): string[] {
  return JSON.parse(localStorage.getItem("typing_suite_linked_accounts") || "[]");
}

function writeLinkedUids(uids: string[]) {
  localStorage.setItem("typing_suite_linked_accounts", JSON.stringify(uids));
}

function buildLinkedAccounts(uids: string[]): LinkedAccountInfo[] {
  const localUsers: any[] = JSON.parse(localStorage.getItem("typing_suite_users") || "[]");
  return uids
    .map((uid) => {
      const u = localUsers.find((lu) => lu.uid === uid);
      return u
        ? ({
            uid: u.uid,
            displayName: u.displayName,
            email: u.email,
            photoURL: u.photoURL,
            requiresPassword: Boolean(u.password), // empty for OAuth accounts
          } as LinkedAccountInfo)
        : null;
    })
    .filter(Boolean) as LinkedAccountInfo[];
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  mobile: string;
  createdAt: string;
  photoURL?: string;
}

export interface LinkedAccountInfo {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  /** false for OAuth accounts (Google, etc.) that have no local password */
  requiresPassword: boolean;
}

export interface TypingSession {
  id: string;
  owner_id: string;
  date: string;
  speed: number;
  accuracy: number;
  type: "Practice" | "Exam";
  duration: number;
  passageTitle: string;
  content: string;
  replayEvents?: string;
}

export interface CloudFile {
  id: string;
  owner_id: string;
  title: string;
  content: string;
  updatedAt: string;
}

interface AuthContextType {
  user: UserProfile | null;
  sessions: TypingSession[];
  files: CloudFile[];
  isLoading: boolean;
  error: string | null;
  guestUid: string;
  linkedAccounts: LinkedAccountInfo[];
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, mobile: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  switchToAccount: (uid: string, password?: string) => Promise<void>;
  removeLinkedAccount: (uid: string) => void;
  addSession: (
    speed: number,
    accuracy: number,
    type: "Practice" | "Exam",
    duration: number,
    passageTitle: string,
    content: string,
    replayEvents?: string
  ) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  saveFile: (title: string, content: string, fileId?: string) => Promise<string>;
  deleteFile: (fileId: string) => Promise<void>;
  clearError: () => void;
  updateProfile: (displayName: string, email: string, mobile: string) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<TypingSession[]>([]);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccountInfo[]>([]);
  const [guestUid] = useState<string>(() => getOrCreateGuestUid());

  const clearError = () => setError(null);

  const refreshLinkedAccounts = () => {
    setLinkedAccounts(buildLinkedAccounts(readLinkedUids()));
  };

  // ── Boot: restore session ──────────────────────────────────────────────────
  useEffect(() => {
    const sessionUid = localStorage.getItem("typing_suite_current_uid");
    if (sessionUid) {
      const localUsers: any[] = JSON.parse(localStorage.getItem("typing_suite_users") || "[]");
      const found = localUsers.find((u) => u.uid === sessionUid);
      if (found) {
        setUser({
          uid: found.uid,
          email: found.email,
          displayName: found.displayName,
          mobile: found.mobile,
          createdAt: found.createdAt,
          photoURL: found.photoURL,
        });
      } else {
        localStorage.removeItem("typing_suite_current_uid");
      }
    }
    refreshLinkedAccounts();
    setIsLoading(false);
  }, []);

  // ── Load sessions & files when user changes ────────────────────────────────
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setFiles([]);
      return;
    }

    const localSessions: TypingSession[] = JSON.parse(localStorage.getItem("typing_suite_sessions") || "[]");
    const userSessions = localSessions
      .filter((s) => s.owner_id === user.uid)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setSessions(userSessions);

    const localFiles: CloudFile[] = JSON.parse(localStorage.getItem("typing_suite_files") || "[]");
    const userFiles = localFiles
      .filter((f) => f.owner_id === user.uid)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setFiles(userFiles);
  }, [user]);

  // ── Guest-data migration helper ────────────────────────────────────────────
  const handleDataSync = (newUid: string) => {
    const sourceUid = localStorage.getItem("typing_suite_sync_source_uid");
    if (!sourceUid || sourceUid === newUid) {
      localStorage.removeItem("typing_suite_sync_source_uid");
      return;
    }
    // Guard: this migration path is only ever meant to fold a device-local
    // guest identity into a newly created/authenticated account. A real
    // (non-guest) uid must NEVER be deleted here, or "Sync to Cloud" followed
    // by any sign-in silently wipes out another linked account.
    const isGuestSource = sourceUid.startsWith("guest_");
    if (!isGuestSource) {
      console.warn(
        `[handleDataSync] Refusing to delete non-guest source uid "${sourceUid}" during migration to "${newUid}".`
      );
      localStorage.removeItem("typing_suite_sync_source_uid");
      return;
    }
    try {
      const localSessions: any[] = JSON.parse(localStorage.getItem("typing_suite_sessions") || "[]");
      localStorage.setItem(
        "typing_suite_sessions",
        JSON.stringify(localSessions.map((s) => (s.owner_id === sourceUid ? { ...s, owner_id: newUid } : s)))
      );
      const localFiles: any[] = JSON.parse(localStorage.getItem("typing_suite_files") || "[]");
      localStorage.setItem(
        "typing_suite_files",
        JSON.stringify(localFiles.map((f) => (f.owner_id === sourceUid ? { ...f, owner_id: newUid } : f)))
      );
      const localUsers: any[] = JSON.parse(localStorage.getItem("typing_suite_users") || "[]");
      localStorage.setItem(
        "typing_suite_users",
        JSON.stringify(localUsers.filter((u) => u.uid !== sourceUid))
      );
    } catch (e) {
      console.error("Error migrating guest data:", e);
    } finally {
      localStorage.removeItem("typing_suite_sync_source_uid");
    }
  };

  // ── Auth actions ───────────────────────────────────────────────────────────

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const localUsers: any[] = JSON.parse(localStorage.getItem("typing_suite_users") || "[]");
      const found = localUsers.find((u) => u.email === email);
      if (!found) throw new Error("Invalid email or password.");

      const valid = await verifyPassword(password, found.password);
      if (!valid) throw new Error("Invalid email or password.");

      // Migrate legacy plaintext → hashed if needed
      if (!isHashed(found.password)) {
        const hashed = await hashPassword(password);
        localStorage.setItem(
          "typing_suite_users",
          JSON.stringify(localUsers.map((u) => (u.uid === found.uid ? { ...u, password: hashed } : u)))
        );
      }

      const profile: UserProfile = {
        uid: found.uid, email: found.email, displayName: found.displayName,
        mobile: found.mobile, createdAt: found.createdAt, photoURL: found.photoURL,
      };
      localStorage.setItem("typing_suite_current_uid", profile.uid);

      // Add to linked accounts (front of list)
      const linked = readLinkedUids().filter((u) => u !== profile.uid);
      writeLinkedUids([profile.uid, ...linked]);

      handleDataSync(profile.uid);
      setUser(profile);
      refreshLinkedAccounts();
    } catch (err: any) {
      setError(err?.message || "Failed to sign in.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName: string, mobile: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const localUsers: any[] = JSON.parse(localStorage.getItem("typing_suite_users") || "[]");
      if (localUsers.some((u) => u.email === email)) throw new Error("Email already registered.");

      const hashedPwd = await hashPassword(password);
      const uid = "uid_" + Math.random().toString(36).substring(2, 15);
      const profile: UserProfile = { uid, email, displayName, mobile, createdAt: new Date().toISOString() };

      localUsers.push({ ...profile, password: hashedPwd });
      localStorage.setItem("typing_suite_users", JSON.stringify(localUsers));
      localStorage.setItem("typing_suite_current_uid", uid);

      // Add to linked accounts
      const linked = readLinkedUids().filter((u) => u !== uid);
      writeLinkedUids([uid, ...linked]);

      handleDataSync(uid);
      setUser(profile);
      refreshLinkedAccounts();
    } catch (err: any) {
      setError(err?.message || "Failed to sign up.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Google sign-in stub.
   * When real Firebase is wired: replace body with Firebase signInWithPopup,
   * set profile.photoURL = firebaseUser.photoURL, and the rest of this code
   * (linked-accounts + data-sync) stays unchanged.
   */
  const signInWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const uid = "google_" + Math.random().toString(36).substring(2, 15);
      const profile: UserProfile = {
        uid,
        email: "google.user@example.com",
        displayName: "Google User",
        mobile: "",
        createdAt: new Date().toISOString(),
        // photoURL: firebaseUser.photoURL  ← wire here when Firebase is added
      };
      localStorage.setItem("typing_suite_current_uid", uid);

      const localUsers: any[] = JSON.parse(localStorage.getItem("typing_suite_users") || "[]");
      if (!localUsers.some((u) => u.uid === uid)) {
        localUsers.push({ ...profile, password: "" });
        localStorage.setItem("typing_suite_users", JSON.stringify(localUsers));
      }

      const linked = readLinkedUids().filter((u) => u !== uid);
      writeLinkedUids([uid, ...linked]);

      handleDataSync(uid);
      setUser(profile);
      refreshLinkedAccounts();
    } catch (err: any) {
      setError(err?.message || "Failed to sign in with Google.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    setError(null);
    try {
      localStorage.removeItem("typing_suite_current_uid");
      setUser(null);
      setSessions([]);
      setFiles([]);
      refreshLinkedAccounts();
    } catch (err: any) {
      setError(err?.message || "Failed to sign out.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /** Switch to any linked account by uid. Guest uid and OAuth accounts require no password. */
  const switchToAccount = async (uid: string, password?: string) => {
    // Switch to guest
    if (uid === guestUid) {
      localStorage.removeItem("typing_suite_current_uid");
      setUser(null);
      setSessions([]);
      setFiles([]);
      return;
    }

    const localUsers: any[] = JSON.parse(localStorage.getItem("typing_suite_users") || "[]");
    const found = localUsers.find((u) => u.uid === uid);
    if (!found) throw new Error("Account not found.");

    // OAuth accounts (Google, etc.) have no local password — switch directly
    if (!found.password) {
      localStorage.setItem("typing_suite_current_uid", uid);
      const linked = readLinkedUids().filter((u) => u !== uid);
      writeLinkedUids([uid, ...linked]);
      const profile: UserProfile = {
        uid: found.uid, email: found.email, displayName: found.displayName,
        mobile: found.mobile, createdAt: found.createdAt, photoURL: found.photoURL,
      };
      setUser(profile);
      refreshLinkedAccounts();
      return;
    }

    if (!password) throw new Error("Password is required.");

    const valid = await verifyPassword(password, found.password);
    if (!valid) throw new Error("Incorrect password.");

    // Migrate legacy plaintext → hashed on successful switch
    if (!isHashed(found.password)) {
      const hashed = await hashPassword(password);
      localStorage.setItem(
        "typing_suite_users",
        JSON.stringify(localUsers.map((u) => (u.uid === uid ? { ...u, password: hashed } : u)))
      );
    }

    localStorage.setItem("typing_suite_current_uid", uid);

    // Bubble this account to the front of linked list
    const linked = readLinkedUids().filter((u) => u !== uid);
    writeLinkedUids([uid, ...linked]);

    const profile: UserProfile = {
      uid: found.uid, email: found.email, displayName: found.displayName,
      mobile: found.mobile, createdAt: found.createdAt, photoURL: found.photoURL,
    };
    setUser(profile);
    refreshLinkedAccounts();
  };

  /** Remove an account from this device's switcher list (data is NOT deleted). */
  const removeLinkedAccount = (uid: string) => {
    const filtered = readLinkedUids().filter((u) => u !== uid);
    writeLinkedUids(filtered);
    // If removing the current user, sign them out
    if (user?.uid === uid) {
      localStorage.removeItem("typing_suite_current_uid");
      setUser(null);
      setSessions([]);
      setFiles([]);
    }
    refreshLinkedAccounts();
  };

  // ── Data actions ───────────────────────────────────────────────────────────

  const addSession = async (
    speed: number, accuracy: number, type: "Practice" | "Exam",
    duration: number, passageTitle: string, content: string, replayEvents?: string
  ) => {
    if (!user) return;
    const id = "session_" + Math.random().toString(36).substring(2, 11);
    const sessionObj: TypingSession = {
      id, owner_id: user.uid, date: new Date().toISOString(),
      speed, accuracy, type, duration, passageTitle, content, replayEvents,
    };
    const localSessions: TypingSession[] = JSON.parse(localStorage.getItem("typing_suite_sessions") || "[]");
    localSessions.push(sessionObj);
    localStorage.setItem("typing_suite_sessions", JSON.stringify(localSessions));
    setSessions((prev) => [sessionObj, ...prev]);
  };

  const deleteSession = async (sessionId: string) => {
    if (!user) return;
    const localSessions: TypingSession[] = JSON.parse(localStorage.getItem("typing_suite_sessions") || "[]");
    localStorage.setItem("typing_suite_sessions", JSON.stringify(localSessions.filter((s) => s.id !== sessionId)));
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const saveFile = async (title: string, content: string, fileId?: string): Promise<string> => {
    if (!user) throw new Error("Authentication required to save file.");
    const id = fileId || "file_" + Math.random().toString(36).substring(2, 11);
    const fileObj: CloudFile = { id, owner_id: user.uid, title, content, updatedAt: new Date().toISOString() };
    const localFiles: CloudFile[] = JSON.parse(localStorage.getItem("typing_suite_files") || "[]");
    const idx = localFiles.findIndex((f) => f.id === id);
    if (idx >= 0) localFiles[idx] = fileObj; else localFiles.push(fileObj);
    localStorage.setItem("typing_suite_files", JSON.stringify(localFiles));
    setFiles((prev) => [fileObj, ...prev.filter((f) => f.id !== id)]);
    return id;
  };

  const deleteFile = async (fileId: string) => {
    if (!user) return;
    const localFiles: CloudFile[] = JSON.parse(localStorage.getItem("typing_suite_files") || "[]");
    localStorage.setItem("typing_suite_files", JSON.stringify(localFiles.filter((f) => f.id !== fileId)));
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const updateProfile = async (displayName: string, email: string, mobile: string) => {
    if (!user) return;
    const updatedUser = { ...user, displayName, email, mobile };
    setUser(updatedUser);
    const localUsers: any[] = JSON.parse(localStorage.getItem("typing_suite_users") || "[]");
    localStorage.setItem(
      "typing_suite_users",
      JSON.stringify(localUsers.map((u) => (u.uid === user.uid ? { ...u, displayName, email, mobile } : u)))
    );
    refreshLinkedAccounts();
  };

  return (
    <AuthContext.Provider
      value={{
        user, sessions, files, isLoading, error,
        guestUid, linkedAccounts,
        signIn, signUp, signInWithGoogle, signOut,
        switchToAccount, removeLinkedAccount,
        addSession, deleteSession, saveFile, deleteFile,
        clearError, updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
