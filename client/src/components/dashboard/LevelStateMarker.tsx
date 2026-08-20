import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type LevelStateMarkerProps = {
  level: number;
  accentColor: string;
  celebrating?: boolean;
};

function LearnerPosture({ level, accentColor }: Pick<LevelStateMarkerProps, "level" | "accentColor">) {
  const posture = Math.min(Math.max(level, 1), 10);
  const ink = "currentColor";
  const figure = { stroke: ink, strokeWidth: 1.35, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="overflow-visible text-neutral-700 dark:text-neutral-300" aria-hidden="true">
      <path d="M4 24.5H24" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-neutral-300 dark:text-neutral-700" />
      {posture === 1 && <g {...figure}><circle cx="10" cy="16" r="2.1" fill={ink} stroke="none" /><path d="M12 17.5c2 0 3.4.8 4.6 2.1M13 19.2l-3.7 1.3M16.2 19.8l3.5 1.5M12.5 19.5l-2 3.4M15.2 20.1l2.5 2.8" /><path d="M7 23h12" stroke={accentColor} /></g>}
      {posture === 2 && <g {...figure}><circle cx="11" cy="13" r="2.1" fill={ink} stroke="none" /><path d="M12.4 15c1.2 1.2 2.1 2.9 2.1 4.8M13.3 17.2l-4.1 2.2M14.6 18.5l3.7 2.4M14.2 19.6l-2.5 3.2M14.8 19.7l3.4 2.9" /><path d="M7 23h13" stroke={accentColor} /></g>}
      {posture === 3 && <g {...figure}><circle cx="14" cy="9" r="2.1" fill={ink} stroke="none" /><path d="M14 11.3v6.6M14 13.5l-4 2.8M14 13.5l4 2.8M14 17.9l-3 4.5M14 17.9l3.4 4.5" /><path d="M9 23h10" stroke={accentColor} /></g>}
      {posture === 4 && <g {...figure}><circle cx="14" cy="6" r="2.1" fill={ink} stroke="none" /><path d="M14 8.3v7.4M14 10.4l-3.6 2.1M14 10.4l3.6 2.1M14 15.7l-2.2 6.4M14 15.7l2.2 6.4" /><path d="M9 23h10" stroke={accentColor} /></g>}
      {posture === 5 && <g {...figure}><circle cx="13" cy="6" r="2.1" fill={ink} stroke="none" /><path d="M13 8.3l.7 7M13.7 10.5l-3.8 1.7M13.7 10.5l3.5 2.4M13.7 15.3l-3.6 6.6M13.7 15.3l4.8 5.1" /><path d="M8 23h12" stroke={accentColor} /></g>}
      {posture === 6 && <g {...figure}><circle cx="13" cy="6" r="2.1" fill={ink} stroke="none" /><path d="M13 8.3l.9 7M13.8 10.4l-3.1 3.5M13.8 10.4l4.2 1.6M13.9 15.3l-2.5 6.6M13.9 15.3l4.7 4.8" /><path d="M8 23h12" stroke={accentColor} /></g>}
      {posture === 7 && <g {...figure}><path d="M17 24h6M14 20h6M11 16h6" stroke="currentColor" strokeWidth="1" className="text-neutral-300 dark:text-neutral-700" /><circle cx="12" cy="8" r="2.1" fill={ink} stroke="none" /><path d="M12 10.3l1.7 6M13.4 12.5l-3.3 1.5M13.4 12.5l3.5-2M13.7 16.3l-1.6 3.7M13.7 16.3l4.4 3.5" {...figure} /><path d="M8 24h14" stroke={accentColor} /></g>}
      {posture === 8 && <g {...figure}><path d="M17 24h6M14 20h6M11 16h6" stroke="currentColor" strokeWidth="1" className="text-neutral-300 dark:text-neutral-700" /><circle cx="12" cy="7" r="2.1" fill={ink} stroke="none" /><path d="M12 9.3l1.8 6.6M13.5 11.5l-3.2 2.1M13.5 11.5l4-3.2M13.8 15.9l-1.2 3.8M13.8 15.9l4.8 4.1" /><rect x="17.3" y="6" width="3.8" height="4.7" rx=".5" fill={accentColor} stroke="none" /><path d="M8 24h14" stroke={accentColor} /></g>}
      {posture === 9 && <g {...figure}><circle cx="14" cy="5.5" r="2.1" fill={ink} stroke="none" /><path d="M14 7.8v7.8M14 10.2l-4-2.8M14 10.2l4-2.8M14 15.6l-2.7 6.3M14 15.6l2.7 6.3" /><path d="M9 23h10" stroke={accentColor} /><path d="M9 6.5l-1.5-1.5M19 6.5L20.5 5" stroke={accentColor} /></g>}
      {posture === 10 && <g {...figure}><path d="M7 24l3-4 3 2 3-6 3 4 4-2v6H7Z" fill="currentColor" className="text-neutral-200 dark:text-neutral-700" stroke="none" /><circle cx="14" cy="7" r="2.1" fill={ink} stroke="none" /><path d="M14 9.3v7M14 11.4l-3.4-2.8M14 11.4l3.5-3.6M14 16.3l-2.3 4.7M14 16.3l2.9 4.3" /><path d="M18 7.8V2.5M18 2.7h4l-1.5 1.5 1.5 1.5h-4" stroke={accentColor} /></g>}
    </svg>
  );
}

export function LevelStateMarker({ level, accentColor, celebrating = false }: LevelStateMarkerProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="w-7 h-7 relative overflow-visible shrink-0 flex items-center justify-center" aria-label={`Level ${level} learner state`}>
      <AnimatePresence mode="wait">
        {celebrating ? (
          <motion.div key="level-celebration" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="overflow-visible text-neutral-700 dark:text-neutral-300" aria-hidden="true">
              <path d="M7 24.5h14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-neutral-300 dark:text-neutral-700" />
              <circle cx="14" cy="11" r="2.1" fill="currentColor" />
              <path d="M14 13.2v6M14 14.8l-3.7-2.8M14 14.8l3.7-2.8M14 19.2l-2.1 4.5M14 19.2l2.1 4.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
              <path d="M10.3 12l1.2-5h5l1.2 5c0 2.1-1.6 3.4-3.7 3.4s-3.7-1.3-3.7-3.4Z" fill={accentColor} stroke="none" />
              <path d="M14 15.4v2M12.1 17.5h3.8" stroke="currentColor" strokeWidth=".9" strokeLinecap="round" />
            </svg>
          </motion.div>
        ) : (
          <motion.div key={`level-${level}`} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
            <LearnerPosture level={level} accentColor={accentColor} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
