'use client';

import { useState } from 'react';
import { BEAR_UNITS, MODS, TRAINS, getTrain, targetKmForRound } from '@/lib/catalog';
import {
  bearBudgetRemaining,
  canAffordBearUnit,
  canAffordMod,
  canAffordTrain,
} from '@/lib/state';
import { composeStats } from '@/lib/simulate';
import type { BearUnitType, GameState, Mod, TrainStats } from '@/lib/types';

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

  const statDiffs: { label: string; key: keyof TrainStats; suffix: string; format: (v: number) => string }[] = [
    { label: 'Speed', key: 'topSpeed', suffix: ' km/h', format: (v) => `${v}` },
    { label: 'Accel', key: 'accel', suffix: ' km/h/s', format: (v) => `${v}` },
    { label: 'HP', key: 'maxHp', suffix: '', format: (v) => `${v}` },
    { label: 'Armor', key: 'armor', suffix: '%', format: (v) => `${Math.round(v * 100)}` },
    { label: 'Plow', key: 'plow', suffix: ' t/s', format: (v) => `${v}` },
    { label: 'Grip', key: 'grip', suffix: '%', format: (v) => `${Math.round(v * 100)}` },
    { label: 'Weapon', key: 'energyWeapon', suffix: '', format: (v) => `${v}` },
    { label: 'Regen', key: 'regen', suffix: ' hp/s', format: (v) => `${v}` },
    { label: 'Heat Shield', key: 'heatShield', suffix: '%', format: (v) => `${Math.round(v * 100)}` },
  ];

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 max-w-3xl mx-auto w-full">
      <TrainCard state={state} stats={stats} installedMods={installedMods} onRemoveMod={onRemoveMod} />

      {previewMod && previewStats && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm">
          <div className="font-semibold mb-2">{previewMod.emoji} {previewMod.name} — stat change preview</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
            {statDiffs.map(({ label, key, format }) => {
              const cur = stats[key];
              const next = previewStats[key];
              if (cur === next && !['armor', 'grip', 'heatShield'].includes(key) && next === 0) return null;
              const diff = next - cur;
              if (diff === 0 && !['armor', 'grip', 'heatShield'].includes(key)) return null;
              return (
                <div key={key} className="flex items-baseline gap-1">
                  <span className="text-zinc-500">{label}:</span>
                  <span className={diff > 0 ? 'text-green-600 font-medium' : diff < 0 ? 'text-red-500 font-medium' : ''}>
                    {format(cur)} → {format(next)}
                  </span>
                  {diff !== 0 && (
                    <span className={diff > 0 ? 'text-green-500 text-xs' : 'text-red-500 text-xs'}>
                      ({diff > 0 ? '+' : ''}{diff > 0 ? format(diff) : format(diff)})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {(['mods', 'trains', 'custom'] as const).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              tab === item ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
            }`}
          >
            {item === 'mods' ? '🔧 Mods' : item === 'trains' ? '🚂 Trains' : '✨ Custom'}
          </button>
        ))}
      </div>

      {tab === 'trains' && (
        <div className="grid gap-3">
          {TRAINS.map((item) => {
            const owned = item.id === state.trainId;
            const affordable = canAffordTrain(state, item.id);
            return (
              <button
                key={item.id}
                disabled={owned || !affordable}
                onClick={() => onBuyTrain(item.id)}
                className={`text-left p-4 rounded-xl border ${
                  owned ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : affordable ? 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900' : 'border-zinc-200 opacity-45'
                }`}
              >
                <div className="flex justify-between gap-3">
                  <div><span className="text-2xl mr-2">{item.emoji}</span><strong>{item.name}</strong><p className="text-xs text-zinc-500 mt-1">{item.desc}</p></div>
                  <span className="text-amber-500 shrink-0">🪙 {item.cost}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {tab === 'mods' && (
        <div className="grid gap-2">
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
                className={`text-left p-3 rounded-xl border ${installed ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : affordable ? 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900' : 'border-zinc-200 opacity-45'}`}
              >
                <div className="flex justify-between gap-3">
                  <div><strong>{mod.emoji} {mod.name}</strong><p className="text-xs text-zinc-500">{mod.desc}</p></div>
                  <span className="text-xs text-amber-500 shrink-0">🪙{mod.coins} {mod.points > 0 ? `⭐${mod.points}` : ''}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {tab === 'custom' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">Describe a train upgrade. The AI arbiter prices valid ideas and rejects instant-win equipment.</p>
          <div className="flex gap-2">
            <input
              value={customPrompt}
              onChange={(event) => onCustomPromptChange(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && onCustomUpgrade()}
              placeholder="Bear-seeking missile launcher..."
              className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
            />
            <button onClick={onCustomUpgrade} disabled={customLoading || !customPrompt.trim()} className="px-5 py-2 bg-purple-600 text-white rounded-xl disabled:opacity-50">
              {customLoading ? 'Evaluating...' : 'Propose'}
            </button>
          </div>
          {customResult && (
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
              {'valid' in customResult && !customResult.valid ? (
                <p className="text-red-500">{customResult.reason}</p>
              ) : 'id' in customResult ? (
                <div className="space-y-2">
                  <strong>{customResult.emoji} {customResult.name}</strong>
                  <p className="text-sm text-zinc-500">{customResult.desc}</p>
                  <button onClick={onConfirmCustom} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm">Install upgrade</button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      <button onClick={onReady} className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg">
        READY — See Bear Intel
      </button>
      <p className="text-xs text-zinc-400 text-center">{train.modSlots - state.modIds.length} train mod slots remaining</p>
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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl">{train.emoji}</span>
        <div><h3 className="text-xl font-bold">{train.name}</h3><p className="text-sm text-zinc-500">{train.desc}</p></div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <Stat label="Speed" value={`${stats.topSpeed} km/h`} />
        <Stat label="HP" value={stats.maxHp} />
        <Stat label="Armor" value={`${Math.round(stats.armor * 100)}%`} />
        <Stat label="Plow" value={`${stats.plow} t/s`} />
        <Stat label="Grip" value={`${Math.round(stats.grip * 100)}%`} />
        <Stat label="Weapon" value={stats.energyWeapon} />
      </div>
      {(installedMods.length > 0 || state.customMods.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1">
          {installedMods.map((mod) => (
            <button key={mod.id} onClick={() => onRemoveMod(mod.id)} className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
              {mod.emoji} {mod.name} ✕
            </button>
          ))}
          {state.customMods.map((mod) => <span key={mod.id} className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-950">{mod.emoji} {mod.name}</span>)}
        </div>
      )}
    </div>
  );
}

function BearShop({ state, onPlaceBear, onRemoveBear, onReady }: ShopScreenProps) {
  const [selectedType, setSelectedType] = useState<BearUnitType>('bear');
  const [atKm, setAtKm] = useState(1.5);
  const targetKm = targetKmForRound(state.round);
  const remaining = bearBudgetRemaining(state);
  const selected = BEAR_UNITS[selectedType];

  return (
    <div className="flex-1 flex flex-col p-6 gap-5 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-black">🐻 Bear Defense Shop</h2><p className="text-sm text-zinc-500">Place blockers and zones before inspecting the incoming train.</p></div>
        <div className="text-right"><div className="text-2xl font-black text-amber-600">{remaining}</div><div className="text-xs text-zinc-400">credits remaining</div></div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="relative h-14 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden">
          {state.bearPlacements.map((placement, index) => (
            <button
              key={`${placement.type}-${placement.atKm}-${index}`}
              onClick={() => onRemoveBear(index)}
              title={`Remove ${BEAR_UNITS[placement.type].name} ×${placement.count}`}
              className="absolute top-1/2 -translate-y-1/2 text-lg hover:scale-125"
              style={{ left: `${Math.min((placement.atKm / targetKm) * 100, 94)}%` }}
            >
              {BEAR_UNITS[placement.type].emoji}<span className="text-[10px]">{placement.count > 1 ? placement.count : ''}</span>
            </button>
          ))}
          <span className="absolute right-2 top-1/2 -translate-y-1/2">🏁</span>
        </div>
        <div>
          <label htmlFor="bear-position" className="flex justify-between text-xs text-zinc-500 mb-1"><span>Placement position</span><strong>{atKm.toFixed(1)} km</strong></label>
          <input id="bear-position" type="range" min="1" max={Math.max(1, targetKm - 1)} step="0.1" value={atKm} onChange={(event) => setAtKm(Number(event.target.value))} className="w-full" />
        </div>
        <button
          disabled={!canAffordBearUnit(state, selectedType)}
          onClick={() => onPlaceBear(selectedType, atKm)}
          className="w-full py-3 bg-amber-700 text-white rounded-xl font-bold disabled:opacity-40"
        >
          Place {selected.emoji} {selected.name} at {atKm.toFixed(1)} km · {selected.cost} credits
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {(Object.keys(BEAR_UNITS) as BearUnitType[]).map((type) => {
          const unit = BEAR_UNITS[type];
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`text-left p-3 rounded-xl border ${selectedType === type ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/20' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'}`}
            >
              <div className="flex justify-between gap-2"><strong>{unit.emoji} {unit.name}</strong><span className="text-amber-600">{unit.cost}</span></div>
              <p className="text-xs text-zinc-500 mt-1">{unit.kind} · {unit.desc}</p>
            </button>
          );
        })}
      </div>

      <button disabled={state.bearPlacements.length === 0} onClick={onReady} className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg disabled:opacity-40">
        READY — Inspect Incoming Train
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div><strong>{value}</strong> <span className="text-zinc-400">{label}</span></div>;
}
