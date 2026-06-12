import type { BearPlacement, BearUnitType, ModFlag, ObstacleEncounter, SimEvent, SimFrame, SimObstacle, SimResult, TrainStats } from './types';
import { BEAR_UNITS } from './catalog';
import { createSeededRandom, deriveSeed, normalizeSeed, type Seed } from './random';

const DT = 0.1; // seconds per tick
const DEFAULT_MAX_SEC = 600;
const WEAPON_RANGE_KM = 0.15; // energy weapon reaches 150m ahead

interface LiveObstacle extends SimObstacle {
  totalMass: number;
  initialCount: number;
  done: boolean;
  damageDealt: number; // accumulated damage from this obstacle
}

export function runSimulation(
  trainStats: TrainStats,
  modFlags: ModFlag[],
  placements: BearPlacement[],
  targetKm: number,
  options?: { maxTimeSec?: number; dt?: number; seed?: Seed },
): SimResult {
  const dt = options?.dt ?? DT;
  const maxTime = options?.maxTimeSec ?? DEFAULT_MAX_SEC;
  const seed = normalizeSeed(options?.seed);
  const random = createSeededRandom(seed);

  // Build live obstacles sorted by position
  const live: LiveObstacle[] = placements
    .map((p, i): LiveObstacle => {
      const spec = BEAR_UNITS[p.type];
      const isBlocker = spec.kind === 'blocker';
      return {
        id: i,
        type: p.type,
        km: p.atKm,
        lengthKm: isBlocker ? 0 : (spec.zoneLengthKm ?? 0),
        count: p.count,
        kind: spec.kind,
        totalMass: isBlocker ? (spec.mass ?? 0) * p.count : 0,
        initialCount: p.count,
        done: false,
        damageDealt: 0,
      };
    })
    .sort((a, b) => a.km - b.km);

  // State
  let km = 0;
  let speed = 0;
  let hp = trainStats.maxHp;
  let t = 0;
  let grinding: LiveObstacle | null = null;
  let bearsSmashed = 0;
  let totalDamage = 0;

  // Damage tracking per source
  let impactDmg = 0;
  let zoneDmg = 0;
  let grindDmg = 0;
  let mineDmg = 0;

  // Obstacle encounters & zone entry tracking
  const encounters: ObstacleEncounter[] = [];
  const enteredZones = new Set<number>();
  const zoneDamageAccum = new Map<number, number>(); // obstacle id -> accumulated zone dps damage

  const frames: SimFrame[] = [];
  const events: SimEvent[] = [];
  let frameTimer = 0;

  const hasFlag = (f: ModFlag) => modFlags.includes(f);

  const reduceDmg = (dmg: number, isHeat = false) => {
    if (isHeat) return dmg * (1 - Math.min(Math.max(trainStats.heatShield, 0), 0.95));
    return dmg * (1 - Math.min(Math.max(trainStats.armor, 0), 0.8));
  };

  // Record frame every ~500ms sim-time
  const maybeRecordFrame = () => {
    frameTimer += dt;
    if (frameTimer >= 0.5) {
      frameTimer = 0;
      frames.push({
        t: Math.round(t * 10) / 10,
        km: Math.round(km * 1000) / 1000,
        speed: Math.round(speed),
        hp: Math.round(hp),
        sticky: 0, // set below
        grinding: grinding !== null,
        underFire: false, // set below
      });
    }
  };

  // Initial frame
  frames.push({ t: 0, km: 0, speed: 0, hp: Math.round(hp), sticky: 0, grinding: false, underFire: false });

  // ---- MAIN LOOP ----
  while (t < maxTime) {
    // 1. Assess zones at current position
    let totalSticky = 0;
    let zoneDps = 0;
    let underFire = false;

    for (const obs of live) {
      if (obs.done) continue;
      if (obs.kind !== 'zone') continue;
      if (km < obs.km || km > obs.km + obs.lengthKm) continue;

      const spec = BEAR_UNITS[obs.type];

      // Drone jammer — nullifies droneSwarm entirely
      if (obs.type === 'droneSwarm' && hasFlag('droneJammer')) {
        if (!enteredZones.has(obs.id)) {
          enteredZones.add(obs.id);
          events.push({
            t: Math.round(t * 10) / 10,
            km: Math.round(km * 1000) / 1000,
            kind: 'info',
            text: `📡 Drone Jammer neutralized ${spec.emoji} ${spec.name} — drones confused by smooth jazz`,
          });
          encounters.push({
            type: obs.type as BearUnitType,
            name: spec.name,
            emoji: spec.emoji,
            atKm: obs.km,
            outcome: 'bypassed',
            damageTaken: 0,
          });
        }
        continue;
      }

      // First entry into this zone?
      if (!enteredZones.has(obs.id)) {
        enteredZones.add(obs.id);
        const entryEvent = {
          t: Math.round(t * 10) / 10,
          km: Math.round(km * 1000) / 1000,
          kind: 'info' as const,
          text: `🚧 Entered ${spec.emoji} ${spec.name} zone (${obs.lengthKm} km)`,
        };
        events.push(entryEvent);
        encounters.push({
          type: obs.type as BearUnitType,
          name: spec.name,
          emoji: spec.emoji,
          atKm: obs.km,
          outcome: 'endured',
          damageTaken: 0,
        });
      }

      if (spec.zoneDps) {
        zoneDps += spec.zoneDps * obs.count;
        underFire = true;
      }
      if (spec.stickiness) {
        totalSticky += spec.stickiness * obs.count;
      }

      // Mines (polarMinefield) — tracked per-zone
      if (spec.minesPerKm && spec.mineDamage && !hasFlag('mineSweeper')) {
        const distKm = (speed / 3600) * dt;
        const expectedHits = spec.minesPerKm * obs.count * distKm;
        if (expectedHits > 0 && random() < expectedHits) {
          const dmg = reduceDmg(spec.mineDamage);
          hp -= dmg;
          totalDamage += dmg;
          mineDmg += dmg;
          obs.damageDealt += dmg;
          events.push({
            t: Math.round(t * 10) / 10,
            km: Math.round(km * 1000) / 1000,
            kind: 'mine',
            text: `💥 Hit a mine! ${Math.round(dmg)} damage.`,
          });
        }
      }
    }

    // Apply zone DPS — distribute proportionally across active zones
    if (zoneDps > 0) {
      const dmg = zoneDps * dt;
      hp -= dmg;
      totalDamage += dmg;
      zoneDmg += dmg;
      // Distribute to each active zone proportionally
      if (zoneDps > 0) {
        for (const obs of live) {
          if (obs.done || obs.kind !== 'zone') continue;
          if (km < obs.km || km > obs.km + obs.lengthKm) continue;
          const spec = BEAR_UNITS[obs.type];
          if (!spec.zoneDps) continue;
          if (obs.type === 'droneSwarm' && hasFlag('droneJammer')) continue;
          const share = ((spec.zoneDps * obs.count) / zoneDps) * dmg;
          obs.damageDealt += share;
        }
      }
    }

    // 2. Compute effective top speed (sticky reduction)
    const effectiveSticky = Math.min(totalSticky * (1 - trainStats.grip), 0.9);
    const effectiveTopSpeed = trainStats.topSpeed * (1 - effectiveSticky);

    // 3. Acceleration
    if (grinding) {
      // While grinding, no acceleration — speed bleeds toward a low grind-speed floor
      const grindFloor = Math.max(effectiveTopSpeed * 0.2, 5);
      speed = Math.max(speed - trainStats.accel * dt * 0.15, grindFloor);
    } else {
      if (speed < effectiveTopSpeed) {
        speed = Math.min(speed + trainStats.accel * dt, effectiveTopSpeed);
      }
    }

    // 4. Movement
    const distKm = (speed / 3600) * dt;
    km += distKm;

    // 5. Regeneration (only when not grinding — nanobots need relative peace)
    if (hp > 0 && trainStats.regen > 0 && !grinding) {
      hp = Math.min(hp + trainStats.regen * dt, trainStats.maxHp);
    }

    // 6. Energy weapon pre-clearing
    if (trainStats.energyWeapon > 0) {
      for (const obs of live) {
        if (obs.done) continue;
        if (obs.kind !== 'blocker') continue;
        if (obs.km <= km || obs.km > km + WEAPON_RANGE_KM) continue;

        // energyWeapon is DPS — convert to "tons of bear vaporized per second"
        const massZapped = trainStats.energyWeapon * 0.02 * dt;
        const prevTotal = obs.totalMass;
        obs.totalMass = Math.max(0, obs.totalMass - massZapped);
        obs.count = Math.ceil(obs.totalMass / (BEAR_UNITS[obs.type].mass ?? 1));

        if (obs.totalMass <= 0 && prevTotal > 0) {
          obs.done = true;
          bearsSmashed += obs.initialCount;
          const spec = BEAR_UNITS[obs.type];
          events.push({
            t: Math.round(t * 10) / 10,
            km: Math.round(km * 1000) / 1000,
            kind: 'clear',
            text: `🔫 Energy weapon vaporized ${spec.emoji} ${spec.name} ×${obs.initialCount} before contact!`,
          });
          encounters.push({
            type: obs.type as BearUnitType,
            name: spec.name,
            emoji: spec.emoji,
            atKm: obs.km,
            outcome: 'vaporized',
            damageTaken: 0,
          });
        }
      }
    }

    // 7. Blocker contact
    if (!grinding) {
      for (const obs of live) {
        if (obs.done) continue;
        if (obs.kind !== 'blocker') continue;
        if (km < obs.km) continue;

        // We've reached this blocker
        const spec = BEAR_UNITS[obs.type];

        // Goose repellent check
        if (obs.type === 'gooseDetail' && hasFlag('gooseRepellent')) {
          obs.done = true;
          events.push({
            t: Math.round(t * 10) / 10,
            km: Math.round(km * 1000) / 1000,
            kind: 'info',
            text: '🪿 The geese flee from Goose-B-Gone™! Honk of retreat!',
          });
          encounters.push({
            type: obs.type as BearUnitType,
            name: spec.name,
            emoji: spec.emoji,
            atKm: obs.km,
            outcome: 'bypassed',
            damageTaken: 0,
          });
          continue;
        }

        // Bear whisperer effect on organic blockers
        if (spec.organic && hasFlag('bearWhisperer')) {
          const reduced = Math.ceil(obs.count * 0.5);
          if (reduced < obs.count) {
            const lost = obs.count - reduced;
            obs.totalMass = (spec.mass ?? 0) * reduced;
            obs.count = reduced;
            events.push({
              t: Math.round(t * 10) / 10,
              km: Math.round(km * 1000) / 1000,
              kind: 'info',
              text: `📯 Bear Whisperer Horn works! ${lost} ${spec.name}(s) wandered off toward a picnic.`,
            });
          }
        }

        // Impact damage
        if (spec.impactDamage && obs.count > 0) {
          let impact = spec.impactDamage * obs.count;
          const isHeat = spec.heat ?? false;
          const isAcid = spec.acid ?? false;

          if (isAcid && hasFlag('acidProof')) impact = 0;

          const actual = reduceDmg(impact, isHeat && !hasFlag('acidProof'));
          hp -= actual;
          totalDamage += actual;
          impactDmg += actual;
          obs.damageDealt += actual;

          events.push({
            t: Math.round(t * 10) / 10,
            km: Math.round(km * 1000) / 1000,
            kind: impact > 60 ? 'boom' : 'hit',
            text: `💥 Hit ${spec.emoji} ${spec.name} ×${obs.count}! ${Math.round(actual)} damage.`,
          });
        }

        // Start grinding
        if (obs.totalMass > 0) {
          grinding = obs;
          obs.contactT = Math.round(t * 10) / 10;
          encounters.push({
            type: obs.type as BearUnitType,
            name: spec.name,
            emoji: spec.emoji,
            atKm: obs.km,
            outcome: 'grinded',
            damageTaken: 0,
          });
        } else {
          obs.done = true;
          obs.clearedT = Math.round(t * 10) / 10;
          bearsSmashed += obs.initialCount;
          encounters.push({
            type: obs.type as BearUnitType,
            name: spec.name,
            emoji: spec.emoji,
            atKm: obs.km,
            outcome: 'smashed',
            damageTaken: 0,
          });
        }
        break; // Only engage one blocker at a time
      }
    }

    // 8. Grinding
    if (grinding) {
      const spec = BEAR_UNITS[grinding.type];

      // Plow mass away
      grinding.totalMass = Math.max(0, grinding.totalMass - trainStats.plow * dt);

      // Grind damage
      if (spec.grindDps && grinding.totalMass > 0) {
        const remainingCount = grinding.totalMass / (spec.mass || 1);
        const isHeat = spec.heat ?? false;
        const isAcid = spec.acid ?? false;

        let dps = spec.grindDps * remainingCount;
        if (isAcid && hasFlag('acidProof')) dps = 0;

        const dmg = reduceDmg(dps * dt, isHeat && !hasFlag('acidProof'));
        hp -= dmg;
        totalDamage += dmg;
        grindDmg += dmg;
        grinding.damageDealt += dmg;
      }

      // Block cleared?
      if (grinding.totalMass <= 0) {
        grinding.done = true;
        grinding.clearedT = Math.round(t * 10) / 10;
        grinding.count = 0;
        bearsSmashed += grinding.initialCount;

        events.push({
          t: Math.round(t * 10) / 10,
          km: Math.round(km * 1000) / 1000,
          kind: 'clear',
          text: `🚂 Plowed through ${spec.emoji} ${spec.name} ×${grinding.initialCount}!`,
        });

        grinding = null;
      }
    }

    // 9. Record frame
    maybeRecordFrame();

    // Update last frame's sticky/fire values
    if (frames.length > 0) {
      const last = frames[frames.length - 1];
      last.sticky = Math.round(effectiveSticky * 100) / 100;
      last.underFire = underFire;
    }

    // 10. Win
    if (km >= targetKm) {
      events.push({
        t: Math.round(t * 10) / 10,
        km: Math.round(km * 1000) / 1000,
        kind: 'win',
        text: `🏁 Reached ${targetKm} km! The bears are defeated!`,
      });
      return buildResult(seed, 'win', km, targetKm, t, bearsSmashed, totalDamage, hp, frames, events, live, impactDmg, zoneDmg, grindDmg, mineDmg, encounters);
    }

    // 11. Loss — destroyed
    if (hp <= 0) {
      hp = 0;
      events.push({
        t: Math.round(t * 10) / 10,
        km: Math.round(km * 1000) / 1000,
        kind: 'fail',
        text: '💀 The train has been completely destroyed. Bears are doing a victory dance. It is not graceful.',
      });
      return buildResult(seed, 'destroyed', km, targetKm, t, bearsSmashed, totalDamage, 0, frames, events, live, impactDmg, zoneDmg, grindDmg, mineDmg, encounters);
    }

    // 12. Loss — stalled (only after 5 seconds grace to allow initial acceleration)
    if (t > 5 && speed < 0.5 && !grinding) {
      events.push({
        t: Math.round(t * 10) / 10,
        km: Math.round(km * 1000) / 1000,
        kind: 'fail',
        text: '🛑 The train has stalled. Bears consider this a win. One bear is already writing a memoir.',
      });
      return buildResult(seed, 'stalled', km, targetKm, t, bearsSmashed, totalDamage, hp, frames, events, live, impactDmg, zoneDmg, grindDmg, mineDmg, encounters);
    }

    t += dt;
  }

  // Timeout
  events.push({
    t: Math.round(t * 10) / 10,
    km: Math.round(km * 1000) / 1000,
    kind: 'fail',
    text: '⏰ Time ran out! The bears stalled you long enough. They are very proud.',
  });
  return buildResult(seed, 'timeout', km, targetKm, t, bearsSmashed, totalDamage, hp, frames, events, live, impactDmg, zoneDmg, grindDmg, mineDmg, encounters);
}

function buildResult(
  seed: number,
  outcome: SimResult['outcome'],
  km: number,
  targetKm: number,
  t: number,
  bearsSmashed: number,
  damageTaken: number,
  hp: number,
  frames: SimFrame[],
  events: SimEvent[],
  live: LiveObstacle[],
  impactDmg = 0,
  zoneDmg = 0,
  grindDmg = 0,
  mineDmg = 0,
  encounters: ObstacleEncounter[] = [],
): SimResult {
  // Convert LiveObstacle[] to SimObstacle[] for output
  const obstacles: SimObstacle[] = live.map((o) => ({
    id: o.id,
    type: o.type,
    km: o.km,
    lengthKm: o.lengthKm,
    count: o.count,
    kind: o.kind,
    contactT: o.contactT,
    clearedT: o.clearedT,
  }));

  // Sync actual damage values into encounters (obstacle damageDealt tracks real accumulated damage)
  const syncDamage = new Map<string, number>();
  for (const o of live) {
    syncDamage.set(`${o.type}-${o.km}`, o.damageDealt);
  }
  for (const enc of encounters) {
    const key = `${enc.type}-${enc.atKm}`;
    const d = syncDamage.get(key);
    if (d !== undefined && d > 0) {
      enc.damageTaken = Math.round(d);
    }
  }

  // Identify killer obstacle (most damage)
  let killerIndex = -1;
  let maxDmg = 0;
  for (let i = 0; i < encounters.length; i++) {
    if (encounters[i].damageTaken > maxDmg && encounters[i].outcome !== 'vaporized' && encounters[i].outcome !== 'bypassed') {
      maxDmg = encounters[i].damageTaken;
      killerIndex = i;
    }
  }
  if (killerIndex >= 0) {
    encounters[killerIndex].outcome = 'killer';
  }

  return {
    seed,
    outcome,
    reachedKm: Math.round(km * 1000) / 1000,
    targetKm,
    timeSec: Math.round(t),
    bearsSmashed,
    damageTaken: Math.round(damageTaken),
    frames,
    events,
    obstacles,
    finalHp: Math.round(hp),
    damageBreakdown: {
      impact: Math.round(impactDmg),
      zone: Math.round(zoneDmg),
      grind: Math.round(grindDmg),
      mines: Math.round(mineDmg),
    },
    obstacleEncounters: encounters,
  };
}

// ---- MULTI-RUN ODDS CALCULATION ----

export function calculateOdds(
  trainStats: TrainStats,
  modFlags: ModFlag[],
  placements: BearPlacement[],
  targetKm: number,
  runs = 20,
  seed: Seed = 'odds',
): { trainWinPct: number; runs: number } {
  let wins = 0;
  for (let i = 0; i < runs; i++) {
    const result = runSimulation(trainStats, modFlags, placements, targetKm, {
      maxTimeSec: 600,
      seed: deriveSeed(seed, i),
    });
    if (result.outcome === 'win') wins++;
  }
  return { trainWinPct: Math.round((wins / runs) * 100), runs };
}

// ---- STAT COMPOSITION ----

export function composeStats(
  baseStats: TrainStats,
  mods: { effects: Partial<TrainStats> }[],
): TrainStats {
  const merged = { ...baseStats };
  for (const mod of mods) {
    for (const key of Object.keys(mod.effects) as (keyof TrainStats)[]) {
      merged[key] += mod.effects[key] ?? 0;
    }
  }
  // Clamp
  merged.armor = Math.min(merged.armor, 0.8);
  merged.heatShield = Math.min(merged.heatShield, 0.95);
  merged.grip = Math.min(merged.grip, 1);
  return merged;
}
