import React, { useEffect, useState } from 'react';
import {
  Star,
  ExternalLink,
  ShieldCheck,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { api } from '../api/client';
import { GitHubIcon, LeetCodeIcon } from '../components/BrandIcons';

interface PortfolioPageProps {
  publicSlug: string;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ publicSlug }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getPublicPortfolio(publicSlug);
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Portfolio not found or set to private.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [publicSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0A0A0C] text-neutral-700 dark:text-neutral-200 flex items-center justify-center text-xs font-medium">
        <div className="animate-spin mr-2.5 w-4 h-4 border-2 border-[#FF4D24] border-t-transparent rounded-full" />
        <span>Loading developer portfolio...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0A0A0C] text-neutral-700 dark:text-neutral-200 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#FFF1ED] dark:bg-[#FF4D24]/15 border border-[#FF4D24]/25 text-[#FF4D24] flex items-center justify-center mb-4">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <h1 className="font-display text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Portfolio Unavailable</h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 max-w-sm">{error}</p>
        <a
          href="/"
          className="mt-5 px-4 py-2 rounded-xl bg-[#FF4D24] hover:bg-[#E83E16] text-xs font-semibold text-white transition-colors"
        >
          Return to DevProfile
        </a>
      </div>
    );
  }

  const { user, verifiedStats, topRepositories, verifiedSkills } = data;

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0A0A0C] text-neutral-900 dark:text-neutral-100">
      <header className="border-b border-neutral-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#0A0A0C]/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#FF4D24] flex items-center justify-center font-display font-bold text-white text-xs tracking-tight">
              DP
            </div>
            <span className="font-display font-bold text-sm text-neutral-900 dark:text-white tracking-tight">DevProfile</span>
            <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">/</span>
            <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">@{user.publicSlug || publicSlug}</span>
          </div>

          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-[#FF4D24] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Workspace</span>
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FF4D24] flex items-center justify-center font-display font-bold text-2xl text-white uppercase shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white tracking-tight truncate">{user.name}</h1>
                <ShieldCheck className="w-4 h-4 text-[#659B00] dark:text-[#C8F96D] shrink-0" aria-label="Verified profile" />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Software Engineering &amp; Problem Solving Record
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400 mt-2 font-mono">
                {user.githubUsername && (
                  <span className="inline-flex items-center gap-1.5">
                    <GitHubIcon className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                    <span>@{user.githubUsername}</span>
                  </span>
                )}
                {user.leetcodeUsername && (
                  <span className="inline-flex items-center gap-1.5">
                    <LeetCodeIcon className="w-3.5 h-3.5" />
                    <span>@{user.leetcodeUsername}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs font-medium text-[#659B00] dark:text-[#C8F96D] inline-flex items-center gap-1.5 shrink-0">
            <ShieldCheck className="w-4 h-4" />
            <span>Synced Public Record</span>
          </div>
        </div>

        {/* 4 Verified Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              LeetCode Solved
            </span>
            <span className="font-display text-3xl font-bold tabular-nums text-neutral-900 dark:text-white mt-2 block tracking-tight">
              {verifiedStats.totalSolves}
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block tabular-nums">
              {verifiedStats.solvedBreakdown.medium} Med &middot; {verifiedStats.solvedBreakdown.hard} Hard
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              GitHub Commits
            </span>
            <span className="font-display text-3xl font-bold tabular-nums text-neutral-900 dark:text-white mt-2 block tracking-tight">
              {verifiedStats.totalCommits}
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
              Across active repos
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              IDE Focus Time
            </span>
            <span className="font-display text-3xl font-bold tabular-nums text-neutral-900 dark:text-white mt-2 block tracking-tight">
              {verifiedStats.totalCodingHours}h
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
              Tracked active coding
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              Active Streak
            </span>
            <span className="font-display text-3xl font-bold tabular-nums text-[#FF4D24] mt-2 block tracking-tight">
              {verifiedStats.currentStreakDays}d
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
              Consistent cadence
            </span>
          </div>
        </div>

        {/* Featured Repositories */}
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
          <h2 className="font-display text-base font-bold text-neutral-900 dark:text-white pb-3 border-b border-neutral-100 dark:border-white/[0.06] flex items-center gap-2 tracking-tight">
            <GitHubIcon className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            <span>Featured Repositories</span>
          </h2>

          <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
            {topRepositories.map((repo: any) => (
              <div key={repo.repo_name} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-xs text-neutral-900 dark:text-white hover:text-[#FF4D24] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>{repo.repo_name}</span>
                    <ExternalLink className="w-3 h-3 text-neutral-400" />
                  </a>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">{repo.primary_language || 'Code'}</span>
                    <span className="tabular-nums">Updated {new Date(repo.pushed_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300 font-mono tabular-nums shrink-0">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span>{repo.stars}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verified Algorithmic Skills */}
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
          <h2 className="font-display text-base font-bold text-neutral-900 dark:text-white mb-1 flex items-center gap-2 tracking-tight">
            <Layers className="w-4 h-4 text-[#FF4D24]" />
            <span>Demonstrated Topics &amp; Skills</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
            Topics verified across solved algorithmic problems and repository history.
          </p>

          <div className="flex flex-wrap gap-2">
            {verifiedSkills.map((skill: string) => (
              <span
                key={skill}
                className="px-3 py-1.5 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.08] text-xs font-medium text-neutral-700 dark:text-neutral-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
