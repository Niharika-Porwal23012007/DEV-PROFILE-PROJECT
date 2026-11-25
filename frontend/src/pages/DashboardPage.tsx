import React, { useEffect, useState } from 'react';
import {
  Flame,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Star,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api/client';
import { ConnectedSources, DashboardData, UserProfile } from '../types';
import { ConsistencyRing } from '../components/ConsistencyRing';
import { Heatmap } from '../components/Heatmap';
import { GoalCard } from '../components/GoalCard';
import { GitHubLogo, LeetCodeLogo, VSCodeLogo } from '../components/BrandIcons';
import { ActivityFilter, getConsistencyStatus } from '../utils/dashboardMetrics';
import { ResilientImage } from '../components/ResilientImage';
import studioBannerImg from '../assets/images/dashboard_studio_banner_1795456284456.jpg';
import codeShowcaseImg from '../assets/images/code_craft_showcase_1795456284692.jpg';
import dsaEmblemImg from '../assets/images/dsa_track_emblem_1795456284597.jpg';

interface DashboardPageProps {
  onNavigateTab: (tab: string) => void;
  refreshKey?: number;
  user?: UserProfile | null;
  connectedSources?: ConnectedSources | null;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateTab,
  refreshKey = 0,
  user,
  connectedSources
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');

  const fetchDashboard = async () => {
    try {
      if (!data) setLoading(true);
      const res = await api.getDashboard(range);
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [range, refreshKey]);

  if ((loading && !data) || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-neutral-500 dark:text-neutral-400 text-sm font-medium">
        <div className="animate-spin mr-3 w-4 h-4 border-2 border-[#FF4D24] border-t-transparent rounded-full" />
        <span>Loading developer analytics...</span>
      </div>
    );
  }

  const { today, leetcodeTotals, streak, goals, heatmap, recentRepositories, recentProblems } = data;
  const freezeRemaining = Math.max(0, 1 - streak.freezeDaysUsedThisWeek);
  const paceStatus = getConsistencyStatus(today.consistencyScore);

  const last7Days = heatmap.slice(-7);
  const lcSpark = last7Days.map(d => ({ label: d.date, value: d.solves }));
  const ghSpark = last7Days.map(d => ({ label: d.date, value: d.commits }));
  const ideSpark = last7Days.map(d => ({ label: d.date, value: d.codingMinutes }));

  const primaryLanguages = Array.from(
    new Set(recentRepositories.map(r => r.primary_language).filter(Boolean))
  ).slice(0, 3);
  const activeTopics = Array.from(
    new Set(recentProblems.flatMap(p => p.topicTags || []))
  ).slice(0, 3);

  const ghHandle = connectedSources?.github?.username || user?.githubUsername;
  const lcHandle = connectedSources?.leetcode?.username || user?.leetcodeUsername;

  return (
    <div className="space-y-6">
      {/* Top Workspace Studio Hero Strip */}
      <section
        aria-label="Streak and workspace spotlight"
        className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch"
      >
        <div className="xl:col-span-7 app-card p-6 flex flex-col justify-between gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#FFF1ED] dark:bg-[#FF4D24]/15 border border-[#FF4D24]/20 flex items-center justify-center text-[#FF4D24] shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Streak Discipline
                  </div>
                  <div className="flex items-baseline gap-1.5 tabular-nums">
                    <span className="font-display text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                      {streak.currentStreak}
                    </span>
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      days active
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden sm:block h-8 w-px bg-neutral-200 dark:bg-white/[0.08]" aria-hidden="true" />

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  All-Time Peak
                </div>
                <div className="font-display text-2xl font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                  {streak.longestStreak} <span className="text-xs font-sans font-medium text-neutral-500 dark:text-neutral-400">days</span>
                </div>
              </div>

              <div className="hidden sm:block h-8 w-px bg-neutral-200 dark:bg-white/[0.08]" aria-hidden="true" />

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  7-Day Average
                </div>
                <div className="flex items-baseline gap-1 tabular-nums">
                  <span className="font-display text-2xl font-bold text-[#FF4D24] tracking-tight">
                    {streak.weeklyAverageScore}
                  </span>
                  <span className="text-xs font-mono font-medium text-neutral-400 dark:text-neutral-500">/ 100</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
              <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
                <ShieldCheck className="w-3.5 h-3.5 text-[#659B00] dark:text-[#C8F96D]" />
                <span>{freezeRemaining} {freezeRemaining === 1 ? 'Freeze Safeguard' : 'Freeze Safeguards'}</span>
              </span>
              <span aria-hidden="true">&middot;</span>
              <span>{recentRepositories.length} repos synced</span>
              <span aria-hidden="true">&middot;</span>
              <span>
                {leetcodeTotals
                  ? `${leetcodeTotals.totalSolved} LeetCode solved`
                  : `${recentProblems.length} recent solves`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('planner')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF4D24] hover:bg-[#E83E16] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-[#FF4D24]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D24]"
            >
              <span>Today&apos;s Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Visual Engineering Desk Spotlight */}
        <div className="xl:col-span-5 relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-white/[0.08] min-h-[172px] bg-[#0A0A0C]">
          <ResilientImage
            src={studioBannerImg}
            alt="Developer workstation desk with dual code displays"
            className="w-full h-full object-cover absolute inset-0"
            fallbackTitle={`${user?.name || 'Developer'} Engineering Workspace`}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C]/95 via-[#0A0A0C]/70 to-[#0A0A0C]/45"
            aria-hidden="true"
          />
          <div className="relative h-full p-5 flex flex-col justify-between text-white">
            <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-neutral-200">
              <span className="font-mono tracking-tight">Engineering Workspace</span>
              <span className="font-semibold text-[#C8F96D]">{paceStatus.label}</span>
            </div>

            <div className="pt-8">
              <div className="font-display text-lg font-bold tracking-tight text-white truncate">
                {user?.name || 'ABC'}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-300">
                {ghHandle && <span>gh/@{ghHandle}</span>}
                {ghHandle && lcHandle && <span aria-hidden="true">&middot;</span>}
                {lcHandle && <span>lc/@{lcHandle}</span>}
                {!ghHandle && !lcHandle && <span>Connect handles in Settings</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Primary 4-Column Metric Grid */}
      <section aria-label="Daily metrics and goals" className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* Daily Consistency Index */}
        <div className="xl:col-span-4 app-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white tracking-tight">
                Daily Consistency Index
              </h2>
              <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                40 · 30 · 30
              </span>
            </div>

            <ConsistencyRing
              score={today.consistencyScore}
              leetcodePts={today.scoreBreakdown.leetcodePts}
              githubPts={today.scoreBreakdown.githubPts}
              codingPts={today.scoreBreakdown.codingPts}
            />
          </div>

          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-4 leading-relaxed">
            Weighted index: 40% DSA solves, 30% Git commits, and 30% focused editor duration. Score &ge; 30 preserves the streak.
          </p>
        </div>

        {/* 3 Daily Goal Cards */}
        <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GoalCard
            title="LeetCode Solves"
            current={goals.leetcode.current}
            target={goals.leetcode.target}
            unit="problems"
            subtitle={
              leetcodeTotals
                ? `${leetcodeTotals.totalSolved} total · ${leetcodeTotals.easy}E / ${leetcodeTotals.medium}M / ${leetcodeTotals.hard}H`
                : undefined
            }
            icon={<LeetCodeLogo className="w-4 h-4" />}
            color="amber"
            sparkData={lcSpark}
          />
          <GoalCard
            title="GitHub Commits"
            current={goals.commits.current}
            target={goals.commits.target}
            unit="commits"
            icon={<GitHubLogo className="w-4 h-4" />}
            color="emerald"
            sparkData={ghSpark}
          />
          <GoalCard
            title="VS Code Focus"
            current={goals.codingMin.current}
            target={goals.codingMin.target}
            unit="min"
            icon={<VSCodeLogo className="w-4 h-4" />}
            color="blue"
            sparkData={ideSpark}
          />
        </div>
      </section>

      {/* Activity & Contribution Matrix */}
      <section
        aria-label="Activity contribution matrix"
        className="app-card p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-display font-bold text-base text-neutral-900 dark:text-white tracking-tight">
              Activity &amp; Contribution Matrix
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Daily composite intensity across LeetCode problem solves, GitHub commits, and VS Code minutes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Source Filter Tabs */}
            <div
              role="group"
              aria-label="Filter activity source"
              className="inline-flex items-center p-0.5 rounded-xl bg-neutral-100 dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.08] text-xs"
            >
              {(
                [
                  { id: 'all', label: 'All Activity' },
                  { id: 'leetcode', label: 'LeetCode' },
                  { id: 'commits', label: 'Commits' },
                  { id: 'coding', label: 'VS Code' }
                ] as { id: ActivityFilter; label: string }[]
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivityFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activityFilter === tab.id
                      ? 'bg-white dark:bg-[#131316] text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Range Selector */}
            <div
              role="group"
              aria-label="Select date window"
              className="inline-flex items-center p-0.5 rounded-xl bg-neutral-100 dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.08] text-xs font-mono"
            >
              {(['7d', '30d', '90d'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                    range === r
                      ? 'bg-[#FF4D24] text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Heatmap
          data={heatmap}
          filter={activityFilter}
          rangeLabel={`${range === '7d' ? '7-Day' : range === '90d' ? '90-Day' : '30-Day'} Activity Window`}
        />
      </section>

      {/* Two Column Section: Repositories & Recent Solves */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active GitHub Repositories */}
        <div className="app-card overflow-hidden flex flex-col">
          <div className="relative h-28 bg-[#0A0A0C] shrink-0">
            <ResilientImage
              src={codeShowcaseImg}
              alt="Modular software pipeline visual for GitHub repositories"
              className="w-full h-full object-cover"
              fallbackTitle="Active GitHub Repositories"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#0A0A0C]/95 via-[#0A0A0C]/85 to-[#0A0A0C]/65"
              aria-hidden="true"
            />
            <div className="absolute inset-0 p-5 flex flex-col justify-between text-white">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display font-bold text-sm flex items-center gap-2 tracking-tight">
                  <GitHubLogo className="w-4 h-4 text-white" />
                  <span>Active GitHub Repositories</span>
                </h2>
                <span className="text-xs font-mono text-neutral-200 tabular-nums">
                  {recentRepositories.length} synced
                </span>
              </div>
              <div className="text-[11px] text-neutral-300 font-mono truncate">
                {primaryLanguages.length > 0 ? primaryLanguages.join(' · ') : 'Public repositories'}
              </div>
            </div>
          </div>

          <div className="p-5 flex-1">
            {recentRepositories.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
                No repositories synced yet. Connect your GitHub ID in Settings.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
                {recentRepositories.map((repo) => (
                  <div
                    key={repo.repo_name}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4 hover:bg-neutral-50 dark:hover:bg-white/[0.03] -mx-2 px-2 rounded-xl transition-colors"
                  >
                    <div className="min-w-0">
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-xs text-neutral-900 dark:text-white hover:text-[#FF4D24] dark:hover:text-[#FF4D24] inline-flex items-center gap-1.5 truncate transition-colors"
                      >
                        <span className="truncate">{repo.repo_name}</span>
                        <ExternalLink className="w-3 h-3 text-neutral-400 shrink-0" />
                      </a>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1.5 tabular-nums">
                        <span className="font-mono text-neutral-700 dark:text-neutral-300">{repo.primary_language || 'Code'}</span>
                        <span aria-hidden="true">&middot;</span>
                        <span>Pushed {new Date(repo.pushed_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300 font-mono font-semibold tabular-nums shrink-0">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                      <span>{repo.stars}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Algorithmic Solves */}
        <div className="app-card overflow-hidden flex flex-col">
          <div className="relative h-28 bg-[#0A0A0C] shrink-0">
            <ResilientImage
              src={dsaEmblemImg}
              alt="Geometric graph structure visual for LeetCode solves"
              className="w-full h-full object-cover"
              fallbackTitle="Recent Algorithmic Solves"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#0A0A0C]/95 via-[#0A0A0C]/85 to-[#0A0A0C]/65"
              aria-hidden="true"
            />
            <div className="absolute inset-0 p-5 flex flex-col justify-between text-white">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display font-bold text-sm flex items-center gap-2 tracking-tight">
                  <LeetCodeLogo className="w-4 h-4" />
                  <span>Recent Algorithmic Solves</span>
                </h2>
                <span className="text-xs font-mono text-neutral-200 tabular-nums">
                  {recentProblems.length} logged
                </span>
              </div>
              <div className="text-[11px] text-neutral-300 font-mono truncate">
                {activeTopics.length > 0 ? activeTopics.join(' · ') : 'Algorithm practice'}
              </div>
            </div>
          </div>

          <div className="p-5 flex-1">
            {recentProblems.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
                No recent solves recorded. Connect LeetCode ID in Settings to sync.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
                {recentProblems.map((prob) => {
                  const diffColor =
                    prob.difficulty === 'Easy'
                      ? 'text-[#659B00] dark:text-[#C8F96D]'
                      : prob.difficulty === 'Medium'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-[#FF4D24]';

                  return (
                    <div
                      key={prob.slug}
                      className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4 hover:bg-neutral-50 dark:hover:bg-white/[0.03] -mx-2 px-2 rounded-xl transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-neutral-900 dark:text-white truncate">
                            {prob.title}
                          </span>
                          {prob.struggled === 1 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 shrink-0">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Queued</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 flex flex-wrap items-center gap-1.5 tabular-nums">
                          <span className={`font-semibold ${diffColor}`}>{prob.difficulty}</span>
                          <span aria-hidden="true">&middot;</span>
                          <span className="truncate max-w-[220px]">{prob.topicTags.join(', ')}</span>
                          <span aria-hidden="true">&middot;</span>
                          <span>{new Date(prob.solved_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <a
                        href={`https://leetcode.com/problems/${prob.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${prob.title} on LeetCode`}
                        className="p-1.5 text-neutral-400 hover:text-[#FF4D24] rounded-lg hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-colors shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
