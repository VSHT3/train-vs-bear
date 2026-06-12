const ROUND_INTROS = [
  null,
  { subtitle: 'The first clash begins.', emoji: '🐻', line: 'Basic hardware. Questionable judgment.' },
  { subtitle: 'Both sides have increased the budget.', emoji: '🐻‍❄️', line: 'Standard tactics are already obsolete.' },
  { subtitle: 'The track is becoming a strategic problem.', emoji: '🧨', line: 'Expect layered defenses and harder impacts.' },
  { subtitle: 'The opposition has studied the replay.', emoji: '🕵️', line: 'Adaptation is no longer optional.' },
  { subtitle: 'Experimental equipment is authorized.', emoji: '🐋', line: 'Some of it should not exist.' },
  { subtitle: 'Desperation has entered the procurement process.', emoji: '🌪️', line: 'Everything is expensive and dangerous.' },
  { subtitle: 'Final round. No reserves remain.', emoji: '👹', line: 'Go big or go extinct.' },
];

export function RoundIntroScreen({ round, onDismiss }: { round: number; onDismiss: () => void }) {
  const intro = ROUND_INTROS[Math.min(round, ROUND_INTROS.length - 1)];
  if (!intro) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 text-center">
      <div className="space-y-6">
        <div className="text-7xl animate-bounce">{intro.emoji}</div>
        <h2 className="text-5xl font-black tracking-tighter">Round {round}</h2>
        <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-md italic">
          &ldquo;{intro.subtitle}&rdquo;
        </p>
        <p className="text-sm text-zinc-400 max-w-sm">{intro.line}</p>
      </div>
      <button
        onClick={onDismiss}
        className="px-10 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-xl font-bold hover:scale-105 transition-transform"
      >
        LET&apos;S GO →
      </button>
    </div>
  );
}
