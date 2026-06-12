import { BEAR_UNITS, getTrain, targetKmForRound } from './catalog';
import { activeModEffects, activeModFlags, simulationSeed } from './state';
import { composeStats } from './simulate';
import type {
  BearPlacement,
  BearPlan,
  BearUnitType,
  GameState,
  ModFlag,
  PlayerSide,
  ReplayPayload,
  TrainStats,
} from './types';

const MAX_REPLAY_LENGTH = 16_000;
const VALID_FLAGS = new Set<ModFlag>([
  'droneJammer',
  'mineSweeper',
  'acidProof',
  'bearWhisperer',
  'gooseRepellent',
]);

export function createReplayPayload(state: GameState): ReplayPayload {
  if (!state.side || !state.plan) {
    throw new Error('A replay requires an active side and bear plan.');
  }

  const train = getTrain(state.trainId);
  return {
    version: 1,
    side: state.side,
    round: state.round,
    train: {
      id: train.id,
      name: train.name,
      emoji: train.emoji,
    },
    trainStats: composeStats(train.base, activeModEffects(state)),
    modFlags: activeModFlags(state),
    plan: state.plan,
    targetKm: targetKmForRound(state.round),
    simulationSeed: simulationSeed(state),
  };
}

export function encodeReplay(payload: ReplayPayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodeReplay(encoded: string | undefined): ReplayPayload | null {
  if (!encoded || encoded.length > MAX_REPLAY_LENGTH) return null;

  try {
    const base64 = encoded.replaceAll('-', '+').replaceAll('_', '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + padding);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return validateReplay(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

function validateReplay(value: unknown): ReplayPayload | null {
  if (!isRecord(value) || value.version !== 1) return null;
  if (value.side !== 'train' && value.side !== 'bear') return null;
  if (!isFiniteNumber(value.round, 1, 7)) return null;
  if (!isFiniteNumber(value.targetKm, 1, 100)) return null;
  if (!isFiniteNumber(value.simulationSeed, 0, 0xffff_ffff)) return null;
  if (!isRecord(value.train)) return null;
  if (!isShortString(value.train.id, 80) || !isShortString(value.train.name, 120) || !isShortString(value.train.emoji, 16)) return null;

  const trainStats = validateTrainStats(value.trainStats);
  const modFlags = validateModFlags(value.modFlags);
  const plan = validatePlan(value.plan);
  if (!trainStats || !modFlags || !plan) return null;

  return {
    version: 1,
    side: value.side as PlayerSide,
    round: value.round,
    train: {
      id: value.train.id,
      name: value.train.name,
      emoji: value.train.emoji,
    },
    trainStats,
    modFlags,
    plan,
    targetKm: value.targetKm,
    simulationSeed: value.simulationSeed,
  };
}

function validateTrainStats(value: unknown): TrainStats | null {
  if (!isRecord(value)) return null;
  const limits: Record<keyof TrainStats, [number, number]> = {
    topSpeed: [0, 1_000],
    accel: [0, 100],
    maxHp: [1, 10_000],
    armor: [0, 0.8],
    plow: [0, 1_000],
    grip: [0, 1],
    heatShield: [0, 0.95],
    energyWeapon: [0, 1_000],
    regen: [0, 100],
  };
  const stats = {} as TrainStats;
  for (const key of Object.keys(limits) as (keyof TrainStats)[]) {
    const [minimum, maximum] = limits[key];
    if (!isFiniteNumber(value[key], minimum, maximum)) return null;
    stats[key] = value[key];
  }
  return stats;
}

function validateModFlags(value: unknown): ModFlag[] | null {
  if (!Array.isArray(value) || value.length > VALID_FLAGS.size) return null;
  if (!value.every((flag) => typeof flag === 'string' && VALID_FLAGS.has(flag as ModFlag))) return null;
  return [...new Set(value)] as ModFlag[];
}

function validatePlan(value: unknown): BearPlan | null {
  if (!isRecord(value)) return null;
  if (!isShortString(value.name, 100) || !isShortString(value.taunt, 240) || !isShortString(value.strategy, 600)) return null;
  if (value.source !== 'ai' && value.source !== 'preset' && value.source !== 'tactical') return null;
  if (!Array.isArray(value.placements) || value.placements.length > 100) return null;

  const placements: BearPlacement[] = [];
  for (const placement of value.placements) {
    if (!isRecord(placement)) return null;
    if (typeof placement.type !== 'string' || !(placement.type in BEAR_UNITS)) return null;
    if (!isFiniteNumber(placement.atKm, 0, 100) || !isFiniteNumber(placement.count, 1, 100)) return null;
    placements.push({
      type: placement.type as BearUnitType,
      atKm: placement.atKm,
      count: placement.count,
    });
  }

  return {
    name: value.name,
    taunt: value.taunt,
    strategy: value.strategy,
    source: value.source,
    placements,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isShortString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function isFiniteNumber(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}
