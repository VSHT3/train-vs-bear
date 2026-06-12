import { MAX_ROUNDS } from '@/lib/catalog';
import { loadStats } from '@/lib/storage';
import type { GameState } from '@/lib/types';
import { CopyReplayButton } from './copy-replay-button';

export function GameOverScreen({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  const bear = state.side === 'bear';
  const lifetime = loadStats();
  const wave = state.freeplay ? state.round - MAX_ROUNDS : 0;
  const prevBest = lifetime.bestFreeplayWave;
  const isNewRecord = state.freeplay && wave - 1 > prevBest;
  const isFirstRun = state.freeplay && prevBest === 0;
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-md mx-auto text-center">
      <div className="text-8xl">🪦</div>
      <h2 className="text-4xl font-black">{state.freeplay ? 'ENDLESS RUN OVER' : 'GAME OVER'}</h2>
      {state.freeplay ? (
        <>
          <p className="text-zinc-500">
            The {bear ? 'train broke through the defense' : 'bears stopped the train'} at <strong>Wave {wave}</strong> in freeplay.
          </p>
          {prevBest > 0 && <p className="text-xs text-zinc-400">Previous best: Wave {prevBest}</p>}
          {isNewRecord && <p className="text-amber-500 text-sm font-semibold">🔥 New record!</p>}
          {isFirstRun && <p className="text-amber-500 text-sm font-semibold">🔥 First freeplay run on record!</p>}
        </>
      ) : (
        <p className="text-zinc-500">
          The {bear ? 'train broke through the defense' : 'bears stopped the train'}. You reached round {state.round}/{MAX_ROUNDS}.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
        <MiniStat emoji="🐻" label="Bears cleared" value={state.totalBearsSmashed.toLocaleString()} />
        <MiniStat emoji="📏" label="Lifetime km" value={`${lifetime.totalKm.toFixed(0)}`} />
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        <CopyReplayButton state={state} className="py-3 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-medium" />
        <button onClick={onNewGame} className="py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg">TRY AGAIN</button>
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
