'use client';

import { useState } from 'react';
import { BEAR_UNITS, BEAR_UPGRADES, COMMANDER_CARDS, MAX_CUSTOM_MODS, MODS, TRAINS, getTrain, targetKmForRound } from '@/lib/catalog';
import {
  bearBudgetRemaining,
  canAffordBearUnit,
  canAffordMod,
  canAffordTrain,
} from '@/lib/state';
import { composeStats } from '@/lib/simulate';
import { Sprite, modSpriteSrc, trainSpriteSrc, unitSpriteSrc } from './sprite';
import type { BearUnitType, GameState, Mod, ModFlag, TrainStats } from '@/lib/types';

const FLAG_LABELS: Record<ModFlag, string> = {
  droneJammer: '📡 Drone Jammer',
  mineSweeper: '🧹 Mine Sweeper',
  acidProof: '🧪 Acid-Proof',
  bearWhisperer: '📯 Bear Whisperer',
  gooseRepellent: '🦢 Goose Repellent',
};

export const STAT_INFO: Record<keyof TrainStats, { label: string; format: (v: number) => string; diff: (v: number) => string; desc: string }> = {
  topSpeed: {
    label: 'Top Speed',
    format: (v) => `${v} km/h`,
    diff: (v) => `${v > 0 ? '+' : ''}${v} km/h`,
    desc: 'Maximum speed on open track. Faster trains reach the finish before damage piles up.',
  },
  accel: {
    label: 'Acceleration',
    format: (v) => `${v} km/h/s`,
    diff: (v) => `${v > 0 ? '+' : ''}${v} km/h/s`,
    desc: 'How quickly speed builds back up after every obstacle stops you.',
  },
  maxHp: {
    label: 'Hull (HP)',
    format: (v) => `${v}`,
    diff: (v) => `${v > 0 ? '+' : ''}${v}`,
    desc: 'Structural integrity. At 0 the train is destroyed and the round is lost.',
  },
  armor: {
    label: 'Armor',
    format: (v) => `${Math.round(v * 100)}%`,
    diff: (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`,
    desc: 'Percentage of all incoming damage that is ignored.',
  },
  plow: {
    label: 'Plow',
    format: (v) => `${v} t/s`,
    diff: (v) => `${v > 0 ? '+' : ''}${v} t/s`,
    desc: 'Tons of obstacle cleared per second while grinding through blockers. Low plow = stuck on steel cubes.',
  },
  grip: {
    label: 'Grip',
    format: (v) => `${Math.round(v * 100)}%`,
    diff: (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`,
    desc: 'Resistance to sticky slow-downs: honey floods, glue rivers, bear jelly.',
  },
  heatShield: {
    label: 'Heat Shield',
    format: (v) => `${Math.round(v * 100)}%`,
    diff: (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`,
    desc: 'Reduces heat damage from lava whales and other molten hazards.',
  },
  energyWeapon: {
    label: 'Energy Weapon',
    format: (v) => `${v} dps`,
    diff: (v) => `${v > 0 ? '+' : ''}${v} dps`,
    desc: 'Zaps obstacles just ahead of the train, shrinking them before contact.',
  },
  regen: {
    label: 'Regeneration',
    format: (v) => `${v} hp/s`,
    diff: (v) => `${v > 0 ? '+' : ''}${v} hp/s`,
    desc: 'Hull repaired per second. Outheals drone fire and slow grinding damage.',
  },
};

const STAT_KEYS = Object.keys(STAT_INFO) as Array<keyof TrainStats>;

type CustomResult = Mod | { valid: false; reason: string } | null;

interface ShopScreenProps {
  state: GameState;
  stats: TrainStats;
  installedMods: Mod[];
  customPrompt: string;
  customResult: CustomResult;
  customLoading: boolean;
  onCustomPromptChange: (value: string) => void;
  onBuyTrain: (id: string) => void;
  onInstallMod: (id: string) => void;
  onRemoveMod: (id: string) => void;
  onCustomUpgrade: () => void;
  onConfirmCustom: () => void;
  onPlaceBear: (type: BearUnitType, atKm: number) => void;
  onRemoveBear: (index: number) => void;
  onBuyBearUpgrade?: (id: string) => void;
  onSelectCommanderCard?: (cardId: string) => void;
  onReady: () => void;
}

export function ShopScreen(props: ShopScreenProps) {
  return props.state.side === 'bear' ? <BearShop {...props} /> : <TrainShop {...props} />;
}

function TrainShop({
  state,
  stats,
  installedMods,
  customPrompt,
  customResult,
  customLoading,
  onCustomPromptChange,
  onBuyTrain,
  onInstallMod,
  onRemoveMod,
  onCustomUpgrade,
  onConfirmCustom,
  onReady,
}: ShopScreenProps) {
  const [tab, setTab] = useState<'mods' | 'trains' | 'custom'>('mods');
  const [previewMod, setPreviewMod] = useState<Mod | null>(null);
  const train = getTrain(state.trainId);

  const withMod = (mod: Mod | null): TrainStats | null => {
    if (!mod) return null;
    const allMods = [...installedMods, ...state.customMods];
    if (state.modIds.includes(mod.id)) return null;
    return composeStats(train.base, [...allMods, mod]);
  };
  const previewStats = previewMod ? withMod(previewMod) : null;

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-screen-2xl mx-auto w-full">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <div className="flex gap-2">
            {(['mods', 'trains', 'custom'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`px-6 py-3 rounded-xl text-base font-semibold ${
                  tab === item ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}
              >
                {item === 'mods' ? '🔧 Mods' : item === 'trains' ? '🚂 Trains' : '✨ Custom'}
              </button>
            ))}
          </div>

          {tab === 'trains' && (
            <div className="grid gap-4 xl:grid-cols-2">
              {TRAINS.map((item) => {
                const owned = item.id === state.trainId;
                const affordable = canAffordTrain(state, item.id);
                return (
                  <button
                    key={item.id}
                    disabled={owned || !affordable}
                    onClick={() => onBuyTrain(item.id)}
                    className={`text-left p-5 rounded-2xl border-2 ${
                      owned ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : affordable ? 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-400' : 'border-zinc-200 dark:border-zinc-800 opacity-45'
                    }`}
                  >
                    <div className="flex justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <Sprite src={trainSpriteSrc(item.id)} emoji={item.emoji} alt={item.name} size={96} />
                        <div className="min-w-0">
                          <strong className="text-lg">{item.name}</strong>
                          <p className="text-sm text-zinc-500 mt-1">{item.desc}</p>
                          <p className="text-sm text-zinc-400 mt-1">{item.modSlots} mod slots · {STAT_INFO.topSpeed.format(item.base.topSpeed)} · {item.base.maxHp} HP</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-amber-500 shrink-0">{owned ? '✓ owned' : `🪙 ${item.cost}`}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'mods' && (
            <div className="grid gap-3 xl:grid-cols-2">
              {MODS.map((mod) => {
                const installed = state.modIds.includes(mod.id);
                const affordable = canAffordMod(state, mod.id);
                return (
                  <button
                    key={mod.id}
                    disabled={installed || !affordable}
                    onClick={() => {
                      onInstallMod(mod.id);
                      setPreviewMod(null);
                    }}
                    onMouseEnter={() => setPreviewMod(mod)}
                    onFocus={() => setPreviewMod(mod)}
                    onMouseLeave={() => setPreviewMod(null)}
                    onBlur={() => setPreviewMod(null)}
                    className={`text-left p-4 rounded-2xl border-2 ${installed ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : affordable ? 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-400' : 'border-zinc-200 dark:border-zinc-800 opacity-45'}`}
                  >
                    <div className="flex gap-4">
                      <Sprite src={modSpriteSrc(mod.id)} emoji={mod.emoji} alt={mod.name} size={64} />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3">
                          <strong className="text-base">{mod.name}</strong>
                          <span className="text-base font-semibold text-amber-500 shrink-0">🪙{mod.coins}{mod.points > 0 ? ` ⭐${mod.points}` : ''}</span>
                        </div>
                        <p className="text-sm text-zinc-500 mt-0.5">{mod.desc}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2 text-sm">
                          {(Object.entries(mod.effects) as Array<[keyof TrainStats, number]>).map(([key, value]) => (
                            <span key={key} className="px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400">
                              {STAT_INFO[key].label} {STAT_INFO[key].diff(value)}
                            </span>
                          ))}
                          {(mod.flags ?? []).map((flag) => (
                            <span key={flag} className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400">
                              {FLAG_LABELS[flag]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'custom' && (
            <div className="space-y-4 max-w-3xl">
              <p className="text-base text-zinc-500">Describe a train upgrade. The AI arbiter prices valid ideas and rejects instant-win equipment.</p>
              <div className="flex gap-3">
                <input
                  value={customPrompt}
                  onChange={(event) => onCustomPromptChange(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && onCustomUpgrade()}
                  placeholder="Bear-seeking missile launcher..."
                  className="flex-1 px-5 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base"
                />
                <button onClick={onCustomUpgrade} disabled={customLoading || !customPrompt.trim()} className="px-6 py-3 bg-purple-600 text-white rounded-xl text-base font-semibold disabled:opacity-50">
                  {customLoading ? 'Evaluating...' : 'Propose'}
                </button>
              </div>
              {customResult && (
                <div className="p-5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                  {'valid' in customResult && !customResult.valid ? (
                    <p className="text-base text-red-500">{customResult.reason}</p>
                  ) : 'id' in customResult ? (
                    (() => {
                      const effectEntries = (Object.entries(customResult.effects) as Array<[keyof TrainStats, number]>).filter(([, v]) => v !== 0);
                      const affordable = state.coins >= customResult.coins && state.points >= customResult.points;
                      const slotsFull = state.customMods.length >= MAX_CUSTOM_MODS;
                      return (
                        <div className="space-y-3">
                          <div className="flex justify-between gap-3">
                            <strong className="text-lg">{customResult.emoji} {customResult.name}</strong>
                            <span className="text-base font-semibold text-amber-500 shrink-0">🪙{customResult.coins} {customResult.points > 0 ? `⭐${customResult.points}` : ''}</span>
                          </div>
                          <p className="text-base text-zinc-500">{customResult.desc}</p>
                          <div className="flex flex-wrap gap-2 text-sm">
                            {effectEntries.map(([key, value]) => (
                              <span key={key} className={`px-2.5 py-1 rounded-full border ${value > 0 ? 'border-green-300 text-green-600 dark:border-green-800' : 'border-red-300 text-red-500 dark:border-red-800'}`}>
                                {STAT_INFO[key].label} {STAT_INFO[key].diff(value)}
                              </span>
                            ))}
                            {(customResult.flags ?? []).map((flag) => (
                              <span key={flag} className="px-2.5 py-1 rounded-full border border-purple-300 text-purple-600 dark:border-purple-800">
                                {FLAG_LABELS[flag]}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={onConfirmCustom}
                            disabled={!affordable || slotsFull}
                            className="px-5 py-3 rounded-xl bg-green-600 text-white text-base font-semibold disabled:opacity-50"
                          >
                            Install for 🪙{customResult.coins}{customResult.points > 0 ? ` + ⭐${customResult.points}` : ''}
                          </button>
                          {slotsFull && <p className="text-sm text-red-500">Custom upgrade limit reached ({MAX_CUSTOM_MODS}).</p>}
                          {!slotsFull && !affordable && <p className="text-sm text-red-500">Not enough {state.coins < customResult.coins ? 'coins' : 'upgrade points'}.</p>}
                        </div>
                      );
                    })()
                  ) : null}
                </div>
              )}
            </div>
          )}

          <button onClick={onReady} className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-xl">
            READY — See Bear Intel
          </button>
          <p className="text-sm text-zinc-400 text-center">{train.modSlots - state.modIds.length} train mod slots remaining</p>
        </div>

        <div className="flex flex-col gap-4 order-first lg:order-none lg:sticky lg:top-6">
          <TrainCard state={state} stats={stats} installedMods={installedMods} onRemoveMod={onRemoveMod} />

          <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-5 text-base min-h-32">
            {previewMod && previewStats ? (
              <>
                <div className="font-semibold mb-3">{previewMod.emoji} {previewMod.name} — stat change preview</div>
                <div className="grid grid-cols-1 gap-y-1.5">
                  {STAT_KEYS.map((key) => {
                    const cur = stats[key];
                    const next = previewStats[key];
                    const diff = next - cur;
                    if (diff === 0) return null;
                    const info = STAT_INFO[key];
                    return (
                      <div key={key} className="flex items-baseline gap-2" title={info.desc}>
                        <span className="text-zinc-500">{info.label}:</span>
                        <span className={diff > 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                          {info.format(cur)} → {info.format(next)}
                        </span>
                        <span className={`text-sm ${diff > 0 ? 'text-green-500' : 'text-red-500'}`}>({info.diff(Math.round(diff * 100) / 100)})</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-zinc-400">Hover or focus a mod to preview its stat changes here.</p>
            )}
          </div>

          <StatLegend />
        </div>
      </div>
    </div>
  );
}

function StatLegend() {
  return (
    <details className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <summary className="text-base font-semibold cursor-pointer select-none">📖 What do the stats mean?</summary>
      <dl className="mt-4 space-y-3">
        {STAT_KEYS.map((key) => (
          <div key={key}>
            <dt className="font-semibold text-base">{STAT_INFO[key].label}</dt>
            <dd className="text-sm text-zinc-500">{STAT_INFO[key].desc}</dd>
          </div>
        ))}
        <div>
          <dt className="font-semibold text-base">Special equipment</dt>
          <dd className="text-sm text-zinc-500">
            Some mods grant immunities instead of stats: drone jammers silence drone swarms, mine sweepers clear minefields,
            acid-proof wax shrugs off acid cubes, the bear whisperer convinces some bears to simply leave, and goose repellent
            handles the geese. Nobody else handles the geese.
          </dd>
        </div>
      </dl>
    </details>
  );
}

const TRAIN_MAX_STATS: Record<keyof TrainStats, number> = {
  topSpeed: Math.max(...TRAINS.map((t) => t.base.topSpeed)),
  accel: Math.max(...TRAINS.map((t) => t.base.accel)),
  maxHp: Math.max(...TRAINS.map((t) => t.base.maxHp)),
  armor: Math.max(...TRAINS.map((t) => t.base.armor)),
  plow: Math.max(...TRAINS.map((t) => t.base.plow)),
  grip: Math.max(...TRAINS.map((t) => t.base.grip)),
  heatShield: Math.max(...TRAINS.map((t) => t.base.heatShield)),
  energyWeapon: Math.max(...TRAINS.map((t) => t.base.energyWeapon)),
  regen: Math.max(...TRAINS.map((t) => t.base.regen)),
};

function StatBar({ label, value, max, format, color }: { label: string; value: number; max: number; format: (v: number) => string; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="group relative cursor-help" title={`${label}: ${format(value)}`}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="text-xs font-mono text-zinc-500">{format(value)}</span>
      </div>
      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TrainCard({
  state,
  stats,
  installedMods,
  onRemoveMod,
}: {
  state: GameState;
  stats: TrainStats;
  installedMods: Mod[];
  onRemoveMod: (id: string) => void;
}) {
  const train = getTrain(state.trainId);
  return (
    <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center gap-4 mb-5">
        <Sprite src={trainSpriteSrc(train.id)} emoji={train.emoji} alt={train.name} size={96} />
        <div className="min-w-0">
          <h3 className="text-2xl font-bold">{train.name}</h3>
          <p className="text-sm text-zinc-400 mt-0.5">{train.desc}</p>
          <p className="text-xs text-zinc-500 mt-1">{train.modSlots} slots · {train.cars} cars</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {STAT_KEYS.map((key) => (
          <StatBar key={key} label={STAT_INFO[key].label} value={stats[key]} max={TRAIN_MAX_STATS[key]} format={STAT_INFO[key].format} color={
            key === 'topSpeed' || key === 'accel' ? 'bg-blue-500' :
            key === 'maxHp' || key === 'armor' ? 'bg-green-500' :
            key === 'plow' || key === 'grip' ? 'bg-amber-500' :
            key === 'heatShield' ? 'bg-orange-500' :
            key === 'energyWeapon' ? 'bg-purple-500' :
            key === 'regen' ? 'bg-cyan-500' : 'bg-zinc-500'
          } />
        ))}
      </div>
      {(installedMods.length > 0 || state.customMods.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-zinc-100 dark:border-zinc-800 pt-4">
          {installedMods.map((mod) => (
            <button key={mod.id} onClick={() => onRemoveMod(mod.id)} title={`Remove ${mod.name} (refunds nothing)`} className="text-sm px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-red-100 dark:hover:bg-red-950 transition-colors">
              {mod.emoji} {mod.name} ✕
            </button>
          ))}
          {state.customMods.map((mod) => <span key={mod.id} className="text-sm px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">{mod.emoji} {mod.name}</span>)}
        </div>
      )}
    </div>
  );
}

const ZONE_STYLES: Record<string, string> = {
  honeyZone: 'bg-amber-400/30',
  polarMinefield: 'bg-cyan-400/20',
  droneSwarm: 'bg-indigo-400/20',
  beeSwarm: 'bg-yellow-400/20',
  glueRiver: 'bg-cyan-300/25',
  mirrorMaze: 'bg-pink-300/20',
  bearNado: 'bg-purple-400/25',
};

function BearShop({ state, onPlaceBear, onRemoveBear, onBuyBearUpgrade, onSelectCommanderCard, onReady }: ShopScreenProps) {
  const [selectedType, setSelectedType] = useState<BearUnitType>('bear');
  const [atKm, setAtKm] = useState(1.5);
  const [unitFilter, setUnitFilter] = useState<'all' | 'blocker' | 'zone'>('all');
  const targetKm = targetKmForRound(state.round);
  const remaining = bearBudgetRemaining(state);
  const selected = BEAR_UNITS[selectedType];

  const filteredTypes = (Object.keys(BEAR_UNITS) as BearUnitType[]).filter((t) => unitFilter === 'all' || BEAR_UNITS[t].kind === unitFilter);

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-8 gap-6 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-3xl font-black">🐻 Bear Defense Shop</h2><p className="text-base text-zinc-500 mt-1">Place blockers and zones to stop the incoming train.</p></div>
        <div className="text-right"><div className="text-3xl font-black text-amber-600">{remaining}</div><div className="text-sm text-zinc-400">credits remaining</div></div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="relative h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden">
          {/* Zone overlays */}
          {state.bearPlacements.filter((p) => BEAR_UNITS[p.type].kind === 'zone').map((placement, i) => {
            const startPct = (placement.atKm / targetKm) * 100;
            const lengthPct = ((BEAR_UNITS[placement.type].zoneLengthKm ?? 1) / targetKm) * 100;
            return (
              <div
                key={`zone-bg-${i}`}
                className={`absolute inset-y-0 ${ZONE_STYLES[placement.type] ?? 'bg-zinc-300/30'}`}
                style={{ left: `${startPct}%`, width: `${lengthPct}%` }}
              />
            );
          })}
          {/* Blockers */}
          {state.bearPlacements.map((placement, index) => (
            <button
              key={`${placement.type}-${placement.atKm}-${index}`}
              onClick={() => onRemoveBear(index)}
              title={`Remove ${BEAR_UNITS[placement.type].name} ×${placement.count}`}
              className="absolute top-1/2 -translate-y-1/2 text-xl hover:scale-125 transition-transform z-10"
              style={{ left: `${Math.min((placement.atKm / targetKm) * 100, 94)}%` }}
            >
              {BEAR_UNITS[placement.type].emoji}<span className="text-xs">{placement.count > 1 ? placement.count : ''}</span>
            </button>
          ))}
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xl z-10">🏁</span>
          {/* Tick marks at 5km intervals */}
          {Array.from({ length: Math.floor(targetKm / 5) + 1 }, (_, i) => (
            <span key={`tick-${i}`} className="absolute bottom-0.5 text-[8px] text-zinc-400" style={{ left: `${(i * 5 / targetKm) * 100}%` }}>{i * 5}</span>
          ))}
        </div>
        <div>
          <label htmlFor="bear-position" className="flex justify-between text-sm text-zinc-500 mb-1"><span>Placement position</span><strong className="text-base">{atKm.toFixed(1)} km</strong></label>
          <input id="bear-position" type="range" min="1" max={Math.max(1, targetKm - 1)} step="0.1" value={atKm} onChange={(event) => setAtKm(Number(event.target.value))} className="w-full" />
        </div>
        <button
          disabled={!canAffordBearUnit(state, selectedType)}
          onClick={() => onPlaceBear(selectedType, atKm)}
          className="w-full py-4 bg-amber-700 text-white rounded-xl font-bold text-lg disabled:opacity-40"
        >
          Place {selected.emoji} {selected.name} at {atKm.toFixed(1)} km · {selected.cost} credits
        </button>
      </div>

      <div className="flex gap-2">
        {(['all', 'blocker', 'zone'] as const).map((f) => (
          <button key={f} onClick={() => setUnitFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${unitFilter === f ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
            {f === 'all' ? 'All units' : f === 'blocker' ? '🚧 Blockers' : '🌊 Zones'}
          </button>
        ))}
        <span className="text-xs text-zinc-400 self-center ml-auto">{filteredTypes.length} units</span>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredTypes.map((type) => {
          const unit = BEAR_UNITS[type];
          const count = state.bearPlacements.filter((p) => p.type === type).reduce((s, p) => s + p.count, 0);
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`text-left p-4 rounded-2xl border-2 transition-colors ${selectedType === type ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/20' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400'}`}
            >
              <div className="flex gap-4">
                <Sprite src={unitSpriteSrc(type)} emoji={unit.emoji} alt={unit.name} size={72} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 items-start">
                    <strong className="text-base">{unit.name}</strong>
                    <div className="text-right shrink-0">
                      <span className="text-base font-semibold text-amber-600">{unit.cost}</span>
                      {count > 0 && <span className="block text-xs text-zinc-400">×{count}</span>}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500 mt-1">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${unit.kind === 'blocker' ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'} mr-1.5`}>
                      {unit.kind}
                    </span>
                    {unit.desc}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bear Upgrades */}
      <details className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden open:pb-4">
        <summary className="p-4 font-bold text-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors select-none">
          ⚡ Bear Upgrades
        </summary>
        <div className="px-4 pt-2 space-y-3">
          {BEAR_UPGRADES.map((upgrade) => {
            const currentLevel = state.bearUpgrades[upgrade.id] ?? 0;
            const maxed = currentLevel >= upgrade.maxLevel;
            const canBuy = !maxed && remaining >= upgrade.cost;
            return (
              <div key={upgrade.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm">{upgrade.name}</strong>
                    <span className="text-xs text-zinc-400">Lv.{currentLevel}/{upgrade.maxLevel}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{upgrade.desc}</p>
                  {!maxed && (
                    <div className="flex gap-2 mt-1 text-xs text-zinc-500">
                      <span className="font-semibold text-amber-600">{upgrade.cost} credits</span>
                    </div>
                  )}
                </div>
                <button
                  disabled={!canBuy}
                  onClick={() => onBuyBearUpgrade?.(upgrade.id)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    maxed
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : canBuy
                        ? 'bg-amber-700 text-white hover:bg-amber-800'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
                  }`}
                >
                  {maxed ? 'Maxed' : `Buy Lv.${currentLevel + 1}`}
                </button>
              </div>
            );
          })}
        </div>
      </details>

      {/* Commander Cards */}
      <details className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden open:pb-4">
        <summary className="p-4 font-bold text-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors select-none">
          🃏 Commander Card
        </summary>
        <div className="px-4 pt-2 space-y-3">
          <p className="text-xs text-zinc-400 mb-1">Pick one card for this round. Each triggers a one-time effect during the run.</p>
          {COMMANDER_CARDS.map((card) => {
            const selected = state.commanderCard === card.id;
            const canAfford = remaining >= card.cost;
            return (
              <button
                key={card.id}
                disabled={!canAfford}
                onClick={() => onSelectCommanderCard?.(card.id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                  selected
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                    : canAfford
                      ? 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:border-zinc-400'
                      : 'border-zinc-200 dark:border-zinc-800 opacity-45'
                }`}
              >
                <div className="flex justify-between gap-2 items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{card.emoji}</span>
                      <strong className="text-sm">{card.name}</strong>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{card.desc}</p>
                    <p className="text-[10px] text-zinc-400 italic mt-0.5">&ldquo;{card.flavor}&rdquo;</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-semibold text-amber-600">{card.cost}cr</span>
                    {selected && <div className="text-[10px] text-purple-500 font-semibold">Selected</div>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </details>

      <button disabled={state.bearPlacements.length === 0} onClick={onReady} className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-xl disabled:opacity-40">
        READY — Inspect Incoming Train
      </button>
    </div>
  );
}
