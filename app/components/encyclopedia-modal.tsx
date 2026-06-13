'use client';

import { useState } from 'react';
import { BEAR_UNITS, COMMANDER_CARDS, MODS, TRAINS, BEAR_UPGRADES, WAVE_MODIFIERS } from '@/lib/catalog';
import type { BearUnitType } from '@/lib/types';
import { Sprite, modSpriteSrc, trainSpriteSrc, unitSpriteSrc } from './sprite';

type Tab = 'trains' | 'mods' | 'bear' | 'upgrades' | 'cards' | 'waves';

export function EncyclopediaModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('trains');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold">📖 Encyclopedia</h2>
          <button onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-zinc-700 text-xl">✕</button>
        </div>

        <div className="flex gap-1.5 px-5 pt-3 pb-2 overflow-x-auto border-b border-zinc-100 dark:border-zinc-800">
          {([
            { key: 'trains' as const, icon: '🚂', label: 'Trains' },
            { key: 'mods' as const, icon: '🔧', label: 'Mods' },
            { key: 'bear' as const, icon: '🐻', label: 'Bear Units' },
            { key: 'upgrades' as const, icon: '⚡', label: 'Upgrades' },
            { key: 'cards' as const, icon: '🃏', label: 'Cards' },
            { key: 'waves' as const, icon: '🌊', label: 'Modifiers' },
          ]).map(({ key, icon, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${tab === key ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
              {icon} {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {tab === 'trains' && TRAINS.map((t) => (
            <div key={t.id} className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Sprite src={trainSpriteSrc(t.id)} emoji={t.emoji} alt={t.name} size={64} />
                <div className="min-w-0 flex-1">
                  <strong className="text-base">{t.name}</strong>
                  <p className="text-xs text-zinc-500">{t.desc}</p>
                </div>
                <span className="text-sm font-semibold text-amber-600 shrink-0">🪙{t.cost}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3 text-xs">
                <span>{t.base.topSpeed} km/h</span>
                <span>{t.base.accel} accel</span>
                <span>{t.base.maxHp} HP</span>
                <span>{t.modSlots} slots</span>
                <span>{t.cars} cars</span>
                <span>armor {Math.round(t.base.armor * 100)}%</span>
              </div>
            </div>
          ))}

          {tab === 'mods' && MODS.map((m) => (
            <div key={m.id} className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Sprite src={modSpriteSrc(m.id)} emoji={m.emoji} alt={m.name} size={48} />
                <div className="min-w-0 flex-1">
                  <strong className="text-sm">{m.name}</strong>
                  <p className="text-xs text-zinc-500">{m.desc}</p>
                </div>
                <span className="text-sm shrink-0">🪙{m.coins}{m.points > 0 ? ` ⭐${m.points}` : ''}</span>
              </div>
              {(Object.entries(m.effects) as Array<[string, number]>).filter(([, v]) => v !== 0).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(Object.entries(m.effects) as Array<[string, number]>).filter(([, v]) => v !== 0).map(([k, v]) => (
                    <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400">{k} +{v}</span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {tab === 'bear' && (Object.keys(BEAR_UNITS) as BearUnitType[]).map((type) => {
            const u = BEAR_UNITS[type];
            return (
              <div key={type} className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Sprite src={unitSpriteSrc(type)} emoji={u.emoji} alt={u.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm">{u.name}</strong>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${u.kind === 'blocker' ? 'bg-red-50 dark:bg-red-950/40 text-red-600' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600'}`}>{u.kind}</span>
                    </div>
                    <p className="text-xs text-zinc-500">{u.desc}</p>
                  </div>
                  <span className="text-sm font-semibold text-amber-600 shrink-0">{u.cost}cr</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-zinc-500">
                  {u.mass && <span>Mass: {u.mass}t</span>}
                  {u.impactDamage && <span>Impact: {u.impactDamage}</span>}
                  {u.grindDps && <span>Grind: {u.grindDps} dps</span>}
                  {u.zoneLengthKm && <span>Zone: {u.zoneLengthKm} km</span>}
                  {u.stickiness && <span>Sticky: {Math.round(u.stickiness * 100)}%</span>}
                  {u.zoneDps && <span>DPS: {u.zoneDps}</span>}
                  {u.minesPerKm && <span>Mines: {u.minesPerKm}/km</span>}
                  {u.mineDamage && <span>Mine dmg: {u.mineDamage}</span>}
                  {u.heat && <span className="text-orange-500">🔥 Heat</span>}
                  {u.acid && <span className="text-green-500">🧪 Acid</span>}
                  {u.organic && <span className="text-amber-500">🧸 Organic</span>}
                </div>
              </div>
            );
          })}

          {tab === 'upgrades' && BEAR_UPGRADES.map((u) => (
            <div key={u.id} className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{u.emoji}</span>
                <div className="min-w-0 flex-1">
                  <strong className="text-sm">{u.name}</strong>
                  <p className="text-xs text-zinc-500">{u.desc}</p>
                </div>
                <span className="text-sm shrink-0">{u.cost}cr · Lv.{u.maxLevel}</span>
              </div>
            </div>
          ))}

          {tab === 'cards' && COMMANDER_CARDS.map((c) => (
            <div key={c.id} className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{c.emoji}</span>
                <div className="min-w-0 flex-1">
                  <strong className="text-sm">{c.name}</strong>
                  <p className="text-xs text-zinc-500">{c.desc}</p>
                  <p className="text-[10px] text-zinc-400 italic mt-0.5">&ldquo;{c.flavor}&rdquo;</p>
                </div>
                <span className="text-sm font-semibold text-amber-600 shrink-0">{c.cost}cr</span>
              </div>
            </div>
          ))}

          {tab === 'waves' && Object.values(WAVE_MODIFIERS).map((w) => (
            <div key={w.id} className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{w.emoji}</span>
                <div className="min-w-0 flex-1">
                  <strong className="text-sm">{w.name}</strong>
                  <p className="text-xs text-zinc-500">{w.desc}</p>
                  <p className="text-[10px] text-zinc-400 italic mt-0.5">&ldquo;{w.flavor}&rdquo;</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
