import React from 'react';
import { getConsistencyStatus } from '../utils/dashboardMetrics';
import { GitHubLogo, LeetCodeLogo, VSCodeLogo } from './BrandIcons';

interface ConsistencyRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  leetcodePts?: number;
  githubPts?: number;
  codingPts?: number;
}

export const ConsistencyRing: React.FC<ConsistencyRingProps> = ({
  score,
  size = 136,
  strokeWidth = 10,
  leetcodePts = 0,
  githubPts = 0,
  codingPts = 0
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = circumference - (clamped / 100) * circumference;
  const status = getConsistencyStatus(clamped);

  const badgeTone = {
    emerald: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60',
    blue: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800/60',
    amber: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60',
    red: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/60'
  }[status.tone];

  return (
    <div className="flex flex-col items-center">
      <div className="relative inline-flex items-center justify-center my-2" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90" aria-label={`Daily consistency score ${Math.round(score)} out of 100`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-neutral-100 dark:stroke-white/[0.08]"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={status.strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline gap-0.5 tabular-nums">
            <span className="font-display text-3xl font-bold tracking-tight text-[#111114] dark:text-white">
              {Math.round(score)}
            </span>
            <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">/100</span>
          </div>
          <span className={`mt-1 px-2 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap ${badgeTone}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* 3-Column Sub-Breakdown */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-neutral-100 dark:border-white/[0.06] w-full text-center">
        <div className="bg-[#F6F7F9] dark:bg-[#0A0A0C] py-2 px-1.5 rounded-xl border border-neutral-200/80 dark:border-white/[0.07]">
          <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            <LeetCodeLogo className="w-3 h-3" />
            <span>DSA</span>
          </div>
          <div className="text-xs font-semibold font-mono tabular-nums text-[#111114] dark:text-white mt-0.5">
            {leetcodePts}<span className="text-neutral-400 font-normal">/40</span>
          </div>
        </div>

        <div className="bg-[#F6F7F9] dark:bg-[#0A0A0C] py-2 px-1.5 rounded-xl border border-neutral-200/80 dark:border-white/[0.07]">
          <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            <GitHubLogo className="w-3 h-3" />
            <span>Git</span>
          </div>
          <div className="text-xs font-semibold font-mono tabular-nums text-[#111114] dark:text-white mt-0.5">
            {githubPts}<span className="text-neutral-400 font-normal">/30</span>
          </div>
        </div>

        <div className="bg-[#F6F7F9] dark:bg-[#0A0A0C] py-2 px-1.5 rounded-xl border border-neutral-200/80 dark:border-white/[0.07]">
          <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            <VSCodeLogo className="w-3 h-3" />
            <span>IDE</span>
          </div>
          <div className="text-xs font-semibold font-mono tabular-nums text-[#111114] dark:text-white mt-0.5">
            {codingPts}<span className="text-neutral-400 font-normal">/30</span>
          </div>
        </div>
      </div>
    </div>
  );
};
