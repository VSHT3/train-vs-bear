import type { BearPlan, GameState, Mod, Odds, Phase, RoundOutcomeSummary, SimResult } from './types';
import {
  getMod,
  getTrain,
  MAX_CUSTOM_MODS,
  MAX_HEARTS,
  MAX_ROUNDS,
  rewardForLoss,
  rewardForWin,
  START_COINS,
  START_POINTS,
  targetKmForRound,
} from './catalog';

export function createGame(): GameState {
  return {
    phase: 'title',
    round: 1,
    hearts: MAX_HEARTS,
    coins: START_COINS,
    points: START_POINTS,
    trainId: 'handcar',
    modIds: [],
    customMods: [],
    plan: null,
    odds: null,
    sim: null,
    lastSummary: null,
    totalBearsSmashed: 0,
    totalKm: 0,
    aiAvailable: null,
    muted: false,
  };
}

export function setPhase(state: GameState, phase: Phase): GameState {
  return { ...state, phase };
}

// ---- SHOP ----

export function buyTrain(state: GameState, trainId: string): GameState | null {
  const train = getTrain(trainId);
  if (!train || state.coins < train.cost || state.trainId === trainId) return null;
  return {
    ...state,
    coins: state.coins - train.cost,
    trainId: train.id,
    modIds: [], // old mods don't fit the new train
  };
}

export function installMod(state: GameState, modId: string): GameState | null {
  const mod = getMod(modId);
  if (!mod) return null;
  if (state.modIds.includes(modId)) return null;

  const train = getTrain(state.trainId);
  if (state.modIds.length >= train.modSlots) return null;
  if (state.coins < mod.coins || state.points < mod.points) return null;

  return {
    ...state,
    coins: state.coins - mod.coins,
    points: state.points - mod.points,
    modIds: [...state.modIds, mod.id],
  };
}

export function removeMod(state: GameState, modId: string): GameState | null {
  if (!state.modIds.includes(modId)) return null;
  return {
    ...state,
    modIds: state.modIds.filter((id) => id !== modId),
  };
}

export function addCustomMod(state: GameState, mod: Mod): GameState | null {
  if (state.customMods.length >= MAX_CUSTOM_MODS) return null;
  if (state.coins < mod.coins || state.points < mod.points) return null;
  return {
    ...state,
    coins: state.coins - mod.coins,
    points: state.points - mod.points,
    customMods: [...state.customMods, { ...mod, custom: true }],
  };
}

export function removeCustomMod(state: GameState, modId: string): GameState {
  return {
    ...state,
    customMods: state.customMods.filter((m) => m.id !== modId),
  };
}

// ---- INTEL ----

export function setIntel(
  state: GameState,
  plan: BearPlan,
  odds: Odds,
): GameState {
  return { ...state, phase: 'intel', plan, odds };
}

// ---- RUN ----

export function startRun(state: GameState): GameState {
  return { ...state, phase: 'run', sim: null };
}

export function finishRun(state: GameState, sim: SimResult): GameState {
  const won = sim.outcome === 'win';
  const targetKm = targetKmForRound(state.round);
  const reward = won ? rewardForWin(state.round, sim.bearsSmashed) : rewardForLoss(sim.reachedKm);

  const summary: RoundOutcomeSummary = {
    round: state.round,
    outcome: sim.outcome,
    reachedKm: sim.reachedKm,
    targetKm,
    bearsSmashed: sim.bearsSmashed,
  };

  const newHearts = won ? state.hearts : state.hearts - 1;
  let nextPhase: Phase;
  if (newHearts <= 0) {
    nextPhase = 'gameover';
  } else if (state.round >= MAX_ROUNDS && won) {
    nextPhase = 'victory';
  } else {
    nextPhase = 'result';
  }

  return {
    ...state,
    phase: nextPhase,
    hearts: newHearts,
    coins: state.coins + reward.coins,
    points: state.points + reward.points,
    sim,
    lastSummary: summary,
    totalBearsSmashed: state.totalBearsSmashed + sim.bearsSmashed,
    totalKm: state.totalKm + sim.reachedKm,
  };
}

export function nextRound(state: GameState): GameState {
  if (state.round >= MAX_ROUNDS) return state;
  return {
    ...state,
    phase: 'shop',
    round: state.round + 1,
    plan: null,
    odds: null,
    sim: null,
    lastSummary: null,
  };
}

// ---- HELPERS ----

export function activeModFlags(state: GameState) {
  const catalogMods = state.modIds
    .map((id) => getMod(id))
    .filter((m): m is Mod => !!m);
  return [...catalogMods, ...state.customMods].flatMap((m) => m.flags ?? []);
}

export function activeModEffects(state: GameState) {
  const catalogMods = state.modIds
    .map((id) => getMod(id))
    .filter((m): m is Mod => !!m);
  return [...catalogMods, ...state.customMods];
}

export function canAffordTrain(state: GameState, trainId: string): boolean {
  const train = getTrain(trainId);
  return !!train && state.coins >= train.cost;
}

export function canAffordMod(state: GameState, modId: string): boolean {
  const mod = getMod(modId);
  if (!mod) return false;
  if (state.modIds.includes(modId)) return false;
  const train = getTrain(state.trainId);
  if (state.modIds.length >= train.modSlots) return false;
  return state.coins >= mod.coins && state.points >= mod.points;
}
