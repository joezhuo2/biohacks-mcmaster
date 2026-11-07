"use client";

import { useCallback, useEffect, useRef } from "react";

export function useChime() {
  const ctx = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Browsers keep an AudioContext suspended until a user gesture, so unlock it on the first one.
    const unlock = () => {
      ctx.current ??= new AudioContext();
      void ctx.current.resume();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      void ctx.current?.close();
      ctx.current = null;
    };
  }, []);

  return useCallback(() => {
    const ac = (ctx.current ??= new AudioContext());
    void ac.resume();
    const t = ac.currentTime;
    const out = ac.createGain();
    out.gain.value = 0.12;
    out.connect(ac.destination);
    [
      [659.25, 0],
      [987.77, 0.14],
    ].forEach(([freq, delay]) => {
      const osc = ac.createOscillator();
      const env = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, t + delay);
      env.gain.linearRampToValueAtTime(1, t + delay + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, t + delay + 1.4);
      osc.connect(env).connect(out);
      osc.start(t + delay);
      osc.stop(t + delay + 1.5);
    });
  }, []);
}
