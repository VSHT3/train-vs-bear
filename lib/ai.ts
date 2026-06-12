import { generateText, Output } from 'ai';
import { z } from 'zod/v4';
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

  const result = await generateText({
    model: 'google/gemini-2.5-flash',
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
    maxOutputTokens: 2000,
  });

  const raw = result.output as { name: string; taunt: string; strategy: string; placements: Array<{ type: string; atKm: number; count: number }> };

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

  const result = await generateText({
    model: 'google/gemini-2.5-flash',
    system: `You are the Upgrade Arbiter — a stern but fair AI that evaluates custom train upgrades. You decide if a player's suggested upgrade is valid and how much it should cost.

Context:
- This is Round ${round} (max 7), costs scale with round
- Existing mods: ${existingNames || 'none'}
- The game has trains, bears, explosives, lava whales, honey, drones, etc.
- Upgrades should be creative but NOT game-breaking (no "instant win", "teleport", "invincibility")
- Stats have these ranges: topSpeed 0-600, accel 0-30, maxHp 0-5000, armor 0-0.8, plow 0-200, grip 0-1, heatShield 0-1, energyWeapon 0-80, regen 0-10
- ModFlags available: droneJammer, mineSweeper, acidProof, bearWhisperer, gooseRepellent

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
  - effects: stat changes (only include stats that change)
  - flags: any ModFlag strings that apply
- If invalid:
  - valid: false
  - reason: short explanation why it was rejected`,
    output: Output.object({ schema: customModSchema }),
    temperature: 0.7,
    maxOutputTokens: 800,
  });

  const raw = result.output as {
    valid: boolean;
    name?: string;
    emoji?: string;
    desc?: string;
    coins?: number;
    points?: number;
    reason?: string;
    effects?: Partial<TrainStats>;
    flags?: string[];
  };

  if (!raw.valid || !raw.name) {
    return { valid: false, reason: raw.reason ?? 'The Upgrade Arbiter was not impressed.' };
  }

  const validFlags: ModFlag[] = ['droneJammer', 'mineSweeper', 'acidProof', 'bearWhisperer', 'gooseRepellent'];
  const flags = (raw.flags ?? []).filter((f): f is ModFlag => validFlags.includes(f as ModFlag));

  return {
    id: `custom-${Date.now()}`,
    name: raw.name.slice(0, 40),
    emoji: (raw.emoji ?? '🔧').slice(0, 2),
    desc: raw.desc?.slice(0, 120) ?? 'A custom upgrade of questionable legality.',
    coins: Math.min(Math.max(raw.coins ?? 200, 50), 1000),
    points: Math.min(Math.max(raw.points ?? 1, 0), 3),
    effects: raw.effects ?? {},
    flags: flags.length > 0 ? flags : undefined,
    custom: true,
  };
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
