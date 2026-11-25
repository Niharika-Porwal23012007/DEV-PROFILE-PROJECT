import React, { useEffect, useState } from 'react';
import {
  Copy,
  Check,
  ShieldCheck,
  FolderGit2,
  UserCheck,
  Calendar,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api/client';
import { LinkedInLogo } from '../components/BrandIcons';

export const DraftsPage: React.FC = () => {
  const [draftType, setDraftType] = useState<'weekly' | 'project' | 'profile'>('weekly');
  const [generatedDraft, setGeneratedDraft] = useState<string>('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isPosted, setIsPosted] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const generate = async (type: 'weekly' | 'project' | 'profile') => {
    try {
      setLoading(true);
      setDraftType(type);
      setCopied(false);
      setDraftError(null);
      const res = await api.generateDraft(type);
      setGeneratedDraft(res.text);
      setDraftId(res.id);
      setIsPosted(res.posted);
    } catch (err: any) {
      setGeneratedDraft('');
      setDraftId(null);
      setIsPosted(false);
      setDraftError(err?.message || 'Unable to generate verified draft without synced activity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate('weekly');
  }, []);

  const handleCopy = () => {
    if (!generatedDraft) return;
    navigator.clipboard.writeText(generatedDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleMarkPosted = async () => {
    if (!draftId) return;
    try {
      await api.markDraftPosted(draftId);
      setIsPosted(true);
    } catch (err) {
      console.error('Failed to mark posted:', err);
    }
  };

  const draftTitle =
    draftType === 'weekly'
      ? 'Weekly Verified Progress Draft'
      : draftType === 'project'
      ? 'Project Release Milestone Draft'
      : 'Optimized Profile Copy';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <LinkedInLogo className="w-5 h-5" />
          <span>LinkedIn Draft Station</span>
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Convert verified commits, solved problems, and session focus hours into concise LinkedIn updates.
        </p>
      </div>

      {/* Verification Guarantee */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-[#FF4D24] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-neutral-900 dark:text-white">Verified Data Only: </span>
          Every number and milestone in these drafts comes strictly from your synced GitHub, LeetCode, and IDE records.
        </div>
      </div>

      {/* Segmented Draft Type Tabs */}
      <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-neutral-100 dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.08]">
        <button
          type="button"
          onClick={() => generate('weekly')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
            draftType === 'weekly'
              ? 'bg-white dark:bg-[#131316] text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/[0.1] shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-[#FF4D24]" />
          <span>Weekly Recap</span>
        </button>

        <button
          type="button"
          onClick={() => generate('project')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
            draftType === 'project'
              ? 'bg-white dark:bg-[#131316] text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/[0.1] shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <FolderGit2 className="w-3.5 h-3.5 text-[#659B00] dark:text-[#C8F96D]" />
          <span>Project Milestone</span>
        </button>

        <button
          type="button"
          onClick={() => generate('profile')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
            draftType === 'profile'
              ? 'bg-white dark:bg-[#131316] text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/[0.1] shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-amber-500" />
          <span>Profile Checklist</span>
        </button>
      </div>

      {/* Draft Display Card */}
      <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white tracking-tight">
              {draftTitle}
            </h2>
            {isPosted && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[#C8F96D]/15 text-[#659B00] dark:text-[#C8F96D] border border-[#C8F96D]/30">
                Posted
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={loading || !generatedDraft}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0A0A0C] dark:hover:bg-white/[0.08] text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-white/[0.08] text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#659B00] dark:text-[#C8F96D]" /> : <Copy className="w-3.5 h-3.5 text-[#FF4D24]" />}
              <span>{copied ? 'Copied' : 'Copy Draft'}</span>
            </button>

            {draftId && !isPosted && (
              <button
                type="button"
                onClick={handleMarkPosted}
                className="px-3.5 py-1.5 rounded-xl bg-[#FF4D24] hover:bg-[#E83E16] text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                Mark as Posted
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="min-h-[220px] flex items-center justify-center text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <div className="animate-spin mr-2.5 w-4 h-4 border-2 border-[#FF4D24] border-t-transparent rounded-full" />
            <span>Drafting post from synced database records...</span>
          </div>
        ) : draftError ? (
          <div
            role="alert"
            className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">Authenticity Guard Blocked Empty Draft</div>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed">{draftError}</p>
            </div>
          </div>
        ) : (
          <div className="bg-[#F6F7F9] dark:bg-[#0A0A0C] p-5 rounded-xl border border-neutral-200 dark:border-white/[0.08] font-sans text-xs leading-relaxed whitespace-pre-wrap text-neutral-800 dark:text-neutral-200 selection:bg-[#FF4D24] selection:text-white">
            {generatedDraft}
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 gap-2">
          <span>Copy and paste manually into your LinkedIn feed or profile sections.</span>
          <a
            href="https://www.linkedin.com/feed/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FF4D24] hover:underline inline-flex items-center gap-1 font-semibold whitespace-nowrap"
          >
            <span>Open LinkedIn Feed</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
