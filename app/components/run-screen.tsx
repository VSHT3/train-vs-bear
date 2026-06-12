'use client';

import { useState } from 'react';
import { createReplayPayload } from '@/lib/replay';
import { runSimulation } from '@/lib/simulate';
import type { GameState, SimResult } from '@/lib/types';
import { SimulationPlayback } from './simulation-playback';

export function RunScreen({ state, onDone }: { state: GameState; onDone: (sim: SimResult) => void }) {
  const [{ payload, result }] = useState(() => {
    const replay = createReplayPayload(state);
    return {
      payload: replay,
      result: runSimulation(
        replay.trainStats,
        replay.modFlags,
        replay.plan.placements,
        replay.targetKm,
        { seed: replay.simulationSeed },
      ),
    };
  });

  return <SimulationPlayback payload={payload} result={result} onDone={onDone} />;
}
