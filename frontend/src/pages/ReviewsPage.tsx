import React, { useEffect, useState } from 'react';
import {
  Brain,
  CheckCircle2,
  XCircle,
  Calendar,
  FileEdit,
  Save,
  ExternalLink
} from 'lucide-react';
import { api } from '../api/client';
import { ReviewItem } from '../types';

interface ReviewsPageProps {
  onReviewUpdated?: () => void;
}

export const ReviewsPage: React.FC<ReviewsPageProps> = ({ onReviewUpdated }) => {
  const [dueToday, setDueToday] = useState<ReviewItem[]>([]);
  const [upcoming, setUpcoming] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [patternTag, setPatternTag] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.getTodayReviews();
      setDueToday(res.dueToday || []);
      setUpcoming(res.upcoming || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDone = async (reviewId: string, passed: boolean) => {
    try {
      await api.completeReview(reviewId, passed);
      await fetchReviews();
      if (onReviewUpdated) onReviewUpdated();
    } catch (err) {
      console.error('Failed to update review:', err);
    }
  };

  const handleOpenNote = async (slug: string) => {
    setSelectedSlug(slug);
    setSaveSuccess(false);
    try {
      const res = await api.getProblemNote(slug);
      setNoteText(res.note?.note_text || '');
      setPatternTag(res.note?.pattern_tag || '');
    } catch (err) {
      setNoteText('');
      setPatternTag('');
    }
  };

  const handleSaveNote = async () => {
    if (!selectedSlug) return;
    try {
      setSavingNote(true);
      await api.saveProblemNote(selectedSlug, noteText, patternTag);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      fetchReviews();
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-neutral-500 dark:text-neutral-400 text-sm font-medium">
        <div className="animate-spin mr-3 w-4 h-4 border-2 border-[#FF4D24] border-t-transparent rounded-full" />
        <span>Loading spaced-repetition queue...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <Brain className="w-5 h-5 text-[#FF4D24]" />
          <span>Spaced Repetition Queue</span>
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Struggled problems are scheduled at 3, 7, and 21-day intervals to strengthen long-term pattern recall.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Queues */}
        <div className="lg:col-span-2 space-y-4">
          {/* Due Today */}
          <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/[0.06]">
              <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white tracking-tight">
                Due Today ({dueToday.length})
              </h2>
              <span className="text-[11px] font-medium text-[#FF4D24]">
                Active Retention Queue
              </span>
            </div>

            {dueToday.length === 0 ? (
              <div className="py-8 text-center text-neutral-500 dark:text-neutral-400 text-xs">
                No problems due for review today.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
                {dueToday.map((rev) => (
                  <div
                    key={rev.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-neutral-900 dark:text-white">
                          {rev.title || rev.problem_slug}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                          {rev.interval_days}d interval
                        </span>
                        {rev.pattern_tag && (
                          <>
                            <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">&middot;</span>
                            <span className="text-[11px] font-medium text-[#FF4D24]">
                              {rev.pattern_tag}
                            </span>
                          </>
                        )}
                      </div>

                      {rev.note_text && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1.5 line-clamp-2">
                          {rev.note_text}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenNote(rev.problem_slug)}
                        className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-[#FF4D24] hover:bg-neutral-100 dark:hover:bg-white/[0.06] rounded-xl transition-colors"
                        aria-label={`Edit pattern note for ${rev.title || rev.problem_slug}`}
                        title="Edit pattern note"
                      >
                        <FileEdit className="w-4 h-4" />
                      </button>

                      <a
                        href={`https://leetcode.com/problems/${rev.problem_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-[#FF4D24] hover:bg-neutral-100 dark:hover:bg-white/[0.06] rounded-xl transition-colors"
                        aria-label={`Open ${rev.title || rev.problem_slug} on LeetCode`}
                        title="Open on LeetCode"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDone(rev.id, true)}
                        className="px-3 py-1.5 rounded-xl bg-[#659B00] hover:bg-[#538000] dark:bg-[#C8F96D] dark:hover:bg-[#b8eb5c] text-white dark:text-[#0A0A0C] text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Solved</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDone(rev.id, false)}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#0A0A0C] hover:bg-[#FFF1ED] dark:hover:bg-[#FF4D24]/15 text-[#FF4D24] border border-neutral-200 dark:border-white/[0.1] text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        title="Struggled (resets interval to 3 days)"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Struggled</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Schedule */}
          <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
            <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white pb-3 border-b border-neutral-100 dark:border-white/[0.06] flex items-center gap-2 tracking-tight">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span>Upcoming Scheduled ({upcoming.length})</span>
            </h2>

            {upcoming.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
                No upcoming reviews scheduled yet.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
                {upcoming.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-neutral-900 dark:text-white font-semibold truncate">
                        {item.title || item.problem_slug}
                      </span>
                      {item.pattern_tag && (
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                          ({item.pattern_tag})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400 font-mono tabular-nums shrink-0">
                      <span>Due {item.due_date}</span>
                      <span className="text-neutral-800 dark:text-neutral-200 font-semibold">
                        {item.interval_days}d
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pattern Note Scratchpad */}
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
          <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white pb-3 border-b border-neutral-100 dark:border-white/[0.06] flex items-center gap-2 mb-4 tracking-tight">
            <FileEdit className="w-4 h-4 text-[#FF4D24]" />
            <span>Pattern Note Scratchpad</span>
          </h2>

          {selectedSlug ? (
            <div className="space-y-4">
              <div className="text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">Problem: </span>
                <span className="font-mono font-semibold text-[#FF4D24]">{selectedSlug}</span>
              </div>

              <div>
                <label htmlFor="pattern-tag-input" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Pattern Tag
                </label>
                <input
                  id="pattern-tag-input"
                  type="text"
                  value={patternTag}
                  onChange={(e) => setPatternTag(e.target.value)}
                  placeholder="e.g. Dynamic Programming / Knapsack"
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.1] text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-[#FF4D24]"
                />
              </div>

              <div>
                <label htmlFor="pattern-note-textarea" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Key Insights &amp; Edge Cases
                </label>
                <textarea
                  id="pattern-note-textarea"
                  rows={7}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="State transition, invariants, and complexity notes..."
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.1] text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-[#FF4D24] font-mono leading-relaxed resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveNote}
                disabled={savingNote}
                className="w-full py-2.5 rounded-xl bg-[#FF4D24] hover:bg-[#E83E16] text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingNote ? 'Saving...' : 'Save Note'}</span>
              </button>

              {saveSuccess && (
                <div className="text-xs text-[#659B00] dark:text-[#C8F96D] text-center font-medium">
                  Note saved successfully.
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 px-4 text-center text-neutral-500 dark:text-neutral-400 text-xs border border-dashed border-neutral-200 dark:border-white/[0.08] rounded-xl">
              Select the edit icon on any problem to view or update its pattern notes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
