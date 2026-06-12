const HELP_SECTIONS = [
  ['🎯', 'Objective', 'Win all 7 rounds. Each round moves through shop, intel, simulation, and result. Lose all 3 hearts and the campaign ends.'],
  ['🚂', 'Train side', 'Buy trains and mods, inspect the bear plan, then try to reach the finish line.'],
  ['🐻', 'Bear side', 'Spend bear credits to place blockers and zones, inspect the incoming train, then defend the finish line.'],
  ['🪙', 'Resources', 'Train crews spend coins and stars. Bear command receives a fresh defense budget each round.'],
  ['🔁', 'True replays', 'Share a complete run with the exact train stats, flags, bear plan, perspective, target distance, and simulation seed.'],
];

export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold">❓ How To Play</h2>
          <button onClick={onClose} aria-label="Close how to play" className="text-zinc-400 hover:text-zinc-700 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {HELP_SECTIONS.map(([icon, title, body]) => (
            <div key={title} className="flex items-start gap-3">
              <span className="text-xl">{icon}</span>
              <div><h3 className="font-semibold text-sm">{title}</h3><p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{body}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
