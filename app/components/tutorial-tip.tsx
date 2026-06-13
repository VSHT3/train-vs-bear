'use client';

const TUTORIAL_KEY = 'train-vs-bear-tutorial';

interface TutorialStep {
  phase: string;
  icon: string;
  title: string;
  text: string;
}

const STEPS: TutorialStep[] = [
  {
    phase: 'title',
    icon: '🚂',
    title: 'Welcome to TRAIN vs BEAR',
    text: 'You can play as the train (buy upgrades, smash through obstacles) or as the bear commander (place traps on the track). Choose your side!',
  },
  {
    phase: 'shop',
    icon: '🛒',
    title: 'Shop Phase',
    text: 'Train crews: buy a better train or install mods to boost stats. Bear commanders: place blockers and zones on the track using your budget. Spend wisely!',
  },
  {
    phase: 'intel',
    icon: '🕵️',
    title: 'Intel Phase',
    text: 'Review the enemy plan. The win probability shows estimated odds from 20 simulated runs. Study the obstacle map before committing to the run.',
  },
  {
    phase: 'run',
    icon: '⚡',
    title: 'Simulation Phase',
    text: 'Watch as the simulation plays out. Train accelerates, hits obstacles, grinds through them, and takes damage from zones. Use Space to pause, arrows to step frame-by-frame.',
  },
  {
    phase: 'result',
    icon: '📊',
    title: 'Result Phase',
    text: 'See the damage breakdown, the most lethal obstacle (the "killer"), and your reward. You earn coins and upgrade points for winning rounds.',
  },
  {
    phase: 'gameover',
    icon: '💀',
    title: 'Game Over',
    text: 'You lost all your hearts! Start a new game to try again. Your lifetime stats and achievements are saved.',
  },
  {
    phase: 'victory',
    icon: '🏆',
    title: 'Victory!',
    text: 'You completed all 7 rounds! You can continue in Freeplay (endless waves) or start a new campaign.',
  },
];

export function tutorialCompleted(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === 'true';
  } catch {
    return true;
  }
}

export function markTutorialCompleted(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, 'true');
  } catch { /* */ }
}

export function TutorialTip({ phase, onDismiss }: { phase: string; onDismiss?: () => void }) {
  const step = STEPS.find((s) => s.phase === phase) ?? null;
  if (!step) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-4 pointer-events-none">
      <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 border-2 border-amber-300 dark:border-amber-700 rounded-2xl shadow-2xl p-5 pointer-events-auto animate-[slide-up_0.3s_ease-out]">
        <div className="flex items-start gap-3">
          <span className="text-3xl shrink-0">{step.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base">{step.title}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{step.text}</p>
          </div>
        </div>
        <div className="flex justify-end mt-3 gap-2">
          <button
            onClick={() => { markTutorialCompleted(); onDismiss?.(); }}
            className="text-xs text-zinc-400 hover:text-zinc-600 px-3 py-1.5"
          >
            Don&apos;t show again
          </button>
          <button
            onClick={() => onDismiss?.()}
            className="px-5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-semibold"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
