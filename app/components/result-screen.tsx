import { getTrain } from '@/lib/catalog';
import type { GameState } from '@/lib/types';
import { CopyReplayButton } from './copy-replay-button';

export function ResultScreen({ state, onNext }: { state: GameState; onNext: () => void }) {
  const sim = state.sim;
  const summary = state.lastSummary;
  if (!sim || !summary) return null;

  const bearSide = state.side === 'bear';
  const trainWon = sim.outcome === 'win';
  const playerWon = bearSide ? !trainWon : trainWon;
  const train = getTrain(state.trainId);
  const totalDamage = Object.values(sim.damageBreakdown).reduce((total, damage) => total + damage, 0);

  return (
    <div className="flex-1 flex flex-col items-center p-6 gap-6 max-w-2xl mx-auto w-full">
      <div className="text-center">
        <div className="text-7xl mb-2">{playerWon ? '🏆' : '💀'}</div>
        <h2 className="text-4xl font-black">{playerWon ? 'ROUND WON!' : 'ROUND LOST'}</h2>
        <p className="text-base text-zinc-500 mt-2">
          {bearSide
            ? trainWon
              ? `${train.name} reached the finish line.`
              : `${train.name} was stopped at ${summary.reachedKm.toFixed(1)} km.`
            : trainWon
              ? `${train.name} broke through with ${sim.finalHp} HP remaining.`
              : `The bears stopped the train ${Math.max(0, summary.targetKm - summary.reachedKm).toFixed(1)} km from the finish.`}
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 w-full space-y-5">
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <Stat value={`${summary.reachedKm.toFixed(1)} km`} label="distance" />
          <Stat value={summary.bearsSmashed} label="cleared" />
          <Stat value={`${sim.timeSec}s`} label="time" />
        </div>

        {sim.obstacleEncounters.length > 0 && (
          <div>
            <p className="text-sm text-zinc-500 mb-2">Encounter report — what happened to each obstacle</p>
            <div className="flex flex-wrap gap-1.5">
              {sim.obstacleEncounters.map((encounter, index) => (
                <span key={`${encounter.type}-${index}`} title={`${encounter.name} at ${encounter.atKm} km — dealt ${Math.round(encounter.damageTaken)} damage to the train`} className="text-sm px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 cursor-help">
                  {encounter.emoji} {encounter.outcome}
                </span>
              ))}
            </div>
          </div>
        )}

        {totalDamage > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Damage to train ({Math.round(totalDamage)} total) — impact = collisions, zones = drones/bees/heat, grinding = pushing through blockers, mines = boom</p>
            <DamageBar label="Impact" damage={sim.damageBreakdown.impact} total={totalDamage} color="bg-orange-500" />
            <DamageBar label="Zones" damage={sim.damageBreakdown.zone} total={totalDamage} color="bg-blue-500" />
            <DamageBar label="Grinding" damage={sim.damageBreakdown.grind} total={totalDamage} color="bg-red-500" />
            <DamageBar label="Mines" damage={sim.damageBreakdown.mines} total={totalDamage} color="bg-amber-500" />
          </div>
        )}

        <p className="text-xs text-zinc-400 text-center">Replay seed {sim.seed}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        <CopyReplayButton state={state} className="py-3 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-medium" />
        <button onClick={onNext} className="py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg">
          NEXT ROUND →
        </button>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return <div><div className="font-bold text-lg">{value}</div><div className="text-zinc-400">{label}</div></div>;
}

function DamageBar({ label, damage, total, color }: { label: string; damage: number; total: number; color: string }) {
  if (damage <= 0) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-16 text-zinc-500 text-right">{label}</span>
      <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className={`h-full ${color}`} style={{ width: `${(damage / total) * 100}%` }} /></div>
      <span className="w-10 text-zinc-400">{Math.round(damage)}</span>
    </div>
  );
}
