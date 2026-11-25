import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Brain,
  Scale,
  Clock,
  Award,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Info
} from 'lucide-react';
import { api } from '../api/client';
import { InsightsData } from '../types';

export const InsightsPage: React.FC = () => {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'deficits' | 'all'>('deficits');

  useEffect(() => {
    api.getInsights().then(res => setInsights(res)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading || !insights) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-neutral-500 dark:text-neutral-400 text-sm font-medium">
        <div className="animate-spin mr-3 w-4 h-4 border-2 border-[#FF4D24] border-t-transparent rounded-full" />
        <span>Computing algorithmic insights and skill gaps...</span>
      </div>
    );
  }

  const { weaknesses, balance, skillGaps, bestTimes, interviewReadiness } = insights;

  const balanceTone =
    balance.status === 'balanced'
      ? 'text-[#659B00] dark:text-[#C8F96D] bg-[#C8F96D]/15 border-[#C8F96D]/30'
      : 'text-[#FF4D24] bg-[#FF4D24]/10 border-[#FF4D24]/25';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <TrendingUp className="w-5 h-5 text-[#FF4D24]" />
          <span>Skill Gaps &amp; Engineering Diagnostics</span>
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Diagnostic comparison across LeetCode topic coverage, Git commit cadence, and VS Code activity windows.
        </p>
      </div>

      {/* Balance Detector Strip */}
      <section className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center text-neutral-700 dark:text-neutral-200">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white tracking-tight">
                  {balance.status === 'balanced' ? 'Balanced Growth Trajectory' : 'Activity Imbalance Detected'}
                </h2>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${balanceTone}`}>
                  {balance.status === 'balanced' ? 'Balanced' : balance.status === 'practice_heavy' ? 'Practice Heavy' : 'Build Heavy'}
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                {balance.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(insights.historyDaysCount ?? 14) < 14 && (
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-[#FFF1ED] dark:bg-[#FF4D24]/10 text-[#FF4D24] border border-[#FF4D24]/25 whitespace-nowrap">
                Cold-start ({insights.historyDaysCount}d)
              </span>
            )}
            <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
              14d vs 28d baseline
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs tabular-nums">
          <div>
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">LeetCode Trend</span>
            <span className="font-display font-bold text-base text-neutral-900 dark:text-white inline-flex items-center gap-1 mt-1">
              {balance.details.leetCodeChangePct >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-[#659B00] dark:text-[#C8F96D]" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-[#FF4D24]" />
              )}
              {balance.details.leetCodeChangePct}%
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">Building Trend</span>
            <span className="font-display font-bold text-base text-neutral-900 dark:text-white inline-flex items-center gap-1 mt-1">
              {balance.details.buildChangePct >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-[#659B00] dark:text-[#C8F96D]" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-[#FF4D24]" />
              )}
              {balance.details.buildChangePct}%
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">Recent LC Daily Avg</span>
            <span className="font-display font-bold text-base text-neutral-900 dark:text-white block mt-1">
              {balance.details.recentLeetCodeAvg} solves
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">Recent Build Avg</span>
            <span className="font-display font-bold text-base text-neutral-900 dark:text-white block mt-1">
              {balance.details.recentBuildAvg} commits/h
            </span>
          </div>
        </div>
      </section>

      {/* Weakness Analyzer & Interview Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weakness Diagnostic Engine */}
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-white/[0.06]">
            <div>
              <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2 tracking-tight">
                <Brain className="w-4 h-4 text-[#FF4D24]" />
                <span>Weakness Diagnostic Engine</span>
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 tabular-nums">
                Topic mean: <strong className="text-neutral-800 dark:text-neutral-200">{weaknesses.averageSolved}</strong> solves &middot; Ranked by deficit
              </p>
            </div>

            <div className="inline-flex items-center p-0.5 rounded-xl bg-neutral-100 dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.08] text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('deficits')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  viewMode === 'deficits'
                    ? 'bg-white dark:bg-[#131316] text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Top 3 Deficits
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  viewMode === 'all'
                    ? 'bg-white dark:bg-[#131316] text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                All ({weaknesses.topicStats?.length || 0})
              </button>
            </div>
          </div>

          {(insights.totalProblemsSolved ?? 5) < 5 && (
            <div className="mt-4 p-3 rounded-xl bg-[#FFF1ED] dark:bg-[#FF4D24]/10 border border-[#FF4D24]/25 text-xs text-neutral-800 dark:text-neutral-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#FF4D24] shrink-0 mt-0.5" />
              <span>
                Preliminary baseline ({insights.totalProblemsSolved ?? 0} solved): solve at least 5 LeetCode problems to calibrate accurate topic weakness rankings.
              </span>
            </div>
          )}

          {(!weaknesses.weakestTopics || weaknesses.weakestTopics.length === 0) ? (
            <div className="py-10 text-center space-y-2">
              <Brain className="w-6 h-6 text-neutral-400 mx-auto" />
              <h3 className="font-semibold text-xs text-neutral-800 dark:text-white">Establishing Topic Baseline</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                Sync your LeetCode profile to begin diagnostic topic tracking.
              </p>
            </div>
          ) : viewMode === 'deficits' ? (
            <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
              {weaknesses.weakestTopics.map((topic, idx) => (
                <div key={topic.topic} className="py-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] font-semibold text-neutral-400">0{idx + 1}.</span>
                      <span className="font-semibold text-neutral-900 dark:text-white truncate">{topic.topic}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums shrink-0">
                      <span className="text-neutral-500 dark:text-neutral-400">Deficit {topic.weaknessScore}</span>
                      <span aria-hidden="true">&middot;</span>
                      <span className="font-semibold text-[#FF4D24]">{topic.totalSolved} solved</span>
                    </div>
                  </div>

                  <div className="w-full bg-neutral-100 dark:bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF4D24] rounded-full"
                      style={{ width: `${Math.min(100, Math.max(4, (topic.totalSolved / (weaknesses.averageSolved * 1.5 || 1)) * 100))}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span>{topic.reason}</span>
                    <span className="font-mono tabular-nums">
                      {topic.mediumCount}M &middot; {topic.hardCount}H &middot; {topic.easyCount}E
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-white/[0.06] max-h-[380px] overflow-y-auto">
              {(weaknesses.topicStats || []).map((topic, idx) => (
                <div key={topic.topic} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900 dark:text-white truncate">{topic.topic}</span>
                      {idx < 3 && (
                        <span className="text-[11px] font-medium text-[#FF4D24]">
                          Priority deficit
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono tabular-nums mt-0.5">
                      {topic.mediumCount} Med &middot; {topic.hardCount} Hard &middot; {topic.easyCount} Easy
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <span className="font-semibold text-neutral-900 dark:text-white block">{topic.totalSolved} solved</span>
                    <span className="text-[11px] text-neutral-400">Score {topic.weaknessScore}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interview Readiness Score */}
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-white/[0.06]">
              <div>
                <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2 tracking-tight">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Interview Readiness Index</span>
                </h2>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  4-pillar weighted evaluation model
                </p>
              </div>
              <div className="text-right tabular-nums">
                <span className="font-display text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">{interviewReadiness.overallScore}</span>
                <span className="text-xs font-mono text-neutral-400 font-medium">/100</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              {[
                { label: 'Difficulty Mix', val: interviewReadiness.difficultyMixScore, max: 30, bar: 'bg-[#FF4D24]' },
                { label: 'Topic Coverage', val: interviewReadiness.topicCoverageScore, max: 25, bar: 'bg-amber-500' },
                { label: 'Consistency', val: interviewReadiness.consistencyScore, max: 25, bar: 'bg-[#659B00] dark:bg-[#C8F96D]' },
                { label: 'Project Activity', val: interviewReadiness.projectActivityScore, max: 20, bar: 'bg-neutral-800 dark:bg-white' }
              ].map((p) => (
                <div key={p.label} className="bg-[#F6F7F9] dark:bg-[#0A0A0C] p-3 rounded-xl border border-neutral-200/80 dark:border-white/[0.06]">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400 font-medium">{p.label}</span>
                    <span className="font-mono font-semibold tabular-nums text-neutral-900 dark:text-white">
                      {p.val}/{p.max}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-white/[0.08] h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full ${p.bar} rounded-full`} style={{ width: `${(p.val / p.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-100 dark:border-white/[0.06]">
            <h3 className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
              Recommended Actions
            </h3>
            <ul className="space-y-2">
              {interviewReadiness.whatToImprove.map((item, i) => (
                <li key={i} className="text-xs text-neutral-600 dark:text-neutral-300 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FF4D24] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Skill-Gap Cross Mapping & Best-Time Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/[0.06]">
            <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2 tracking-tight">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Skill-Gap Cross Mapping</span>
            </h2>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">DSA vs Repositories</span>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
            {skillGaps.map((gap, i) => (
              <div key={i} className="py-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-900 dark:text-white">{gap.category}</span>
                  <span className="text-[11px] font-medium text-[#FF4D24] capitalize">
                    {gap.gapType.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{gap.message}</p>
                <div className="text-[11px] text-neutral-700 dark:text-neutral-300 font-medium">
                  Next: {gap.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/[0.06]">
            <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2 tracking-tight">
              <Clock className="w-4 h-4 text-[#659B00] dark:text-[#C8F96D]" />
              <span>Best-Time Focus Windows</span>
            </h2>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">Asia/Kolkata</span>
          </div>

          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-[#F6F7F9] dark:bg-[#0A0A0C] border border-neutral-200/80 dark:border-white/[0.06] rounded-xl px-3.5 py-2.5 my-4">
            {bestTimes.summary}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                Peak Hours
              </h3>
              <div className="divide-y divide-neutral-100 dark:divide-white/[0.06] border border-neutral-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
                {bestTimes.peakHours.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-xs px-3 py-2 tabular-nums">
                    <span className="text-neutral-700 dark:text-neutral-300 font-medium">{h.label}</span>
                    <span className="font-mono font-semibold text-[#659B00] dark:text-[#C8F96D]">
                      {Math.round(h.activeMinutes / 60)}h
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                Peak Days
              </h3>
              <div className="divide-y divide-neutral-100 dark:divide-white/[0.06] border border-neutral-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
                {bestTimes.peakDays.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs px-3 py-2 tabular-nums">
                    <span className="text-neutral-700 dark:text-neutral-300 font-medium">{d.dayName}</span>
                    <span className="font-mono font-semibold text-[#FF4D24]">
                      {Math.round(d.activeMinutes / 60)}h
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
