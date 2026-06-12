'use server';

import { generatePresetPlan, generateTacticalPlan, validateCustomUpgrade } from '@/lib/ai';
import type { Seed } from '@/lib/random';
import type { BearPlan, Mod, TrainStats } from '@/lib/types';

export async function getBearPlan(
  round: number,
  trainStats: TrainStats,
  modNames: string[],
  targetKm: number,
  playerLostLast: boolean,
  seed: Seed,
): Promise<BearPlan> {
  try {
    return generateTacticalPlan(round, trainStats, modNames, targetKm, playerLostLast, seed);
  } catch (error) {
    console.error('[tactical] plan generation failed, using preset:', error instanceof Error ? error.message : error);
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
  } catch (error) {
    console.error('[ai] custom upgrade validation failed:', error instanceof Error ? error.message : error);
    return { valid: false, reason: 'The Upgrade Arbiter is currently on lunch break. Try again later.' };
  }
}
