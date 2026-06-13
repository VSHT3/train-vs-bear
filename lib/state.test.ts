import { describe, expect, it } from 'vitest';
import { BEAR_UNITS, trainLoadoutForRound } from './catalog';
import {
  bearBudgetRemaining,
  buildPlayerBearPlan,
  finishRun,
  gameReducer,
  placeBearUnit,
  removeBearPlacement,
  startGame,
} from './state';
import type { SimResult } from './types';

function result(outcome: SimResult['outcome']): SimResult {
  return {
    seed: 1,
    outcome,
    reachedKm: outcome === 'win' ? 8 : 4,
    targetKm: 8,
    timeSec: 10,
    bearsSmashed: 2,
    damageTaken: 100,
    frames: [],
    events: [],
    obstacles: [],
    finalHp: outcome === 'win' ? 100 : 0,
    damageBreakdown: { impact: 100, zone: 0, grind: 0, mines: 0 },
    obstacleEncounters: [],
    decisions: [],
  };
}

describe('bear-side state', () => {
  it('starts with the deterministic opponent train loadout', () => {
    const state = startGame('bear', 123);
    expect(state.trainId).toBe(trainLoadoutForRound(1).trainId);
    expect(state.modIds).toEqual(trainLoadoutForRound(1).modIds);
    expect(state.side).toBe('bear');
  });

  it('spends and refunds bear placement budget', () => {
    const initial = startGame('bear', 123);
    const placed = placeBearUnit(initial, 'armoredBear', 2);
    expect(placed).not.toBeNull();
    expect(bearBudgetRemaining(placed!)).toBe(initial.bearBudget - BEAR_UNITS.armoredBear.cost);

    const removed = removeBearPlacement(placed!, 0);
    expect(bearBudgetRemaining(removed)).toBe(initial.bearBudget);
  });

  it('builds a simulation plan from player placements', () => {
    const state = gameReducer(startGame('bear', 123), { type: 'placeBearUnit', unitType: 'bear', atKm: 2 });
    expect(buildPlayerBearPlan(state).placements).toEqual([{ type: 'bear', atKm: 2, count: 1 }]);
  });

  it('counts stopping the train as a bear-side win', () => {
    const state = finishRun(startGame('bear', 123), result('destroyed'));
    expect(state.phase).toBe('result');
    expect(state.hearts).toBe(3);
  });

  it('takes a bear-side heart when the train reaches the finish', () => {
    const state = finishRun(startGame('bear', 123), result('win'));
    expect(state.phase).toBe('result');
    expect(state.hearts).toBe(2);
  });
});
