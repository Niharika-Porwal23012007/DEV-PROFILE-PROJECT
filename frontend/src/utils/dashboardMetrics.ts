export type ActivityFilter = 'all' | 'leetcode' | 'commits' | 'coding';

export interface HeatmapEntry {
  date: string;
  commits: number;
  solves: number;
  codingMinutes: number;
  score: number;
  intensity: number;
}

export function singularizeUnit(count: number, unit: string): string {
  if (count === 1 && unit.endsWith('s')) {
    return unit.slice(0, -1);
  }
  return unit;
}

export function getGoalProgress(current: number, target: number, unit: string) {
  const safeTarget = target > 0 ? target : 1;
  const pct = Math.min(100, Math.round((current / safeTarget) * 100));
  const remaining = Math.max(0, target - current);
  const completed = current >= target;
  const remainingLabel = completed
    ? 'Target reached'
    : `${remaining} ${singularizeUnit(remaining, unit)} left`;

  return { pct, remaining, completed, remainingLabel };
}

export function getConsistencyStatus(score: number): {
  label: string;
  tone: 'emerald' | 'blue' | 'amber' | 'red';
  strokeColor: string;
} {
  if (score >= 80) {
    return { label: 'Optimal Pace', tone: 'emerald', strokeColor: '#16A34A' };
  }
  if (score >= 50) {
    return { label: 'Strong Progress', tone: 'blue', strokeColor: '#2563EB' };
  }
  if (score >= 30) {
    return { label: 'Streak Maintained', tone: 'amber', strokeColor: '#D97706' };
  }
  return { label: 'Below Threshold', tone: 'red', strokeColor: '#DC2626' };
}

export function getHeatmapCellLevel(day: HeatmapEntry, filter: ActivityFilter): {
  level: 0 | 1 | 2 | 3 | 4;
  primaryValue: string;
} {
  if (filter === 'leetcode') {
    const v = day.solves;
    const level: 0 | 1 | 2 | 3 | 4 = v >= 4 ? 4 : v === 3 ? 3 : v === 2 ? 2 : v === 1 ? 1 : 0;
    return { level, primaryValue: `${v} ${singularizeUnit(v, 'solves')}` };
  }
  if (filter === 'commits') {
    const v = day.commits;
    const level: 0 | 1 | 2 | 3 | 4 = v >= 6 ? 4 : v >= 4 ? 3 : v >= 2 ? 2 : v >= 1 ? 1 : 0;
    return { level, primaryValue: `${v} ${singularizeUnit(v, 'commits')}` };
  }
  if (filter === 'coding') {
    const v = day.codingMinutes;
    const level: 0 | 1 | 2 | 3 | 4 = v >= 120 ? 4 : v >= 75 ? 3 : v >= 40 ? 2 : v > 0 ? 1 : 0;
    return { level, primaryValue: `${v}m active` };
  }

  const s = day.score;
  const level: 0 | 1 | 2 | 3 | 4 = s >= 80 ? 4 : s >= 55 ? 3 : s >= 30 ? 2 : s > 0 ? 1 : 0;
  return { level, primaryValue: `${Math.round(s)}/100` };
}

export function formatSyncTimestamp(isoString?: string | null): string {
  if (!isoString) return 'Not synced yet';
  const ts = new Date(isoString).getTime();
  if (Number.isNaN(ts)) return 'Synced recently';
  const diffMin = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 1) return 'Synced just now';
  if (diffMin < 60) return `Synced ${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Synced ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Synced ${diffDays}d ago`;
}
