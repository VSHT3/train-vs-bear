import { describe, expect, it } from 'vitest';
import { createReplayPayload, decodeReplay, encodeReplay } from './replay';
import { runSimulation } from './simulate';
import { startGame } from './state';
import type { BearPlan, GameState } from './types';

const aiPlan: BearPlan = {
  name: 'AI Mine Test',
  taunt: 'This exact plan should survive a URL.',
  strategy: 'Stack mines and a blocker.',
  source: 'ai',
  placements: [
    { type: 'polarMinefield', atKm: 1.5, count: 2 },
    { type: 'armoredBear', atKm: 4, count: 3 },
  ],
};

function replayState(): GameState {
  return {
    ...startGame('train', 99),
    round: 3,
    trainId: 'diesel',
    modIds: ['reactive', 'sweeper'],
    customMods: [{
      id: 'custom-replay',
      name: 'Replay Plow',
      emoji: '🔁',
      desc: 'A custom stat payload.',
      coins: 0,
      points: 0,
      effects: { plow: 7, regen: 1 },
      flags: ['droneJammer'],
      custom: true,
    }],
    plan: aiPlan,
  };
}

describe('replay payloads', () => {
  it('round-trips complete AI plans and composed train inputs through a URL-safe payload', () => {
    const payload = createReplayPayload(replayState());
    const decoded = decodeReplay(encodeReplay(payload));

    expect(decoded).toEqual(payload);
    expect(decoded?.plan.source).toBe('ai');
    expect(decoded?.plan.placements).toEqual(aiPlan.placements);
    expect(decoded?.trainStats.plow).toBeGreaterThan(30);
    expect(decoded?.modFlags).toContain('droneJammer');
  });

  it('reproduces the exact simulation result without campaign state', () => {
    const payload = createReplayPayload(replayState());
    const decoded = decodeReplay(encodeReplay(payload))!;
    const original = runSimulation(
      payload.trainStats,
      payload.modFlags,
      payload.plan.placements,
      payload.targetKm,
      { seed: payload.simulationSeed },
    );
    const replay = runSimulation(
      decoded.trainStats,
      decoded.modFlags,
      decoded.plan.placements,
      decoded.targetKm,
      { seed: decoded.simulationSeed },
    );

    expect(replay).toEqual(original);
  });

  it('rejects malformed and oversized replay links', () => {
    expect(decodeReplay('not-a-replay')).toBeNull();
    expect(decodeReplay('a'.repeat(16_001))).toBeNull();
  });
});
