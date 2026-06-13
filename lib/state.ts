import type {
  BearPlan,
  BearUnitType,
  BonusObjective,
  GameState,
  Mod,
  Phase,
  PlayerSide,
  RoundOutcomeSummary,
  SimResult,
} from './types';
import {
  BEAR_UNITS,
  BEAR_UPGRADES,
  COMMANDER_CARDS,
  bearBudgetForRound,
  buildBearUpgradeOverrides,
  getMod,
  getTrain,
  MAX_CUSTOM_MODS,
  MAX_HEARTS,
  MAX_ROUNDS,
  rewardForLoss,
  rewardForWin,
  rollWaveModifier,
  START_COINS,
  START_POINTS,
  targetKmForRound,
  trainLoadoutForRound,
} from './catalog';
import { deriveSeed, normalizeSeed, type Seed } from './random';
import { calculateOdds, composeStats } from './simulate';

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
    freeplay: false,
    waveModifier: null,
    bearUpgrades: {},
    bonusObjectives: [],
    commanderCard: null,
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
    bearUpgrades: {},
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

export function buyBearUpgrade(state: GameState, upgradeId: string): GameState | null {
  if (state.side !== 'bear') return null;
  const upgrade = BEAR_UPGRADES.find((u) => u.id === upgradeId);
  if (!upgrade) return null;
  const currentLevel = state.bearUpgrades[upgradeId] ?? 0;
  if (currentLevel >= upgrade.maxLevel) return null;
  if (bearBudgetRemaining(state) < upgrade.cost) return null;
  return {
    ...state,
    bearBudget: state.bearBudget - upgrade.cost,
    bearUpgrades: { ...state.bearUpgrades, [upgradeId]: currentLevel + 1 },
  };
}

export function selectCommanderCard(state: GameState, cardId: string): GameState | null {
  if (state.side !== 'bear') return null;
  const card = COMMANDER_CARDS.find((c) => c.id === cardId);
  if (!card) return null;
  const remaining = bearBudgetRemaining(state);
  if (remaining < card.cost) return null;
  return {
    ...state,
    bearBudget: state.bearBudget - card.cost,
    commanderCard: cardId,
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
): GameState {
  const train = getTrain(state.trainId);
  const mods = activeModEffects(state);
  const stats = composeStats(train.base, mods);
  const flags = activeModFlags(state);
  const target = targetKmForRound(state.round);
  const seed = simulationSeed(state);
  const bearUpgrades = buildBearUpgradeOverrides(state.bearUpgrades);
  const odds = calculateOdds(stats, flags, plan.placements, target, 20, seed, state.waveModifier ?? undefined, bearUpgrades, undefined, state.side === 'bear', state.commanderCard ?? undefined);
  const objectives = generateBonusObjectives(state, stats, target);
  return { ...state, phase: 'intel', plan, odds, bonusObjectives: objectives };
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

  // Check bonus objectives
  const checkedObjectives = checkBonusObjectives(state, sim);
  const bonusCoins = checkedObjectives
    .filter((o) => o.completed)
    .reduce((sum, o) => sum + o.reward, 0);

  const summary: RoundOutcomeSummary = {
    round: state.round,
    outcome: sim.outcome,
    reachedKm: sim.reachedKm,
    targetKm,
    bearsSmashed: sim.bearsSmashed,
  };

  const newHearts = playerWon ? state.hearts : state.hearts - 1;
  let nextPhase: Phase;
  if (newHearts <= 0) {
    nextPhase = 'gameover';
  } else if (state.freeplay) {
    nextPhase = 'result';
  } else if (state.round >= MAX_ROUNDS && !playerWon) {
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
    coins: state.side === 'train' ? state.coins + reward.coins + bonusCoins : state.coins,
    points: state.side === 'train' ? state.points + reward.points : state.points,
    sim,
    lastSummary: summary,
    totalBearsSmashed: state.totalBearsSmashed + sim.bearsSmashed,
    totalKm: state.totalKm + sim.reachedKm,
    bonusObjectives: checkedObjectives,
  };
}

export function nextRound(state: GameState): GameState {
  if (!state.freeplay && state.round >= MAX_ROUNDS) return state;
  const round = state.round + 1;
  const loadout = state.side === 'bear' ? trainLoadoutForRound(round) : null;

  // Roll wave modifier in freeplay
  let waveModifier = state.waveModifier;
  if (state.freeplay) {
    waveModifier = rollWaveModifier(deriveSeed(state.seed, `freeplay:${round}`));
  }
  let bearBudget = bearBudgetForRound(round, false);
  if (waveModifier === 'slimPickings') {
    bearBudget = Math.floor(bearBudget * 0.75);
  }

  // Apply bear upgrades to budget
  const budgetBonusLevel = state.bearUpgrades.warChest ?? 0;
  if (budgetBonusLevel > 0) {
    bearBudget = Math.floor(bearBudget * (1 + budgetBonusLevel * 0.1));
  }

  return {
    ...state,
    phase: 'roundIntro',
    round,
    trainId: loadout?.trainId ?? state.trainId,
    modIds: loadout?.modIds ?? state.modIds,
    customMods: state.side === 'bear' ? [] : state.customMods,
    bearPlacements: [],
    bearBudget,
    plan: null,
    odds: null,
    sim: null,
    waveModifier,
    bonusObjectives: [],
    commanderCard: null,
  };
}

export function dismissRoundIntro(state: GameState): GameState {
  return { ...state, phase: 'shop' };
}

export function enterFreeplay(state: GameState): GameState {
  const firstFreeplayRound = MAX_ROUNDS + 1;
  const waveModifier = rollWaveModifier(deriveSeed(state.seed, `freeplay:${firstFreeplayRound}`));
  let bearBudget = bearBudgetForRound(firstFreeplayRound, false);
  if (waveModifier === 'slimPickings') {
    bearBudget = Math.floor(bearBudget * 0.75);
  }

  // Apply bear upgrades to budget
  const budgetBonusLevel = state.bearUpgrades.warChest ?? 0;
  if (budgetBonusLevel > 0) {
    bearBudget = Math.floor(bearBudget * (1 + budgetBonusLevel * 0.1));
  }

  return {
    ...state,
    freeplay: true,
    round: firstFreeplayRound,
    phase: 'roundIntro',
    hearts: MAX_HEARTS,
    bearPlacements: [],
    bearBudget,
    plan: null,
    odds: null,
    sim: null,
    waveModifier,
    bonusObjectives: [],
    commanderCard: null,
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

// ---- BONUS OBJECTIVES ----

export function generateBonusObjectives(state: GameState, stats: import('./types').TrainStats, targetKm: number): BonusObjective[] {
  if (state.side !== 'train' && state.side !== 'bear') return [];
  const side = state.side;
  const objectives: BonusObjective[] = [];
  const rng = (i: number) => deriveSeed(state.seed, `obj:${state.round}:${i}`);

  const baseReward = 50 + 20 * state.round;

  // Pool of possible objectives
  const pool: (() => BonusObjective | null)[] = [];

  if (side === 'train') {
    pool.push(() => ({
      id: `speed-${state.round}`,
      type: 'speedTarget' as const,
      desc: `Reach ${Math.round(stats.topSpeed * 0.8)} km/h`,
      target: Math.round(stats.topSpeed * 0.8),
      reward: baseReward,
      completed: false,
      progress: 0,
    }));
    pool.push(() => ({
      id: `bears-${state.round}`,
      type: 'bearsSmashed' as const,
      desc: `Smash ${10 + 5 * state.round} bears`,
      target: 10 + 5 * state.round,
      reward: baseReward,
      completed: false,
      progress: 0,
    }));
    pool.push(() => ({
      id: `lowdmg-${state.round}`,
      type: 'lowDamage' as const,
      desc: `Take less than ${Math.round(stats.maxHp * 0.3)} damage`,
      target: Math.round(stats.maxHp * 0.3),
      reward: baseReward + 20,
      completed: false,
      progress: 0,
    }));
    pool.push(() => ({
      id: `fast-${state.round}`,
      type: 'fastTime' as const,
      desc: `Finish under ${Math.max(30, Math.round(targetKm / stats.topSpeed * 3600 * 1.2))}s`,
      target: Math.max(30, Math.round(targetKm / stats.topSpeed * 3600 * 1.2)),
      reward: baseReward,
      completed: false,
      progress: 0,
    }));
  } else {
    // Bear side
    pool.push(() => ({
      id: `bear-bears-${state.round}`,
      type: 'bearsSmashed' as const,
      desc: `Let the train clear ${5 + 3 * state.round} bears`,
      target: 5 + 3 * state.round,
      reward: baseReward,
      completed: false,
      progress: 0,
    }));
    pool.push(() => ({
      id: `grind-${state.round}`,
      type: 'grindTime' as const,
      desc: `Keep train grinding for ${5 + 2 * state.round}s`,
      target: 5 + 2 * state.round,
      reward: baseReward + 20,
      completed: false,
      progress: 0,
    }));
    pool.push(() => ({
      id: `zone-${state.round}`,
      type: 'zoneDamage' as const,
      desc: `Deal ${100 + 50 * state.round} zone damage`,
      target: 100 + 50 * state.round,
      reward: baseReward + 10,
      completed: false,
      progress: 0,
    }));
  }

  // Pick 2 objectives deterministically from seed
  const indices = pool.map((_, i) => i);
  // Simple shuffle using round seeds
  for (let i = indices.length - 1; i > 0; i--) {
    const j = rng(i) % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  for (let i = 0; i < Math.min(2, pool.length); i++) {
    const gen = pool[indices[i]];
    const obj = gen();
    if (obj) objectives.push(obj);
  }

  return objectives;
}

export function checkBonusObjectives(state: GameState, sim: SimResult): BonusObjective[] {
  const trainWon = sim.outcome === 'win';
  const playerWon = state.side === 'bear' ? !trainWon : trainWon;

  return state.bonusObjectives.map((obj) => {
    let progress = 0;
    let completed = false;

    switch (obj.type) {
      case 'speedTarget':
        progress = Math.round(Math.max(...sim.frames.map((f) => f.speed), 0));
        completed = progress >= obj.target;
        break;
      case 'bearsSmashed':
        progress = sim.bearsSmashed;
        completed = progress >= obj.target;
        break;
      case 'lowDamage':
        progress = Math.round(sim.damageTaken);
        completed = progress < obj.target && playerWon;
        break;
      case 'fastTime':
        progress = Math.round(sim.timeSec);
        completed = progress <= obj.target && sim.outcome === 'win';
        break;
      case 'grindTime':
        progress = Math.round(sim.frames.filter((f) => f.grinding).length * 0.5);
        completed = progress >= obj.target;
        break;
      case 'zoneDamage':
        progress = Math.round(sim.damageBreakdown.zone + sim.damageBreakdown.grind);
        completed = progress >= obj.target;
        break;
    }

    return { ...obj, progress, completed };
  });
}

export type GameAction =
  | { type: 'startGame'; side: PlayerSide; seed?: Seed }
  | { type: 'buyTrain'; trainId: string }
  | { type: 'installMod'; modId: string }
  | { type: 'removeMod'; modId: string }
  | { type: 'addCustomMod'; mod: Mod }
  | { type: 'setPhase'; phase: Phase }
  | { type: 'setIntel'; plan: BearPlan }
  | { type: 'startRun' }
  | { type: 'finishRun'; sim: SimResult }
  | { type: 'nextRound' }
  | { type: 'dismissRoundIntro' }
  | { type: 'placeBearUnit'; unitType: BearUnitType; atKm: number }
  | { type: 'removeBearPlacement'; index: number }
  | { type: 'buyBearUpgrade'; upgradeId: string }
  | { type: 'selectCommanderCard'; cardId: string }
  | { type: 'restoreGame'; state: GameState }
  | { type: 'enterFreeplay' };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'startGame':
      return startGame(action.side, action.seed);
    case 'restoreGame':
      return action.state;
    case 'enterFreeplay':
      return enterFreeplay(state);
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
      return setIntel(state, action.plan);
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
    case 'buyBearUpgrade':
      return buyBearUpgrade(state, action.upgradeId) ?? state;
    case 'selectCommanderCard':
      return selectCommanderCard(state, action.cardId) ?? state;
  }
}
