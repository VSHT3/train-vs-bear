'use client';

import { useState } from 'react';
import { loadLeaderboard, loadStats, type LeaderboardEntry, type LifetimeStats } from '@/lib/storage';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function StatsDashboard({ onClose }: { onClose: () => void }) {
  const [stats] = useState<LifetimeStats>(() => loadStats());
  const [leaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard());
  const [tab, setTab] = useState<'lifetime' | 'leaderboard'>('lifetime');

  const trainWinRate = stats.trainGames > 0 ? Math.round((stats.trainWins / stats.trainGames) * 100) : 0;
  const bearWinRate = stats.bearGames > 0 ? Math.round((stats.bearWins / stats.bearGames) * 100) : 0;
  const overallWinRate = stats.gamesCompleted > 0 ? Math.round((stats.gamesWon / stats.gamesCompleted) * 100) : 0;

  const topEntries = leaderboard.slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-lg font-bold tracking-tight">📊 Career Stats</h2>
          <button onClick={onClose} aria-label="Close stats" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xl leading-none">✕</button>
        </div>

        <div className="flex border-b border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => setTab('lifetime')}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${tab === 'lifetime' ? 'text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            Lifetime
          </button>
          <button
            onClick={() => setTab('leaderboard')}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${tab === 'leaderboard' ? 'text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            Leaderboard
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'lifetime' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3 text-center">
                  <div className="text-2xl font-black">{stats.gamesCompleted}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">games</div>
                </div>
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-3 text-center">
                  <div className="text-2xl font-black text-emerald-600">{stats.gamesWon}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">won</div>
                </div>
                <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-3 text-center">
                  <div className="text-2xl font-black text-red-500">{stats.gamesLost}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">lost</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Performance</h3>
                <div className="space-y-2.5">
                  <ProgressRow label="Win Rate" value={`${overallWinRate}%`} pct={overallWinRate} color="bg-emerald-500" />
                  <ProgressRow label="Best Round" value={`${stats.bestRound}/7`} pct={Math.round((stats.bestRound / 7) * 100)} color="bg-violet-500" />
                  {stats.bestFreeplayWave > 0 && (
                    <ProgressRow label="Freeplay Best" value={`wave ${stats.bestFreeplayWave}`} pct={Math.min(stats.bestFreeplayWave * 10, 100)} color="bg-purple-500" />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Totals</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <MetricBox emoji="🐻" label="Bears cleared" value={stats.totalBearsSmashed.toLocaleString()} />
                  <MetricBox emoji="📏" label="Distance" value={`${stats.totalKm.toFixed(0)} km`} />
                  <MetricBox emoji="⏱️" label="Sim time" value={formatTime(stats.totalTimeSec)} />
                  <MetricBox emoji="🎯" label="Games started" value={stats.gamesStarted.toString()} />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">By Side</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/30 p-3">
                    <div className="flex items-center gap-1.5 text-sm font-bold mb-2">🚂 Train</div>
                    <div className="space-y-1.5 text-xs">
                      <SideStat label="Played" value={stats.trainGames.toString()} />
                      <SideStat label="Won" value={stats.trainWins.toString()} />
                      <SideStat label="Win rate" value={`${trainWinRate}%`} />
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-3">
                    <div className="flex items-center gap-1.5 text-sm font-bold mb-2">🐻 Bear</div>
                    <div className="space-y-1.5 text-xs">
                      <SideStat label="Played" value={stats.bearGames.toString()} />
                      <SideStat label="Won" value={stats.bearWins.toString()} />
                      <SideStat label="Win rate" value={`${bearWinRate}%`} />
                    </div>
                  </div>
                </div>
              </div>

              {stats.gamesStarted === 0 && (
                <p className="text-sm text-zinc-400 text-center py-4">Play your first game to start building stats!</p>
              )}
            </div>
          )}

          {tab === 'leaderboard' && (
            <div className="space-y-0.5">
              {topEntries.length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-8">No runs recorded yet. Finish a round to appear here!</p>
              )}
              {topEntries.map((entry, i) => (
                <div
                  key={`${entry.when}-${entry.seed}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${i === 0 ? 'bg-amber-50 dark:bg-amber-950/20' : 'even:bg-zinc-50 dark:even:bg-zinc-800/20'}`}
                >
                  <span className={`w-6 text-center font-bold text-xs ${i === 0 ? 'text-amber-500' : 'text-zinc-400'}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <span className="text-base">{entry.side === 'train' ? '🚂' : '🐻'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      Round {entry.round} — {entry.won ? 'Won' : 'Lost'}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {entry.bearsSmashed} bears · {entry.totalKm.toFixed(1)} km · {formatTime(entry.timeSec)}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-400 whitespace-nowrap">{timeAgo(entry.when)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 text-zinc-500">{label}</span>
      <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="w-12 text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

function MetricBox({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/30 p-3">
      <div className="text-xs text-zinc-400">{emoji} {label}</div>
      <div className="text-lg font-bold mt-0.5 truncate">{value}</div>
    </div>
  );
}

function SideStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
