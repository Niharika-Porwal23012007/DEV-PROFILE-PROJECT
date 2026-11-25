import React from 'react';
import { getGoalProgress } from '../utils/dashboardMetrics';

export interface SparkBarPoint {
  label: string;
  value: number;
}

interface GoalCardProps {
  title: string;
  current: number;
  target: number;
  unit: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'amber' | 'emerald' | 'blue';
  sparkData?: SparkBarPoint[];
}

export const GoalCard: React.FC<GoalCardProps> = ({
  title,
  current,
  target,
  unit,
  subtitle,
  icon,
  color,
  sparkData = []
}) => {
  const { pct, completed, remainingLabel } = getGoalProgress(current, target, unit);

  const colorStyles = {
    amber: {
      bar: 'bg-amber-500',
      sparkToday: 'bg-amber-500',
      sparkPast: 'bg-amber-200 dark:bg-amber-900/70',
      iconBox: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/50 text-amber-600 dark:text-amber-400'
    },
    emerald: {
      bar: 'bg-emerald-600 dark:bg-emerald-500',
      sparkToday: 'bg-emerald-600 dark:bg-emerald-500',
      sparkPast: 'bg-emerald-200 dark:bg-emerald-900/70',
      iconBox: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400'
    },
    blue: {
      bar: 'bg-blue-600 dark:bg-blue-500',
      sparkToday: 'bg-blue-600 dark:bg-blue-500',
      sparkPast: 'bg-blue-200 dark:bg-blue-900/70',
      iconBox: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-800/50 text-blue-600 dark:text-blue-400'
    }
  }[color];

  const recentPoints = sparkData.slice(-7);
  const maxSpark = Math.max(target, ...recentPoints.map(p => p.value), 1);
  const avgSpark = recentPoints.length > 0
    ? (recentPoints.reduce((acc, p) => acc + p.value, 0) / recentPoints.length).toFixed(1).replace(/\.0$/, '')
    : String(current);

  return (
    <div className="app-card p-5 flex flex-col justify-between min-h-[220px] hover:border-neutral-300 dark:hover:border-white/20">
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {title}
            </span>
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${colorStyles.iconBox}`}>
              {icon}
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-1.5 tabular-nums">
            <span className="font-display text-4xl font-bold tracking-tight text-[#111114] dark:text-white">
              {current}
            </span>
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 font-mono">
              / {target} {unit}
            </span>
          </div>
          {subtitle && (
            <div className="mt-1 text-[10.5px] leading-snug font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
              {subtitle}
            </div>
          )}
        </div>

        {/* 7-Day Activity Sparkbars */}
        {recentPoints.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5 tabular-nums">
              <span>Last 7 days</span>
              <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300">
                avg {avgSpark}/d
              </span>
            </div>
            <div className="flex items-end gap-1.5 h-14" aria-label={`${title} 7-day trend`}>
              {recentPoints.map((pt, idx) => {
                const isToday = idx === recentPoints.length - 1;
                const heightPct = pt.value > 0 ? Math.max(18, Math.round((pt.value / maxSpark) * 100)) : 8;
                return (
                  <div
                    key={pt.label || idx}
                    title={`${pt.label}: ${pt.value} ${unit}`}
                    className="flex-1 h-full flex items-end"
                  >
                    <div
                      className={`w-full rounded-t-[4px] transition-all duration-300 ${
                        pt.value === 0
                          ? 'bg-neutral-100 dark:bg-white/[0.06]'
                          : isToday
                          ? colorStyles.sparkToday
                          : colorStyles.sparkPast
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="pt-4">
        <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 mb-2 tabular-nums whitespace-nowrap">
          <span className="font-mono font-medium">{pct}% reached</span>
          <span className={completed ? 'text-emerald-600 dark:text-[#C8F96D] font-semibold' : 'font-mono'}>
            {remainingLabel}
          </span>
        </div>
        <div className="w-full bg-neutral-100 dark:bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorStyles.bar} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
