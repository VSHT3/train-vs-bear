import { BEAR_UNITS, getMod, getTrain, targetKmForRound } from '@/lib/catalog';
import { activeModEffects } from '@/lib/state';
import { composeStats } from '@/lib/simulate';
import type { BearPlacement, GameState } from '@/lib/types';
import { Sprite, trainSpriteSrc, unitSpriteSrc } from './sprite';

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

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-8 gap-6 max-w-5xl mx-auto w-full">
      <h2 className="text-3xl font-bold">{bearSide ? '🚂 Incoming Train Intel' : '🕵️ Bear Intel'} — Round {state.round}</h2>

      {loading && (
        <div className="flex flex-col items-center gap-4 py-20 text-zinc-500">
          <div className="text-6xl animate-bounce">{bearSide ? '🚂' : '🐻'}</div>
          <p className="text-lg">{bearSide ? 'Scouting the incoming train...' : 'BEAR-GENERAL is assembling forces...'}</p>
        </div>
      )}

      {!loading && plan && (
        <>
          {bearSide ? (
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-4"><Sprite src={trainSpriteSrc(train.id)} emoji={train.emoji} alt={train.name} size={112} /><div><h3 className="text-2xl font-bold">{train.name}</h3><p className="text-base text-zinc-500 mt-1">{train.desc}</p></div></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-base">
                <span><strong>{stats.topSpeed}</strong> km/h top speed</span><span><strong>{stats.maxHp}</strong> HP hull</span><span><strong>{Math.round(stats.armor * 100)}%</strong> armor</span>
                <span><strong>{stats.plow}</strong> t/s plow</span><span><strong>{Math.round(stats.grip * 100)}%</strong> grip</span><span><strong>{stats.energyWeapon}</strong> dps weapon</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {mods.map((mod) => <span key={mod.id} className="text-sm px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">{mod.emoji} {mod.name}</span>)}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between"><h3 className="text-2xl font-bold">{plan.name}</h3><span className="text-sm text-zinc-400">{plan.source === 'ai' ? '🤖 live AI plan' : plan.source === 'tactical' ? '🎯 tactical algorithm' : '📋 preset plan'}</span></div>
              <p className="text-xl italic text-zinc-600 dark:text-zinc-400">&ldquo;{plan.taunt}&rdquo;</p>
              <p className="text-base text-zinc-500">{plan.strategy}</p>
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <h4 className="text-base font-semibold text-zinc-500 mb-3">{bearSide ? 'Your Defense' : 'Track Map'} ({targetKm} km)</h4>
            <div className="relative h-14 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden">
              {plan.placements.map((placement, index) => {
                const unit = BEAR_UNITS[placement.type];
                return (
                  <span
                    key={`${placement.type}-${placement.atKm}-${index}`}
                    className="absolute top-1/2 -translate-y-1/2 text-xl"
                    style={{ left: `${Math.min((placement.atKm / targetKm) * 100, 95)}%` }}
                    title={`${unit.name} ×${placement.count} at ${placement.atKm}km`}
                  >
                    {unit.emoji}
                  </span>
                );
              })}
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xl">🏁</span>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">
              {groupPlacements(plan.placements).map(({ type, total, positions }) => {
                const unit = BEAR_UNITS[type];
                return (
                  <div key={type} className="flex gap-3 items-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <Sprite src={unitSpriteSrc(type)} emoji={unit.emoji} alt={unit.name} size={56} />
                    <div className="min-w-0">
                      <strong className="text-base">{unit.name} ×{total}</strong>
                      <p className="text-sm text-zinc-500">at {positions.join(', ')} km</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={onBack} className="flex-1 py-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl font-semibold text-lg">← Back to Shop</button>
            <button onClick={onRun} className="flex-1 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg">RUN SIMULATION</button>
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
