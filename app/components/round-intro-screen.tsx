'use client';

import { useEffect, useState } from 'react';

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

const FREEPLAY_INTROS = [
  { subtitle: 'The campaign is over. The track remains.', emoji: '♾️', line: 'Endless. Relentless. How far can you go?' },
  { subtitle: 'Physics has stopped pretending.', emoji: '🔥', line: 'The bears are innovating. So should you.' },
  { subtitle: 'Scraping the bottom of the bear budget.', emoji: '🧊', line: 'Every credit is now a strategic decision.' },
  { subtitle: 'The train howls through the void.', emoji: '🌌', line: 'There is no finish line. Only the next wave.' },
  { subtitle: 'Bears have formed committees.', emoji: '📋', line: 'Inefficient. Terrifying. Somehow working.' },
  { subtitle: 'The simulation is starting to notice you.', emoji: '👁️', line: 'It is not impressed. It is never impressed.' },
  { subtitle: 'Your train has developed opinions.', emoji: '🗣️', line: 'It refuses to back down. Neither do the bears.' },
  { subtitle: 'The noise is starting to attract things.', emoji: '🕳️', line: 'Dark shapes gather at the edge of the rails.' },
  { subtitle: 'Track maintenance has been discontinued.', emoji: '⚡', line: 'The rails are held together by willpower and regret.' },
  { subtitle: 'Welcome to the noise.', emoji: '📯', line: 'The bears have accepted entropy as their co-commander.' },
];

export function RoundIntroScreen({ round, freeplay, onDismiss }: { round: number; freeplay?: boolean; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [emojiVisible, setEmojiVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setEmojiVisible(true), 100);
    const t2 = setTimeout(() => setVisible(true), 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (freeplay) {
    const wave = round - 7;
    const intro = FREEPLAY_INTROS[Math.min(wave - 1, FREEPLAY_INTROS.length - 1)];
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 text-center relative overflow-hidden">
        {/* Track lines */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
          <div className="absolute top-1/3 left-0 right-0 h-px bg-current" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-current" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute h-px bg-current" style={{ top: `${20 + i * 12}%`, left: 0, right: 0 }} />
          ))}
        </div>
        <div className={`space-y-6 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className={`text-6xl transition-all duration-700 ${emojiVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>{intro.emoji}</div>
          <div className="text-xs text-purple-500 dark:text-purple-400 font-semibold tracking-widest uppercase">Free Play</div>
          <h2 className="text-5xl font-black tracking-tighter">Wave {wave}</h2>
          <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-md italic">&ldquo;{intro.subtitle}&rdquo;</p>
          <p className="text-sm text-zinc-400 max-w-sm">{intro.line}</p>
          <p className="text-xs text-zinc-500">{8 + 6 * (round - 1)} km · {380 + 360 * (round - 1)} credits</p>
        </div>
        <button onClick={onDismiss} className="px-10 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-xl font-bold hover:scale-105 hover:shadow-xl transition-all active:scale-[0.98]">
          DEPLOY →
        </button>
      </div>
    );
  }

  const intro = ROUND_INTROS[Math.min(round, ROUND_INTROS.length - 1)];
  if (!intro) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 text-center relative overflow-hidden">
      {/* Subtle track lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="absolute h-px bg-current" style={{ top: `${15 + i * 15}%`, left: 0, right: 0 }} />
        ))}
      </div>
      <div className={`space-y-6 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className={`text-7xl transition-all duration-700 ${emojiVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>{intro.emoji}</div>
        <h2 className="text-5xl font-black tracking-tighter">Round {round}</h2>
        <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-md italic">&ldquo;{intro.subtitle}&rdquo;</p>
        <p className="text-sm text-zinc-400 max-w-sm">{intro.line}</p>
      </div>
      <button onClick={onDismiss} className="px-10 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-xl font-bold hover:scale-105 hover:shadow-xl transition-all active:scale-[0.98]">
        LET&apos;S GO →
      </button>
    </div>
  );
}
