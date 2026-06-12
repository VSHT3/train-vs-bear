import type { PlayerSide } from '@/lib/types';
import { Sprite } from './sprite';

export function TitleScreen({ onStart, onHelp }: { onStart: (side: PlayerSide) => void; onHelp: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="space-y-4">
        <div className="flex justify-center">
          <Sprite src="/sprites/title-hero.png" emoji="🚂🐻" alt="A train charging toward a bear blocking the tracks" size={288} className="rounded-3xl" />
        </div>
        <h2 className="text-6xl sm:text-7xl font-black tracking-tighter">
          TRAIN <span className="text-zinc-400 font-light">vs</span> BEAR
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-xl text-xl">
          Upgrade the train or command the bears. Build your side, inspect the opposition, then let physics settle it.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 w-full max-w-2xl">
        <button
          onClick={() => onStart('train')}
          className="p-5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg hover:scale-[1.02] transition-transform"
        >
          <span className="block text-3xl mb-1">🚂</span>
          PLAY TRAIN
        </button>
        <button
          onClick={() => onStart('bear')}
          className="p-5 bg-amber-700 text-white rounded-2xl font-bold text-lg hover:scale-[1.02] transition-transform"
        >
          <span className="block text-3xl mb-1">🐻</span>
          PLAY BEAR
        </button>
      </div>
      <button onClick={onHelp} className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        ❓ How to play
      </button>
    </div>
  );
}
