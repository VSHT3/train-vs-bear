'use client';

import { useCallback, useEffect, useReducer, useState, useRef } from 'react';
import { evaluateCustomUpgrade, getBearPlan } from '@/app/actions';
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
import { SoundToggle, useSound } from '@/lib/sound';
import {
  addLeaderboardEntry,
  deleteGame,
  loadGame,
  loadStats,
  hasSave,
  saveGame,
  saveStats,
} from '@/lib/storage';
import type { BearUnitType, Mod, PlayerSide, ReplayPayload, SimResult } from '@/lib/types';
import { GameOverScreen } from './game-over-screen';
import { HowToPlayModal } from './how-to-play-modal';
import { IntelScreen } from './intel-screen';
import { ResultScreen } from './result-screen';
import { ReplayScreen } from './replay-screen';
import { RoundIntroScreen } from './round-intro-screen';
import { RunScreen } from './run-screen';
import { ShopScreen } from './shop-screen';
import { StatsDashboard } from './stats-dashboard';
import { TitleScreen } from './title-screen';
import { VictoryScreen } from './victory-screen';

export function GameShell({
  initialSeed,
  initialReplay,
  replayInvalid,
}: {
  initialSeed: number | null;
  initialReplay: ReplayPayload | null;
  replayInvalid: boolean;
}) {
  const [state, dispatch] = useReducer(gameReducer, initialSeed, (seed) => createGame(seed ?? 'train-vs-bear'));
  const [customPrompt, setCustomPrompt] = useState('');
  const [customResult, setCustomResult] = useState<Mod | { valid: false; reason: string } | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [intelLoading, setIntelLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFirstTutorial, setShowFirstTutorial] = useState(true);
  const [replayDismissed, setReplayDismissed] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const justLoaded = useRef(false);
  const { play } = useSound();

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; });

  useEffect(() => {
    if (!initialSeed && !initialReplay && !justLoaded.current && hasSave()) {
      setShowContinue(true);
    }
  }, [initialSeed, initialReplay]);

  const train = getTrain(state.trainId);
  const installedMods = state.modIds.map((id) => getMod(id)).filter((mod) => mod !== undefined);
  const stats = composeStats(train.base, activeModEffects(state));

  const recordGameEnd = useCallback((finalState: typeof state) => {
    const s = loadStats();
    s.gamesCompleted++;
    if (finalState.freeplay) {
      const waves = Math.max(0, finalState.round - (MAX_ROUNDS + 1));
      s.bestFreeplayWave = Math.max(s.bestFreeplayWave, waves);
    }
    if (finalState.phase === 'victory' && !finalState.freeplay) {
      s.gamesWon++;
      if (finalState.side === 'train') s.trainWins++;
      else s.bearWins++;
    } else {
      s.gamesLost++;
    }
    s.bestRound = Math.max(s.bestRound, finalState.round - 1);
    if (finalState.sim && finalState.sim.outcome === 'win') {
      if (!s.bestRunSeed || finalState.round > s.bestRunRound) {
        s.bestRunSeed = finalState.sim.seed;
        s.bestRunRound = finalState.round;
      }
    }
    saveStats(s);
    if (finalState.lastSummary && finalState.sim) {
      addLeaderboardEntry({
        side: finalState.side ?? 'train',
        round: finalState.lastSummary.round,
        won: finalState.sim.outcome === 'win',
        totalKm: finalState.lastSummary.reachedKm,
        bearsSmashed: finalState.lastSummary.bearsSmashed,
        timeSec: finalState.sim.timeSec,
        when: Date.now(),
        seed: finalState.sim.seed,
      });
    }
    deleteGame();
  }, []);

  const restoreGame = () => {
    const saved = loadGame();
    if (saved) {
      justLoaded.current = true;
      setShowContinue(false);
      setShowFirstTutorial(false);
      dispatch({ type: 'restoreGame', state: saved });
    }
  };

  const startGame = (side: PlayerSide) => {
    play('click');
    deleteGame();
    dispatch({ type: 'startGame', side, seed: initialSeed ?? Date.now() });
    const s = loadStats();
    s.gamesStarted++;
    saveStats(s);
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
    dispatch({ type: 'setIntel', plan });
    setIntelLoading(false);
    play('nextRound');
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
    const current = stateRef.current;
    const trainWon = sim.outcome === 'win';
    const playerWon = current.side === 'bear' ? !trainWon : trainWon;
    if (playerWon) play('victory');
    else play('defeat');
    const s = loadStats();
    s.totalBearsSmashed += sim.bearsSmashed;
    s.totalKm += sim.reachedKm;
    s.totalTimeSec += sim.timeSec;
    if (current.side === 'train') {
      if (playerWon) s.trainWins++;
      s.trainGames++;
    } else {
      if (playerWon) s.bearWins++;
      s.bearGames++;
    }
    saveStats(s);
    saveGame({ ...current, sim });
  }, []);

  const nextRound = () => {
    play('horn');
    dispatch({ type: 'nextRound' });
    setCustomPrompt('');
    setCustomResult(null);
    saveGame({ ...stateRef.current });
  };

  const startFreeplay = () => {
    dispatch({ type: 'enterFreeplay' });
    saveGame({ ...stateRef.current, freeplay: true, round: MAX_ROUNDS + 1 });
  };

  const playAgain = () => {
    recordGameEnd(stateRef.current);
    dispatch({ type: 'startGame', side: state.side ?? 'train', seed: initialSeed ?? Date.now() });
    setCustomPrompt('');
    setCustomResult(null);
  };

  if (initialReplay && !replayDismissed) {
    return (
      <div className="flex flex-col min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <header className="flex items-center justify-between gap-2 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <h1 className="text-lg font-bold tracking-tight">🚂 TRAIN <span className="text-zinc-400">vs</span> 🐻 BEAR</h1>
          <span className="text-xs text-zinc-400">Shared replay · round {initialReplay.round}</span>
        </header>
        <main id="main-content" className="flex-1 flex flex-col">
          <ReplayScreen payload={initialReplay} onExit={() => setReplayDismissed(true)} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <h1 className="text-lg font-bold tracking-tight">🚂 TRAIN <span className="text-zinc-400">vs</span> 🐻 BEAR</h1>
        {state.phase !== 'title' && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-500">{state.side === 'bear' ? 'Bear Command' : 'Train Crew'} · {state.freeplay ? `Wave ${state.round - MAX_ROUNDS}` : `Round ${state.round}/${MAX_ROUNDS}`}</span>
            <span className="text-red-500">{'❤️'.repeat(state.hearts)}{'🖤'.repeat(MAX_HEARTS - state.hearts)}</span>
            {state.side === 'bear'
              ? <span className="text-amber-600">🐾 {bearBudgetRemaining(state)} credits</span>
              : <><span className="text-amber-500">🪙 {state.coins}</span><span className="text-purple-500">⭐ {state.points}</span></>}
            <span className="hidden sm:inline text-xs text-zinc-400">seed {state.seed}</span>
            <button onClick={() => setShowStats(true)} aria-label="Career stats" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" title="Career Stats">📊</button>
            <button onClick={() => setShowHelp(true)} aria-label="How to play" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">❓</button>
            <SoundToggle />
          </div>
        )}
      </header>

      <main id="main-content" className="flex-1 flex flex-col">
        {replayInvalid && state.phase === 'title' && (
          <div className="mx-auto mt-6 max-w-lg rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            This replay link is invalid, unsupported, or too large.
          </div>
        )}
        {state.phase === 'title' && (
          <TitleScreen
            onStart={startGame}
            onHelp={() => setShowHelp(true)}
            onStats={() => setShowStats(true)}
            onContinue={showContinue ? restoreGame : undefined}
          />
        )}
        {state.phase === 'roundIntro' && <RoundIntroScreen round={state.round} freeplay={state.freeplay} onDismiss={() => dispatch({ type: 'dismissRoundIntro' })} />}
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
        {state.phase === 'victory' && <VictoryScreen state={state} onNewGame={playAgain} onFreeplay={startFreeplay} />}
        {state.phase === 'gameover' && <GameOverScreen state={state} onNewGame={playAgain} />}
      </main>
      {showHelp && <HowToPlayModal onClose={() => setShowHelp(false)} />}
      {showStats && <StatsDashboard onClose={() => setShowStats(false)} />}
    </div>
  );
}
