let sharedAudioCtx: AudioContext | null = null;

export const getSharedAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass({ latencyHint: "interactive" });
    }
  }
  return sharedAudioCtx;
};

export const resumeSharedAudioContext = async (): Promise<void> => {
  const ctx = getSharedAudioContext();
  if (ctx && ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch (err) {
      console.warn("Failed to resume shared AudioContext:", err);
    }
  }
};
