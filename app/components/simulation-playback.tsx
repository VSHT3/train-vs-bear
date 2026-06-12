'use client';

import { useEffect, useRef, useState } from 'react';
import { BEAR_UNITS } from '@/lib/catalog';
import { encodeReplay } from '@/lib/replay';
import type { ReplayPayload, SimResult } from '@/lib/types';

const PLAYBACK_SPEEDS = [1, 2, 3, 5] as const;

export function SimulationPlayback({
  payload,
  result,
  replayMode = false,
  onDone,
  onExit,
}: {
  payload: ReplayPayload;
  result: SimResult;
  replayMode?: boolean;
  onDone?: (sim: SimResult) => void;
  onExit?: () => void;
}) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [paused, setPaused] = useState(replayMode);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [copied, setCopied] = useState(false);
  const [shake, setShake] = useState(false);
  const [zoneFlash, setZoneFlash] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const lastHpRef = useRef(0);
  const wasUnderFireRef = useRef(false);

  const frame = result.frames[Math.min(frameIndex, result.frames.length - 1)];
  const progress = Math.min((frame.km / payload.targetKm) * 100, 100);
  const maxHp = payload.trainStats.maxHp;
  const hpPercent = Math.max((frame.hp / maxHp) * 100, 0);
  const visibleEvents = result.events.filter((event) => event.t <= frame.t + 0.01);
  const bearSide = payload.side === 'bear';
  const playerWon = bearSide ? result.outcome !== 'win' : result.outcome === 'win';
  const dead = frame.hp <= 0;

  useEffect(() => {
    if (paused || finished) return;
    const interval = window.setInterval(() => {
      setFrameIndex((current) => {
        if (current >= result.frames.length - 1) {
          setFinished(true);
          return current;
        }
        return current + 1;
      });
    }, Math.max(16, 80 / playbackSpeed));
    return () => window.clearInterval(interval);
  }, [finished, paused, playbackSpeed, result.frames.length]);

  useEffect(() => {
    // Screen shake on big damage events
    const hpDrop = lastHpRef.current - frame.hp;
    if (hpDrop > maxHp * 0.2) {
      setShake(true);
      const timer = window.setTimeout(() => setShake(false), 300);
      return () => window.clearTimeout(timer);
    }
    lastHpRef.current = frame.hp;
  }, [frame.hp, frameIndex, maxHp]);

  useEffect(() => {
    // Zone entry flash
    if (frame.underFire && !wasUnderFireRef.current) {
      setZoneFlash(true);
      const timer = window.setTimeout(() => setZoneFlash(false), 600);
      return () => window.clearTimeout(timer);
    }
    wasUnderFireRef.current = frame.underFire;
  }, [frame.underFire, frameIndex]);

  useEffect(() => {
    if (!finished || !onDone) return;
    const delay = dead ? 3000 : 1500;
    const timeout = window.setTimeout(() => onDone(result), delay);
    return () => window.clearTimeout(timeout);
  }, [finished, onDone, result, dead]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [frameIndex]);

  const shareReplay = async () => {
    const url = new URL(window.location.href);
    url.pathname = '/';
    url.search = '';
    url.searchParams.set('replay', encodeReplay(payload));
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
  };

  const scrubTo = (nextFrame: number) => {
    setPaused(true);
    setFrameIndex(nextFrame);
    setFinished(nextFrame >= result.frames.length - 1);
  };

  const restart = () => {
    setPaused(true);
    setFinished(false);
    setFrameIndex(0);
  };

  return (
    <div className={`flex-1 flex flex-col p-6 gap-4 max-w-3xl mx-auto w-full ${shake ? 'animate-[shake_0.3s_ease-in-out]' : ''}`}>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>

      {dead && finished && (
        <div className="fixed inset-0 z-50 pointer-events-none animate-[fadeIn_0.5s_ease-out_forwards] bg-red-900/40" />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">{replayMode ? '🔁 Replay Viewer' : bearSide ? '🐻 Defend the Finish Line' : '🚂 Break Through the Defense'}</h2>
          <p className="text-xs text-zinc-400">
            Round {payload.round} · {payload.train.emoji} {payload.train.name} · run seed {result.seed}
          </p>
        </div>
        <div className="flex gap-2">
          {replayMode && <button onClick={onExit} className="px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg">New game</button>}
          <button onClick={shareReplay} className="px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg">{copied ? 'Replay link copied' : 'Share replay'}</button>
        </div>
      </div>

      {replayMode && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-sm text-blue-700 dark:text-blue-300">
          This replay contains the exact train stats, flags, bear plan, perspective, target distance, and simulation seed.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Train speed" value={`${frame.speed} km/h`} alert={frame.grinding || frame.sticky > 0}>
          {frame.grinding ? 'Grinding through defense' : frame.sticky > 0 ? `${Math.round(frame.sticky * 100)}% slowed` : 'Clear track'}
        </MetricCard>
        <MetricCard label="Train integrity" value={`${frame.hp}/${payload.trainStats.maxHp}`} alert={hpPercent < 30}>
          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-2"><div className={`h-full ${hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${hpPercent}%` }} /></div>
        </MetricCard>
      </div>

      <div className={`bg-white dark:bg-zinc-900 border rounded-xl p-4 transition-colors duration-300 ${zoneFlash ? 'border-yellow-400 dark:border-yellow-500' : 'border-zinc-200 dark:border-zinc-800'}`}>
        <div className="relative h-14 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
          <div className={`absolute inset-y-0 left-0 ${bearSide ? 'bg-red-500/15' : 'bg-green-500/20'}`} style={{ width: `${progress}%` }} />
          {result.obstacles.map((obstacle) => (
            <span key={obstacle.id} className={`absolute top-1/2 -translate-y-1/2 text-sm ${obstacle.km < frame.km ? 'opacity-20' : 'opacity-70'}`} style={{ left: `${Math.min((obstacle.km / payload.targetKm) * 100, 95)}%` }}>
              {BEAR_UNITS[obstacle.type].emoji}
            </span>
          ))}
          <span className="absolute top-1/2 -translate-y-1/2 text-2xl transition-all duration-100" style={{ left: `${Math.min(progress, 92)}%` }}>{payload.train.emoji}</span>
          <span className="absolute right-1 top-1/2 -translate-y-1/2">🏁</span>
        </div>
        <div className="flex justify-between text-xs text-zinc-400 mt-2"><span>{frame.km.toFixed(1)} / {payload.targetKm} km</span><span>{frame.t.toFixed(1)}s</span></div>
        <label htmlFor="replay-timeline" className="sr-only">Replay timeline</label>
        <input
          id="replay-timeline"
          type="range"
          min="0"
          max={Math.max(result.frames.length - 1, 0)}
          value={frameIndex}
          onChange={(event) => scrubTo(Number(event.target.value))}
          className="w-full mt-3"
        />
      </div>

      <div className="flex-1 min-h-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs text-zinc-500">Event Log · {bearSide ? 'bear command view' : 'engineer view'}</span>
          <div className="flex gap-1">
            <button onClick={restart} className="px-2 py-1 text-xs border rounded" aria-label="Restart replay">↺</button>
            <button onClick={() => setPaused((value) => !value)} className="px-2 py-1 text-xs border rounded" aria-label={paused ? 'Play replay' : 'Pause replay'}>{paused ? '▶' : '⏸'}</button>
            {PLAYBACK_SPEEDS.map((speed) => <button key={speed} onClick={() => setPlaybackSpeed(speed)} className={`px-2 py-1 text-xs border rounded ${speed === playbackSpeed ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : ''}`}>{speed}×</button>)}
          </div>
        </div>
        <div ref={logRef} className="flex-1 overflow-y-auto space-y-1 text-sm font-mono">
          {visibleEvents.map((event, index) => <p key={`${event.t}-${index}`} className={event.kind === 'fail' || event.kind === 'boom' ? 'text-red-500' : event.kind === 'win' || event.kind === 'clear' ? 'text-green-500' : 'text-zinc-500'}><span className="text-xs text-zinc-400">[{event.km.toFixed(1)}km]</span> {event.text}</p>)}
          {finished && <p className={`text-center text-xl font-black py-4 ${playerWon ? 'text-green-500' : 'text-red-500'}`}>{playerWon ? (bearSide ? 'DEFENSE HOLDS!' : 'TRAIN BREAKS THROUGH!') : (bearSide ? 'TRAIN BROKE THROUGH' : 'TRAIN STOPPED')}</p>}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, alert, children }: { label: string; value: string; alert: boolean; children: React.ReactNode }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 border rounded-xl p-4 ${alert ? 'border-amber-500' : 'border-zinc-200 dark:border-zinc-800'}`}>
      <div className="text-xs text-zinc-500">{label}</div><div className="text-2xl font-bold tabular-nums">{value}</div><div className="text-xs text-zinc-400 mt-1">{children}</div>
    </div>
  );
}
