'use client';

import { useEffect, useState } from 'react';
import { BEAR_UNITS, getTrain, MAX_ROUNDS } from '@/lib/catalog';
import { loadStats } from '@/lib/storage';
import type { GameState, ObstacleEncounter } from '@/lib/types';
import { CopyReplayButton } from './copy-replay-button';

export function ResultScreen({ state, onNext }: { state: GameState; onNext: () => void }) {
  const [visible, setVisible] = useState(false);
  const sim = state.sim;
  const summary = state.lastSummary;
  if (!sim || !summary) return null;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const bearSide = state.side === 'bear';
  const trainWon = sim.outcome === 'win';
  const playerWon = bearSide ? !trainWon : trainWon;
  const train = getTrain(state.trainId);
  const totalDamage = Object.values(sim.damageBreakdown).reduce((t, d) => t + d, 0);
  const lifetime = loadStats();

  // Sort encounters by damage dealt (descending)
  const sortedEncounters = [...sim.obstacleEncounters]
    .filter((e) => e.outcome !== 'bypassed')
    .sort((a, b) => b.damageTaken - a.damageTaken);

  const killer = sortedEncounters.find((e) => e.outcome === 'killer');
  const hpLost = bearSide ? (trainWon ? 0 : train.base.maxHp) : train.base.maxHp - sim.finalHp;

  return (
    <div className={`flex-1 flex flex-col p-4 sm:p-8 gap-6 max-w-3xl mx-auto w-full transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className={`text-6xl transition-all duration-700 delay-200 ${visible ? 'scale-100' : 'scale-0'}`}>
          {playerWon ? (bearSide ? '🐻' : '🚂') : '💀'}
        </div>
        <h2 className={`text-4xl font-black transition-all duration-500 delay-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          {playerWon ? 'ROUND WON' : 'ROUND LOST'}
        </h2>
        {state.freeplay && (
          <p className="text-xs text-purple-500 dark:text-purple-400 font-semibold">FREE PLAY — WAVE {state.round - MAX_ROUNDS}</p>
        )}
        <p className="text-base text-zinc-500 mt-1">
          {bearSide
            ? trainWon
              ? `${train.name} reached the finish line.`
              : `${train.name} was stopped at ${summary.reachedKm.toFixed(1)} km.`
            : trainWon
              ? `${train.name} broke through with ${sim.finalHp} HP remaining.`
              : `The bears stopped the train ${Math.max(0, summary.targetKm - summary.reachedKm).toFixed(1)} km from the finish.`}
        </p>
      </div>

      {/* Killer highlight */}
      {killer && !playerWon && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-center animate-pulse">
          <p className="text-sm text-red-600 dark:text-red-400 font-semibold">
            💀 Critical failure: <strong>{killer.emoji} {killer.name}</strong> dealt {killer.damageTaken} damage — the most of any obstacle.
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ResultCard label="Distance" value={`${summary.reachedKm.toFixed(1)} km`} sub={bearSide ? undefined : `${Math.max(0, summary.targetKm - summary.reachedKm).toFixed(1)} km short`} />
        <ResultCard label="Duration" value={`${sim.timeSec}s`} sub={`${(summary.reachedKm / Math.max(sim.timeSec, 1) * 3.6).toFixed(0)} km/h avg`} />
        <ResultCard label="Bears cleared" value={summary.bearsSmashed} sub={`${sim.obstacleEncounters.length} obstacles`} />
        <ResultCard label={`${playerWon ? 'HP left' : 'HP lost'}`} value={playerWon ? `${sim.finalHp}` : `${Math.round(hpLost)}`} sub={`of ${train.base.maxHp} total`} />
      </div>

      {/* Damage breakdown */}
      {totalDamage > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-zinc-500">DAMAGE BREAKDOWN</h3>
            <span className="text-xs text-zinc-400">{Math.round(totalDamage)} total</span>
          </div>
          {/* Stacked bar */}
          <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
            {sim.damageBreakdown.impact > 0 && <div className="h-full bg-orange-500 transition-all" style={{ width: `${(sim.damageBreakdown.impact / totalDamage) * 100}%` }} title={`Impact: ${Math.round(sim.damageBreakdown.impact)}`} />}
            {sim.damageBreakdown.zone > 0 && <div className="h-full bg-blue-500 transition-all" style={{ width: `${(sim.damageBreakdown.zone / totalDamage) * 100}%` }} title={`Zones: ${Math.round(sim.damageBreakdown.zone)}`} />}
            {sim.damageBreakdown.grind > 0 && <div className="h-full bg-red-500 transition-all" style={{ width: `${(sim.damageBreakdown.grind / totalDamage) * 100}%` }} title={`Grinding: ${Math.round(sim.damageBreakdown.grind)}`} />}
            {sim.damageBreakdown.mines > 0 && <div className="h-full bg-amber-500 transition-all" style={{ width: `${(sim.damageBreakdown.mines / totalDamage) * 100}%` }} title={`Mines: ${Math.round(sim.damageBreakdown.mines)}`} />}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {sim.damageBreakdown.impact > 0 && <DamagePill label="💥 Impact" dmg={sim.damageBreakdown.impact} total={totalDamage} color="bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300" bar="bg-orange-500" />}
            {sim.damageBreakdown.zone > 0 && <DamagePill label="🌊 Zones" dmg={sim.damageBreakdown.zone} total={totalDamage} color="bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300" bar="bg-blue-500" />}
            {sim.damageBreakdown.grind > 0 && <DamagePill label="⚙️ Grind" dmg={sim.damageBreakdown.grind} total={totalDamage} color="bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300" bar="bg-red-500" />}
            {sim.damageBreakdown.mines > 0 && <DamagePill label="💣 Mines" dmg={sim.damageBreakdown.mines} total={totalDamage} color="bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300" bar="bg-amber-500" />}
          </div>
        </div>
      )}

      {/* Obstacle encounter report */}
      {sortedEncounters.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-sm text-zinc-500">OBSTACLE REPORT</h3>
          <div className="space-y-1">
            {sortedEncounters.map((enc, i) => (
              <EncounterRow key={`${enc.type}-${enc.atKm}-${i}`} encounter={enc} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Min-stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MiniStat emoji="🐻" label="Lifetime bears" value={lifetime.totalBearsSmashed.toLocaleString()} />
        <MiniStat emoji="📏" label="Lifetime km" value={`${lifetime.totalKm.toFixed(0)}`} />
        <MiniStat emoji="🏆" label="Games won" value={lifetime.gamesWon.toString()} />
        <MiniStat emoji="🎯" label={state.freeplay ? 'Best wave' : 'Best round'} value={state.freeplay ? `${lifetime.bestFreeplayWave} waves` : `${lifetime.bestRound}/${MAX_ROUNDS}`} />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <CopyReplayButton state={state} className="py-3 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors" />
        <button onClick={onNext} className="py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg hover:scale-[1.01] transition-transform">
          NEXT ROUND →
        </button>
      </div>
    </div>
  );
}

function ResultCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-center">
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-[10px] text-zinc-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function DamagePill({ label, dmg, total, color, bar }: { label: string; dmg: number; total: number; color: string; bar: string }) {
  return (
    <div className={`rounded-xl p-2.5 ${color}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="font-medium">{label}</span>
        <span className="font-bold">{Math.round(dmg)}</span>
      </div>
      <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
        <div className={`h-full ${bar}`} style={{ width: `${(dmg / total) * 100}%` }} />
      </div>
    </div>
  );
}

const OUTCOME_ICONS: Record<string, string> = {
  vaporized: '🔫',
  smashed: '💥',
  grinded: '🧊',
  endured: '🌊',
  bypassed: '🚫',
  killer: '☠️',
};

function EncounterRow({ encounter, index }: { encounter: ObstacleEncounter; index: number }) {
  const isKiller = encounter.outcome === 'killer';
  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl text-sm transition-colors ${isKiller ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800' : 'bg-zinc-50 dark:bg-zinc-800/30'}`}>
      <span className="text-xs text-zinc-400 w-5 text-right">{index + 1}</span>
      <span className="text-lg">{encounter.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{encounter.name} <span className="text-[11px] text-zinc-400">×{encounter.outcome !== 'killer' ? '' : '⚡'} </span></div>
        <div className="text-[11px] text-zinc-400">at {encounter.atKm.toFixed(1)} km</div>
      </div>
      <div className="text-right shrink-0">
        <div className={`font-mono font-bold text-sm ${isKiller ? 'text-red-500' : encounter.damageTaken > 0 ? 'text-orange-500' : 'text-zinc-400'}`}>
          {OUTCOME_ICONS[encounter.outcome] ?? '•'} {encounter.damageTaken > 0 ? `${Math.round(encounter.damageTaken)} dmg` : '—'}
        </div>
        <div className="text-[10px] text-zinc-400 capitalize">{encounter.outcome}</div>
      </div>
    </div>
  );
}

function MiniStat({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/20 p-2.5 text-center text-sm">
      <div className="text-xs text-zinc-400">{emoji} {label}</div>
      <div className="font-bold truncate">{value}</div>
    </div>
  );
}
