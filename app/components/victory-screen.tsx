import { MAX_ROUNDS } from '@/lib/catalog';
import { loadStats } from '@/lib/storage';
import type { GameState } from '@/lib/types';
import { CopyReplayButton } from './copy-replay-button';

export function VictoryScreen({ state, onNewGame, onFreeplay }: { state: GameState; onNewGame: () => void; onFreeplay?: () => void }) {
  const bear = state.side === 'bear';
  const lifetime = loadStats();
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-md mx-auto text-center">
      <div className="text-8xl">{bear ? '🐻👑' : '🚂👑'}</div>
      <h2 className="text-4xl font-black">{bear ? 'THE TRACK HOLDS!' : 'YOU WIN!'}</h2>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 w-full space-y-2">
        <p className="text-zinc-500">
          All {MAX_ROUNDS} rounds won as the {bear ? 'bear commander' : 'train engineer'}.
        </p>
        <p className="font-bold">{state.totalKm.toFixed(0)} km simulated · {state.totalBearsSmashed} bears cleared</p>
      </div>
      {onFreeplay && (
        <div className="w-full bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-400/30 dark:border-purple-400/20 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">🔥 Freeplay unlocked!</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Push beyond the campaign. Rounds scale infinitely, hearts refresh, and every wave is a new record. How far can you go?</p>
          <button onClick={onFreeplay} className="w-full mt-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-colors">
            CONTINUE TO ENDLESS →
          </button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        <CelebStat emoji="🏆" label="Games won" value={lifetime.gamesWon.toString()} />
        <CelebStat emoji="🐻" label="Bears" value={lifetime.totalBearsSmashed.toLocaleString()} />
        <CelebStat emoji="📏" label="Total km" value={`${lifetime.totalKm.toFixed(0)}`} />
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        <CopyReplayButton state={state} className="py-3 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-medium" />
        <button onClick={onNewGame} className="py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg">PLAY AGAIN</button>
      </div>
    </div>
  );
}

function CelebStat({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/20 p-2.5 text-center text-sm">
      <div className="text-lg">{emoji}</div>
      <div className="font-bold">{value}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </div>
  );
}
