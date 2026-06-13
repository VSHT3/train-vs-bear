import { BEAR_UNITS, COMMANDER_CARDS, getMod, getTrain, targetKmForRound } from '@/lib/catalog';
import { activeModEffects } from '@/lib/state';
import { composeStats } from '@/lib/simulate';
import type { BearPlacement, GameState } from '@/lib/types';
import { Sprite, trainSpriteSrc, unitSpriteSrc } from './sprite';

const ZONE_STYLES: Record<string, string> = {
  honeyZone: 'bg-amber-400/30',
  polarMinefield: 'bg-cyan-400/20',
  droneSwarm: 'bg-indigo-400/20',
  beeSwarm: 'bg-yellow-400/20',
  glueRiver: 'bg-cyan-300/25',
  mirrorMaze: 'bg-pink-300/20',
  bearNado: 'bg-purple-400/25',
};

export function IntelScreen({
  state,
  loading,
  onBack,
  onRun,
}: {
  state: GameState;
  loading: boolean;
  onBack: () => void;
  onRun: () => void;
}) {
  const plan = state.plan;
  const targetKm = targetKmForRound(state.round);
  const bearSide = state.side === 'bear';
  const train = getTrain(state.trainId);
  const mods = state.modIds.map((id) => getMod(id)).filter((mod) => mod !== undefined);
  const stats = composeStats(train.base, activeModEffects(state));
  const odds = state.odds;
  const warnPct = odds ? (odds.trainWinPct < 30 ? 'text-red-500' : odds.trainWinPct < 60 ? 'text-yellow-500' : 'text-green-500') : '';

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-8 gap-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">{bearSide ? '🚂 Incoming Train Intel' : '🕵️ Bear Intel'} — Round {state.round}</h2>
        {odds && <div className={`text-right ${warnPct}`}><div className="text-3xl font-black">{odds.trainWinPct}%</div><div className="text-xs">train win chance ({odds.runs} sims)</div></div>}
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-4 py-20 text-zinc-500">
          <div className="text-6xl animate-bounce">{bearSide ? '🚂' : '🐻'}</div>
          <p className="text-lg">{bearSide ? 'Scouting the incoming train...' : 'BEAR-GENERAL is assembling forces...'}</p>
          <div className="flex gap-1 mt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {!loading && plan && (
        <>
          {/* Odds meter */}
          {odds && (
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-500 font-medium">Win probability</span>
                <span className={`text-lg font-bold ${warnPct}`}>{odds.trainWinPct}% train · {100 - odds.trainWinPct}% bear</span>
              </div>
              <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${odds.trainWinPct}%` }} />
                <div className="h-full bg-amber-600 transition-all" style={{ width: `${100 - odds.trainWinPct}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                <span>Train favored</span>
                <span>Bear favored</span>
              </div>
            </div>
          )}

          {bearSide ? (
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Sprite src={trainSpriteSrc(train.id)} emoji={train.emoji} alt={train.name} size={96} />
                <div className="min-w-0">
                  <h3 className="text-2xl font-bold">{train.name}</h3>
                  <p className="text-base text-zinc-500 mt-1">{train.desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-sm">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 text-center"><strong className="block text-lg">{stats.topSpeed}</strong><span className="text-zinc-400 text-xs">Speed</span></div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 text-center"><strong className="block text-lg">{stats.maxHp}</strong><span className="text-zinc-400 text-xs">HP</span></div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 text-center"><strong className="block text-lg">{Math.round(stats.armor * 100)}%</strong><span className="text-zinc-400 text-xs">Armor</span></div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 text-center"><strong className="block text-lg">{stats.plow}</strong><span className="text-zinc-400 text-xs">Plow</span></div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 text-center"><strong className="block text-lg">{Math.round(stats.grip * 100)}%</strong><span className="text-zinc-400 text-xs">Grip</span></div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 text-center"><strong className="block text-lg">{stats.energyWeapon}</strong><span className="text-zinc-400 text-xs">Weapon</span></div>
              </div>
              {mods.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {mods.map((mod) => <span key={mod.id} className="text-sm px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">{mod.emoji} {mod.name}</span>)}
                </div>
              )}
              {state.commanderCard && (() => {
                const card = COMMANDER_CARDS.find((c) => c.id === state.commanderCard);
                return card ? (
                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    <div className="text-xs text-zinc-400 font-semibold mb-1">🃏 Active Commander Card</div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-lg">{card.emoji}</span>
                      <span className="font-medium">{card.name}</span>
                      <span className="text-xs text-zinc-400">{card.flavor}</span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <span className="text-sm text-zinc-400">{plan.source === 'ai' ? '🤖 live AI plan' : plan.source === 'tactical' ? '🎯 tactical algorithm' : '📋 preset plan'}</span>
              </div>
              <p className="text-xl italic text-zinc-600 dark:text-zinc-400">&ldquo;{plan.taunt}&rdquo;</p>
              <p className="text-base text-zinc-500">{plan.strategy}</p>
            </div>
          )}

          {/* Track map */}
          <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <h4 className="text-base font-semibold text-zinc-500 mb-3">{bearSide ? 'Your Defense Layout' : 'Track Obstacle Map'} ({targetKm} km)</h4>
            <div className="relative h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden">
              {/* Zone overlays */}
              {plan.placements.filter((p) => BEAR_UNITS[p.type].kind === 'zone').map((placement, i) => {
                const startPct = (placement.atKm / targetKm) * 100;
                const lengthPct = ((BEAR_UNITS[placement.type].zoneLengthKm ?? 1) / targetKm) * 100;
                return (
                  <div key={`intel-zone-${i}`} className={`absolute inset-y-0 ${ZONE_STYLES[placement.type] ?? 'bg-zinc-300/30'}`}
                    style={{ left: `${startPct}%`, width: `${lengthPct}%` }}
                    title={`${BEAR_UNITS[placement.type].name} zone (${BEAR_UNITS[placement.type].zoneLengthKm} km)`}
                  />
                );
              })}
              {/* Blockers */}
              {plan.placements.map((placement, index) => {
                const unit = BEAR_UNITS[placement.type];
                return (
                  <span key={`${placement.type}-${placement.atKm}-${index}`}
                    className="absolute top-1/2 -translate-y-1/2 text-xl" style={{ left: `${Math.min((placement.atKm / targetKm) * 100, 95)}%` }}
                    title={`${unit.name} ×${placement.count} at ${placement.atKm}km`}>
                    {unit.emoji}
                  </span>
                );
              })}
              {/* Tick marks */}
              {Array.from({ length: Math.floor(targetKm / 5) + 1 }, (_, i) => (
                <span key={`tick-${i}`} className="absolute bottom-0.5 text-[8px] text-zinc-400" style={{ left: `${(i * 5 / targetKm) * 100}%` }}>{i * 5}</span>
              ))}
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xl">🏁</span>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">
              {groupPlacements(plan.placements).map(({ type, total, positions }) => {
                const unit = BEAR_UNITS[type];
                return (
                  <div key={type} className="flex gap-3 items-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <Sprite src={unitSpriteSrc(type)} emoji={unit.emoji} alt={unit.name} size={48} />
                    <div className="min-w-0">
                      <strong className="text-base">{unit.name} ×{total}</strong>
                      <p className="text-sm text-zinc-500">at {positions.join(', ')} km</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bonus objectives preview */}
          {state.bonusObjectives.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-zinc-500 mb-3">🎯 BONUS OBJECTIVES</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {state.bonusObjectives.map((obj) => (
                  <div key={obj.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-sm">
                    <span className="text-lg">🎯</span>
                    <span className="flex-1">{obj.desc}</span>
                    <span className="text-xs font-bold text-amber-600 shrink-0">+{obj.reward}🪙</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button onClick={onBack} className="flex-1 py-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl font-semibold text-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">← Back to Shop</button>
            <button onClick={onRun} className="flex-1 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg hover:scale-[1.01] transition-transform">
              ▶ RUN SIMULATION
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function groupPlacements(placements: BearPlacement[]) {
  const groups = new Map<BearPlacement['type'], { type: BearPlacement['type']; total: number; positions: number[] }>();
  for (const p of placements) {
    const g = groups.get(p.type) ?? { type: p.type, total: 0, positions: [] };
    g.total += p.count;
    g.positions.push(p.atKm);
    groups.set(p.type, g);
  }
  return [...groups.values()];
}
