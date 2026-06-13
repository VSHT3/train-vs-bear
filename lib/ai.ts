import { generateText, Output } from 'ai';
import { z } from 'zod/v4';

// Tried in order — free-tier gateway rate limits hit per model, so falling
// through to another provider keeps live AI alive before the preset fallback.
const AI_MODELS = ['google/gemini-2.5-flash', 'anthropic/claude-haiku-4.5', 'openai/gpt-4o-mini'];

async function generateWithFallback<T>(opts: {
  system: string;
  prompt: string;
  output: ReturnType<typeof Output.object>;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<T> {
  let lastError: unknown;
  for (const model of AI_MODELS) {
    try {
      const result = await generateText({ ...opts, model });
      return result.output as T;
    } catch (error) {
      lastError = error;
      console.error(`[ai] model ${model} failed:`, error instanceof Error ? error.message : error);
    }
  }
  throw lastError;
}
import type { BearPlan, BearPlacement, BearUnitType, Mod, ModFlag, TrainStats } from './types';
import { BEAR_UNITS, bearBudgetForRound, MODS } from './catalog';
import { createSeededRandom, type Seed } from './random';

// ---- BEAR PLAN GENERATION ----

const bearPlacementSchema = z.object({
  type: z.string(),
  atKm: z.number(),
  count: z.number(),
});

const bearPlanSchema = z.object({
  name: z.string(),
  taunt: z.string(),
  strategy: z.string(),
  placements: z.array(bearPlacementSchema),
});

export async function generateBearPlan(
  round: number,
  trainStats: TrainStats,
  modNames: string[],
  targetKm: number,
  playerLostLast: boolean,
): Promise<BearPlan> {
  const budgetActual = bearBudgetForRound(round, playerLostLast);

  const unitList = Object.entries(BEAR_UNITS).map(([type, spec]) =>
    `${spec.emoji} ${spec.name} (${type}) — cost:${spec.cost}ea, ${spec.kind}, ${spec.desc}`
  ).join('\n');

  const raw = await generateWithFallback<{ name: string; taunt: string; strategy: string; placements: Array<{ type: string; atKm: number; count: number }> }>({
    system: `You are the Bear Commander, a creative and slightly unhinged AI that designs obstacle courses to stop trains. You have access to a catalog of bear units and obstacles.

You are facing a train with these stats:
- Top Speed: ${trainStats.topSpeed} km/h
- Acceleration: ${trainStats.accel} km/h/s
- HP: ${trainStats.maxHp}
- Armor: ${Math.round(trainStats.armor * 100)}%
- Plow: ${trainStats.plow} tons/s
- Grip: ${Math.round(trainStats.grip * 100)}%
- Heat Shield: ${Math.round(trainStats.heatShield * 100)}%
- Energy Weapon: ${trainStats.energyWeapon} dps
- Regeneration: ${trainStats.regen} hp/s
${modNames.length > 0 ? `- Active mods: ${modNames.join(', ')}` : '- No mods installed'}

Rules for your obstacle plan:
1. Total cost must not exceed ${budgetActual}
2. Place obstacles between 2 km and ${targetKm - 1} km (leave warm-up and finish buffer)
3. Mix blocker and zone types for variety
4. Counter the train's weaknesses — low heat shield? Add lava whales. Low grip? Add honey/glue zones.
5. Be creative and funny with your plan name and taunt
6. Placements must be valid BearUnitType values from the catalog

Every obstacle teaches a lesson. Make it memorable.`,
    prompt: `Design a bear obstacle plan for Round ${round}.

Available bear units:
${unitList}

Target distance: ${targetKm} km
Your budget: ${budgetActual} credits
${playerLostLast ? 'The train LOST last round — your budget is reduced by 15%. Make it count.' : 'The train WON last round — you have full budget. No mercy.'}

Train weaknesses to exploit:
${getWeaknessAdvice(trainStats)}

Return a JSON object with:
- name: a creative mission name
- taunt: a one-line taunt aimed at the train
- strategy: a paragraph explaining your devious plan
- placements: array of { type (exact BearUnitType string), atKm (number), count (number) }`,
    output: Output.object({ schema: bearPlanSchema }),
    temperature: 0.9,
    // Thinking models (gemini-2.5) spend output budget on reasoning before
    // emitting JSON — a tight cap yields "No output generated".
    maxOutputTokens: 6000,
  });

  // Validate and sanitize placements
  const validPlacements: BearPlacement[] = raw.placements
    .filter((p) => p.type in BEAR_UNITS)
    .filter((p) => p.atKm > 1 && p.atKm < targetKm)
    .filter((p) => p.count > 0)
    .map((p) => ({
      type: p.type as BearUnitType,
      atKm: Math.round(p.atKm * 10) / 10,
      count: Math.min(Math.round(p.count), 50),
    }));

  return {
    name: raw.name.slice(0, 80),
    taunt: raw.taunt.slice(0, 200),
    strategy: raw.strategy.slice(0, 500),
    placements: validPlacements,
    source: 'ai',
  };
}

function getWeaknessAdvice(stats: TrainStats): string {
  const advice: string[] = [];
  if (stats.topSpeed < 180) advice.push('- Low top speed: use sticky zones to slow them to a crawl');
  if (stats.accel < 9) advice.push('- Slow acceleration: place obstacles early, they won\'t have time to speed up');
  if (stats.maxHp < 1000) advice.push('- Low HP: explosive bears and acid cubes will shred them');
  if (stats.armor < 0.2) advice.push('- Low armor: direct damage units (steel cubes, C4 bears) are extra effective');
  if (stats.plow < 40) advice.push('- Low plow: stack many units together, they\'ll get stuck grinding');
  if (stats.grip < 0.25) advice.push('- Low grip: honey floods and glue rivers will be devastating');
  if (stats.heatShield < 0.25) advice.push('- Low heat shield: lava whales are an obvious choice');
  if (stats.energyWeapon < 10) advice.push('- No energy weapon: you can place blockers without fear of them being pre-cleared');
  if (stats.regen < 2) advice.push('- Negligible regen: sustained damage from zones (drones, bees) will wear them down');
  if (advice.length === 0) advice.push('- This train is well-rounded. Throw everything at them and hope for the best.');
  return advice.join('\n');
}

// ---- CUSTOM UPGRADE VALIDATION ----

const customModSchema = z.object({
  valid: z.boolean(),
  name: z.string(),
  emoji: z.string(),
  desc: z.string(),
  coins: z.number(),
  points: z.number(),
  reason: z.string(),
  effects: z.object({
    topSpeed: z.number().optional(),
    accel: z.number().optional(),
    maxHp: z.number().optional(),
    armor: z.number().optional(),
    plow: z.number().optional(),
    grip: z.number().optional(),
    heatShield: z.number().optional(),
    energyWeapon: z.number().optional(),
    regen: z.number().optional(),
  }).optional(),
  flags: z.array(z.string()).optional(),
});

export async function validateCustomUpgrade(
  description: string,
  round: number,
  existingMods: string[],
): Promise<Mod | { valid: false; reason: string }> {
  const existingNames = existingMods
    .map((id) => MODS.find((m) => m.id === id))
    .filter(Boolean)
    .map((m) => m!.name)
    .join(', ');

  const raw = await generateWithFallback<{
    valid: boolean;
    name?: string;
    emoji?: string;
    desc?: string;
    coins?: number;
    points?: number;
    reason?: string;
    effects?: Partial<TrainStats>;
    flags?: string[];
  }>({
    system: `You are the Upgrade Arbiter — a stern but fair AI that evaluates custom train upgrades. You decide if a player's suggested upgrade is valid and how much it should cost.

Context:
- This is Round ${round} (max 7), costs scale with round
- Existing mods: ${existingNames || 'none'}
- The game has trains, bears, explosives, lava whales, honey, drones, etc.
- Upgrades should be creative but NOT game-breaking (no "instant win", "teleport", "invincibility")
- Stats have these ranges: topSpeed 0-600, accel 0-30, maxHp 0-5000, armor 0-0.8, plow 0-200, grip 0-1, heatShield 0-1, energyWeapon 0-80, regen 0-10
- ModFlags available: droneJammer (drones can't hit), mineSweeper (mines mostly bypassed), acidProof (acid cube damage halved), bearWhisperer (some bears wander off), gooseRepellent (geese ignored)

CRITICAL: every approved upgrade MUST have at least one concrete game effect — a non-zero stat delta in "effects" and/or a flag in "flags". Pure flavor with no mechanics is useless in the simulation. Translate flavor creatively into mechanics:
- "a cute kitten" → bearWhisperer flag (bears get distracted) or small regen (morale)
- "racing stripes" → small topSpeed boost
- "cup holders" → small maxHp (crew morale = better maintenance)
Effect sizes are DELTAS added to the train's stats, and are clamped server-side to: topSpeed ±100, accel ±8, maxHp ±800, armor ±0.15, plow ±40, grip ±0.4, heatShield ±0.4, energyWeapon ±30, regen ±5. Price must match the mechanical power you grant, not the flavor.

Pricing guidelines:
- Small stat boost (e.g. +5 topSpeed, +0.05 armor): 100-200 coins, 0-1 points
- Medium stat boost or utility flag: 200-400 coins, 1-2 points
- Large stat boost or powerful flag: 400-600 coins, 2-3 points
- Very powerful combos: 600-800 coins, 3 points

You can reject upgrades that make no sense, are impossibly OP, or duplicate existing mods.`,
    prompt: `Player suggests this custom upgrade: "${description}"

Evaluate it and return a JSON object:
- valid: boolean (true if acceptable)
- If valid:
  - name: short upgrade name (max 40 chars)
  - emoji: one emoji that fits
  - desc: funny one-line description (max 120 chars)
  - coins: cost in coins
  - points: cost in upgrade points (0-3)
  - effects: stat DELTAS (only include stats that change; at least one non-zero entry unless a flag is given)
  - flags: any ModFlag strings that apply
- If invalid:
  - valid: false
  - reason: short explanation why it was rejected`,
    output: Output.object({ schema: customModSchema }),
    temperature: 0.7,
    // Headroom for thinking models — see note in generateBearPlan.
    maxOutputTokens: 4000,
  });

  if (!raw.valid || !raw.name) {
    return { valid: false, reason: raw.reason ?? 'The Upgrade Arbiter was not impressed.' };
  }

  const validFlags: ModFlag[] = ['droneJammer', 'mineSweeper', 'acidProof', 'bearWhisperer', 'gooseRepellent'];
  const flags = (raw.flags ?? []).filter((f): f is ModFlag => validFlags.includes(f as ModFlag));
  const effects = clampEffects(raw.effects ?? {});

  if (Object.keys(effects).length === 0 && flags.length === 0) {
    return {
      valid: false,
      reason: 'The Arbiter loved the idea but found no measurable effect on the train. Pitch it with some mechanical teeth.',
    };
  }

  return {
    id: `custom-${Date.now()}`,
    name: raw.name.slice(0, 40),
    emoji: (raw.emoji ?? '🔧').slice(0, 2),
    desc: raw.desc?.slice(0, 120) ?? 'A custom upgrade of questionable legality.',
    coins: Math.min(Math.max(Math.round(raw.coins ?? 200), 50), 1000),
    points: Math.min(Math.max(Math.round(raw.points ?? 1), 0), 3),
    effects,
    flags: flags.length > 0 ? flags : undefined,
    custom: true,
  };
}

// Max absolute per-stat delta an AI-approved upgrade may grant.
const EFFECT_CLAMPS: Record<keyof TrainStats, number> = {
  topSpeed: 100,
  accel: 8,
  maxHp: 800,
  armor: 0.15,
  plow: 40,
  grip: 0.4,
  heatShield: 0.4,
  energyWeapon: 30,
  regen: 5,
};

function clampEffects(effects: Partial<TrainStats>): Partial<TrainStats> {
  const clamped: Partial<TrainStats> = {};
  for (const [key, limit] of Object.entries(EFFECT_CLAMPS) as Array<[keyof TrainStats, number]>) {
    const value = effects[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) continue;
    clamped[key] = Math.min(Math.max(value, -limit), limit);
  }
  return clamped;
}

// ---- GENERATE PRESET BEAR PLAN (offline fallback) ----

export function generatePresetPlan(
  round: number,
  targetKm: number,
  playerLostLast: boolean,
  seed: Seed = `preset:${round}`,
): BearPlan {
  const budget = bearBudgetForRound(round, playerLostLast);
  const random = createSeededRandom(seed);

  const presetStrategies: Array<{
    name: string;
    taunt: string;
    strategy: string;
    units: Array<{ type: BearUnitType; count: number }>;
    spacing: 'even' | 'clustered' | 'frontloaded' | 'backloaded';
  }> = [
    {
      name: 'Classic Bear-icade',
      taunt: 'You shall not pass! ...probably. But we\'ll try!',
      strategy: 'Standard bear blockade with sticky honey traps. Tried and true. Like a bear hug, but for trains.',
      units: [
        { type: 'bear', count: 8 },
        { type: 'honeyZone', count: 1 },
        { type: 'armoredBear', count: 3 },
        { type: 'steelCube', count: 1 },
      ],
      spacing: 'even',
    },
    {
      name: 'Operation Hot Paw',
      taunt: 'They won\'t survive the heat. Or the bears. Or both. Mostly both.',
      strategy: 'Heat-focused build with lava whales backed by explosive bears. If the heat doesn\'t get them, the boom will.',
      units: [
        { type: 'lavaWhale', count: 2 },
        { type: 'explosiveBear', count: 5 },
        { type: 'droneSwarm', count: 1 },
        { type: 'armoredBear', count: 2 },
      ],
      spacing: 'clustered',
    },
    {
      name: 'The Stick',
      taunt: 'You will go precisely nowhere, train.',
      strategy: 'Maximum stickiness — honey floods, glue rivers, polar minefields. The train will be going 5 km/h and hating every second of it.',
      units: [
        { type: 'honeyZone', count: 1 },
        { type: 'glueRiver', count: 1 },
        { type: 'polarMinefield', count: 1 },
        { type: 'bear', count: 6 },
      ],
      spacing: 'frontloaded',
    },
    {
      name: 'Goose Protocol',
      taunt: 'Honk honk, train. Honk honk.',
      strategy: 'Geese. Just... so many geese. With bear support. Nobody is prepared for the geese.',
      units: [
        { type: 'gooseDetail', count: 3 },
        { type: 'beeSwarm', count: 1 },
        { type: 'bear', count: 5 },
        { type: 'explosiveBear', count: 3 },
      ],
      spacing: 'even',
    },
    {
      name: 'Apocalypse Bear',
      taunt: 'We have a bear-nado. We are not joking.',
      strategy: 'Endgame chaos build. Bear-nado, mega bear, acid cubes. This is what bear R&D has been working toward.',
      units: [
        { type: 'bearNado', count: 1 },
        { type: 'acidCube', count: 1 },
        { type: 'jellyMonolith', count: 1 },
        { type: 'megaUrsa', count: 1 },
        { type: 'droneSwarm', count: 1 },
      ],
      spacing: 'backloaded',
    },
    {
      name: 'Bee Movie But Worse',
      taunt: 'According to all known laws of aviation, bees should not be this effective.',
      strategy: 'Drone swarms, bee swarms, and bear support. The entire track is a no-fly zone. Which is ironic because the train doesn\'t fly.',
      units: [
        { type: 'beeSwarm', count: 1 },
        { type: 'droneSwarm', count: 1 },
        { type: 'bearpult', count: 1 },
        { type: 'armoredBear', count: 3 },
      ],
      spacing: 'even',
    },
  ];

  const strategy = presetStrategies[(round - 1) % presetStrategies.length];

  // Filter units to fit budget
  let remaining = budget;
  const filteredUnits: Array<{ type: BearUnitType; count: number }> = [];
  for (const unit of strategy.units) {
    const cost = BEAR_UNITS[unit.type].cost;
    const maxAfford = Math.floor(remaining / cost);
    const actualCount = Math.min(unit.count, maxAfford);
    if (actualCount > 0) {
      filteredUnits.push({ ...unit, count: actualCount });
      remaining -= cost * actualCount;
    }
  }

  // Generate placements
  const placements: BearPlacement[] = [];
  const usableDist = targetKm - 3; // Leave 1.5km start buffer and 1.5km end buffer
  const startKm = 1.5;

  for (const unit of filteredUnits) {
    let position: number;

    switch (strategy.spacing) {
      case 'frontloaded':
        position = startKm + (random() * usableDist * 0.3);
        break;
      case 'backloaded':
        position = startKm + usableDist * 0.6 + (random() * usableDist * 0.4);
        break;
      case 'clustered':
        position = startKm + usableDist * 0.3 + (random() * usableDist * 0.4);
        break;
      default: // even
        position = startKm + random() * usableDist;
    }

    placements.push({
      type: unit.type,
      atKm: Math.round(position * 10) / 10,
      count: unit.count,
    });
  }

  placements.sort((a, b) => a.atKm - b.atKm);

  return {
    name: strategy.name,
    taunt: strategy.taunt,
    strategy: strategy.strategy,
    placements,
    source: 'preset',
  };
}

// ---- TACTICAL PLAN GENERATION (no AI) ----

const MAX_STATS: TrainStats = {
  topSpeed: 520, accel: 26, maxHp: 3000, armor: 0.45,
  plow: 120, grip: 0.6, heatShield: 0.5, energyWeapon: 50, regen: 6,
};

type WeaknessKey = 'lowHeatShield' | 'lowGrip' | 'lowArmor' | 'lowMaxHp' | 'lowPlow' | 'lowRegen' | 'lowEnergyWeapon' | 'lowTopSpeed' | 'lowAccel';

const COUNTER_MAP: Record<WeaknessKey, BearUnitType[]> = {
  lowHeatShield:   ['lavaWhale'],
  lowGrip:         ['honeyZone', 'glueRiver'],
  lowArmor:        ['explosiveBear', 'steelCube'],
  lowMaxHp:        ['explosiveBear', 'bearpult'],
  lowPlow:         ['armoredBear', 'jellyMonolith'],
  lowRegen:        ['droneSwarm', 'beeSwarm'],
  lowEnergyWeapon: ['armoredBear', 'bear'],
  lowTopSpeed:     ['honeyZone', 'glueRiver', 'mirrorMaze'],
  lowAccel:        ['gooseDetail', 'honeyZone'],
};

const FILLER_UNITS: BearUnitType[] = ['bear', 'gooseDetail', 'armoredBear', 'explosiveBear'];

const STRATEGY_TEMPLATES: Record<WeaknessKey, { names: string[]; taunts: string[]; desc: string }> = {
  lowHeatShield: {
    names: ['Operation Hot Paw', 'The Floor is Lava', 'Thermal Payload', 'Bearly Lukewarm'],
    taunts: ['Hope you brought sunscreen.', 'This track is well done.', 'Bears turn up the heat.'],
    desc: 'Lava whales deployed to exploit thermal vulnerability.',
  },
  lowGrip: {
    names: ['The Stick', 'Velcro Protocol', 'The Slow Zone', 'Glue Factory'],
    taunts: ['You will go precisely nowhere.', 'Stick around, will you?', 'Slippery when dry.'],
    desc: 'Maximum stickiness via honey floods and glue rivers.',
  },
  lowArmor: {
    names: ['Operation Tin Can', 'Armor? What Armor?', 'The Nutcracker', 'Soft Target Protocol'],
    taunts: ['Your armor is merely a suggestion.', 'We brought hammers.', 'Crunch time, train.'],
    desc: 'High-impact units targeting weak armor plating.',
  },
  lowMaxHp: {
    names: ['Glass Cannon Test', 'Operation Sudden Stop', 'The Delete Button', 'Fragile Express'],
    taunts: ['One good hit and it\'s over.', 'Your HP bar is a countdown.', 'Bears love glass cannons.'],
    desc: 'Burst-damage units designed to overwhelm low hull integrity.',
  },
  lowPlow: {
    names: ['Operation Bear Pile', 'The Wall', 'Bear Jenga', 'Gridlock Protocol'],
    taunts: ['You\'re not pushing through this.', 'Plow? Cute.', 'Welcome to the bear pile.'],
    desc: 'High-mass obstacles the low-plow train will struggle to clear.',
  },
  lowRegen: {
    names: ['Death by a Thousand Cuts', 'Attrition Protocol', 'The Grind', 'Operation Papercut'],
    taunts: ['Every scratch counts.', 'You can\'t heal fast enough.', 'Slow and steady bear offense.'],
    desc: 'Sustained damage zones exploiting negligible regeneration.',
  },
  lowEnergyWeapon: {
    names: ['The Gauntlet', 'Blockade Protocol', 'Operation Bear Wall', 'No Laser No Pass'],
    taunts: ['No energy weapon? Bold choice.', 'Every bear is a speed bump.', 'You\'ll have to earn every meter.'],
    desc: 'Dense blocker formations — no pre-clearing means every bear must be rammed.',
  },
  lowTopSpeed: {
    names: ['Operation Tar Pit', 'The Slow Cooker', 'Bear Traffic Jam', '5 km/h Express'],
    taunts: ['Speed is no longer an option.', 'You will crawl.', 'The bears have all day.'],
    desc: 'Sticky traps to reduce the already-low top speed to a standstill.',
  },
  lowAccel: {
    names: ['Early Bird Protocol', 'Operation Welcome Mat', 'Bear Breakfast Club'],
    taunts: ['No time to speed up.', 'Front-loaded. No mercy.', 'We meet you at the door.'],
    desc: 'Obstacles placed early to exploit slow acceleration before the train builds speed.',
  },
};

const STICKY_TYPES: BearUnitType[] = ['honeyZone', 'glueRiver', 'mirrorMaze'];
const ZONE_DPS_TYPES: BearUnitType[] = ['droneSwarm', 'beeSwarm', 'bearNado'];
const HEAVY_BLOCKERS: BearUnitType[] = ['megaUrsa', 'jellyMonolith', 'acidCube'];
const BURST_BLOCKERS: BearUnitType[] = ['explosiveBear', 'bearpult', 'steelCube'];

export function generateTacticalPlan(
  round: number,
  trainStats: TrainStats,
  modNames: string[],
  targetKm: number,
  playerLostLast: boolean,
  seed: Seed = `tactical:${round}`,
): BearPlan {
  const budget = bearBudgetForRound(round, playerLostLast);
  const random = createSeededRandom(seed);

  const weaknesses: { key: WeaknessKey; score: number }[] = ([
    { key: 'lowHeatShield',   field: 'heatShield' },
    { key: 'lowGrip',         field: 'grip' },
    { key: 'lowArmor',        field: 'armor' },
    { key: 'lowMaxHp',        field: 'maxHp' },
    { key: 'lowPlow',         field: 'plow' },
    { key: 'lowRegen',        field: 'regen' },
    { key: 'lowEnergyWeapon', field: 'energyWeapon' },
    { key: 'lowTopSpeed',     field: 'topSpeed' },
    { key: 'lowAccel',        field: 'accel' },
  ] as const).map(({ key, field }) => ({
    key,
    score: 1 - (trainStats[field] / MAX_STATS[field]),
  })).sort((a, b) => b.score - a.score);

  // Resolve active mod flags for counter-play adjustments
  const activeFlags = new Set<ModFlag>();
  for (const name of modNames) {
    const mod = MODS.find((m) => m.name === name);
    if (mod?.flags) mod.flags.forEach((f) => activeFlags.add(f));
  }

  let remaining = budget;
  const shopping: Map<BearUnitType, number> = new Map();

  function buy(type: BearUnitType, count: number): number {
    const cost = BEAR_UNITS[type].cost * count;
    if (cost > remaining) return 0;
    remaining -= cost;
    shopping.set(type, (shopping.get(type) ?? 0) + count);
    return count;
  }

  // Allocate 45% / 30% / 15% to top 3 weaknesses above threshold
  const activeWeaknesses = weaknesses.filter((w) => w.score > 0.25).slice(0, 3);
  const totalScore = activeWeaknesses.reduce((s, w) => s + w.score, 0) || 1;
  const allocPcts = [0.45, 0.30, 0.15];

  for (let i = 0; i < activeWeaknesses.length && remaining > 0; i++) {
    const weakness = activeWeaknesses[i];
    const alloc = Math.floor(budget * allocPcts[i] * (weakness.score / totalScore));
    let subBudget = Math.min(alloc, remaining);

    const counters = COUNTER_MAP[weakness.key];
    if (!counters || counters.length === 0) continue;

    // Filter out units countered by mod flags
    const effective = counters.filter((t) => {
      if (activeFlags.has('droneJammer') && t === 'droneSwarm') return false;
      if (activeFlags.has('mineSweeper') && t === 'polarMinefield') return false;
      if (activeFlags.has('gooseRepellent') && t === 'gooseDetail') return false;
      return true;
    });

    if (effective.length === 0) continue;

    // Distribute across counter units (primary gets ~60%, rest split)
    const primaryWeight = 0.6;
    for (let j = 0; j < effective.length && subBudget > 0; j++) {
      const unitType = effective[j];
      const weight = j === 0 ? primaryWeight : (1 - primaryWeight) / (effective.length - 1);
      let unitBudget = Math.floor(subBudget * weight);

      // Reduce budget if countered by specific flags
      if (activeFlags.has('acidProof') && unitType === 'acidCube') unitBudget = Math.floor(unitBudget * 0.4);
      if (activeFlags.has('bearWhisperer') && BEAR_UNITS[unitType].organic) unitBudget = Math.floor(unitBudget * 0.5);

      const cost = BEAR_UNITS[unitType].cost;
      const count = Math.max(1, Math.floor(unitBudget / cost));
      const actual = buy(unitType, Math.min(count, Math.floor(subBudget / cost)));
      subBudget -= actual * cost;
    }
  }

  // Spend remaining on filler units (max 3 extra types)
  const fillerPool = FILLER_UNITS.filter((t) => {
    if (activeFlags.has('gooseRepellent') && t === 'gooseDetail') return false;
    if (activeFlags.has('bearWhisperer') && BEAR_UNITS[t].organic) return false;
    return true;
  });
  let fillerIdx = 0;
  while (remaining > 0 && shopping.size < 8) {
    const filler = fillerPool[fillerIdx % fillerPool.length];
    const cost = BEAR_UNITS[filler].cost;
    if (remaining >= cost) {
      buy(filler, 1);
    } else {
      break;
    }
    fillerIdx++;
  }

  // Ensure at least 2 unit types for variety
  if (shopping.size < 2 && budget >= 200) {
    const varietyPool: BearUnitType[] = ['honeyZone', 'beeSwarm', 'armoredBear', 'gooseDetail'];
    for (const vt of varietyPool) {
      if (shopping.has(vt)) continue;
      if (activeFlags.has('gooseRepellent') && vt === 'gooseDetail') continue;
      if (activeFlags.has('bearWhisperer') && BEAR_UNITS[vt].organic) continue;
      const cost = BEAR_UNITS[vt].cost;
      // Rebalance: take 1 bear away, add variety unit if possible
      const bearCount = shopping.get('bear') ?? 0;
      if (bearCount > 0 && cost <= remaining + BEAR_UNITS.bear.cost) {
        shopping.set('bear', bearCount - 1);
        remaining += BEAR_UNITS.bear.cost;
        buy(vt, 1);
        break;
      }
      if (remaining >= cost) { buy(vt, 1); break; }
    }
  }

  // Place units strategically
  const usableDist = targetKm - 3;
  const startKm = 1.5;
  const placements: BearPlacement[] = [];

  for (const [type, totalCount] of shopping) {
    if (totalCount <= 0) continue;

    // Split large counts into multiple placements (max 1 placement per ~8 units)
    const numPlacements = Math.max(1, Math.ceil(totalCount / 8));
    const basePerPlacement = Math.floor(totalCount / numPlacements);
    let leftover = totalCount - basePerPlacement * numPlacements;

    for (let p = 0; p < numPlacements; p++) {
      const count = basePerPlacement + (leftover > 0 ? 1 : 0);
      if (leftover > 0) leftover--;

      let position: number;
      if (STICKY_TYPES.includes(type)) {
        // Front half to slow train early
        position = startKm + random() * usableDist * 0.4;
      } else if (ZONE_DPS_TYPES.includes(type)) {
        // Spread across full track
        position = startKm + random() * usableDist;
      } else if (HEAVY_BLOCKERS.includes(type)) {
        // Back half — let the train get softened up first
        position = startKm + usableDist * 0.5 + random() * usableDist * 0.5;
      } else if (BURST_BLOCKERS.includes(type)) {
        // Middle section — hit the train after stickies but before heavies
        position = startKm + usableDist * 0.25 + random() * usableDist * 0.5;
      } else {
        // Mixed placement
        position = startKm + random() * usableDist;
      }

      placements.push({ type, atKm: Math.round(position * 10) / 10, count });
    }
  }

  placements.sort((a, b) => a.atKm - b.atKm);

  const { name, taunt, strategy } = generateTacticalFlavor(weaknesses, shopping, round, budget, targetKm);

  return { name, taunt, strategy, placements, source: 'tactical' };
}

function generateTacticalFlavor(
  weaknesses: { key: WeaknessKey; score: number }[],
  shopping: Map<BearUnitType, number>,
  round: number,
  budget: number,
  targetKm: number,
): { name: string; taunt: string; strategy: string } {
  const primary = weaknesses[0]?.key ?? 'lowArmor';
  const templates = STRATEGY_TEMPLATES[primary] ?? STRATEGY_TEMPLATES.lowArmor;

  const name = templates.names[round % templates.names.length];
  const taunt = templates.taunts[round % templates.taunts.length];

  const unitSummary = [...shopping.entries()]
    .map(([type, count]) => `${BEAR_UNITS[type].emoji} ${BEAR_UNITS[type].name} ×${count}`)
    .join(', ');

  const strategy = `${templates.desc} ${unitSummary}. Budget: ${budget} credits across ${targetKm} km.`;

  return { name, taunt, strategy };
}
