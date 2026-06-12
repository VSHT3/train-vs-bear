'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

const VOLUME_KEY = 'train-vs-bear-volume';

type SoundName = 'click' | 'horn' | 'crash' | 'zone' | 'victory' | 'defeat' | 'nextRound';

interface SoundContextValue {
  play: (name: SoundName) => void;
  volume: number;
  setVolume: (v: number) => void;
  muted: boolean;
  toggleMute: () => void;
}

const SoundContext = createContext<SoundContextValue>({
  play: () => {},
  volume: 0.3,
  setVolume: () => {},
  muted: false,
  toggleMute: () => {},
});

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.3) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function playNoise(duration: number, vol = 0.15) {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain).connect(ctx.destination);
    source.start();
  } catch {}
}

function playFilteredNoise(duration: number, freq: number, Q = 5, vol = 0.08) {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, ctx.currentTime);
    filter.Q.setValueAtTime(Q, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  } catch {}
}

function playMultiTone(notes: [number, number][], type: OscillatorType = 'square', vol = 0.2) {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    for (const [freq, tOffset] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + tOffset);
      gain.gain.setValueAtTime(0, now + tOffset);
      gain.gain.linearRampToValueAtTime(vol, now + tOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + tOffset + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + tOffset);
      osc.stop(now + tOffset + 0.35);
    }
  } catch {}
}

const SOUND_FNS: Record<SoundName, (vol: number) => void> = {
  click: (vol) => playTone(800, 0.04, 'square', vol * 0.3),
  horn: (vol) => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.3);
      osc.frequency.linearRampToValueAtTime(160, now + 0.6);
      osc.frequency.linearRampToValueAtTime(240, now + 0.9);
      gain.gain.setValueAtTime(vol * 0.2, now);
      gain.gain.linearRampToValueAtTime(vol * 0.35, now + 0.1);
      gain.gain.setValueAtTime(vol * 0.35, now + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.3);
    } catch {}
  },
  crash: (vol) => {
    playNoise(0.25, vol * 0.4);
    playTone(60, 0.15, 'sine', vol * 0.2);
  },
  zone: (vol) => playFilteredNoise(0.8, 300, 3, vol * 0.15),
  victory: (vol) => playMultiTone([[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45]], 'square', vol * 0.2),
  defeat: (vol) => playMultiTone([[400, 0], [350, 0.2], [300, 0.4], [250, 0.6]], 'sawtooth', vol * 0.2),
  nextRound: (vol) => playMultiTone([[440, 0], [523, 0.12], [659, 0.24]], 'triangle', vol * 0.18),
};

export function SoundProvider({ children }: { children: ReactNode }) {
  const [volume, _setVolume] = useState(() => {
    if (typeof window === 'undefined') return 0.3;
    const saved = localStorage.getItem(VOLUME_KEY);
    return saved ? Number(saved) : 0.3;
  });
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const volRef = useRef(volume);

  useEffect(() => { volRef.current = volume; }, [volume]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const play = useCallback((name: SoundName) => {
    if (mutedRef.current) return;
    const fn = SOUND_FNS[name];
    if (fn) fn(volRef.current);
  }, []);

  const setVolume = useCallback((v: number) => {
    _setVolume(v);
    localStorage.setItem(VOLUME_KEY, String(v));
  }, []);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  return (
    <SoundContext.Provider value={{ play, volume, setVolume, muted, toggleMute }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  return useContext(SoundContext);
}

export function SoundToggle() {
  const { play, muted, toggleMute, volume, setVolume } = useSound();
  return (
    <div className="flex items-center gap-1.5" title={`Sound: ${muted ? 'off' : `${Math.round(volume * 100)}%`}`}>
      <button
        onClick={() => { toggleMute(); if (muted) play('click'); }}
        aria-label={muted ? 'Unmute sound' : 'Mute sound'}
        className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
      >
        {muted ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
      </button>
      {!muted && (
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          onClick={() => play('click')}
          className="w-12 h-1 accent-zinc-900 dark:accent-zinc-100"
          aria-label="Volume"
        />
      )}
    </div>
  );
}
