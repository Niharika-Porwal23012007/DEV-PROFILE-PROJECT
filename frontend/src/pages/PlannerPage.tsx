import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Code2,
  FolderGit2,
  BrainCircuit,
  BookOpen
} from 'lucide-react';
import { api } from '../api/client';
import { PlannerTask } from '../types';

export const PlannerPage: React.FC = () => {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [source, setSource] = useState<'ai' | 'rule-based-fallback' | 'cached'>('rule-based-fallback');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [date, setDate] = useState('');

  const loadPlan = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const res = await api.getDailyPlan(refresh);
      setTasks(res.tasks || []);
      setSource(res.source);
      setDate(res.date);
    } catch (err) {
      console.error('Failed to load plan:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, []);

  const toggleTask = async (idx: number) => {
    try {
      const updated = [...tasks];
      updated[idx].completed = !updated[idx].completed;
      setTasks(updated);
      await api.togglePlanTask(idx);
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'practice':
        return <Code2 className="w-4 h-4 text-[#FF4D24]" />;
      case 'project':
        return <FolderGit2 className="w-4 h-4 text-[#659B00] dark:text-[#C8F96D]" />;
      case 'review':
        return <BrainCircuit className="w-4 h-4 text-amber-500" />;
      default:
        return <BookOpen className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-neutral-500 dark:text-neutral-400 text-sm font-medium">
        <div className="animate-spin mr-3 w-4 h-4 border-2 border-[#FF4D24] border-t-transparent rounded-full" />
        <span>Generating today&apos;s action plan...</span>
      </div>
    );
  }

  const completedCount = tasks.filter(t => t.completed).length;
  const totalMinutes = tasks.reduce((acc, t) => acc + t.minutes, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#FF4D24]" />
            <span>Daily Action Agenda</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Three targeted tasks derived from your topic deficits, stalest repositories, and spaced-repetition queue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            {source === 'ai' ? 'Gemini Planner' : 'Rule-Based Engine'}
          </span>

          <button
            type="button"
            onClick={() => loadPlan(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-[#131316] hover:bg-neutral-50 dark:hover:bg-white/[0.06] text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-white/[0.08] transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Plan</span>
          </button>
        </div>
      </div>

      {/* Clean Progress Strip */}
      <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">{date}</div>
          <div className="font-display text-2xl font-bold text-neutral-900 dark:text-white mt-0.5 tabular-nums tracking-tight">
            {completedCount} of {tasks.length} Tasks Completed
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 tabular-nums">
            Allocated focus time: {totalMinutes} minutes
          </div>
        </div>

        <div className="w-full sm:w-52">
          <div className="flex justify-between text-[11px] font-mono text-neutral-500 dark:text-neutral-400 mb-1.5 tabular-nums">
            <span>Daily Completion</span>
            <span>{Math.round((completedCount / Math.max(1, tasks.length)) * 100)}%</span>
          </div>
          <div className="w-full bg-neutral-100 dark:bg-white/[0.06] h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF4D24] rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / Math.max(1, tasks.length)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl divide-y divide-neutral-100 dark:divide-white/[0.06] overflow-hidden">
        {tasks.map((task, idx) => {
          const isDone = Boolean(task.completed);
          return (
            <div
              key={idx}
              className={`p-5 transition-colors ${isDone ? 'bg-neutral-50/80 dark:bg-white/[0.02]' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleTask(idx)}
                    aria-label={isDone ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
                    className="mt-0.5 text-neutral-400 hover:text-[#FF4D24] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D24] rounded"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-[#659B00] dark:text-[#C8F96D]" />
                    ) : (
                      <Circle className="w-5 h-5 text-neutral-300 dark:text-neutral-600 hover:text-[#FF4D24]" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-neutral-100 dark:bg-[#0A0A0C] border border-neutral-200/80 dark:border-white/[0.06] shrink-0">
                        {getTaskIcon(task.type)}
                      </span>
                      <span className={`text-sm font-semibold ${isDone ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-900 dark:text-white'}`}>
                        {task.title}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                      <span className="font-medium text-neutral-800 dark:text-neutral-300">Rationale: </span>
                      {task.reason}
                    </p>

                    {task.problemSlug && (
                      <div className="mt-2.5">
                        <a
                          href={`https://leetcode.com/problems/${task.problemSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF4D24] hover:underline"
                        >
                          <span>Open on LeetCode</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300 font-mono font-medium tabular-nums shrink-0">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{task.minutes}m</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footnote */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-[#659B00] dark:text-[#C8F96D] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-neutral-900 dark:text-white">Deterministic Safeguard: </span>
          Planning uses summary counts and topic metrics without reading source code, falling back cleanly to curated problem selection if external models are unconfigured.
        </div>
      </div>
    </div>
  );
};
