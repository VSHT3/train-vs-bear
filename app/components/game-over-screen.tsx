import { MAX_ROUNDS } from '@/lib/catalog';
import type { GameState } from '@/lib/types';

export function GameOverScreen({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  const bear = state.side === 'bear';
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-md mx-auto text-center">
      <div className="text-8xl">🪦</div>
      <h2 className="text-4xl font-black">GAME OVER</h2>
      <p className="text-zinc-500">
        The {bear ? 'train broke through the defense' : 'bears stopped the train'}. You reached round {state.round}/{MAX_ROUNDS}.
      </p>
      <button onClick={onNewGame} className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg">
        TRY AGAIN
      </button>
    </div>
  );
}
