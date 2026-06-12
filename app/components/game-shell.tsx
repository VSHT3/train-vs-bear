'use client';

import { useCallback, useReducer, useState } from 'react';
import { computeOdds, evaluateCustomUpgrade, getBearPlan } from '@/app/actions';
import { getMod, getTrain, MAX_HEARTS, MAX_ROUNDS, targetKmForRound } from '@/lib/catalog';
import {
  activeModEffects,
  bearBudgetRemaining,
  buildPlayerBearPlan,
  createGame,
  gameReducer,
  simulationSeed,
} from '@/lib/state';
import { composeStats } from '@/lib/simulate';
import type { BearUnitType, Mod, PlayerSide, SimResult } from '@/lib/types';
import { GameOverScreen } from './game-over-screen';
import { HowToPlayModal } from './how-to-play-modal';
import { IntelScreen } from './intel-screen';
import { ResultScreen } from './result-screen';
import { RoundIntroScreen } from './round-intro-screen';
import { RunScreen } from './run-screen';
import { ShopScreen } from './shop-screen';
import { TitleScreen } from './title-screen';
import { VictoryScreen } from './victory-screen';

export function GameShell({ initialSeed }: { initialSeed: number | null }) {
  const [state, dispatch] = useReducer(gameReducer, initialSeed, (seed) => createGame(seed ?? 'train-vs-bear'));
  const [customPrompt, setCustomPrompt] = useState('');
  const [customResult, setCustomResult] = useState<Mod | { valid: false; reason: string } | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [intelLoading, setIntelLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFirstTutorial, setShowFirstTutorial] = useState(true);

  const train = getTrain(state.trainId);
  const installedMods = state.modIds.map((id) => getMod(id)).filter((mod) => mod !== undefined);
  const stats = composeStats(train.base, activeModEffects(state));

  const startGame = (side: PlayerSide) => {
    dispatch({ type: 'startGame', side, seed: initialSeed ?? Date.now() });
    if (showFirstTutorial) {
      setShowFirstTutorial(false);
      setShowHelp(true);
    }
  };

  const startIntel = async () => {
    setIntelLoading(true);
    dispatch({ type: 'setPhase', phase: 'intel' });

    const targetKm = targetKmForRound(state.round);
    const plan = state.side === 'bear'
      ? buildPlayerBearPlan(state)
      : await getBearPlan(
        state.round,
        stats,
        [...installedMods, ...state.customMods].map((mod) => mod.name),
        targetKm,
        state.lastSummary?.outcome !== 'win' && state.round > 1,
        simulationSeed(state),
      );
    const odds = await computeOdds(state, plan);
    dispatch({ type: 'setIntel', plan, odds });
    setIntelLoading(false);
  };

  const evaluateUpgrade = async () => {
    if (!customPrompt.trim()) return;
    setCustomLoading(true);
    setCustomResult(await evaluateCustomUpgrade(customPrompt, state.round, state.modIds));
    setCustomLoading(false);
  };

  const confirmUpgrade = () => {
    if (!customResult || !('id' in customResult)) return;
    dispatch({ type: 'addCustomMod', mod: customResult });
    setCustomPrompt('');
    setCustomResult(null);
  };

  const finishSimulation = useCallback((sim: SimResult) => {
    dispatch({ type: 'finishRun', sim });
  }, []);

  const nextRound = () => {
    dispatch({ type: 'nextRound' });
    setCustomPrompt('');
    setCustomResult(null);
  };

  const playAgain = () => {
    dispatch({ type: 'startGame', side: state.side ?? 'train', seed: initialSeed ?? Date.now() });
    setCustomPrompt('');
    setCustomResult(null);
  };

  return (
    <div className="flex flex-col min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <h1 className="text-lg font-bold tracking-tight">🚂 TRAIN <span className="text-zinc-400">vs</span> 🐻 BEAR</h1>
        {state.phase !== 'title' && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-500">{state.side === 'bear' ? 'Bear Command' : 'Train Crew'} · Round {state.round}/{MAX_ROUNDS}</span>
            <span className="text-red-500">{'❤️'.repeat(state.hearts)}{'🖤'.repeat(MAX_HEARTS - state.hearts)}</span>
            {state.side === 'bear'
              ? <span className="text-amber-600">🐾 {bearBudgetRemaining(state)} credits</span>
              : <><span className="text-amber-500">🪙 {state.coins}</span><span className="text-purple-500">⭐ {state.points}</span></>}
            <span className="hidden sm:inline text-xs text-zinc-400">seed {state.seed}</span>
            <button onClick={() => setShowHelp(true)} aria-label="How to play" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">❓</button>
          </div>
        )}
      </header>

      <main id="main-content" className="flex-1 flex flex-col">
        {state.phase === 'title' && <TitleScreen onStart={startGame} onHelp={() => setShowHelp(true)} />}
        {state.phase === 'roundIntro' && <RoundIntroScreen round={state.round} onDismiss={() => dispatch({ type: 'dismissRoundIntro' })} />}
        {state.phase === 'shop' && (
          <ShopScreen
            state={state}
            stats={stats}
            installedMods={installedMods}
            customPrompt={customPrompt}
            customResult={customResult}
            customLoading={customLoading}
            onCustomPromptChange={setCustomPrompt}
            onBuyTrain={(trainId) => dispatch({ type: 'buyTrain', trainId })}
            onInstallMod={(modId) => dispatch({ type: 'installMod', modId })}
            onRemoveMod={(modId) => dispatch({ type: 'removeMod', modId })}
            onCustomUpgrade={evaluateUpgrade}
            onConfirmCustom={confirmUpgrade}
            onPlaceBear={(unitType: BearUnitType, atKm: number) => dispatch({ type: 'placeBearUnit', unitType, atKm })}
            onRemoveBear={(index) => dispatch({ type: 'removeBearPlacement', index })}
            onReady={startIntel}
          />
        )}
        {state.phase === 'intel' && <IntelScreen state={state} loading={intelLoading} onBack={() => dispatch({ type: 'setPhase', phase: 'shop' })} onRun={() => dispatch({ type: 'startRun' })} />}
        {state.phase === 'run' && <RunScreen state={state} onDone={finishSimulation} />}
        {state.phase === 'result' && <ResultScreen state={state} onNext={nextRound} />}
        {state.phase === 'victory' && <VictoryScreen state={state} onNewGame={playAgain} />}
        {state.phase === 'gameover' && <GameOverScreen state={state} onNewGame={playAgain} />}
      </main>
      {showHelp && <HowToPlayModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
