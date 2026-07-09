import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';




export function AnimatedPracticeIcon({
  active = false,
  isHovered = false,
  className = "",
  color = "currentColor"
}: {
  active?: boolean;
  isHovered?: boolean;
  className?: string;
  color?: string;
}) {
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {

      if (!document.hasFocus()) return;
      if (e.key === 'Escape' || e.key.startsWith('Arrow') || e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt') {
        return;
      }


      const activeEl = document.activeElement;
      if (!activeEl || activeEl.id !== "typing-screen-input") {
        return;
      }

      setIsTyping(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsTyping(false);
      }, 300);
    };

    if (active) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [active]);

  const shouldAnimate = isHovered || (active && isTyping);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">

        <motion.path
          d="M 50 25 C 50 15, 35 15, 45 8 C 55 1, 55 12, 50 15 C 45 18, 55 30, 50 25"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          animate={shouldAnimate ? {
            d: [
               "M 50 25 C 45 10, 35 10, 45 5 C 55 -5, 60 10, 50 12 C 40 14, 55 30, 50 25",
               "M 50 25 C 47 12, 37 12, 47 7 C 57 -3, 62 12, 52 14 C 42 16, 57 32, 50 25",
               "M 50 25 C 45 10, 35 10, 45 5 C 55 -5, 60 10, 50 12 C 40 14, 55 30, 50 25",
            ]
          } : {
            d: "M 50 25 C 45 10, 35 10, 45 5 C 55 -5, 60 10, 50 12 C 40 14, 55 30, 50 25"
          }}
          transition={shouldAnimate ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : { type: "spring", stiffness: 70, damping: 18 }}
        />

        {/* Keyboard Base */}
        <rect x="10" y="25" width="80" height="40" rx="4" fill="transparent" stroke={color} strokeWidth="4" />


        <rect x="16" y="32" width="12" height="10" rx="2" stroke={color} strokeWidth="2.5" />
        <rect x="32" y="32" width="12" height="10" rx="2" stroke={color} strokeWidth="2.5" />
        <rect x="48" y="32" width="16" height="10" rx="2" stroke={color} strokeWidth="2.5" />
        <rect x="68" y="32" width="16" height="10" rx="2" stroke={color} strokeWidth="2.5" />

        <rect x="16" y="47" width="16" height="10" rx="2" stroke={color} strokeWidth="2.5" />
        <rect x="36" y="47" width="36" height="10" rx="2" stroke={color} strokeWidth="2.5" />
        <rect x="76" y="47" width="8" height="10" rx="2" stroke={color} strokeWidth="2.5" />


        <motion.g
          animate={shouldAnimate ? {
            y: [0, -6, 2, -4, 0, -5, 0],
            rotate: [0, 4, -2, -3, 0, 2, 0]
          } : {
            y: 0, rotate: 0
          }}
          transition={shouldAnimate ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : { type: "spring", stiffness: 70, damping: 18 }}
          style={{ transformOrigin: "30px 80px" }}
        >
          <path d="M 17 95 L 30 84 L 38 95 L 25 105 Z" fill={color} />
          <path d="M 28 86 C 24 75, 23 58, 27 55 C 30 52, 33 55, 34 60 C 35 55, 39 52, 42 55 C 44 58, 45 61, 45 65 C 48 62, 51 64, 50 68 C 50 72, 43 78, 38 86 Z" fill="transparent" stroke={color} strokeWidth="3" strokeLinejoin="round" />
          <path d="M 34 60 L 34 68 M 42 58 L 42 66" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>

        {/* Right Hand */}
        <motion.g
          animate={shouldAnimate ? {
            y: [0, -3, 0, -6, 2, -4, 0],
            rotate: [0, -3, 2, 4, 0, -2, 0]
          } : {
            y: 0, rotate: 0
          }}
          transition={shouldAnimate ? { duration: 0.85, repeat: Infinity, delay: 0.1, ease: "easeInOut" } : { type: "spring", stiffness: 70, damping: 18 }}
          style={{ transformOrigin: "70px 80px" }}
        >
          <path d="M 83 95 L 70 84 L 62 95 L 75 105 Z" fill={color} />
          <path d="M 72 86 C 76 75, 77 58, 73 55 C 70 52, 67 55, 66 60 C 65 55, 61 52, 58 55 C 56 58, 55 61, 55 65 C 52 62, 49 64, 50 68 C 50 72, 57 78, 62 86 Z" fill="transparent" stroke={color} strokeWidth="3" strokeLinejoin="round" />
          <path d="M 66 60 L 66 68 M 58 58 L 58 66" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>
      </svg>
    </div>
  );
}


// ==========================================


export function AnimatedWriteIcon({
  active = false,
  isHovered = false,
  className = "",
}: {
  active?: boolean;
  isHovered?: boolean;
  className?: string;
}) {
  const [isTyping, setIsTyping] = useState(false);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handleKeyDown = (e: KeyboardEvent) => {

      if (!document.hasFocus()) return;
      if (e.key === 'Escape' || e.key.startsWith('Arrow') || e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt') return;


      const activeEl = document.activeElement;
      const isEditing = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true' ||
        activeEl.closest('[contenteditable="true"]') !== null
      );
      if (!isEditing) return;

      setIsTyping(true);
      setHasStartedTyping(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsTyping(false), 300);
    };
    if (active) window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [active]);

  const shouldHeavyAnimate = isHovered || (active && isTyping);

  const shouldPassiveAnimate = active && !isTyping && hasStartedTyping;

  const heavyAnimX = [0, 8, 16, 24, -10, -2, 6, 14, 0];
  const heavyAnimY = [0, -2, 1, -1, 13, 11, 14, 12, 0];
  const heavyAnimRot = [0, -2, 2, -1, 0, -2, 2, 0, 0];

  const passiveAnimX = [0, 1, -1, 0];
  const passiveAnimY = [0, -1, 0.5, 0];
  const passiveAnimRot = [0, 0.5, -0.5, 0];

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible stroke-current text-current">


        <path
          d="M 20 35 C 20 10, 85 10, 85 45 C 85 80, 55 90, 35 90 L 10 95 L 20 75 C 10 65, 20 40, 20 35 Z"
          strokeWidth="3.5"
          strokeLinejoin="round"
          fill="transparent"
        />


        <line x1="40" y1="35" x2="65" y2="35" strokeWidth="3" strokeLinecap="round" />
        <line x1="30" y1="48" x2="70" y2="48" strokeWidth="3" strokeLinecap="round" />
        <line x1="30" y1="61" x2="60" y2="61" strokeWidth="3" strokeLinecap="round" />
        <line x1="30" y1="74" x2="50" y2="74" strokeWidth="3" strokeLinecap="round" />


        <motion.g
          animate={
            shouldHeavyAnimate ? {
              x: heavyAnimX, y: heavyAnimY, rotate: heavyAnimRot
            } : shouldPassiveAnimate ? {
              x: passiveAnimX, y: passiveAnimY, rotate: passiveAnimRot
            } : {
              x: 0, y: 0, rotate: 0
            }
          }
          transition={
            shouldHeavyAnimate ? { duration: 1.8, repeat: Infinity, ease: "linear" } :
            shouldPassiveAnimate ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" } :
            { type: "spring", stiffness: 70, damping: 18 }
          }
          style={{ transformOrigin: "45px 80px" }}
        >

          <path d="M 68 12 L 80 14 L 55 70 L 43 68 Z" fill="#F97316" strokeWidth="3" strokeLinejoin="round" />


          <path d="M 70 8 L 78 9 C 80 11, 80 13, 80 14 L 68 12 C 68 10, 68 8, 70 8 Z" fill="transparent" strokeWidth="3" strokeLinejoin="round" />
          <path d="M 72 4 L 76 5 L 75 8 L 71 7 Z" fill="transparent" strokeWidth="3" strokeLinejoin="round" />


          <path d="M 80 14 L 84 15 L 83 30 L 79 28" fill="transparent" strokeWidth="3" strokeLinejoin="round" />


          <path d="M 43 68 L 55 70 L 46 80 L 44 78 Z" fill="transparent" strokeWidth="3" strokeLinejoin="round" />
          <path d="M 46 80 L 45 84 L 43 76" strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>
      </svg>
    </div>
  );
}

// ==========================================


export function AnimatedExamIcon({
  active = false,
  isHovered = false,
  className = "",
  examStatus = "idle",
}: {
  active?: boolean;
  isHovered?: boolean;
  className?: string;
  examStatus?: "idle" | "countdown" | "running" | "timeout";
}) {
  const shouldAnimate = active || isHovered;


  const colorClass = "stroke-current text-current";
  const clockFillClass = "dark:fill-neutral-900 fill-white";


  let isClockMoving = false;
  let moveDuration = 2;

  if (active) {
    if (examStatus === "running") {
       isClockMoving = true;
       moveDuration = 1.0;
    }
  } else {
    if (isHovered) {
       isClockMoving = true;
       moveDuration = 2.0;
    }
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible transition-colors duration-300 ${colorClass}`}>


        <g style={{ transform: "translate(22px, 22px) scale(0.5)", opacity: 0.15 }}>

           <circle cx="25" cy="25" r="30" strokeWidth="3.5" fill="transparent" />

           <circle cx="25" cy="25" r="20" strokeWidth="3.5" fill="transparent" className="dark:fill-neutral-800 fill-neutral-100 transition-colors" />

           <circle cx="25" cy="25" r="10" strokeWidth="3.5" fill="currentColor" />


           <motion.g
              initial={{ x: -10, y: -10, opacity: 0 }}
              animate={shouldAnimate ? { x: [ -15, 0, 0, -15 ], y: [ -15, 0, 0, -15 ], opacity: [0, 1, 1, 0] } : { x: 0, y: 0, opacity: 1 }}
              transition={shouldAnimate ? { duration: 2.5, repeat: Infinity, times: [0, 0.2, 0.8, 1], ease: "easeOut" } : { type: "spring", stiffness: 70, damping: 18 }}
           >

              <line x1="-5" y1="-5" x2="25" y2="25" strokeWidth="3.5" strokeLinecap="round" />

              <path d="M 15 25 L 25 25 L 25 15 Z" fill="currentColor" strokeWidth="2" strokeLinejoin="round" />

              <path d="M -5 -5 L -10 0 M -5 -5 L 0 -10 M -10 -10 L -15 -5 M -10 -10 L -5 -15" strokeWidth="2.5" strokeLinecap="round" />
           </motion.g>
        </g>


        <g style={{ transform: "translate(10px, 10px) scale(1.6)" }}>

           <path d="M 5 5 C 0 -5, 15 -10, 15 0" strokeWidth="3" fill="transparent" />
           <path d="M 45 5 C 50 -5, 35 -10, 35 0" strokeWidth="3" fill="transparent" />


           <motion.line
             x1="25" y1="0" x2="25" y2="-5"
             strokeWidth="3.5"
             strokeLinecap="round"
             animate={isClockMoving ? { rotate: [-15, 15] } : { rotate: 0 }}
             transition={isClockMoving ? { duration: 0.1, repeat: Infinity, repeatType: "reverse" } : { type: "spring", stiffness: 70, damping: 18 }}
             style={{ transformOrigin: "25px 0px" }}
           />

           {/* Clock Body */}
           <circle cx="25" cy="25" r="22" strokeWidth="3.5" fill="transparent" className={`${clockFillClass} transition-colors`} />


           <line x1="12" y1="42" x2="8" y2="52" strokeWidth="3.5" strokeLinecap="round" />
           <line x1="38" y1="42" x2="42" y2="52" strokeWidth="3.5" strokeLinecap="round" />


           <circle cx="25" cy="25" r="18" strokeWidth="1.5" fill="transparent" strokeDasharray="2 4" opacity="0.6"/>


           <circle cx="25" cy="25" r="3.5" strokeWidth="0" fill="currentColor" />



           <line x1="25" y1="25" x2="33" y2="25" strokeWidth="3.5" strokeLinecap="round" />


           <motion.path
              d="M 25 25 L 25 10"
              strokeWidth="3.5"
              strokeLinecap="round"
              animate={isClockMoving ? { rotate: [0, 360] } : { rotate: 0 }}
              transition={isClockMoving ? { duration: moveDuration, repeat: Infinity, ease: "linear" } : { type: "spring", stiffness: 70, damping: 18 }}
              style={{ transformOrigin: "25px 25px" }}
           />
        </g>
      </svg>
    </div>
  );
}
