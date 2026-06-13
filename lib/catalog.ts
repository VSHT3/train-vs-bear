import type { BearUnitSpec, BearUnitType, Mod, TrainTier } from "./types";

export const MAX_ROUNDS = 7;
export const MAX_HEARTS = 3;
export const MAX_CUSTOM_MODS = 3;
export const START_COINS = 500;
export const START_POINTS = 0;

export function targetKmForRound(round: number): number {
  return 8 + 6 * (round - 1); // round 7 = 44 km
}

export function trainLoadoutForRound(round: number): { trainId: string; modIds: string[] } {
  const loadouts = [
    { trainId: "handcar", modIds: ["cowcatcher"] },
    { trainId: "rusty", modIds: ["hull", "nitro"] },
    { trainId: "diesel", modIds: ["reactive", "cowcatcher", "sweeper"] },
    { trainId: "thomas", modIds: ["teflon", "laser", "hull"] },
    { trainId: "voltline", modIds: ["reactive", "heatTiles", "jammer", "nanobots"] },
    { trainId: "bullet", modIds: ["forcefield", "laser", "sweeper", "acidwax"] },
    { trainId: "alfax", modIds: ["forcefield", "laser", "nanobots", "teflon", "horn"] },
  ];
  return loadouts[Math.min(Math.max(round, 1), loadouts.length) - 1];
}

export function bearBudgetForRound(
  round: number,
  playerLostLast: boolean,
): number {
  const base = 380 + 360 * (round - 1);
  return Math.round(playerLostLast ? base * 0.85 : base);
}

export function rewardForWin(round: number, bearsSmashed: number) {
  return { coins: 200 + 60 * round + 10 * bearsSmashed, points: 2 + round };
}

export function rewardForLoss(reachedKm: number) {
  return { coins: 80 + Math.floor(reachedKm * 6), points: 1 };
}

// ---------------- TRAINS ----------------

export const TRAINS: TrainTier[] = [
  {
    id: "handcar",
    name: "Handcar of Despair",
    emoji: "🛞",
    desc: "Two idiots pumping a lever. Top speed: however fast your will to live allows. At least it was free.",
    cost: 0,
    modSlots: 1,
    cars: 1,
    body: "#a0522d",
    accent: "#5c2e16",
    base: {
      topSpeed: 55,
      accel: 2,
      maxHp: 350,
      armor: 0,
      plow: 8,
      grip: 0.05,
      heatShield: 0,
      energyWeapon: 0,
      regen: 0,
    },
  },
  {
    id: "rusty",
    name: "Old Rusty",
    emoji: "🚂",
    desc: "A steam loco held together by optimism and one (1) bolt. Smells like grandpa.",
    cost: 200,
    modSlots: 2,
    cars: 2,
    body: "#8a5a3b",
    accent: "#3f2a1d",
    base: {
      topSpeed: 90,
      accel: 4,
      maxHp: 600,
      armor: 0.05,
      plow: 18,
      grip: 0.1,
      heatShield: 0,
      energyWeapon: 0,
      regen: 0,
    },
  },
  {
    id: "diesel",
    name: "Diesel Dan",
    emoji: "🚆",
    desc: "Burns fuel, takes names. The mullet of locomotives: business front, party back.",
    cost: 550,
    modSlots: 3,
    cars: 3,
    body: "#4a6b8a",
    accent: "#22384d",
    base: {
      topSpeed: 140,
      accel: 6,
      maxHp: 900,
      armor: 0.12,
      plow: 30,
      grip: 0.15,
      heatShield: 0.05,
      energyWeapon: 0,
      regen: 0,
    },
  },
  {
    id: "thomas",
    name: "Thomas the Suspiciously Familiar Engine",
    emoji: "🔵",
    desc: "A cheerful blue tank engine with a face. Bears find its unblinking smile deeply, existentially wrong.",
    cost: 850,
    modSlots: 3,
    cars: 2,
    body: "#3b7dd8",
    accent: "#cc2222",
    base: {
      topSpeed: 180,
      accel: 8,
      maxHp: 1100,
      armor: 0.15,
      plow: 32,
      grip: 0.18,
      heatShield: 0.08,
      energyWeapon: 0,
      regen: 0,
    },
  },
  {
    id: "voltline",
    name: "Voltline E-9",
    emoji: "🚈",
    desc: 'Fully electric. Bears report a "spicy tingle" upon contact.',
    cost: 1500,
    modSlots: 4,
    cars: 3,
    body: "#3fae6b",
    accent: "#1d5e38",
    base: {
      topSpeed: 220,
      accel: 9,
      maxHp: 1100,
      armor: 0.18,
      plow: 38,
      grip: 0.2,
      heatShield: 0.1,
      energyWeapon: 5,
      regen: 0,
    },
  },
  {
    id: "bullet",
    name: "Bullet Bill Express",
    emoji: "💣",
    desc: "This train has angry eyebrows painted on and will not stop for anything. Bears have a restraining order against it.",
    cost: 2200,
    modSlots: 4,
    cars: 3,
    body: "#1a1a1a",
    accent: "#ff4444",
    base: {
      topSpeed: 260,
      accel: 16,
      maxHp: 1250,
      armor: 0.2,
      plow: 48,
      grip: 0.22,
      heatShield: 0.12,
      energyWeapon: 8,
      regen: 0,
    },
  },
  {
    id: "alfax",
    name: "ALFA-X Shinkansen",
    emoji: "🚄",
    desc: "Japan's pride. A 400 km/h apology to physics with a nose longer than your weekend.",
    cost: 3400,
    modSlots: 5,
    cars: 4,
    body: "#e8e8f0",
    accent: "#2451a8",
    base: {
      topSpeed: 320,
      accel: 13,
      maxHp: 1500,
      armor: 0.25,
      plow: 55,
      grip: 0.3,
      heatShield: 0.2,
      energyWeapon: 12,
      regen: 1,
    },
  },
  {
    id: "cyber",
    name: "NEO-SHINKANSEN X-9000",
    emoji: "🚝",
    desc: "Cyber maglev from the year 3000. It does not ride rails. Rails ride it.",
    cost: 7000,
    modSlots: 6,
    cars: 4,
    body: "#1a1a2e",
    accent: "#00f0ff",
    base: {
      topSpeed: 480,
      accel: 20,
      maxHp: 2100,
      armor: 0.35,
      plow: 80,
      grip: 0.45,
      heatShield: 0.35,
      energyWeapon: 30,
      regen: 3,
    },
  },
  {
    id: "doomtrain",
    name: "DOOMTRAIN",
    emoji: "👹",
    desc: "Straight from the 7th circle of hell. Its headlight is a portal. Its horn is a scream. It is currently on fire. It is not sorry.",
    cost: 12000,
    modSlots: 7,
    cars: 5,
    body: "#8b0000",
    accent: "#ff4500",
    base: {
      topSpeed: 520,
      accel: 26,
      maxHp: 3000,
      armor: 0.45,
      plow: 120,
      grip: 0.6,
      heatShield: 0.5,
      energyWeapon: 50,
      regen: 6,
    },
  },
];

export function getTrain(id: string): TrainTier {
  return TRAINS.find((t) => t.id === id) ?? TRAINS[0];
}

// ---------------- MODS ----------------

export const MODS: Mod[] = [
  {
    id: "cowcatcher",
    name: "Cowcatcher 9000",
    emoji: "🔱",
    desc: "Industrial bear-redirection wedge. Bears are gently encouraged to become airborne.",
    coins: 180,
    points: 0,
    effects: { plow: 14 },
  },
  {
    id: "hull",
    name: "Extra Hull Plating",
    emoji: "🧱",
    desc: "More train per train. +350 structural integrity, +0 style points.",
    coins: 220,
    points: 0,
    effects: { maxHp: 350 },
  },
  {
    id: "reactive",
    name: "Reactive Armor",
    emoji: "🛡️",
    desc: "Explodes a little so you explode less. Counterintuitive, very effective.",
    coins: 320,
    points: 1,
    effects: { armor: 0.1 },
  },
  {
    id: "teflon",
    name: "Honey-B-Gone™ Coating",
    emoji: "🧈",
    desc: "NASA-grade non-stick. Honey, jelly, and emotional baggage slide right off.",
    coins: 200,
    points: 0,
    effects: { grip: 0.25 },
  },
  {
    id: "nitro",
    name: "Nitro Boosters",
    emoji: "🔥",
    desc: "Strapped-on rockets. Legal? No. Awesome? Extremely.",
    coins: 260,
    points: 0,
    effects: { accel: 5, topSpeed: 30 },
  },
  {
    id: "snacks",
    name: "Tactical Picnic Launcher",
    emoji: "🧺",
    desc: "Launches full picnic baskets ahead of the train. 40% of bears choose lunch over violence. The other 60% demand seconds. — Organic bears bypassed.",
    coins: 190,
    points: 0,
    effects: { grip: 0.08 },
    flags: ["bearWhisperer"],
  },
  {
    id: "spikes",
    name: "Bear-Scattering Spikes",
    emoji: "📌",
    desc: "Retractable spikes along the hull. Bears get flat paws. We have never seen a bear with flat paws and frankly it is hilarious.",
    coins: 150,
    points: 0,
    effects: { plow: 7, armor: 0.03 },
  },
  {
    id: "fridge",
    name: "Onboard Salmon Fridge",
    emoji: "🐟",
    desc: "Fully stocked with premium salmon. Bears raid the fridge car instead of destroying the engine. The fridge... does not survive.",
    coins: 170,
    points: 0,
    effects: { maxHp: 260 },
  },
  {
    id: "plushie",
    name: "Emotional Support Caboose",
    emoji: "🧸",
    desc: "A giant stuffed bear strapped to the back. Morale +1000. Structural integrity +0. Somehow it heals the train through sheer wholesomeness.",
    coins: 180,
    points: 1,
    effects: { regen: 2 },
  },
  {
    id: "mirror",
    name: "Bear Mirror Array",
    emoji: "🪞",
    desc: "Projects life-size bear reflections ahead of the train. Many bears have never seen themselves. Existential crisis ensues. Some start podcasts.",
    coins: 220,
    points: 0,
    effects: { plow: 18 },
  },
  {
    id: "oil",
    name: "Oil Slick Generator",
    emoji: "🛢️",
    desc: "Dumps industrial lubricant on the tracks behind you. Following bears become accidental bowling balls into other bears. OSHA has been notified.",
    coins: 250,
    points: 1,
    effects: { grip: 0.22 },
  },
  {
    id: "turboDiesel",
    name: "Turbo-Diesel Overclock",
    emoji: "⛽",
    desc: "Overclocks the engine so hard the pistons achieve sentience. They are NOT happy but they ARE fast.",
    coins: 280,
    points: 1,
    effects: { accel: 6, topSpeed: 35 },
  },
  {
    id: "maglev",
    name: "Maglev Rail Kit",
    emoji: "🧲",
    desc: "Floating slightly is technically not touching the bears.",
    coins: 360,
    points: 1,
    effects: { topSpeed: 60, grip: 0.1 },
  },
  {
    id: "laser",
    name: "Roof Laser Turret",
    emoji: "🔫",
    desc: "Pew pew, but for bears. Vaporizes obstacles slightly before they become your problem.",
    coins: 380,
    points: 1,
    effects: { energyWeapon: 18 },
  },
  {
    id: "heatTiles",
    name: "Ceramic Heat Tiles",
    emoji: "🌡️",
    desc: 'Space-shuttle leftovers. Lava whales rated "mildly warm" with this baby.',
    coins: 240,
    points: 0,
    effects: { heatShield: 0.35 },
  },
  {
    id: "nanobots",
    name: "Repair Nanobots",
    emoji: "🤖",
    desc: "A billion tiny mechanics. Union-free, complaint-free, sleep-free.",
    coins: 280,
    points: 2,
    effects: { regen: 3 },
  },
  {
    id: "jammer",
    name: '"NO-BZZZ" Drone Jammer',
    emoji: "📡",
    desc: "Broadcasts unbearable smooth jazz on all drone frequencies. Drones simply give up. — Nullifies drone swarm zones.",
    coins: 300,
    points: 2,
    effects: {},
    flags: ["droneJammer"],
  },
  {
    id: "sweeper",
    name: "Mine Roomba",
    emoji: "🧹",
    desc: "Rolls ahead, eats mines, beeps happily. We don't ask how. — Nullifies minefield damage.",
    coins: 280,
    points: 1,
    effects: {},
    flags: ["mineSweeper"],
  },
  {
    id: "acidwax",
    name: "Acid-Proof Wax",
    emoji: "🧪",
    desc: "Carnauba blend, pH-immune. The corrosive bear cube hates this one trick. — Negates acid damage on impact and in zones.",
    coins: 260,
    points: 1,
    effects: {},
    flags: ["acidProof"],
  },
  {
    id: "horn",
    name: "Bear Whisperer Horn",
    emoji: "📯",
    desc: 'Plays a sound only bears understand: "the picnic is THAT way." Some bears just leave. — Organic bears bypassed.',
    coins: 250,
    points: 2,
    effects: {},
    flags: ["bearWhisperer"],
  },
  {
    id: "karaoke",
    name: "Karaoke PA System",
    emoji: "🎤",
    desc: 'Blasts off-key "My Heart Will Go On" at 140 decibels. Bears have sensitive ears. This is technically a war crime but the court date is in 2067. — Organic bears bypassed.',
    coins: 380,
    points: 2,
    effects: { armor: 0.06 },
    flags: ["bearWhisperer"],
  },
  {
    id: "bribe",
    name: "Bear Coin Launcher",
    emoji: "🪙",
    desc: "Fires gold coins into the bear horde. Bears are unionized and accept bribes. Some bears switch sides mid-battle. Management is furious. — Organic bears bypassed.",
    coins: 420,
    points: 2,
    effects: { armor: 0.08 },
    flags: ["bearWhisperer"],
  },
  {
    id: "forcefield",
    name: '"Not Touching Me" Forcefield',
    emoji: "🫧",
    desc: "Projects a shimmering energy bubble around the train. Bears technically cannot make contact. Physics professors are still arguing about this.",
    coins: 500,
    points: 2,
    effects: { armor: 0.16 },
  },
  {
    id: "gooseSpray",
    name: "Goose-B-Gone™ Repellent",
    emoji: "🦆",
    desc: "Industrial-grade goose deterrent. Geese flee on sight. Unfortunately, the formula smells exactly like a wounded salmon to bears. Whoops. — Goose Security Details flee on contact.",
    coins: 260,
    points: 1,
    effects: { armor: 0.04 },
    flags: ["gooseRepellent"],
  },
];

export function getMod(id: string): Mod | undefined {
  return MODS.find((m) => m.id === id);
}

// ---------------- BEAR UNITS ----------------

export const BEAR_UNITS: Record<BearUnitType, BearUnitSpec> = {
  bear: {
    type: "bear",
    name: "Bear",
    emoji: "🐻",
    cost: 10,
    kind: "blocker",
    desc: "Standard issue bear. Fuzzy. Furious. Free-range.",
    mass: 1.2,
    impactDamage: 8,
    grindDps: 2,
    organic: true,
  },
  armoredBear: {
    type: "armoredBear",
    name: "Armored Bear",
    emoji: "🐻‍⚔️",
    cost: 30,
    kind: "blocker",
    desc: "Bear in welded steel plates. Does not fit through doors. Does not care.",
    mass: 4,
    impactDamage: 25,
    grindDps: 5,
    organic: true,
  },
  explosiveBear: {
    type: "explosiveBear",
    name: "C4 Bear",
    emoji: "🧨",
    kind: "blocker",
    cost: 60,
    desc: "Bear stuffed with C4. Detonates on contact. HR has concerns.",
    mass: 2,
    impactDamage: 70,
    grindDps: 0,
    organic: true,
  },
  honeyZone: {
    type: "honeyZone",
    name: "Honey Flood",
    emoji: "🍯",
    cost: 60,
    kind: "zone",
    desc: "1.2 km of industrial honey. Delicious. Adhesive. Devastating.",
    zoneLengthKm: 1.2,
    stickiness: 0.32,
  },
  polarMinefield: {
    type: "polarMinefield",
    name: "Polar Mine Patch",
    emoji: "❄️",
    cost: 120,
    kind: "zone",
    desc: "Polar bears in honey-plump coats hiding mines. Cold. Sticky. Explodey.",
    zoneLengthKm: 2,
    stickiness: 0.1,
    minesPerKm: 6,
    mineDamage: 60,
  },
  droneSwarm: {
    type: "droneSwarm",
    name: "Bear Drone Squadron",
    emoji: "🛸",
    cost: 80,
    kind: "zone",
    desc: "Bear-branded drones with machine guns and infinite ammo subscriptions.",
    zoneLengthKm: 6,
    zoneDps: 3,
  },
  lavaWhale: {
    type: "lavaWhale",
    name: "Lava Whale",
    emoji: "🐋",
    cost: 130,
    kind: "blocker",
    desc: "A whale. Full of lava. The bears will not explain how or why.",
    mass: 25,
    impactDamage: 60,
    grindDps: 35,
    heat: true,
  },
  jellyMonolith: {
    type: "jellyMonolith",
    name: "Bear Jelly Monolith",
    emoji: "🟪",
    cost: 180,
    kind: "blocker",
    desc: "Condensed essence of 2,500 bears. Do not ask. Do not touch. Do not taste.",
    mass: 120,
    impactDamage: 60,
    grindDps: 12,
  },
  steelCube: {
    type: "steelCube",
    name: "Steel Cube",
    emoji: "🧊",
    cost: 150,
    kind: "blocker",
    desc: "5×5×5 m of solid steel with a bear engraved on it. For intimidation.",
    mass: 60,
    impactDamage: 120,
    grindDps: 8,
  },
  acidCube: {
    type: "acidCube",
    name: "Corrosive Bear Cube",
    emoji: "🟩",
    cost: 320,
    kind: "blocker",
    desc: "20×20×20 m cube of bear-imprinted acid. Titanium center. Pure spite.",
    mass: 90,
    impactDamage: 90,
    grindDps: 30,
    acid: true,
  },
  megaUrsa: {
    type: "megaUrsa",
    name: "URSA MAJOR PRIME",
    emoji: "🐻‍❄️",
    cost: 900,
    kind: "blocker",
    desc: "The final bear. Forty meters tall. Has a theme song. It is currently playing.",
    mass: 300,
    impactDamage: 250,
    grindDps: 25,
    organic: false,
  },
  beeSwarm: {
    type: "beeSwarm",
    name: "Tactical Bee Deployment",
    emoji: "🐝",
    cost: 95,
    kind: "zone",
    desc: "3 km of military-grade angry bees. Bears trained them. The bees have tiny uniforms. They bypass armor through sheer determination.",
    zoneLengthKm: 3,
    zoneDps: 4,
    stickiness: 0.04,
  },
  bearpult: {
    type: "bearpult",
    name: "Bear-apult Battery",
    emoji: "🏗️",
    cost: 110,
    kind: "blocker",
    desc: "A trebuchet that launches bears. Bears are NOT aerodynamic but they ARE committed. Impact occurs before you even see them coming.",
    mass: 2,
    impactDamage: 110,
    grindDps: 2,
    organic: true,
  },
  glueRiver: {
    type: "glueRiver",
    name: "Industrial Glue River",
    emoji: "🫗",
    cost: 105,
    kind: "zone",
    desc: "2 km of aerospace-grade superglue. Bears have special shoes. You do not. NASA wants their glue back.",
    zoneLengthKm: 2,
    stickiness: 0.52,
  },
  gooseDetail: {
    type: "gooseDetail",
    name: "Goose Security Detail",
    emoji: "🪿",
    cost: 60,
    kind: "blocker",
    desc: "40 geese with private military training. They have nothing to lose. They never had anything to lose. Honk.",
    mass: 0.3,
    impactDamage: 25,
    grindDps: 9,
    organic: true,
  },
  mirrorMaze: {
    type: "mirrorMaze",
    name: "House of Mirrors",
    emoji: "🪩",
    cost: 90,
    kind: "zone",
    desc: "1.5 km of mirrors. Bears look fantastic. The train gets confused and slows down to check its own reflection. Vain.",
    zoneLengthKm: 1.5,
    stickiness: 0.2,
  },
  bearNado: {
    type: "bearNado",
    name: "BEARNADO",
    emoji: "🌪️",
    cost: 260,
    kind: "zone",
    desc: "800 meters of tornado filled with bears, honey, splinters, and a surprising amount of salmon. Insurance does not cover this.",
    zoneLengthKm: 0.8,
    zoneDps: 15,
    stickiness: 0.25,
  },
};

export function planCost(
  placements: { type: BearUnitType; count: number }[],
): number {
  return placements.reduce(
    (sum, p) => sum + BEAR_UNITS[p.type].cost * p.count,
    0,
  );
}

// ---- WAVE MODIFIERS ----

import type { WaveModifierDef, WaveModifierId } from './types';

export const WAVE_MODIFIERS: Record<WaveModifierId, WaveModifierDef> = {
  stickyStorm: {
    id: 'stickyStorm', name: 'Sticky Storm', emoji: '🍯',
    desc: 'All zones have 50% more stickiness — slowing the train to a crawl.',
    flavor: 'The air tastes like honey. The rails taste like glue. Everything is sticky.',
  },
  armoredWave: {
    id: 'armoredWave', name: 'Armored Wave', emoji: '🛡️',
    desc: 'All blockers have 50% more mass — grinding takes much longer.',
    flavor: 'The bears have been hitting the gym. And a steel foundry. And a tank factory.',
  },
  dpsSurge: {
    id: 'dpsSurge', name: 'DPS Surge', emoji: '⚡',
    desc: 'All damaging zones deal 30% more DPS every tick.',
    flavor: 'Someone turned the dial to "extra uncomfortable." The bears applaud.',
  },
  rushHour: {
    id: 'rushHour', name: 'Rush Hour', emoji: '🏃',
    desc: 'Train acceleration is reduced by 25% — slow to recover after every obstacle.',
    flavor: 'Traffic is terrible today. The bears have formed a conga line on the tracks.',
  },
  glassCannon: {
    id: 'glassCannon', name: 'Glass Cannon', emoji: '💎',
    desc: 'All damage is amplified 20% — every hit hurts more.',
    flavor: 'Everything is more painful today. The bears are not complaining.',
  },
  slimPickings: {
    id: 'slimPickings', name: 'Slim Pickings', emoji: '💸',
    desc: 'Bear budget is reduced by 25% — fewer obstacles on the track.',
    flavor: 'Budget cuts hit the bear military hard. The salmon industry is unaffected.',
  },
  reinforcements: {
    id: 'reinforcements', name: 'Reinforcements', emoji: '📯',
    desc: 'Every bear placement has 50% more units.',
    flavor: 'Backup has arrived. The backup is more bears. It is always more bears.',
  },
  mineGalore: {
    id: 'mineGalore', name: 'Mine Galore', emoji: '💣',
    desc: 'Minefields have 50% more mines that deal 50% more damage each.',
    flavor: 'Someone scattered a whole warehouse of mines. That someone was a bear.',
  },
};

export const ALL_WAVE_MODIFIERS = Object.values(WAVE_MODIFIERS);

export function rollWaveModifier(seed: number): WaveModifierId {
  const ids: WaveModifierId[] = Object.keys(WAVE_MODIFIERS) as WaveModifierId[];
  return ids[seed % ids.length];
}

// ---- BEAR UPGRADES ----

import type { BearUpgrade } from './types';

export const BEAR_UPGRADES: BearUpgrade[] = [
  { id: 'stickyGoo', name: 'Premium Sticky Goo', emoji: '🧈', desc: 'Zone stickiness +15% per level', cost: 60, maxLevel: 3, effects: { stickinessBonus: 0.15 } },
  { id: 'ironBears', name: 'Iron Bear Diet', emoji: '🏋️', desc: 'Blocker mass +20% per level', cost: 80, maxLevel: 3, effects: { massBonus: 0.2 } },
  { id: 'droneUpgrade', name: 'Drone Firmware Update', emoji: '🛸', desc: 'Zone DPS +15% per level', cost: 90, maxLevel: 3, effects: { dpsBonus: 0.15 } },
  { id: 'mineShaft', name: 'Deeper Mine Shafts', emoji: '⛏️', desc: 'Mine frequency +1/km, mine damage +20% per level', cost: 100, maxLevel: 2, effects: { mineBonus: 1, mineDamageBonus: 0.2 } },
  { id: 'warChest', name: 'War Chest Expansion', emoji: '💰', desc: 'Bear budget +10% each round per level', cost: 120, maxLevel: 2, effects: { budgetBonus: 0.1 } },
];

// ---- COMMANDER CARDS ----

import type { CommanderCard } from './types';

export const COMMANDER_CARDS: CommanderCard[] = [
  {
    id: 'roadRepair',
    name: 'Road Repair Crew',
    emoji: '🛠️',
    desc: 'When the train clears a blocker, it instantly respawns with 50% of its original mass right behind the train.',
    flavor: 'The bears have discovered infrastructure funding. This is a problem.',
    type: 'roadRepair',
    cost: 120,
  },
  {
    id: 'stickyCloud',
    name: 'Sticky Airstrike',
    emoji: '☁️',
    desc: 'When the train enters a zone, double that zone\'s stickiness for 8 seconds.',
    flavor: 'The bears have weaponized honey. From the sky. OSHA is crying.',
    type: 'stickyCloud',
    cost: 100,
  },
  {
    id: 'emergencyMines',
    name: 'Emergency Mine Drop',
    emoji: '💣',
    desc: 'When the train reaches 50% of the track, drop a polar minefield at its current position.',
    flavor: 'The mine budget got approved at the last town hall meeting.',
    type: 'emergencyMines',
    cost: 130,
  },
  {
    id: 'lastStand',
    name: 'Last Stand',
    emoji: '🛡️',
    desc: 'When train speed drops below 10 km/h, add 30% mass to all remaining blockers.',
    flavor: 'The bears have accepted their fate. They are not going quietly.',
    type: 'lastStand',
    cost: 90,
  },
  {
    id: 'sabotage',
    name: 'Track Sabotage',
    emoji: '🔧',
    desc: 'At the start of the run, reduce train top speed by 20% for the first 25 seconds.',
    flavor: 'Someone loosened the tracks. Someone was definitely a bear.',
    type: 'sabotage',
    cost: 110,
  },
];

export function buildBearUpgradeOverrides(upgrades: Record<string, number>): Record<string, number> {
  const overrides: Record<string, number> = {};
  for (const upgrade of BEAR_UPGRADES) {
    const level = upgrades[upgrade.id] ?? 0;
    if (level === 0) continue;
    for (const [effect, value] of Object.entries(upgrade.effects)) {
      overrides[effect] = (overrides[effect] ?? 0) + value * level;
    }
  }
  return overrides;
}
