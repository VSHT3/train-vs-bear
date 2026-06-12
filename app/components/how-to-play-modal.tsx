'use client';

import { useState, type ReactNode } from 'react';
import { STAT_INFO } from './shop-screen';

const PHASES = [
  {
    icon: '🛒',
    title: 'Shop Phase',
    text: 'Spend your resources to prepare for the upcoming round. Train crews buy trains and mods. Bear commanders place obstacles on the track with a limited budget.',
    tips: [
      'Mods stack with your train\'s base stats — stat bars show where you stand relative to the strongest train',
      'Bear whisperer mods thin out organic bears; drone jammers and mine sweepers negate specific zones',
      'Custom upgrades (AI-evaluated) cost no mod slots but are limited to 3 per run',
      'Place bear blockers in front of zones to slow the train inside zone DPS longer',
      'Mix zone types: stickiness + DPS zones are more dangerous than either alone',
    ],
  },
  {
    icon: '🕵️',
    title: 'Intel Phase',
    text: 'You see the opposing side\'s full plan before the simulation runs. Study the obstacle map and train stats to understand what you\'re up against.',
    tips: [
      'The win probability shows the outcome of 20 simulated runs with your exact setup',
      'Zone overlays on the track map show where DPS/stickiness will hit hardest',
      'Check if the opponent\'s plan counters your mods',
    ],
  },
  {
    icon: '⚡',
    title: 'Simulation Phase',
    text: 'A discrete-timestep physics engine resolves the encounter. Your train accelerates, hits obstacles, grinds through them, and takes damage from zones.',
    tips: [
      'Speed is your best defense — faster trains spend less time in zone DPS',
      'Armor reduces impact and grind damage but does NOT reduce zone DPS',
      'Regeneration only works outside combat (while not grinding)',
      'Energy weapons pre-clear obstacles just ahead of the train',
      'Plow rate determines how fast you grind through blockers — low plow = stuck in lava whales',
      'Keyboard shortcuts: Space = pause, arrows = step frame-by-frame, R = restart',
    ],
  },
  {
    icon: '📊',
    title: 'Result Phase',
    text: 'See the damage breakdown, which obstacle hurt you most (the "killer"), and a full encounter report.',
    tips: [
      'The killer marker highlights which single obstacle dealt the most damage',
      'Stacked damage bars show which source (impact, zones, grinding, mines) contributed most',
      'Compare your performance across rounds in the lifetime stats dashboard',
    ],
  },
];

const STAT_DETAILS = [
  { key: 'topSpeed', note: 'Aimed-for stat. More speed = less time in danger zones.' },
  { key: 'accel', note: 'Crucial after every obstacle stop. High accel gets you back to speed fast.' },
  { key: 'maxHp', note: 'Raw survivability. Lets you survive more mistakes and bigger impacts.' },
  { key: 'armor', note: 'Reduces impact, grind, and mine damage. Does NOT reduce zone DPS (drones, bees, bear tornadoes bypass armor).' },
  { key: 'plow', note: 'Your only defense against heavy blockers (jelly monoliths, steel cubes). Low plow = you grind forever and die.' },
  { key: 'grip', note: 'Counter to sticky zones (honey, glue, jelly). Without grip, sticky zones will slow you to a crawl.' },
  { key: 'heatShield', note: 'Only matters against heat sources (lava whales). Useless against everything else.' },
  { key: 'energyWeapon', note: 'Pre-clears obstacles ahead of the train. Can vaporize entire blocker groups before contact.' },
  { key: 'regen', note: 'Heals you between obstacles. Outvalues maxHp on long rounds with many gaps between blockers.' },
];

const STRATEGIES = [
  { icon: '💨', title: 'Speed runner', desc: 'Maximize topSpeed + accel. Rely on armor/plow for the few things you can\'t outrun. Weak to heavy blocking + high sticky zones.' },
  { icon: '🛡️', title: 'Tank', desc: 'Stack maxHp, armor, and regen. Grind through everything slowly. Weak to zone DPS stacking (ignores armor).' },
  { icon: '🔫', title: 'Tech', desc: 'Max energyWeapon + anti-zone mods (jammer, sweeper, acidProof). Vaporize problems before they start. Weak to cheap massed blockers.' },
  { icon: '🧪', title: 'Generalist', desc: 'Balanced spread. Adaptable but not exceptional at anything. Works best with good intel reads.' },
];

export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'guide' | 'stats' | 'strategy'>('guide');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold">❓ How To Play</h2>
          <button onClick={onClose} aria-label="Close how to play" className="text-zinc-400 hover:text-zinc-700 text-xl">✕</button>
        </div>

        <div className="px-5 pt-3 pb-1 flex gap-1.5 border-b border-zinc-100 dark:border-zinc-800">
          {(['guide', 'stats', 'strategy'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
              {t === 'guide' ? '📖 Guide' : t === 'stats' ? '📊 Stats' : '🧠 Strategies'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === 'guide' && PHASES.map((phase) => (
            <CollapsibleSection key={phase.title} icon={phase.icon} title={phase.title}>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{phase.text}</p>
              {phase.tips.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                  {phase.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-zinc-400 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CollapsibleSection>
          ))}

          {tab === 'stats' && (
            <div className="space-y-3">
              {STAT_DETAILS.map(({ key, note }) => {
                const info = STAT_INFO[key as keyof typeof STAT_INFO];
                return (
                  <div key={key} className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-sm">{info.label}</strong>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{info.desc}</p>
                        <p className="text-[11px] text-zinc-500 mt-1 italic">{note}</p>
                      </div>
                      <span className="text-xs font-mono bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded shrink-0">{info.format(999).replace('999', '')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'strategy' && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500">Build archetypes for the train side. Mix and match mods to create your own style.</p>
              {STRATEGIES.map((s) => (
                <div key={s.title} className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-3.5">
                  <strong className="text-sm">{s.icon} {s.title}</strong>
                  <p className="text-xs text-zinc-500 mt-1">{s.desc}</p>
                </div>
              ))}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 mt-4">
                <strong className="text-sm">🐻 Bear strategy tips</strong>
                <ul className="mt-1.5 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                  <li>• Place a cheap blocker just inside a zone entrance — the train will grind at low speed through the whole DPS zone</li>
                  <li>• Mix honey zones (sticky) with drone/bee zones (DPS) for the highest damage output</li>
                  <li>• BearNado is expensive but devastating: high DPS + stickiness in one short burst</li>
                  <li>• Early blockers eat the train&apos;s energy weapon charges, weakening it for later obstacles</li>
                  <li>• Save budget for a late-game megaUrsa or steel cube — the train will have accumulated damage by then</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({ icon, title, children, defaultOpen = true }: { icon: string; title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/30 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors">
        <span className="text-lg">{icon}</span>
        <span className="font-semibold text-sm flex-1">{title}</span>
        <span className={`text-xs text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}
