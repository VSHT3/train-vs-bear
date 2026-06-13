'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BEAR_UNITS, WAVE_MODIFIERS } from '@/lib/catalog';
import { encodeReplay } from '@/lib/replay';
import { runSimulation } from '@/lib/simulate';
import { useSound } from '@/lib/sound';
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
  const [currentResult, setCurrentResult] = useState(result);
  const [frameIndex, setFrameIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [paused, setPaused] = useState(replayMode);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [copied, setCopied] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<{ decision: SimResult['decisions'][0]; makeChoice: (optionId: string) => void } | null>(null);
  const decisionsMade = useRef<Record<number, string>>({});
  const logRef = useRef<HTMLDivElement>(null);
  const { play: playSound } = useSound();

  const frame = currentResult.frames[Math.min(frameIndex, currentResult.frames.length - 1)];
  const progress = Math.min((frame.km / payload.targetKm) * 100, 100);
  const maxHp = payload.trainStats.maxHp;
  const hpPercent = Math.max((frame.hp / maxHp) * 100, 0);
  const visibleEvents = currentResult.events.filter((event) => event.t <= frame.t + 0.01);
  const bearSide = payload.side === 'bear';
  const playerWon = bearSide ? currentResult.outcome !== 'win' : currentResult.outcome === 'win';
  const dead = frame.hp <= 0;
  const trackSpeed = payload.trainStats.topSpeed > 0 ? frame.speed / payload.trainStats.topSpeed : 0;

  const eventsAtFrame = currentResult.events.filter((e) => Math.abs(e.t - frame.t) < 0.15);
  const justHit = eventsAtFrame.some((e) => e.kind === 'hit' || e.kind === 'boom');

  useEffect(() => {
    if (paused || finished) return;
    if (pendingDecision) return;
    const interval = window.setInterval(() => {
      setFrameIndex((current) => {
        if (current >= currentResult.frames.length - 1) {
          setFinished(true);
          return current;
        }
        return current + 1;
      });
    }, Math.max(16, 80 / playbackSpeed));
    return () => window.clearInterval(interval);
  }, [finished, paused, playbackSpeed, currentResult.frames.length, pendingDecision]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [frameIndex]);

  // Play sounds for events
  const lastEventCount = useRef(0);
  useEffect(() => {
    if (visibleEvents.length > lastEventCount.current) {
      const newEvents = visibleEvents.slice(lastEventCount.current);
      for (const e of newEvents) {
        if (e.kind === 'hit' || e.kind === 'boom') playSound('crash');
        else if (e.kind === 'info' && e.text.includes('Entered')) playSound('zone');
      }
    }
    lastEventCount.current = visibleEvents.length;
  }, [visibleEvents, playSound]);

  useEffect(() => {
    if (!finished || !onDone) return;
    const delay = dead ? 3000 : 1500;
    const timeout = window.setTimeout(() => onDone(currentResult), delay);
    return () => window.clearTimeout(timeout);
  }, [finished, onDone, currentResult, dead]);

  // Detect pending decisions in the current frame
  const prevFrameKm = useRef(0);
  useEffect(() => {
    if (pendingDecision || finished || frameIndex === 0) return;
    if (frame.km <= prevFrameKm.current) { prevFrameKm.current = frame.km; return; }
    prevFrameKm.current = frame.km;
    const pending = currentResult.decisions.find(
      (d) => d.chosenOptionId === null && frame.km >= d.atKm,
    );
    if (pending) {
      const id = setTimeout(() => {
        setPaused(true);
        setPendingDecision({
          decision: pending,
          makeChoice: (optionId: string) => {
            const newOverrides = { ...decisionsMade.current, [pending.atKm]: optionId };
            decisionsMade.current = newOverrides;
            try {
              const newResult = runSimulation(
                payload.trainStats,
                payload.modFlags,
                payload.plan.placements,
                payload.targetKm,
                {
                  seed: payload.simulationSeed,
                  waveModifier: payload.waveModifier,
                  bearUpgrades: payload.bearUpgrades,
                  decisionOverrides: newOverrides,
                  isBearSide: payload.side === 'bear',
                  commanderCard: (payload as { commanderCard?: string }).commanderCard,
                },
              );
              setCurrentResult(newResult);
              setFrameIndex(0);
              setFinished(false);
              prevFrameKm.current = 0;
            } catch {
              // fallback: skip decision
            }
            setPendingDecision(null);
          },
        });
      }, 50);
      return () => clearTimeout(id);
    }
  }, [frameIndex, currentResult.decisions, finished, pendingDecision, frame.km, payload]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'k') {
        event.preventDefault();
        setPaused((p) => !p);
      }
      if (event.key === 'ArrowRight') setFrameIndex((i) => Math.min(i + 1, currentResult.frames.length - 1));
      if (event.key === 'ArrowLeft') setFrameIndex((i) => Math.max(i - 1, 0));
      if (event.key === 'r') {
        setPaused(true);
        setFinished(false);
        setFrameIndex(0);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentResult.frames.length]);

  const shareReplay = useCallback(async () => {
    const url = new URL(window.location.href);
    url.pathname = '/';
    url.search = '';
    url.searchParams.set('replay', encodeReplay(payload));
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
  }, [payload]);

  const scrubTo = (nextFrame: number) => {
    setPaused(true);
    setFrameIndex(nextFrame);
    setFinished(nextFrame >= currentResult.frames.length - 1);
  };

  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 gap-4 max-w-5xl mx-auto w-full relative overflow-hidden">
      {dead && finished && <div className="fixed inset-0 z-50 pointer-events-none animate-fade-in bg-red-900/40" />}

      <style>{`
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes rail-scroll { 0% { background-position: 0 0; } 100% { background-position: -24px 0; } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 8px rgba(34,197,94,0.3); } 50% { box-shadow: 0 0 20px rgba(34,197,94,0.6); } }
        @keyframes speed-line { 0% { opacity: 0; transform: translateX(0); } 50% { opacity: 0.5; } 100% { opacity: 0; transform: translateX(-60px); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }
        @keyframes slide-up { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes damage-flash { 0% { filter: brightness(1); } 25% { filter: brightness(1.5) saturate(0); } 50% { filter: brightness(0.6) saturate(2); } 100% { filter: brightness(1); } }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-lg">{replayMode ? '🔁 Replay' : bearSide ? '🐻 DEFENSE RUN' : '🚂 TRAIN RUN'}</h2>
          <p className="text-xs text-zinc-400">
            Round {payload.round} · {payload.train.emoji} {payload.train.name} · seed {result.seed}
          </p>
        </div>
        <div className="flex gap-2">
          {replayMode && <button onClick={onExit} className="px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg">Exit replay</button>}
          <button onClick={shareReplay} className="px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg">{copied ? 'Link copied!' : 'Share replay'}</button>
        </div>
      </div>

      {replayMode && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-sm text-blue-700 dark:text-blue-300">
          Exact replay — train stats, flags, bear plan, perspective, distance, and simulation seed are preserved.
        </div>
      )}

      {payload.waveModifier && (() => {
        const mod = WAVE_MODIFIERS[payload.waveModifier];
        if (!mod) return null;
        return (
          <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3 text-sm text-purple-700 dark:text-purple-300">
            🌊 Wave modifier: <strong>{mod.emoji} {mod.name}</strong> — {mod.desc}
          </div>
        );
      })()}

      {/* === TRACK VISUALIZATION === */}
      <div className={`bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden transition-colors ${dead && finished ? 'border-red-400' : 'border-zinc-200 dark:border-zinc-800'}`}>
        {/* Speed lines */}
        {frame.speed > 80 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="absolute h-px bg-zinc-300 dark:bg-zinc-600" style={{ top: `${20 + i * 30}%`, animation: `speed-line ${0.3 / trackSpeed}s linear infinite`, animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {/* Track */}
        <div className="relative">
          <div
            className="h-20 bg-zinc-100 dark:bg-zinc-800"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 12px)',
              animation: finished && !dead ? 'none' : `rail-scroll ${Math.max(0.5, 3 - trackSpeed * 2)}s linear infinite`,
            }}
          >
            {/* Zone overlays */}
            {currentResult.obstacles.filter((o) => o.kind === 'zone').map((obs) => {
              const startPct = (obs.km / payload.targetKm) * 100;
              const widthPct = (obs.lengthKm / payload.targetKm) * 100;
              const isActive = frame.km >= obs.km && frame.km <= obs.km + obs.lengthKm;
              return (
                <div
                  key={`zone-${obs.id}`}
                  className={`absolute inset-y-0 transition-all duration-300 ${isActive ? 'opacity-40' : 'opacity-15'}`}
                  style={{
                    left: `${startPct}%`,
                    width: `${widthPct}%`,
                    background: obs.type === 'honeyZone' ? '#f59e0b' : obs.type === 'droneSwarm' ? '#6366f1' : obs.type === 'beeSwarm' ? '#eab308' : obs.type === 'bearNado' ? '#a855f7' : obs.type === 'glueRiver' ? '#06b6d4' : obs.type === 'polarMinefield' ? '#0ea5e9' : obs.type === 'mirrorMaze' ? '#ec4899' : '#8b5cf6',
                  }}
                />
              );
            })}

            {/* Obstacles */}
            {currentResult.obstacles.filter((o) => o.kind === 'blocker').map((obs) => {
              const passed = obs.km < frame.km;
              const cleared = obs.clearedT !== undefined;
              const current = obs.contactT !== undefined && !cleared;
              return (
                <div
                  key={`obs-${obs.id}`}
                  className={`absolute top-1/2 -translate-y-1/2 text-xl transition-all duration-200 ${passed ? (cleared ? 'opacity-20 scale-75' : 'opacity-50') : 'opacity-80'} ${current ? 'animate-pulse scale-125' : ''}`}
                  style={{ left: `${Math.min((obs.km / payload.targetKm) * 100, 94)}%` }}
                  title={`${BEAR_UNITS[obs.type].name} ×${obs.count}`}
                >
                  {BEAR_UNITS[obs.type].emoji}
                </div>
              );
            })}

            {/* Finish line */}
            <div className="absolute right-0 inset-y-0 flex items-center text-2xl px-2 bg-zinc-200/50 dark:bg-zinc-700/50">🏁</div>

            {/* Train */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 text-3xl transition-all duration-75 ${justHit ? 'animate-[damage-flash_0.4s_ease-out]' : ''} ${frame.grinding ? 'scale-110' : ''}`}
              style={{ left: `${Math.min(progress, 90)}%` }}
            >
              {payload.train.emoji}
              {frame.grinding && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs animate-pulse">💥</span>}
            </div>
          </div>
        </div>

        {/* Timeline + labels */}
        <div className="px-4 pb-3">
          <div className="flex justify-between text-xs text-zinc-400 mt-1.5 mb-1">
            <span>{frame.km.toFixed(1)} / {payload.targetKm} km</span>
            <span className="font-mono">{frame.t.toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min="0"
            max={Math.max(currentResult.frames.length - 1, 0)}
            value={frameIndex}
            onChange={(event) => scrubTo(Number(event.target.value))}
            className="w-full accent-zinc-900 dark:accent-zinc-100"
            aria-label="Replay timeline"
          />
        </div>
      </div>

      {/* === STATS PANEL === */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* HP */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-zinc-500">Integrity</span>
            <span className={`text-xs font-mono font-bold ${hpPercent < 25 ? 'text-red-500 animate-pulse' : ''}`}>{Math.round(frame.hp)} / {maxHp}</span>
          </div>
          <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-150 ${hpColor}`} style={{ width: `${hpPercent}%` }} />
          </div>
          {dead && <div className="text-xs text-red-500 font-bold mt-1 animate-pulse">DESTROYED</div>}
        </div>

        {/* Speed */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-zinc-500">Speed</span>
            <span className="text-xs font-mono font-bold">{frame.speed} km/h</span>
          </div>
          <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-150" style={{ width: `${trackSpeed * 100}%` }} />
          </div>
          {frame.grinding && <div className="text-xs text-orange-500 font-bold mt-1">GRINDING</div>}
          {frame.sticky > 0.1 && <div className="text-xs text-cyan-500 font-bold mt-1">{Math.round(frame.sticky * 100)}% SLOWED</div>}
        </div>

        {/* Distance / State */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:col-span-1 col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-zinc-500">Status</span>
            <span className={`text-xs font-mono font-bold ${frame.underFire ? 'text-yellow-500' : dead ? 'text-red-500' : 'text-green-500'}`}>
              {finished ? (playerWon ? 'COMPLETE' : 'FAILED') : frame.underFire ? 'UNDER FIRE' : dead ? 'DESTROYED' : 'RUNNING'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-400">🏁</span>
            <div className="h-3 flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-150" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-zinc-400 font-mono text-xs">{frame.km.toFixed(1)}km</span>
          </div>
        </div>
      </div>

      {/* === DECISION MODAL === */}
      {pendingDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPendingDecision(null)}>
          <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-4xl mb-2">⚡</div>
              <h3 className="text-xl font-black">{pendingDecision.decision.title}</h3>
              <p className="text-sm text-zinc-500 mt-1">The simulation awaits your command.</p>
            </div>
            <div className="space-y-2">
              {pendingDecision.decision.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => pendingDecision.makeChoice(opt.id)}
                  className="w-full text-left p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all group"
                >
                  <div className="font-bold text-base group-hover:text-amber-600">{opt.label}</div>
                  <div className="text-sm text-zinc-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-400 text-center">This choice will affect the outcome of the run.</p>
          </div>
        </div>
      )}

      {/* === EVENT LOG + CONTROLS === */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 font-medium">EVENT LOG · {visibleEvents.length} events</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setPaused(true); setFinished(false); setFrameIndex(0); }} className="px-2.5 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800" title="Restart (R)">↺</button>
            <button onClick={() => setPaused((p) => !p)} className="px-2.5 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 min-w-[2rem]" title="Play/Pause (Space)">
              {paused ? '▶' : '⏸'}
            </button>
            {PLAYBACK_SPEEDS.map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1.5 text-xs border rounded-lg ${speed === playbackSpeed ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
              >
                {speed}×
              </button>
            ))}
            <span className="text-[10px] text-zinc-400 ml-1 hidden sm:inline">Space/R</span>
          </div>
        </div>
        <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-1 max-h-52" style={{ minHeight: '8rem' }}>
          {visibleEvents.length === 0 && (
            <p className="text-sm text-zinc-400 text-center py-4">The train accelerates. Bears watch from the treeline...</p>
          )}
          {visibleEvents.map((event, index) => (
            <p
              key={`${event.t}-${index}`}
              className={`text-sm leading-relaxed animate-[slide-up_0.2s_ease-out] ${
                event.kind === 'fail' || event.kind === 'boom' ? 'text-red-500 font-medium' :
                event.kind === 'win' ? 'text-emerald-600 font-bold' :
                event.kind === 'clear' ? 'text-green-600' :
                event.kind === 'mine' ? 'text-orange-500' :
                event.kind === 'info' ? 'text-blue-500' :
                event.kind === 'hit' ? 'text-red-400' :
                'text-zinc-500'
              }`}
            >
              <span className="text-[10px] text-zinc-400 font-mono mr-1.5">[{event.t.toFixed(1)}s]</span>
              {event.text}
            </p>
          ))}
          {finished && (
            <div className={`text-center py-4 animate-[fade-in_1s_ease-out] ${playerWon ? '' : ''}`}>
              <p className={`text-2xl font-black ${playerWon ? 'text-emerald-500' : 'text-red-500'}`}>
                {playerWon ? (bearSide ? '🐻 DEFENSE HOLDS!' : '🚂 TRAIN BREAKS THROUGH!') : (bearSide ? '🚂 TRAIN BROKE THROUGH' : '🐻 TRAIN STOPPED')}
              </p>
              <p className="text-sm text-zinc-400 mt-1">
                {currentResult.reachedKm.toFixed(1)} / {currentResult.targetKm} km · {currentResult.timeSec}s · {currentResult.bearsSmashed} bears cleared
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
