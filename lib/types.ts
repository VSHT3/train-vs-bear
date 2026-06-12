// Core game types for TRAIN vs BEAR

export interface TrainStats {
  topSpeed: number; // km/h
  accel: number; // km/h gained per second
  maxHp: number; // structural integrity
  armor: number; // 0..0.8 fraction of damage ignored
  plow: number; // tons of bear cleared per second while grinding
  grip: number; // 0..1 resistance to sticky slow zones (honey, jelly)
  heatShield: number; // 0..1 resistance to heat damage (lava whales)
  energyWeapon: number; // dps applied to obstacles just ahead (pre-clearing)
  regen: number; // hp per second
}

export type ModFlag = 'droneJammer' | 'mineSweeper' | 'acidProof' | 'bearWhisperer' | 'gooseRepellent';

export interface Mod {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  coins: number;
  points: number;
  effects: Partial<TrainStats>;
  flags?: ModFlag[];
  custom?: boolean; // AI-approved custom upgrade
}

export interface TrainTier {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  cost: number; // coins
  modSlots: number;
  cars: number; // visual length
  body: string; // css color
  accent: string;
  base: TrainStats;
}

export type BearUnitType =
  | 'bear'
  | 'armoredBear'
  | 'explosiveBear'
  | 'honeyZone'
  | 'polarMinefield'
  | 'droneSwarm'
  | 'lavaWhale'
  | 'jellyMonolith'
  | 'steelCube'
  | 'acidCube'
  | 'megaUrsa'
  | 'beeSwarm'
  | 'bearpult'
  | 'glueRiver'
  | 'gooseDetail'
  | 'mirrorMaze'
  | 'bearNado';

export interface BearUnitSpec {
  type: BearUnitType;
  name: string;
  emoji: string;
  desc: string;
  cost: number; // bear budget per unit
  kind: 'blocker' | 'zone';
  // blockers
  mass?: number; // tons per unit
  impactDamage?: number; // damage on first contact (scaled by count)
  grindDps?: number; // damage per second while grinding through
  heat?: boolean; // grind damage counts as heat (heatShield applies)
  acid?: boolean; // acidProof flag applies
  organic?: boolean; // bearWhisperer flag applies
  // zones
  zoneLengthKm?: number;
  stickiness?: number; // slow factor contribution
  zoneDps?: number; // damage per second inside zone (per stack)
  minesPerKm?: number;
  mineDamage?: number;
}

export interface BearPlacement {
  type: BearUnitType;
  atKm: number;
  count: number;
}

export interface BearPlan {
  name: string;
  taunt: string;
  strategy: string;
  placements: BearPlacement[];
  source: 'ai' | 'preset';
}

// ---- simulation output ----

export type SimOutcome = 'win' | 'destroyed' | 'stalled' | 'timeout';

export interface SimEvent {
  t: number; // sim seconds
  km: number;
  kind: 'hit' | 'boom' | 'zone' | 'mine' | 'clear' | 'info' | 'win' | 'fail';
  text: string;
}

export interface SimFrame {
  t: number;
  km: number;
  speed: number;
  hp: number;
  sticky: number; // 0..1 current slow factor
  grinding: boolean;
  underFire: boolean;
}

export interface SimObstacle {
  id: number;
  type: BearUnitType;
  km: number;
  lengthKm: number; // 0 for point blockers
  count: number;
  kind: 'blocker' | 'zone';
  contactT?: number; // when the train first touched it
  clearedT?: number; // when it was destroyed (blockers only)
}

export interface SimResult {
  outcome: SimOutcome;
  reachedKm: number;
  targetKm: number;
  timeSec: number;
  bearsSmashed: number;
  damageTaken: number;
  frames: SimFrame[];
  events: SimEvent[];
  obstacles: SimObstacle[];
  finalHp: number;
}

export interface Odds {
  trainWinPct: number; // 0..100
  runs: number;
}

// ---- meta game state ----

export type Phase = 'title' | 'shop' | 'intel' | 'run' | 'result' | 'gameover' | 'victory';

export interface RoundOutcomeSummary {
  round: number;
  outcome: SimOutcome;
  reachedKm: number;
  targetKm: number;
  bearsSmashed: number;
}

export interface GameState {
  phase: Phase;
  round: number; // 1..MAX_ROUNDS
  hearts: number;
  coins: number;
  points: number; // upgrade points
  trainId: string;
  modIds: string[];
  customMods: Mod[]; // AI-approved upgrades (installed, no slot needed, max 3)
  plan: BearPlan | null;
  odds: Odds | null;
  sim: SimResult | null;
  lastSummary: RoundOutcomeSummary | null;
  totalBearsSmashed: number;
  totalKm: number;
  aiAvailable: boolean | null; // null = unknown yet
  muted: boolean;
}
