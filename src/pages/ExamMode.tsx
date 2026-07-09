import React, { useState, useEffect } from "react";
import { X, ChevronRight, Check, Settings, Mouse } from "lucide-react";
import { SmoothInput } from "../components/ui/SmoothInputs";
import { useSettings, THEME_OPTIONS } from "../contexts/SettingsContext";
import { motion, AnimatePresence } from "motion/react";

const RULES = [
  {
    title: "No Pauses Allowed",
    desc: "Once you click start, the clock keeps ticking. No pause button, so make sure you are ready!"
  },
  {
    title: "Auto-Stop on Time",
    desc: "As soon as the timer hits zero, typing stops automatically. Every second counts!"
  },
  {
    title: "Stay on the Page",
    desc: "Leaving full screen or clicking away will trigger warning signs. Stay focused right here!"
  },
  {
    title: "Locked Results",
    desc: "After finishing, your typed text is sealed and saved forever. It can't be changed or lost!"
  },
  {
    title: "Ready, Set, Go!",
    desc: "A quick, silent countdown will run right before the test starts to help you get ready to type."
  }
];

export function ExamWizard({
  onStart,
  onCancel,
}: {
  onStart: (minutes: number) => void;
  onCancel: () => void;
}) {
  const [wizardState, setWizardState] = useState<"configure" | "rules">("configure");
  const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);


  const [timerHrs, setTimerHrs] = useState(0);
  const [timerMins, setTimerMins] = useState(10);
  const [timerSecs, setTimerSecs] = useState(0);

  let themeAccentColor = "#3b82f6";
  try {
    const { accent } = useSettings();
    const currentThemeObj = THEME_OPTIONS.find((t: any) => t.id === accent) || THEME_OPTIONS[0];
    themeAccentColor = currentThemeObj.colors[2];
  } catch {}


  const applyPreset = (m: number) => {
    const hrs = Math.floor(m / 60);
    const mins = m % 60;
    setTimerHrs(hrs);
    setTimerMins(mins);
    setTimerSecs(0);
  };

  const handleStartRequest = () => {
    const totalMinutes = timerHrs * 60 + timerMins + timerSecs / 60;
    const finalMinutes = Math.max(0.1, totalMinutes);

    const skipRulesSaved = localStorage.getItem("vortex_exam_skip_rules") === "true";
    if (skipRulesSaved) {
      onStart(finalMinutes);
    } else {
      setWizardState("rules");
    }
  };

  const handleConfirmExamStart = () => {
    if (dontShowAgain) {
      localStorage.setItem("vortex_exam_skip_rules", "true");
    }
    const totalMinutes = timerHrs * 60 + timerMins + timerSecs / 60;
    onStart(Math.max(0.1, totalMinutes));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 dark:bg-black/40 backdrop-blur-[6px] animate-in fade-in duration-300">
      <AnimatePresence mode="wait">
        {wizardState === "configure" ? (
          <motion.div
            key="config"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ "--accent-color": themeAccentColor } as React.CSSProperties}
            className="flex flex-col bg-[#FCF5F3] dark:bg-[#20202A] rounded-xl shadow-[0_24px_54px_rgba(0,0,0,0.25)] overflow-hidden w-[460px] h-[460px] max-w-full max-h-[90vh] border border-black/5 dark:border-white/10 font-sans justify-between"
          >

            <div className="h-[38px] flex items-center justify-between pl-4 pr-0 shrink-0 select-none bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
               <div className="flex items-center gap-2.5 text-[#1E1E1E] dark:text-[#EAEAEA]">
                 <Settings className="w-4 h-4 animate-spin-slow" />
                 <span className="text-[12px] font-medium tracking-wide">Configure Timer</span>
               </div>
               <div className="flex items-center h-full">
                 <button onClick={onCancel} className="h-full px-4 hover:bg-[#E81123] hover:text-white text-[#1E1E1E] dark:text-[#EAEAEA] transition-colors">
                   <X className="w-4 h-4"/>
                 </button>
               </div>
            </div>

            {/* Config Panel Content */}
            <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar space-y-4">
              {/* Adjustable Digit Boxes */}
              <div className="flex items-center justify-center gap-2 font-mono text-center select-none py-6 relative">
                {/* Hours Box */}
                <div className="flex flex-col items-center">
                  <SmoothInput
                    type="number"
                    value={timerHrs}
                    onChange={(e) => setTimerHrs(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                    onWheel={(e) => {
                      e.preventDefault();
                      const step = e.deltaY < 0 ? 1 : -1;
                      setTimerHrs(prev => Math.max(0, Math.min(23, prev + step)));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setTimerHrs(prev => Math.max(0, Math.min(23, prev + 1)));
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setTimerHrs(prev => Math.max(0, Math.min(23, prev - 1)));
                      }
                    }}
                    className="w-16 h-16 bg-[#F5EBE9] dark:bg-[#2A2A35]/50 border-none rounded-xl text-3xl font-medium font-sans tracking-tight text-[#1E1E1E] dark:text-[#EAEAEA] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 uppercase font-semibold tracking-wider mt-2.5">Hours</span>
                </div>

                <div className="text-2xl font-light text-[#1E1E1E]/30 dark:text-[#EAEAEA]/20 pointer-events-none mb-6">:</div>

                {/* Minutes Box */}
                <div className="flex flex-col items-center">
                  <SmoothInput
                    type="number"
                    value={timerMins}
                    onChange={(e) => setTimerMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    onWheel={(e) => {
                      e.preventDefault();
                      const step = e.deltaY < 0 ? 1 : -1;
                      setTimerMins(prev => Math.max(0, Math.min(59, prev + step)));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setTimerMins(prev => Math.max(0, Math.min(59, prev + 1)));
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setTimerMins(prev => Math.max(0, Math.min(59, prev - 1)));
                      }
                    }}
                    className="w-16 h-16 bg-[#F5EBE9] dark:bg-[#2A2A35]/50 border-none rounded-xl text-3xl font-medium font-sans tracking-tight text-[#1E1E1E] dark:text-[#EAEAEA] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 uppercase font-semibold tracking-wider mt-2.5">Mins</span>
                </div>

                <div className="text-2xl font-light text-[#1E1E1E]/30 dark:text-[#EAEAEA]/20 pointer-events-none mb-6">:</div>

                {/* Seconds Box */}
                <div className="flex flex-col items-center">
                  <SmoothInput
                    type="number"
                    value={timerSecs}
                    onChange={(e) => setTimerSecs(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    onWheel={(e) => {
                      e.preventDefault();
                      const step = e.deltaY < 0 ? 1 : -1;
                      setTimerSecs(prev => Math.max(0, Math.min(59, prev + step)));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setTimerSecs(prev => Math.max(0, Math.min(59, prev + 1)));
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setTimerSecs(prev => Math.max(0, Math.min(59, prev - 1)));
                      }
                    }}
                    className="w-16 h-16 bg-[#F5EBE9] dark:bg-[#2A2A35]/50 border-none rounded-xl text-3xl font-medium font-sans tracking-tight text-[#1E1E1E] dark:text-[#EAEAEA] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 uppercase font-semibold tracking-wider mt-2.5">Secs</span>
                </div>
              </div>

              {/* Scroller Tip */}
              <p className="flex justify-center items-center gap-1.5 text-[12px] text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 select-none">
                <Mouse className="w-3.5 h-3.5 opacity-70" />
                <span>Scroll mouse wheel or use up/down keys to adjust</span>
              </p>

              {/* Quick Preset Labels */}
              <div className="space-y-3">
                <span className="text-[11px] uppercase tracking-wider text-[#1E1E1E]/50 dark:text-[#EAEAEA]/40 font-semibold block select-none">
                  Presets
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((m) => {
                    const totalMins = timerHrs * 60 + timerMins;
                    const isSelected = totalMins === m && timerSecs === 0;
                    return (
                      <button
                        key={m}
                        onClick={() => applyPreset(m)}
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

              {/* Buttons UI */}
              <div className="flex justify-end gap-2 pt-6">
                <button
                  onClick={onCancel}
                  className="px-5 py-2 rounded-lg text-[14px] font-medium bg-transparent text-[#1E1E1E]/70 dark:text-[#EAEAEA]/70 hover:text-[#1E1E1E] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartRequest}
                  className="flex items-center justify-center px-6 py-2 rounded-lg text-white text-[14px] font-medium transition-all active:scale-95 shadow-md hover:opacity-90"
                  style={{ backgroundColor: themeAccentColor }}
                >
                  Set Timer
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Rules Onboarding Screen -- Completely Borderless and box-free floating style on blur */
          <motion.div
            key="rules"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="flex flex-col bg-[#FCF5F3] dark:bg-[#20202A] rounded-xl shadow-[0_24px_54px_rgba(0,0,0,0.25)] overflow-hidden max-w-[540px] w-full border border-black/5 dark:border-white/10 font-sans select-none focus:outline-none"
          >
            {/* Title Bar Context */}
            <div className="h-[38px] flex items-center justify-between pl-4 pr-0 shrink-0 select-none bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
               <div className="flex items-center gap-2.5 text-[#1E1E1E] dark:text-[#EAEAEA]">
                 <Settings className="w-4 h-4" />
                 <span className="text-[12px] font-medium tracking-wide">Exam Preview Rules</span>
               </div>
               <div className="flex items-center h-full">
                 <button onClick={onCancel} className="h-full px-4 hover:bg-[#E81123] hover:text-white text-[#1E1E1E] dark:text-[#EAEAEA] transition-colors">
                   <X className="w-4 h-4"/>
                 </button>
               </div>
            </div>

            <div className="px-6 py-8 space-y-8 text-center">
              {/* Slide Rules Carousel */}
              <div className="min-h-[170px] flex flex-col justify-center items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentRuleIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Step ID */}
                    <div className="text-[36px] font-black tracking-tighter text-[#1E1E1E]/20 dark:text-[#EAEAEA]/20 font-mono">
                      {(currentRuleIndex + 1).toString().padStart(2, "0")}
                    </div>
                    {/* Heading */}
                    <h3 className="text-[20px] font-bold tracking-tight text-[#1E1E1E] dark:text-white">
                      {RULES[currentRuleIndex].title}
                    </h3>
                    {/* Body description */}
                    <p className="text-[14px] leading-relaxed text-[#1E1E1E]/70 dark:text-[#EAEAEA]/70 font-mono max-w-[440px] mx-auto">
                      {RULES[currentRuleIndex].desc}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Slide Indicators */}
              <div className="flex justify-center gap-1.5 py-2">
                {RULES.map((_, i) => (
                  <button
                    key={i}
                    disabled
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentRuleIndex ? "w-6" : "w-1.5"
                    }`}
                    style={{
                      backgroundColor: i === currentRuleIndex ? themeAccentColor : "rgba(156, 163, 175, 0.3)"
                    }}
                  />
                ))}
              </div>

              {/* Controls panel */}
              <div className="flex flex-col items-center gap-6 pt-4 border-t border-black/5 dark:border-white/5 max-w-[380px] mx-auto">
                {/* Checkbox Don't show again */}
                <label className="flex items-center gap-2.5 cursor-pointer text-[12px] text-[#1E1E1E]/70 hover:text-[#1E1E1E] dark:text-[#EAEAEA]/70 dark:hover:text-white font-mono active:scale-95 transition-all">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="hidden"
                  />
                  <div
                    className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${
                      dontShowAgain
                        ? "border-[#E81123] bg-[#E81123] text-white"
                        : "border-black/20 dark:border-white/20 bg-transparent"
                    }`}
                  >
                    {dontShowAgain && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span>Don't show rules again</span>
                </label>

                {/* Action buttons */}
                <div className="w-full flex items-center justify-between gap-5 font-mono">
                  <button
                    onClick={handleConfirmExamStart}
                    className="text-[12px] font-bold text-[#1E1E1E]/50 hover:text-[#1E1E1E] dark:text-[#EAEAEA]/50 dark:hover:text-[#EAEAEA] transition-colors cursor-pointer py-2"
                  >
                    Skip Rules &amp; Start
                  </button>

                  {currentRuleIndex < RULES.length - 1 ? (
                    <button
                      onClick={() => setCurrentRuleIndex(prev => prev + 1)}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-md bg-white dark:bg-[#1A1A23] text-[#1E1E1E] dark:text-[#EAEAEA] text-[13px] font-medium border border-[#E5DCDA] dark:border-[#1A1A23] hover:bg-neutral-50 dark:hover:bg-[#2A2A35] transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <span>Next Rule</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleConfirmExamStart}
                      className="flex items-center gap-1.5 px-6 py-2 rounded-md text-white text-[13px] font-medium transition-all active:scale-95 shadow-sm cursor-pointer hover:brightness-110"
                      style={{ backgroundColor: themeAccentColor }}
                    >
                      <span>Start Countdown</span>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
