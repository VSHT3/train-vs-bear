'use client';

import { useEffect, useRef, useState } from 'react';
import { BEAR_UNITS, getTrain, targetKmForRound } from '@/lib/catalog';
import { activeModEffects, activeModFlags, simulationSeed } from '@/lib/state';
import { composeStats, runSimulation } from '@/lib/simulate';
import type { GameState, SimResult } from '@/lib/types';

const PLAYBACK_SPEEDS = [1, 2, 3, 5] as const;

export function RunScreen({ state, onDone }: { state: GameState; onDone: (sim: SimResult) => void }) {
  const train = getTrain(state.trainId);
  const targetKm = targetKmForRound(state.round);
  const stats = composeStats(train.base, activeModEffects(state));
  const bearSide = state.side === 'bear';
  const [simResult] = useState(() => runSimulation(
    stats,
    activeModFlags(state),
    state.plan!.placements,
    targetKm,
    { seed: simulationSeed(state) },
  ));
  const [frameIndex, setFrameIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [paused, setPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [copied, setCopied] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const frame = simResult.frames[Math.min(frameIndex, simResult.frames.length - 1)];
  const progress = Math.min((frame.km / targetKm) * 100, 100);
  const hpPercent = Math.max((frame.hp / stats.maxHp) * 100, 0);
  const visibleEvents = simResult.events.filter((event) => event.t <= frame.t + 0.01);

  useEffect(() => {
    if (paused || finished) return;
    const interval = window.setInterval(() => {
      setFrameIndex((current) => {
        if (current >= simResult.frames.length - 1) {
          setFinished(true);
          return current;
        }
        return current + 1;
      });
    }, Math.max(16, 80 / playbackSpeed));
    return () => window.clearInterval(interval);
  }, [finished, paused, playbackSpeed, simResult.frames.length]);

  useEffect(() => {
    if (!finished) return;
    const timeout = window.setTimeout(() => onDone(simResult), 1500);
    return () => window.clearTimeout(timeout);
  }, [finished, onDone, simResult]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [frameIndex]);

  const shareReplay = async () => {
    const url = new URL(window.location.href);
    url.pathname = '/';
    url.search = '';
    url.searchParams.set('seed', String(state.seed));
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
  };

  const playerWon = bearSide ? simResult.outcome !== 'win' : simResult.outcome === 'win';

  return (
    <div className="flex-1 flex flex-col p-6 gap-4 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div><h2 className="font-bold">{bearSide ? '🐻 Defend the Finish Line' : '🚂 Break Through the Defense'}</h2><p className="text-xs text-zinc-400">Run seed {simResult.seed}</p></div>
        <button onClick={shareReplay} className="px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg">{copied ? 'Copied' : 'Share seed'}</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Train speed" value={`${frame.speed} km/h`} alert={frame.grinding || frame.sticky > 0}>
          {frame.grinding ? 'Grinding through defense' : frame.sticky > 0 ? `${Math.round(frame.sticky * 100)}% slowed` : 'Clear track'}
        </MetricCard>
        <MetricCard label="Train integrity" value={`${frame.hp}/${stats.maxHp}`} alert={hpPercent < 30}>
          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-2"><div className={`h-full ${hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${hpPercent}%` }} /></div>
        </MetricCard>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
        <div className="relative h-14 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
          <div className={`absolute inset-y-0 left-0 ${bearSide ? 'bg-red-500/15' : 'bg-green-500/20'}`} style={{ width: `${progress}%` }} />
          {simResult.obstacles.map((obstacle) => (
            <span
              key={obstacle.id}
              className={`absolute top-1/2 -translate-y-1/2 text-sm ${obstacle.km < frame.km ? 'opacity-20' : 'opacity-70'}`}
              style={{ left: `${Math.min((obstacle.km / targetKm) * 100, 95)}%` }}
            >
              {BEAR_UNITS[obstacle.type].emoji}
            </span>
          ))}
          <span className="absolute top-1/2 -translate-y-1/2 text-2xl transition-all duration-100" style={{ left: `${Math.min(progress, 92)}%` }}>{train.emoji}</span>
          <span className="absolute right-1 top-1/2 -translate-y-1/2">🏁</span>
        </div>
        <div className="flex justify-between text-xs text-zinc-400 mt-2"><span>{frame.km.toFixed(1)} / {targetKm} km</span><span>{frame.t.toFixed(1)}s</span></div>
      </div>

      <div className="flex-1 min-h-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500">Event Log · {bearSide ? 'bear command view' : 'engineer view'}</span>
          <div className="flex gap-1">
            <button onClick={() => setPaused((value) => !value)} className="px-2 py-1 text-xs border rounded">{paused ? '▶' : '⏸'}</button>
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
