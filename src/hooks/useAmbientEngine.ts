import { useEffect, useRef } from "react";
import { useSettings } from "../contexts/SettingsContext";

let audioContext: AudioContext | null = null;
const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};


let masterAmbientGain: GainNode | null = null;

const activeSounds: Record<string, { source: AudioBufferSourceNode; gain: GainNode }> = {};
const bufferCache: Record<string, AudioBuffer> = {};

const loadBuffer = async (ctx: AudioContext, id: string): Promise<AudioBuffer> => {
  if (bufferCache[id]) return bufferCache[id];
  const response = await fetch(`/assets/sounds/ambient/${id}.mp3`);
  const arrayBuffer = await response.arrayBuffer();
  const decodedData = await ctx.decodeAudioData(arrayBuffer);
  bufferCache[id] = decodedData;
  return decodedData;
};

export function useAmbientEngine() {
  const { ambientMix, zenNoiseEnabled, zenNoiseVolume } = useSettings();


  const activeMixRef = useRef<Record<string, number>>({});

  useEffect(() => {

    if (!zenNoiseEnabled) {

      Object.keys(activeSounds).forEach((id) => {
        try {
          activeSounds[id].source.stop();
          activeSounds[id].gain.disconnect();
        } catch {}
        delete activeSounds[id];
      });
      activeMixRef.current = {};
      return;
    }

    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    if (!masterAmbientGain) {
      masterAmbientGain = ctx.createGain();
      masterAmbientGain.connect(ctx.destination);
    }


    masterAmbientGain.gain.setTargetAtTime(zenNoiseVolume, ctx.currentTime, 0.1);


    Object.keys(ambientMix).forEach((id) => {
      const targetVolume = ambientMix[id];
      const prevVolume = activeMixRef.current[id] || 0;

      if (targetVolume > 0) {
        if (!activeSounds[id]) {

          loadBuffer(ctx, id).then((buffer) => {

            if (!activeMixRef.current[id]) return;

            if (activeSounds[id]) return;

            const gain = ctx.createGain();

            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.setTargetAtTime(targetVolume, ctx.currentTime, 0.5);
            gain.connect(masterAmbientGain!);

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            source.connect(gain);
            source.start();

            activeSounds[id] = { source, gain };
          }).catch(console.error);
        } else {

          if (prevVolume !== targetVolume) {
            activeSounds[id].gain.gain.setTargetAtTime(targetVolume, ctx.currentTime, 0.1);
          }
        }
      } else if (targetVolume === 0 && activeSounds[id]) {

        const node = activeSounds[id];
        node.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
        setTimeout(() => {
          try {
            node.source.stop();
            node.gain.disconnect();
          } catch {}
        }, 1000);
        delete activeSounds[id];
      }
    });


    Object.keys(activeSounds).forEach((id) => {
      if (ambientMix[id] === undefined || ambientMix[id] <= 0) {
        const node = activeSounds[id];
        node.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
        setTimeout(() => {
          try {
            node.source.stop();
            node.gain.disconnect();
          } catch {}
        }, 1000);
        delete activeSounds[id];
      }
    });

    activeMixRef.current = { ...ambientMix };

  }, [ambientMix, zenNoiseEnabled, zenNoiseVolume]);

  return null;
}
