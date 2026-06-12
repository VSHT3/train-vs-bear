'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { BearPlan, GameState, Mod, Odds, SimResult } from '@/lib/types';
import {
  createGame,
  buyTrain,
  installMod,
  removeMod,
  addCustomMod,
  startRun as startRunPhase,
  finishRun as finishRunPhase,
  nextRound,
  activeModFlags,
  activeModEffects,
  canAffordTrain,
  canAffordMod,
} from '@/lib/state';
import { TRAINS, MODS, BEAR_UNITS, getTrain, getMod, targetKmForRound, MAX_ROUNDS, MAX_HEARTS } from '@/lib/catalog';
import { runSimulation, composeStats } from '@/lib/simulate';
import { getBearPlan, getPresetPlan, evaluateCustomUpgrade, computeOdds } from '@/app/actions';

export default function Game() {
  const [state, setState] = useState<GameState>(createGame);
  const [shopTab, setShopTab] = useState<'trains' | 'mods' | 'custom'>('mods');
  const [customPrompt, setCustomPrompt] = useState('');
  const [customResult, setCustomResult] = useState<Mod | { valid: false; reason: string } | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelPlan, setIntelPlan] = useState<BearPlan | null>(null);
  const [intelOdds, setIntelOdds] = useState<Odds | null>(null);

  const train = getTrain(state.trainId);
  const targetKm = targetKmForRound(state.round);
  const installedMods = state.modIds.map((id) => getMod(id)).filter(Boolean) as Mod[];
  const allMods = [...installedMods, ...state.customMods];
  const stats = composeStats(train.base, allMods);
  const modSlotsUsed = state.modIds.length;
  const modSlotsMax = train.modSlots;

  // ---- Handlers ----

  const handleBuyTrain = useCallback((trainId: string) => {
    const next = buyTrain(state, trainId);
    if (next) setState(next);
  }, [state]);

  const handleInstallMod = useCallback((modId: string) => {
    const next = installMod(state, modId);
    if (next) setState(next);
  }, [state]);

  const handleRemoveMod = useCallback((modId: string) => {
    const next = removeMod(state, modId);
    if (next) setState(next);
  }, [state]);

  const handleCustomUpgrade = useCallback(async () => {
    if (!customPrompt.trim()) return;
    setCustomLoading(true);
    const result = await evaluateCustomUpgrade(customPrompt, state.round, state.modIds);
    setCustomResult(result);
    setCustomLoading(false);
  }, [customPrompt, state.round, state.modIds]);

  const handleConfirmCustom = useCallback(() => {
    if (customResult && 'id' in customResult) {
      const next = addCustomMod(state, customResult);
      if (next) {
        setState(next);
        setCustomResult(null);
        setCustomPrompt('');
      }
    }
  }, [customResult, state]);

  const handleStartIntel = useCallback(async (useAI = true) => {
    setIntelLoading(true);
    setState((prev) => ({ ...prev, phase: 'intel', plan: null, odds: null }));
    const modNames = allMods.map((m) => m.name);

    const plan = useAI
      ? await getBearPlan(state.round, stats, modNames, 0, targetKm, state.lastSummary?.outcome !== 'win' && state.round > 1)
      : await getPresetPlan(state.round, targetKm, state.lastSummary?.outcome !== 'win' && state.round > 1);

    const odds = await computeOdds(state, plan);

    setIntelPlan(plan);
    setIntelOdds(odds);
    setIntelLoading(false);
    setState((prev) => ({ ...prev, plan, odds }));
  }, [state, stats, allMods, targetKm]);

  const handleRun = useCallback(() => {
    setState(startRunPhase(state));
  }, [state]);

  const handleSimDone = useCallback((sim: SimResult) => {
    setState((prev) => finishRunPhase(prev, sim));
  }, []);

  const handleNextRound = useCallback(() => {
    setState(nextRound(state));
    setIntelPlan(null);
    setIntelOdds(null);
    setCustomResult(null);
    setCustomPrompt('');
  }, [state]);

  const handleNewGame = useCallback(() => {
    const game = createGame();
    game.phase = 'shop';
    setState(game);
    setIntelPlan(null);
    setIntelOdds(null);
    setCustomResult(null);
    setCustomPrompt('');
  }, []);

  // ---- Render ----

  return (
    <div className="flex flex-col min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Header bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <h1 className="text-lg font-bold tracking-tight">
          🚂 TRAIN <span className="text-zinc-400">vs</span> 🐻 BEAR
        </h1>
        {state.phase !== 'title' && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-500">
              Round {state.round}/{MAX_ROUNDS}
            </span>
            <span className="text-red-500">{'❤️'.repeat(state.hearts)}{'🖤'.repeat(MAX_HEARTS - state.hearts)}</span>
            <span className="text-amber-500">🪙 {state.coins}</span>
            <span className="text-purple-500">⭐ {state.points}</span>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {state.phase === 'title' && (
          <TitleScreen onStart={handleNewGame} />
        )}
        {state.phase === 'shop' && (
          <ShopScreen
            state={state}
            train={train}
            stats={stats}
            installedMods={installedMods}
            customMods={state.customMods}
            modSlotsUsed={modSlotsUsed}
            modSlotsMax={modSlotsMax}
            shopTab={shopTab}
            setShopTab={setShopTab}
            customPrompt={customPrompt}
            setCustomPrompt={setCustomPrompt}
            customResult={customResult}
            customLoading={customLoading}
            onBuyTrain={handleBuyTrain}
            onInstallMod={handleInstallMod}
            onRemoveMod={handleRemoveMod}
            onCustomUpgrade={handleCustomUpgrade}
            onConfirmCustom={handleConfirmCustom}
            onReady={handleStartIntel}
          />
        )}
        {state.phase === 'intel' && (
          <IntelScreen
            state={state}
            plan={intelPlan}
            odds={intelOdds}
            loading={intelLoading}
            targetKm={targetKm}
            onBack={() => setState((prev) => ({ ...prev, phase: 'shop' }))}
            onRun={handleRun}
          />
        )}
        {state.phase === 'run' && (
          <RunScreen
            state={state}
            targetKm={targetKm}
            onDone={handleSimDone}
          />
        )}
        {state.phase === 'result' && (
          <ResultScreen
            state={state}
            onNext={handleNextRound}
          />
        )}
        {state.phase === 'victory' && (
          <VictoryScreen state={state} onNewGame={handleNewGame} />
        )}
        {state.phase === 'gameover' && (
          <GameOverScreen state={state} onNewGame={handleNewGame} />
        )}
      </main>
    </div>
  );
}

// ============================================================
// TITLE SCREEN
// ============================================================

function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="space-y-4">
        <div className="text-8xl">🚂🐻</div>
        <h2 className="text-5xl font-black tracking-tighter">
          TRAIN <span className="text-zinc-400 font-light">vs</span> BEAR
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-md text-lg">
          Upgrade your train. Smash through bears. Survive 7 rounds. The bears have a budget and they are NOT happy about it.
        </p>
      </div>
      <button
        onClick={onStart}
        className="px-8 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-xl font-bold hover:scale-105 transition-transform"
      >
        START GAME
      </button>
    </div>
  );
}

// ============================================================
// SHOP SCREEN
// ============================================================

function ShopScreen({
  state, train, stats, installedMods, customMods, modSlotsUsed, modSlotsMax,
  shopTab, setShopTab, customPrompt, setCustomPrompt, customResult, customLoading,
  onBuyTrain, onInstallMod, onRemoveMod, onCustomUpgrade, onConfirmCustom, onReady,
}: {
  state: GameState;
  train: ReturnType<typeof getTrain>;
  stats: ReturnType<typeof composeStats>;
  installedMods: Mod[];
  customMods: Mod[];
  modSlotsUsed: number;
  modSlotsMax: number;
  shopTab: string;
  setShopTab: (t: 'trains' | 'mods' | 'custom') => void;
  customPrompt: string;
  setCustomPrompt: (p: string) => void;
  customResult: Mod | { valid: false; reason: string } | null;
  customLoading: boolean;
  onBuyTrain: (id: string) => void;
  onInstallMod: (id: string) => void;
  onRemoveMod: (id: string) => void;
  onCustomUpgrade: () => void;
  onConfirmCustom: () => void;
  onReady: (useAI?: boolean) => void;
}) {
  return (
    <div className="flex-1 flex flex-col p-6 gap-6 max-w-3xl mx-auto w-full">
      {/* Current train card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">{train.emoji}</span>
          <div>
            <h3 className="text-xl font-bold">{train.name}</h3>
            <p className="text-sm text-zinc-500">{train.desc}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-zinc-500">
          <Stat label="Speed" val={`${stats.topSpeed} km/h`} />
          <Stat label="Accel" val={`${stats.accel} km/h/s`} />
          <Stat label="HP" val={`${stats.maxHp}`} />
          <Stat label="Armor" val={`${Math.round(stats.armor * 100)}%`} />
          <Stat label="Plow" val={`${stats.plow} t/s`} />
          <Stat label="Grip" val={`${Math.round(stats.grip * 100)}%`} />
          <Stat label="Heat" val={`${Math.round(stats.heatShield * 100)}%`} />
          <Stat label="Weapon" val={`${stats.energyWeapon} dps`} />
          <Stat label="Regen" val={`${stats.regen} hp/s`} />
        </div>
        {installedMods.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {installedMods.map((m) => (
              <span key={m.id} className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30" onClick={() => onRemoveMod(m.id)} title="Click to remove">
                {m.emoji} {m.name} ✕
              </span>
            ))}
            {customMods.map((m) => (
              <span key={m.id} className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                {m.emoji} {m.name} (custom)
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 text-xs text-zinc-400">
          Mod slots: {modSlotsUsed}/{modSlotsMax} · Custom: {customMods.length}/3
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['mods', 'trains', 'custom'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setShopTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              shopTab === tab
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {tab === 'mods' ? '🔧 Mods' : tab === 'trains' ? '🚂 Trains' : '✨ Custom'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {shopTab === 'trains' && (
        <div className="grid gap-3">
          {TRAINS.map((t) => {
            const owned = state.trainId === t.id;
            const affordable = canAffordTrain(state, t.id);
            return (
              <button
                key={t.id}
                disabled={owned || !affordable}
                onClick={() => onBuyTrain(t.id)}
                className={`text-left p-4 rounded-xl border transition-colors ${
                  owned
                    ? 'border-green-500/30 bg-green-50 dark:bg-green-950/20'
                    : affordable
                      ? 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-400'
                      : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{t.emoji}</span>
                    <div>
                      <div className="font-bold">{t.name}</div>
                      <div className="text-xs text-zinc-500">{t.desc}</div>
                      <div className="text-xs text-zinc-400 mt-1">
                        {t.modSlots} slots · {t.base.topSpeed} km/h · {t.base.maxHp} HP
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-500">🪙 {t.cost}</div>
                    <div className="text-xs text-zinc-400">
                      {owned ? 'OWNED' : affordable ? 'BUY' : 'too expensive'}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {shopTab === 'mods' && (
        <div className="grid gap-2">
          {MODS.map((mod) => {
            const installed = state.modIds.includes(mod.id);
            const canInstall = canAffordMod(state, mod.id);
            return (
              <button
                key={mod.id}
                disabled={!canInstall || installed}
                onClick={() => installed ? onRemoveMod(mod.id) : onInstallMod(mod.id)}
                className={`text-left p-3 rounded-xl border transition-colors ${
                  installed
                    ? 'border-green-500/30 bg-green-50 dark:bg-green-950/20'
                    : canInstall
                      ? 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-400'
                      : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{mod.emoji}</span>
                    <div>
                      <div className="font-medium text-sm">{mod.name}</div>
                      <div className="text-xs text-zinc-500">{mod.desc}</div>
                    </div>
                  </div>
                  <div className="text-right text-xs shrink-0 ml-2">
                    <div className="text-amber-500">🪙{mod.coins}</div>
                    {mod.points > 0 && <div className="text-purple-500">⭐{mod.points}</div>}
                    <div className="text-zinc-400">{installed ? 'INSTALLED' : canInstall ? 'BUY' : modSlotsUsed >= modSlotsMax ? 'no slots' : state.coins < mod.coins ? 'no coins' : 'no points'}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {shopTab === 'custom' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            Describe your custom upgrade and the AI Upgrade Arbiter will evaluate it. Be creative but reasonable — no instant wins or teleportation.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Bear-seeking missile launcher..."
              className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && onCustomUpgrade()}
            />
            <button
              onClick={onCustomUpgrade}
              disabled={customLoading || !customPrompt.trim()}
              className="px-6 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {customLoading ? 'Evaluating...' : 'Propose'}
            </button>
          </div>
          {customResult && (
            <div className={`p-4 rounded-xl border ${'valid' in customResult && !customResult.valid ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20' : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20'}`}>
              {'valid' in customResult && !customResult.valid ? (
                <div>
                  <div className="font-medium text-red-600">✕ Rejected</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">{customResult.reason}</div>
                </div>
              ) : 'id' in customResult ? (
                <div>
                  <div className="font-medium text-green-600">{customResult.emoji} {customResult.name}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">{customResult.desc}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Cost: 🪙{customResult.coins} ⭐{customResult.points} · Effects: {Object.entries(customResult.effects).map(([k, v]) => `${k} +${v}`).join(', ') || 'none'}
                    {customResult.flags?.length ? ` · Flags: ${customResult.flags.join(', ')}` : ''}
                  </div>
                  <button onClick={onConfirmCustom} className="mt-2 px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
                    Install Custom Upgrade
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Ready button */}
      <button
        onClick={() => onReady(true)}
        className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg hover:scale-[1.02] transition-transform"
      >
        READY — See Intel
      </button>
    </div>
  );
}

function Stat({ label, val }: { label: string; val: string }) {
  return (
    <div>
      <span className="font-medium text-zinc-600 dark:text-zinc-300">{val}</span>{' '}
      <span className="text-zinc-400">{label}</span>
    </div>
  );
}

// ============================================================
// INTEL SCREEN
// ============================================================

function IntelScreen({
  state, plan, odds, loading, targetKm, onBack, onRun,
}: {
  state: GameState;
  plan: BearPlan | null;
  odds: Odds | null;
  loading: boolean;
  targetKm: number;
  onBack: () => void;
  onRun: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col p-6 gap-6 max-w-3xl mx-auto w-full">
      <h2 className="text-2xl font-bold">🕵️ Bear Intel — Round {state.round}</h2>

      {loading && (
        <div className="flex flex-col items-center gap-4 py-16 text-zinc-500">
          <div className="text-4xl animate-bounce">🐻</div>
          <p>The bears are strategizing...</p>
        </div>
      )}

      {!loading && plan && (
        <>
          {/* Plan card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{plan.source}</span>
            </div>
            <p className="text-lg italic text-zinc-600 dark:text-zinc-400">&ldquo;{plan.taunt}&rdquo;</p>
            <p className="text-sm text-zinc-500">{plan.strategy}</p>
          </div>

          {/* Track map */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <h4 className="text-sm font-medium text-zinc-500 mb-3">Track Map ({targetKm} km)</h4>
            <div className="relative h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
              {plan.placements.map((p, i) => {
                const s = BEAR_UNITS[p.type as keyof typeof BEAR_UNITS];
                const leftPct = (p.atKm / targetKm) * 100;
                return (
                  <div
                    key={i}
                    className="absolute top-1/2 -translate-y-1/2 text-sm"
                    style={{ left: `${Math.min(leftPct, 95)}%` }}
                    title={`${s?.name ?? p.type} ×${p.count} at ${p.atKm}km`}
                  >
                    {s?.emoji ?? '🐻'}
                  </div>
                );
              })}
              <div className="absolute right-1 top-1/2 -translate-y-1/2 text-sm">🏁</div>
            </div>
          </div>

          {/* Odds */}
          {odds && (
            <div className={`p-4 rounded-xl border text-center ${
              odds.trainWinPct >= 60
                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20'
                : odds.trainWinPct >= 30
                  ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20'
                  : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20'
            }`}>
              <div className="text-3xl font-black">{odds.trainWinPct}%</div>
              <div className="text-sm text-zinc-500">estimated win chance ({odds.runs} simulated runs)</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              ← Back to Shop
            </button>
            <button
              onClick={onRun}
              className="flex-1 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg hover:scale-[1.02] transition-transform"
            >
              RUN SIMULATION
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// RUN SCREEN
// ============================================================

function RunScreen({
  state, targetKm, onDone,
}: {
  state: GameState;
  targetKm: number;
  onDone: (sim: SimResult) => void;
}) {
  const [simResult] = useState(() => {
    const train = getTrain(state.trainId);
    const effects = activeModEffects(state);
    const stats = composeStats(train.base, effects);
    const flags = activeModFlags(state);
    return runSimulation(stats, flags, state.plan!.placements, targetKm);
  });

  const [frameIdx, setFrameIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const frames = simResult.frames;
  const events = simResult.events;
  const currentFrame = frames[Math.min(frameIdx, frames.length - 1)];

  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      setFrameIdx((prev) => {
        if (prev >= frames.length - 1) {
          setFinished(true);
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [frames.length, finished]);

  useEffect(() => {
    if (finished) {
      const timer = setTimeout(() => onDone(simResult), 1500);
      return () => clearTimeout(timer);
    }
  }, [finished, simResult, onDone]);

  // Scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [frameIdx]);

  const progressPct = Math.min((currentFrame.km / targetKm) * 100, 100);
  const hpPct = Math.max((currentFrame.hp / (getTrain(state.trainId).base.maxHp + 500)) * 100, 0);

  // Show events up to current frame time
  const visibleEvents = events.filter((e) => e.t <= currentFrame.t + 0.01);

  return (
    <div className="flex-1 flex flex-col p-6 gap-4 max-w-3xl mx-auto w-full">
      {/* Speed + HP bars */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Speed</div>
          <div className="text-3xl font-bold tabular-nums">{currentFrame.speed}</div>
          <div className="text-xs text-zinc-400">km/h</div>
          <div className="mt-2 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-100" style={{ width: `${Math.min((currentFrame.speed / (getTrain(state.trainId).base.topSpeed + 100)) * 100, 100)}%` }} />
          </div>
          {currentFrame.sticky > 0 && (
            <div className="text-xs text-amber-500 mt-1">Sticky: {Math.round(currentFrame.sticky * 100)}%</div>
          )}
          {currentFrame.grinding && (
            <div className="text-xs text-red-500 mt-1">GRINDING!</div>
          )}
          {currentFrame.underFire && (
            <div className="text-xs text-orange-500 mt-1">UNDER FIRE</div>
          )}
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">HP</div>
          <div className="text-3xl font-bold tabular-nums">{currentFrame.hp}</div>
          <div className="text-xs text-zinc-400">/{getTrain(state.trainId).base.maxHp + 500}</div>
          <div className="mt-2 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-100 ${hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Track progress */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
        <div className="flex justify-between text-xs text-zinc-500 mb-2">
          <span>0 km</span>
          <span>{targetKm} km</span>
        </div>
        <div className="relative h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500/30 to-green-500/10 transition-all duration-100"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="absolute top-0.5 text-2xl transition-all duration-100"
            style={{ left: `${Math.min(progressPct, 92)}%` }}
          >
            {getTrain(state.trainId).emoji}
          </div>
          {/* Obstacle markers */}
          {simResult.obstacles.filter(o => o.km > currentFrame.km).slice(0, 8).map((obs) => {
            const spec = BEAR_UNITS[obs.type];
            const leftPct = (obs.km / targetKm) * 100;
            return (
              <div
                key={obs.id}
                className="absolute text-xs opacity-40"
                style={{ left: `${Math.min(leftPct, 95)}%`, top: '50%', transform: 'translateY(-50%)' }}
              >
                {spec?.emoji ?? '🐻'}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-zinc-400 mt-1">
          <span>Traveled: {currentFrame.km.toFixed(1)} km</span>
          <span>Time: {currentFrame.t.toFixed(1)}s</span>
        </div>
      </div>

      {/* Event log */}
      <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 overflow-hidden flex flex-col min-h-0">
        <div className="text-xs text-zinc-500 mb-2">Event Log</div>
        <div ref={logRef} className="flex-1 overflow-y-auto space-y-1 text-sm">
          {visibleEvents.map((e, i) => (
            <div key={i} className="text-zinc-600 dark:text-zinc-400">
              <span className="text-xs text-zinc-400 tabular-nums">[{e.km.toFixed(1)}km]</span>{' '}
              {e.text}
            </div>
          ))}
          {finished && (
            <div className="text-lg font-bold text-center py-4">
              {simResult.outcome === 'win'
                ? '🏁 VICTORY!'
                : `💀 ${simResult.outcome.toUpperCase()}`}
            </div>
          )}
        </div>
      </div>

      {finished && (
        <div className="text-center text-zinc-400 text-sm animate-pulse">
          Loading results...
        </div>
      )}
    </div>
  );
}

// ============================================================
// RESULT SCREEN
// ============================================================

function ResultScreen({ state, onNext }: { state: GameState; onNext: () => void }) {
  const summary = state.lastSummary;
  const won = summary?.outcome === 'win';

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-md mx-auto text-center">
      <div className="text-7xl">{won ? '🏆' : '💀'}</div>
      <h2 className="text-3xl font-black">{won ? 'ROUND WON!' : 'ROUND LOST'}</h2>

      {summary && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 w-full space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-zinc-500">Distance</div>
            <div className="font-medium">{summary.reachedKm.toFixed(1)} / {summary.targetKm} km</div>
            <div className="text-zinc-500">Bears Smashed</div>
            <div className="font-medium">{summary.bearsSmashed}</div>
            <div className="text-zinc-500">Outcome</div>
            <div className="font-medium">{summary.outcome}</div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 w-full">
        {won ? (
          <button
            onClick={onNext}
            className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg hover:scale-[1.02] transition-transform"
          >
            NEXT ROUND →
          </button>
        ) : (
          <button
            onClick={onNext}
            className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg hover:scale-[1.02] transition-transform"
          >
            CONTINUE ({state.hearts} ❤️ left)
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// VICTORY SCREEN
// ============================================================

function VictoryScreen({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-md mx-auto text-center">
      <div className="text-8xl">👑🐻💥</div>
      <h2 className="text-4xl font-black">YOU WIN!</h2>
      <p className="text-zinc-500">
        All {MAX_ROUNDS} rounds conquered. Bears smashed: {state.totalBearsSmashed}. Total distance: {state.totalKm.toFixed(1)} km.
      </p>
      <p className="text-sm text-zinc-400">The bears have filed for bankruptcy. Their lawyer-goose was unavailable for comment.</p>
      <button
        onClick={onNewGame}
        className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg hover:scale-[1.02] transition-transform"
      >
        PLAY AGAIN
      </button>
    </div>
  );
}

// ============================================================
// GAME OVER SCREEN
// ============================================================

function GameOverScreen({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-md mx-auto text-center">
      <div className="text-8xl">🪦</div>
      <h2 className="text-4xl font-black">GAME OVER</h2>
      <p className="text-zinc-500">
        The bears claim victory. You made it to round {state.round}/{MAX_ROUNDS} and smashed {state.totalBearsSmashed} bears.
      </p>
      <p className="text-sm text-zinc-400">A bear is writing a ballad about your defeat. It rhymes &ldquo;train&rdquo; with &ldquo;pain.&rdquo;</p>
      <button
        onClick={onNewGame}
        className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg hover:scale-[1.02] transition-transform"
      >
        TRY AGAIN
      </button>
    </div>
  );
}
