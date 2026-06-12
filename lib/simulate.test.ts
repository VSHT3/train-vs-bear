import { describe, expect, it } from 'vitest';
import type { TrainStats } from './types';
import { composeStats, runSimulation } from './simulate';
import { normalizeSeed } from './random';

const train: TrainStats = {
  topSpeed: 120,
  accel: 120,
  maxHp: 1000,
  armor: 0,
  plow: 100,
  grip: 0,
  heatShield: 0,
  energyWeapon: 0,
  regen: 0,
};

describe('runSimulation', () => {
  it('replays mine outcomes exactly from the same seed', () => {
    const placements = [{ type: 'polarMinefield' as const, atKm: 0, count: 3 }];
    const first = runSimulation(train, [], placements, 4, { seed: 42, maxTimeSec: 180 });
    const replay = runSimulation(train, [], placements, 4, { seed: 42, maxTimeSec: 180 });

    expect(first.seed).toBe(42);
    expect(first.damageBreakdown.mines).toBeGreaterThan(0);
    expect(replay.events).toEqual(first.events);
    expect(replay.damageBreakdown).toEqual(first.damageBreakdown);
    expect(replay.outcome).toBe(first.outcome);
  });

  it('mine sweeper prevents deterministic mine triggers', () => {
    const result = runSimulation(
      train,
      ['mineSweeper'],
      [{ type: 'polarMinefield', atKm: 0, count: 3 }],
      4,
      { seed: 42, maxTimeSec: 180 },
    );

    expect(result.damageBreakdown.mines).toBe(0);
    expect(result.events.some((event) => event.kind === 'mine')).toBe(false);
  });

  it('stacks zone damage and stickiness by placement count', () => {
    const result = runSimulation(
      { ...train, grip: 0.5 },
      [],
      [
        { type: 'honeyZone', atKm: 0, count: 2 },
        { type: 'droneSwarm', atKm: 0, count: 2 },
      ],
      1,
      { seed: 1, maxTimeSec: 60 },
    );

    expect(Math.max(...result.frames.map((frame) => frame.sticky))).toBeCloseTo(0.32, 2);
    expect(result.damageBreakdown.zone).toBeGreaterThan(0);
  });

  it('pre-clears blockers inside energy weapon range before impact', () => {
    const result = runSimulation(
      { ...train, energyWeapon: 1000 },
      [],
      [{ type: 'bear', atKm: 0.1, count: 1 }],
      1,
      { seed: 1, maxTimeSec: 60 },
    );

    expect(result.obstacleEncounters[0]?.outcome).toBe('vaporized');
    expect(result.damageBreakdown.impact).toBe(0);
    expect(result.bearsSmashed).toBe(1);
  });

  it('caps armor at the documented 80 percent even for raw stats', () => {
    const result = runSimulation(
      { ...train, armor: 1 },
      [],
      [{ type: 'explosiveBear', atKm: 0.05, count: 1 }],
      1,
      { seed: 1, maxTimeSec: 60 },
    );

    expect(result.damageBreakdown.impact).toBe(14);
  });

  it('applies grip after stacked stickiness', () => {
    const noGrip = runSimulation(
      train,
      [],
      [{ type: 'honeyZone', atKm: 0, count: 2 }],
      1,
      { seed: 1, maxTimeSec: 60 },
    );
    const highGrip = runSimulation(
      { ...train, grip: 0.75 },
      [],
      [{ type: 'honeyZone', atKm: 0, count: 2 }],
      1,
      { seed: 1, maxTimeSec: 60 },
    );

    expect(Math.max(...noGrip.frames.map((frame) => frame.sticky))).toBeCloseTo(0.64, 2);
    expect(Math.max(...highGrip.frames.map((frame) => frame.sticky))).toBeCloseTo(0.16, 2);
  });

  it('does not let regeneration revive a train destroyed in the same tick', () => {
    const result = runSimulation(
      { ...train, maxHp: 1, regen: 100 },
      [],
      [{ type: 'droneSwarm', atKm: 0, count: 2 }],
      1,
      { seed: 1, maxTimeSec: 10 },
    );

    expect(result.outcome).toBe('destroyed');
    expect(result.finalHp).toBe(0);
  });
});

describe('composeStats', () => {
  it('clamps armor upgrades to 80 percent', () => {
    expect(composeStats(train, [{ effects: { armor: 2 } }]).armor).toBe(0.8);
  });
});

describe('replay seeds', () => {
  it('preserves numeric seeds when they round-trip through a share URL', () => {
    expect(normalizeSeed('2615462800')).toBe(2615462800);
  });
});
