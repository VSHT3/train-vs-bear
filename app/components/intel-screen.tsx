import { BEAR_UNITS, getMod, getTrain, targetKmForRound } from '@/lib/catalog';
import { activeModEffects } from '@/lib/state';
import { composeStats } from '@/lib/simulate';
import type { GameState } from '@/lib/types';

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
  const odds = state.odds;
  const targetKm = targetKmForRound(state.round);
  const bearSide = state.side === 'bear';
  const train = getTrain(state.trainId);
  const mods = state.modIds.map((id) => getMod(id)).filter((mod) => mod !== undefined);
  const stats = composeStats(train.base, activeModEffects(state));
  const displayedOdds = odds ? (bearSide ? 100 - odds.trainWinPct : odds.trainWinPct) : null;

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 max-w-3xl mx-auto w-full">
      <h2 className="text-2xl font-bold">{bearSide ? '🚂 Incoming Train Intel' : '🕵️ Bear Intel'} — Round {state.round}</h2>

      {loading && (
        <div className="flex flex-col items-center gap-4 py-16 text-zinc-500">
          <div className="text-4xl animate-bounce">{bearSide ? '🚂' : '🐻'}</div>
          <p>Running deterministic scouting simulations...</p>
        </div>
      )}

      {!loading && plan && (
        <>
          {bearSide ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3"><span className="text-4xl">{train.emoji}</span><div><h3 className="text-xl font-bold">{train.name}</h3><p className="text-sm text-zinc-500">{train.desc}</p></div></div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span><strong>{stats.topSpeed}</strong> km/h</span><span><strong>{stats.maxHp}</strong> HP</span><span><strong>{Math.round(stats.armor * 100)}%</strong> armor</span>
                <span><strong>{stats.plow}</strong> t/s plow</span><span><strong>{Math.round(stats.grip * 100)}%</strong> grip</span><span><strong>{stats.energyWeapon}</strong> weapon</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {mods.map((mod) => <span key={mod.id} className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">{mod.emoji} {mod.name}</span>)}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between"><h3 className="text-xl font-bold">{plan.name}</h3><span className="text-xs text-zinc-400">{plan.source}</span></div>
              <p className="text-lg italic text-zinc-600 dark:text-zinc-400">&ldquo;{plan.taunt}&rdquo;</p>
              <p className="text-sm text-zinc-500">{plan.strategy}</p>
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <h4 className="text-sm font-medium text-zinc-500 mb-3">{bearSide ? 'Your Defense' : 'Track Map'} ({targetKm} km)</h4>
            <div className="relative h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
              {plan.placements.map((placement, index) => {
                const unit = BEAR_UNITS[placement.type];
                return (
                  <span
                    key={`${placement.type}-${placement.atKm}-${index}`}
                    className="absolute top-1/2 -translate-y-1/2 text-sm"
                    style={{ left: `${Math.min((placement.atKm / targetKm) * 100, 95)}%` }}
                    title={`${unit.name} ×${placement.count} at ${placement.atKm}km`}
                  >
                    {unit.emoji}
                  </span>
                );
              })}
              <span className="absolute right-1 top-1/2 -translate-y-1/2">🏁</span>
            </div>
          </div>

          {displayedOdds !== null && odds && (
            <div className={`p-4 rounded-xl border text-center ${displayedOdds >= 60 ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : displayedOdds >= 30 ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'}`}>
              <div className="text-3xl font-black">{displayedOdds}%</div>
              <div className="text-sm font-semibold mt-0.5">
                {displayedOdds >= 80 ? '🟢 FAVORED' : displayedOdds >= 60 ? '🟢 GOOD CHANCE' : displayedOdds >= 40 ? '🟡 EVEN' : displayedOdds >= 20 ? '🔴 UNLIKELY' : '🔴 LONG SHOT'}
              </div>
              <div className="text-sm text-zinc-500">estimated {bearSide ? 'defense hold' : 'train win'} chance · {odds.runs} seeded runs</div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onBack} className="flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-medium">← Back to Shop</button>
            <button onClick={onRun} className="flex-1 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold">RUN SIMULATION</button>
          </div>
        </>
      )}
    </div>
  );
}
