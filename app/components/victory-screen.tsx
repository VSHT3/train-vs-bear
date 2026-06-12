import { MAX_ROUNDS } from '@/lib/catalog';
import type { GameState } from '@/lib/types';
import { CopyReplayButton } from './copy-replay-button';

export function VictoryScreen({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  const bear = state.side === 'bear';
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
      <div className="grid grid-cols-2 gap-3 w-full">
        <CopyReplayButton state={state} className="py-3 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-medium" />
        <button onClick={onNewGame} className="py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg">PLAY AGAIN</button>
      </div>
    </div>
  );
}
