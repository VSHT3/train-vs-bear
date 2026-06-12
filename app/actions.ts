'use server';

import { generateBearPlan, generatePresetPlan, validateCustomUpgrade } from '@/lib/ai';
import { activeModEffects, activeModFlags } from '@/lib/state';
import { composeStats, calculateOdds } from '@/lib/simulate';
import { getTrain, targetKmForRound } from '@/lib/catalog';
import type { Seed } from '@/lib/random';
import type { BearPlan, GameState, Mod, TrainStats } from '@/lib/types';

export async function getBearPlan(
  round: number,
  trainStats: TrainStats,
  modNames: string[],
  targetKm: number,
  playerLostLast: boolean,
  seed: Seed,
): Promise<BearPlan> {
  try {
    return await generateBearPlan(round, trainStats, modNames, targetKm, playerLostLast);
  } catch {
    return generatePresetPlan(round, targetKm, playerLostLast, seed);
  }
}

export async function getPresetPlan(
  round: number,
  targetKm: number,
  playerLostLast: boolean,
  seed: Seed,
): Promise<BearPlan> {
  return generatePresetPlan(round, targetKm, playerLostLast, seed);
}

export async function evaluateCustomUpgrade(
  description: string,
  round: number,
  existingMods: string[],
): Promise<Mod | { valid: false; reason: string }> {
  try {
    return await validateCustomUpgrade(description, round, existingMods);
  } catch {
    return { valid: false, reason: 'The Upgrade Arbiter is currently on lunch break. Try again later.' };
  }
}

export async function computeOdds(
  state: GameState,
  plan: BearPlan,
): Promise<{ trainWinPct: number; runs: number }> {
  const train = getTrain(state.trainId);
  const mods = activeModEffects(state);
  const stats = composeStats(train.base, mods);
  const flags = activeModFlags(state);

  return calculateOdds(stats, flags, plan.placements, targetKmForRound(state.round), 30, state.seed);
}
