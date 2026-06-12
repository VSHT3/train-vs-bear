import type { GameState } from './types';

const SAVE_KEY = 'train-vs-bear-save';
const STATS_KEY = 'train-vs-bear-stats';
const LEADERBOARD_KEY = 'train-vs-bear-leaderboard';

interface SaveData {
  version: 1;
  state: GameState;
  savedAt: number;
}

export function saveGame(state: GameState): void {
  if (state.phase === 'title') return;
  try {
    const data: SaveData = { version: 1, state, savedAt: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch { /* storage full or unavailable — silently ignore */ }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 1) return null;
    return data.state;
  } catch {
    return null;
  }
}

export function deleteGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch { /* */ }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export type AchievementId = 
  | 'firstSteps' | 'bearlyScratch' | 'unstoppable' | 'bearpocalypse'
  | 'thousandMiler' | 'fullSteam' | 'bearCommander' | 'doomtrain'
  | 'customShop' | 'perfectionist';

export interface Achievement {
  id: AchievementId;
  icon: string;
  title: string;
  desc: string;
  unlockedAt?: number;
}

export const ACHIEVEMENT_DEFS: Record<AchievementId, { icon: string; title: string; desc: string }> = {
  firstSteps: { icon: '👶', title: 'First Steps', desc: 'Complete your first game' },
  bearlyScratch: { icon: '🩹', title: 'Bearly a Scratch', desc: 'Win a round without ever taking damage' },
  unstoppable: { icon: '♾️', title: 'Unstoppable', desc: 'Reach freeplay wave 10' },
  bearpocalypse: { icon: '🐻‍❄️', title: 'Bearpocalypse', desc: 'Smash 1,000 bears total' },
  thousandMiler: { icon: '🎯', title: 'Thousand-Miler', desc: 'Cover 1,000 km total' },
  fullSteam: { icon: '🚂', title: 'Full Steam', desc: 'Complete all 7 rounds as train' },
  bearCommander: { icon: '🐻', title: 'Bear Commander', desc: 'Complete all 7 rounds as bear' },
  doomtrain: { icon: '👹', title: 'DOOMTRAIN', desc: 'Win a game using the DOOMTRAIN' },
  customShop: { icon: '✨', title: 'Custom Workshop', desc: 'Install 3 custom upgrades in one run' },
  perfectionist: { icon: '💎', title: 'Perfectionist', desc: 'Win all 7 rounds without losing any hearts' },
};

export interface LifetimeStats {
  gamesStarted: number;
  gamesCompleted: number;
  gamesWon: number;
  gamesLost: number;
  bestRound: number;
  totalBearsSmashed: number;
  totalKm: number;
  totalTimeSec: number;
  trainGames: number;
  trainWins: number;
  bearGames: number;
  bearWins: number;
  bestRunSeed: number | null;
  bestRunRound: number;
  bestFreeplayWave: number;
  achievements: AchievementId[];
  // Perfectionist tracking
  heartsLostThisRun: number;
}

export const EMPTY_STATS: LifetimeStats = {
  gamesStarted: 0,
  gamesCompleted: 0,
  gamesWon: 0,
  gamesLost: 0,
  bestRound: 0,
  totalBearsSmashed: 0,
  totalKm: 0,
  totalTimeSec: 0,
  trainGames: 0,
  trainWins: 0,
  bearGames: 0,
  bearWins: 0,
  bestRunSeed: null,
  bestRunRound: 0,
  bestFreeplayWave: 0,
  achievements: [],
  heartsLostThisRun: 0,
};

export function loadStats(): LifetimeStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...EMPTY_STATS };
    return JSON.parse(raw) as LifetimeStats;
  } catch {
    return { ...EMPTY_STATS };
  }
}

export function saveStats(stats: LifetimeStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch { /* */ }
}

export interface LeaderboardEntry {
  side: 'train' | 'bear';
  round: number;
  won: boolean;
  totalKm: number;
  bearsSmashed: number;
  timeSec: number;
  when: number;
  seed: number;
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  try {
    const sorted = entries
      .sort((a, b) => b.bearsSmashed - a.bearsSmashed || b.round - a.round)
      .slice(0, 50);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sorted));
  } catch { /* */ }
}

export function addLeaderboardEntry(entry: LeaderboardEntry): void {
  const entries = loadLeaderboard();
  entries.push(entry);
  saveLeaderboard(entries);
}

export function checkAchievements(stats: LifetimeStats): AchievementId[] {
  const newlyUnlocked: AchievementId[] = [];
  const unlocked = new Set(stats.achievements);

  const check = (id: AchievementId, condition: boolean) => {
    if (condition && !unlocked.has(id)) {
      unlocked.add(id);
      newlyUnlocked.push(id);
    }
  };

  check('firstSteps', stats.gamesCompleted >= 1);
  check('bearpocalypse', stats.totalBearsSmashed >= 1000);
  check('thousandMiler', stats.totalKm >= 1000);
  check('unstoppable', stats.bestFreeplayWave >= 10);

  if (newlyUnlocked.length > 0) {
    stats.achievements = [...unlocked];
    saveStats(stats);
  }

  return newlyUnlocked;
}
