'use client';

import { useState } from 'react';
import { runSimulation } from '@/lib/simulate';
import type { ReplayPayload } from '@/lib/types';
import { SimulationPlayback } from './simulation-playback';

export function ReplayScreen({ payload, onExit }: { payload: ReplayPayload; onExit: () => void }) {
  const [result] = useState(() => runSimulation(
    payload.trainStats,
    payload.modFlags,
    payload.plan.placements,
    payload.targetKm,
    { seed: payload.simulationSeed, waveModifier: payload.waveModifier, bearUpgrades: payload.bearUpgrades, isBearSide: payload.side === 'bear' },
  ));

  return <SimulationPlayback payload={payload} result={result} replayMode onExit={onExit} />;
}
