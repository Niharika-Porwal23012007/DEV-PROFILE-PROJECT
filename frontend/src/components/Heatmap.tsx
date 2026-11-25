import React, { useState } from 'react';
import { ActivityFilter, HeatmapEntry, getHeatmapCellLevel } from '../utils/dashboardMetrics';

interface HeatmapProps {
  data: HeatmapEntry[];
  filter?: ActivityFilter;
  rangeLabel?: string;
}

export const Heatmap: React.FC<HeatmapProps> = ({
  data,
  filter = 'all',
  rangeLabel = '30-Day Activity Window'
}) => {
  const [hovered, setHovered] = useState<HeatmapEntry | null>(null);

  const getCellColor = (level: 0 | 1 | 2 | 3 | 4) => {
    if (filter === 'leetcode') {
      if (level === 4) return 'bg-amber-500 hover:bg-amber-400';
      if (level === 3) return 'bg-amber-400 hover:bg-amber-300';
      if (level === 2) return 'bg-amber-300 dark:bg-amber-700 hover:bg-amber-400';
      if (level === 1) return 'bg-amber-100 dark:bg-amber-950 hover:bg-amber-200';
      return 'bg-neutral-100 dark:bg-white/[0.06] hover:bg-neutral-200 dark:hover:bg-white/[0.12]';
    }
    if (filter === 'coding') {
      if (level === 4) return 'bg-blue-600 hover:bg-blue-500';
      if (level === 3) return 'bg-blue-500 hover:bg-blue-400';
      if (level === 2) return 'bg-blue-400 dark:bg-blue-800 hover:bg-blue-500';
      if (level === 1) return 'bg-blue-100 dark:bg-blue-950 hover:bg-blue-200';
      return 'bg-neutral-100 dark:bg-white/[0.06] hover:bg-neutral-200 dark:hover:bg-white/[0.12]';
    }
    if (level === 4) return 'bg-emerald-500 hover:bg-emerald-400';
    if (level === 3) return 'bg-emerald-400 hover:bg-emerald-300';
    if (level === 2) return 'bg-emerald-300 dark:bg-emerald-800 hover:bg-emerald-400';
    if (level === 1) return 'bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200';
    return 'bg-neutral-100 dark:bg-white/[0.06] hover:bg-neutral-200 dark:hover:bg-white/[0.12]';
  };

  const legendPalette =
    filter === 'leetcode'
      ? ['bg-neutral-100 dark:bg-white/[0.06]', 'bg-amber-100 dark:bg-amber-950', 'bg-amber-300 dark:bg-amber-700', 'bg-amber-400', 'bg-amber-500']
      : filter === 'coding'
      ? ['bg-neutral-100 dark:bg-white/[0.06]', 'bg-blue-100 dark:bg-blue-950', 'bg-blue-400 dark:bg-blue-800', 'bg-blue-500', 'bg-blue-600']
      : ['bg-neutral-100 dark:bg-white/[0.06]', 'bg-emerald-100 dark:bg-emerald-950', 'bg-emerald-300 dark:bg-emerald-800', 'bg-emerald-400', 'bg-emerald-500'];

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 py-1" data-testid="activity-heatmap">
        {data.map((day, idx) => {
          const { level, primaryValue } = getHeatmapCellLevel(day, filter);
          return (
            <button
              key={day.date || idx}
              type="button"
              onMouseEnter={() => setHovered(day)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(day)}
              onBlur={() => setHovered(null)}
              aria-label={`${day.date}: ${primaryValue}`}
              className={`w-4 h-4 rounded-[4px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D24] ${getCellColor(level)}`}
            />
          );
        })}
      </div>

      {hovered && (
        <div
          role="status"
          className="mt-2 inline-flex flex-wrap items-center gap-3 bg-[#131316] dark:bg-white text-white dark:text-[#111114] text-xs px-3 py-1.5 rounded-xl tabular-nums border border-white/10"
        >
          <span className="font-mono font-semibold">{hovered.date}</span>
          <span className="opacity-80">Score {Math.round(hovered.score)}/100</span>
          <span className="opacity-80">{hovered.solves} solves</span>
          <span className="opacity-80">{hovered.commits} commits</span>
          <span className="opacity-80">{hovered.codingMinutes}m IDE</span>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mt-3 pt-3 border-t border-neutral-100 dark:border-white/[0.06]">
        <span className="font-medium">{rangeLabel}</span>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          {legendPalette.map((cls, i) => (
            <span key={i} className={`w-3 h-3 rounded-[3px] ${cls}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
