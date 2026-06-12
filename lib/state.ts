import type {
  BearPlan,
  BearUnitType,
  GameState,
  Mod,
  Odds,
  Phase,
  PlayerSide,
  RoundOutcomeSummary,
  SimResult,
} from './types';
import {
  BEAR_UNITS,
  bearBudgetForRound,
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
  trainLoadoutForRound,
} from './catalog';
import { deriveSeed, normalizeSeed, type Seed } from './random';

export function createGame(seed: Seed = 'train-vs-bear'): GameState {
  return {
    side: null,
    seed: normalizeSeed(seed),
    phase: 'title',
    round: 1,
    hearts: MAX_HEARTS,
    coins: START_COINS,
    points: START_POINTS,
    trainId: 'handcar',
    modIds: [],
    customMods: [],
    bearPlacements: [],
    bearBudget: bearBudgetForRound(1, false),
    plan: null,
    odds: null,
    sim: null,
    lastSummary: null,
    totalBearsSmashed: 0,
    totalKm: 0,
  };
}

export function startGame(side: PlayerSide, seed: Seed = 'train-vs-bear'): GameState {
  const state = createGame(seed);
  const loadout = side === 'bear' ? trainLoadoutForRound(1) : null;
  return {
    ...state,
    side,
    phase: 'shop',
    trainId: loadout?.trainId ?? state.trainId,
    modIds: loadout?.modIds ?? state.modIds,
  };
}

export function setPhase(state: GameState, phase: Phase): GameState {
  return { ...state, phase };
}

// ---- SHOP ----

export function buyTrain(state: GameState, trainId: string): GameState | null {
  if (state.side !== 'train') return null;
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
  if (state.side !== 'train') return null;
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
  if (state.side !== 'train') return null;
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

// ---- BEAR SHOP ----

export function bearPlanCost(state: GameState): number {
  return state.bearPlacements.reduce(
    (total, placement) => total + BEAR_UNITS[placement.type].cost * placement.count,
    0,
  );
}

export function bearBudgetRemaining(state: GameState): number {
  return state.bearBudget - bearPlanCost(state);
}

export function canAffordBearUnit(state: GameState, type: BearUnitType): boolean {
  return state.side === 'bear' && bearBudgetRemaining(state) >= BEAR_UNITS[type].cost;
}

export function placeBearUnit(state: GameState, type: BearUnitType, atKm: number): GameState | null {
  if (!canAffordBearUnit(state, type)) return null;
  const targetKm = targetKmForRound(state.round);
  const spec = BEAR_UNITS[type];
  const maxKm = Math.max(1, targetKm - (spec.zoneLengthKm ?? 0) - 0.5);
  const km = Math.round(Math.min(Math.max(atKm, 1), maxKm) * 10) / 10;
  const existingIndex = state.bearPlacements.findIndex(
    (placement) => placement.type === type && placement.atKm === km,
  );

  const placements = [...state.bearPlacements];
  if (existingIndex >= 0) {
    placements[existingIndex] = {
      ...placements[existingIndex],
      count: placements[existingIndex].count + 1,
    };
  } else {
    placements.push({ type, atKm: km, count: 1 });
  }

  return {
    ...state,
    bearPlacements: placements.sort((a, b) => a.atKm - b.atKm),
  };
}

export function removeBearPlacement(state: GameState, index: number): GameState {
  return {
    ...state,
    bearPlacements: state.bearPlacements.filter((_, placementIndex) => placementIndex !== index),
  };
}

export function buildPlayerBearPlan(state: GameState): BearPlan {
  return {
    name: 'Player Bear Defense',
    taunt: 'This track is under bear management now.',
    strategy: `A hand-placed defense using ${bearPlanCost(state)} of ${state.bearBudget} bear credits.`,
    placements: state.bearPlacements,
    source: 'preset',
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
  const trainWon = sim.outcome === 'win';
  const playerWon = state.side === 'bear' ? !trainWon : trainWon;
  const targetKm = targetKmForRound(state.round);
  const reward = playerWon ? rewardForWin(state.round, sim.bearsSmashed) : rewardForLoss(sim.reachedKm);

  const summary: RoundOutcomeSummary = {
    round: state.round,
    outcome: sim.outcome,
    reachedKm: sim.reachedKm,
    targetKm,
    bearsSmashed: sim.bearsSmashed,
  };

  const newHearts = playerWon ? state.hearts : state.hearts - 1;
  let nextPhase: Phase;
  if (newHearts <= 0 || (state.round >= MAX_ROUNDS && !playerWon)) {
    nextPhase = 'gameover';
  } else if (state.round >= MAX_ROUNDS && playerWon) {
    nextPhase = 'victory';
  } else {
    nextPhase = 'result';
  }

  return {
    ...state,
    phase: nextPhase,
    hearts: newHearts,
    coins: state.side === 'train' ? state.coins + reward.coins : state.coins,
    points: state.side === 'train' ? state.points + reward.points : state.points,
    sim,
    lastSummary: summary,
    totalBearsSmashed: state.totalBearsSmashed + sim.bearsSmashed,
    totalKm: state.totalKm + sim.reachedKm,
  };
}

export function nextRound(state: GameState): GameState {
  if (state.round >= MAX_ROUNDS) return state;
  const round = state.round + 1;
  const loadout = state.side === 'bear' ? trainLoadoutForRound(round) : null;
  return {
    ...state,
    phase: 'roundIntro',
    round,
    trainId: loadout?.trainId ?? state.trainId,
    modIds: loadout?.modIds ?? state.modIds,
    customMods: state.side === 'bear' ? [] : state.customMods,
    bearPlacements: [],
    bearBudget: bearBudgetForRound(round, false),
    plan: null,
    odds: null,
    sim: null,
  };
}

export function dismissRoundIntro(state: GameState): GameState {
  return { ...state, phase: 'shop' };
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
  if (state.side !== 'train') return false;
  const train = getTrain(trainId);
  return !!train && state.coins >= train.cost;
}

export function canAffordMod(state: GameState, modId: string): boolean {
  if (state.side !== 'train') return false;
  const mod = getMod(modId);
  if (!mod) return false;
  if (state.modIds.includes(modId)) return false;
  const train = getTrain(state.trainId);
  if (state.modIds.length >= train.modSlots) return false;
  return state.coins >= mod.coins && state.points >= mod.points;
}

export function simulationSeed(state: GameState): number {
  return deriveSeed(state.seed, `round:${state.round}`);
}

export type GameAction =
  | { type: 'startGame'; side: PlayerSide; seed?: Seed }
  | { type: 'buyTrain'; trainId: string }
  | { type: 'installMod'; modId: string }
  | { type: 'removeMod'; modId: string }
  | { type: 'addCustomMod'; mod: Mod }
  | { type: 'setPhase'; phase: Phase }
  | { type: 'setIntel'; plan: BearPlan; odds: Odds }
  | { type: 'startRun' }
  | { type: 'finishRun'; sim: SimResult }
  | { type: 'nextRound' }
  | { type: 'dismissRoundIntro' }
  | { type: 'placeBearUnit'; unitType: BearUnitType; atKm: number }
  | { type: 'removeBearPlacement'; index: number };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'startGame':
      return startGame(action.side, action.seed);
    case 'buyTrain':
      return buyTrain(state, action.trainId) ?? state;
    case 'installMod':
      return installMod(state, action.modId) ?? state;
    case 'removeMod':
      return removeMod(state, action.modId) ?? state;
    case 'addCustomMod':
      return addCustomMod(state, action.mod) ?? state;
    case 'setPhase':
      return setPhase(state, action.phase);
    case 'setIntel':
      return setIntel(state, action.plan, action.odds);
    case 'startRun':
      return startRun(state);
    case 'finishRun':
      return finishRun(state, action.sim);
    case 'nextRound':
      return nextRound(state);
    case 'dismissRoundIntro':
      return dismissRoundIntro(state);
    case 'placeBearUnit':
      return placeBearUnit(state, action.unitType, action.atKm) ?? state;
    case 'removeBearPlacement':
      return removeBearPlacement(state, action.index);
  }
}
