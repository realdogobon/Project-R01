import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { X, Mail, Lock, User, Phone, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SmoothInput } from "../ui/SmoothInputs";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called synchronously right before signIn/signUp executes, so callers can snapshot state */
  onBeforeSubmit?: () => void;
}

export function AuthModal({ isOpen, onClose, onBeforeSubmit }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle, error, clearError } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mobile, setMobile] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();


    if (!email || !password) {
      setFormError("Please fill in all mandatory fields.");
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    if (isRegister) {
      if (!displayName) {
        setFormError("Full Name is required.");
        return;
      }
      if (!mobile) {
        setFormError("Mobile Number is required for contact updates.");
        return;
      }

      const cleanPhone = mobile.replace(/[^0-9+]/g, "");
      if (cleanPhone.length < 7) {
        setFormError("Please enter a valid mobile phone number.");
        return;
      }
    }

    setLoading(true);
    try {
      // Snapshot current state (e.g. guest editor content) before auth changes uid
      onBeforeSubmit?.();
      if (isRegister) {
        await signUp(email, password, displayName, mobile);
      } else {
        await signIn(email, password);
      }
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();

        setEmail("");
        setPassword("");
        setDisplayName("");
        setMobile("");
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    clearError();
    setLoading(true);
    try {
      onBeforeSubmit?.();
      await signInWithGoogle();
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const activeError = formError || error;

  const getFriendlyErrorMessage = (errText: string) => {
    const textLower = errText.toLowerCase();
    if (textLower.includes("operation-not-allowed") || textLower.includes("auth/operation-not-allowed")) {
      return (
        <div className="flex flex-col gap-2.5 text-left leading-normal">
          <span className="font-bold text-[13px] text-red-600 dark:text-red-400 flex items-center gap-1.5">
            ⚠️ Auth Provider Disabled in Firebase Console
          </span>
          <span className="text-[11.5px] text-neutral-600 dark:text-neutral-400 font-normal">
            Bhai, iska simple sa reason hai: Firebase project setup hone par <strong>Email/Password</strong> registration custom configuration se off rehta hai. Isko open karne ke liye:
          </span>
          <div className="bg-black/5 dark:bg-white/5 p-2.5 rounded-lg border border-black/[0.06] dark:border-white/[0.06] space-y-1 text-[11px] font-mono text-neutral-600 dark:text-neutral-300">
            <div>1. Open your <strong>Firebase Console</strong>.</div>
            <div>2. Go to <strong>Build &rarr; Authentication &rarr; Sign-in method</strong>.</div>
            <div>3. Click <strong>Add new provider</strong> &rarr; select <strong>Email/Password</strong>.</div>
            <div>4. Toggle the <strong>Enable</strong> switch &rarr; Click <strong>Save</strong>!</div>
          </div>
          <span className="text-[11.5px] font-semibold text-blue-600 dark:text-blue-400">
            💡 Easy bypass: Click the Google Sign-In button below! Google authentication is already enabled and works instantly out-of-the-box!
          </span>
        </div>
      );
    }
    return errText;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 dark:bg-black/40 backdrop-blur-[6px] animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative max-w-[430px] w-full mx-4"
      >

        <div className="absolute -inset-[1.5px] rounded-[18px] google-ambient-glow blur-[8px] opacity-75 dark:opacity-100 z-0 pointer-events-none" />


        <div className="bg-[#FCF5F3] dark:bg-[#111213] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.35)] overflow-hidden w-full border border-black/5 dark:border-white/5 relative z-10 text-neutral-900 dark:text-[#E2E2E2] font-sans">


          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-450 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-all cursor-pointer z-20"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {isSuccess ? (
            <div className="p-10 flex flex-col items-center justify-center text-center min-h-[380px]">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 16 }}
                className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-5 border border-black/5 dark:border-white/10"
              >
                <CheckCircle className="w-7 h-7 text-neutral-800 dark:text-white" />
              </motion.div>
              <h2 className="text-[20px] font-medium tracking-tight mb-2 font-sans text-neutral-900 dark:text-white">
                {isRegister ? "Account created" : "Signed in successfully"}
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Welcome to your workspace. Setting things up...
              </p>
            </div>
          ) : (
            <div>
              {/* Header Area */}
              <div className="pt-10 pb-4 px-8 text-center">
                <h2 className="text-[24px] font-normal tracking-tight font-sans text-neutral-900 dark:text-white mb-2">
                  {isRegister ? "Create your account" : "Sign in"}
                </h2>
                <p className="text-[15px] text-neutral-600 dark:text-neutral-400 leading-normal">
                  to continue to RoyScript Suite
                </p>
              </div>

            {/* Error Feedback with Interactive Help */}
            {activeError && (
              <div className="mx-8 mt-5 p-4 rounded-xl bg-red-500/[0.06] dark:bg-red-500/[0.04] border border-red-500/15 flex items-start gap-3 text-[12px] font-medium text-neutral-800 dark:text-neutral-300 select-none max-h-[220px] overflow-y-auto">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <div className="flex-1">
                  {getFriendlyErrorMessage(activeError)}
                </div>
              </div>
            )}

            <div className="p-8 pt-5 space-y-5">
              {/* Google Auth Button - Primary Option since it works natively out-of-the-box */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-[#18181a] hover:bg-neutral-50 dark:hover:bg-[#202022] text-neutral-800 dark:text-neutral-200 font-medium text-[13px] border border-black/10 dark:border-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {/* Clean Vector Google 'G' Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>


              <div className="relative select-none">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-black/[0.08] dark:border-white/[0.08]" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
                  <span className="bg-[#FCF5F3] dark:bg-[#111213] px-3 text-neutral-400 dark:text-neutral-500 font-medium">
                    or use email credentials
                  </span>
                </div>
              </div>


              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <div className="grid grid-cols-2 gap-3.5">

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono tracking-tight text-neutral-450 dark:text-neutral-500 uppercase pl-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-600 z-10" />
                        <SmoothInput
                          type="text"
                          placeholder="John Doe"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-[12.5px] rounded-lg bg-black/[0.03] dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] focus:border-neutral-400 dark:focus:border-neutral-600 focus:ring-0 outline-none transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600 text-neutral-900 dark:text-neutral-100"
                        />
                      </div>
                    </div>

                    {/* Phone Input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono tracking-tight text-neutral-450 dark:text-neutral-500 uppercase pl-1">
                        Mobile Phone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-600 z-10" />
                        <SmoothInput
                          type="tel"
                          placeholder="+91 98765..."
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-[12.5px] rounded-lg bg-black/[0.03] dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] focus:border-neutral-400 dark:focus:border-neutral-600 focus:ring-0 outline-none transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600 text-neutral-900 dark:text-neutral-100"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono tracking-tight text-neutral-450 dark:text-neutral-500 uppercase pl-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-600 z-10" />
                    <SmoothInput
                      type="email"
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9.5 pr-4 py-2 text-[12.5px] rounded-lg bg-black/[0.03] dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] focus:border-neutral-400 dark:focus:border-neutral-600 focus:ring-0 outline-none transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center pl-1">
                    <label className="text-[11px] font-mono tracking-tight text-neutral-450 dark:text-neutral-500 uppercase">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-600 z-10" />
                    <SmoothInput
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9.5 pr-4 py-2 text-[12.5px] rounded-lg bg-black/[0.03] dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] focus:border-neutral-400 dark:focus:border-neutral-600 focus:ring-0 outline-none transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-200 dark:hover:bg-white text-white dark:text-neutral-950 font-medium text-[14px] shadow-md active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <div className="w-4.5 h-4.5 border-2 border-neutral-400 border-t-neutral-100 dark:border-neutral-600 dark:border-t-neutral-900 rounded-full animate-spin"></div>
                  ) : isRegister ? (
                    "Create account"
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              {/* Toggle Tab Footer */}
              <div className="pt-2 text-center text-[13px] text-neutral-600 dark:text-neutral-400">
                <span>
                  {isRegister ? "Already have an account? " : "Don't have an account? "}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setFormError(null);
                    clearError();
                  }}
                  className="text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer transition-all ml-1"
                >
                  {isRegister ? "Sign in" : "Create account"}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </motion.div>
    </div>
  );
}
