import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Download,
  Trash2,
  Key,
  Check,
  CheckCircle2,
  Copy,
  Save,
  Globe,
  Sun,
  Moon,
  Palette
} from 'lucide-react';
import { api } from '../api/client';
import { UserProfile, ConnectedSources } from '../types';
import { GitHubIcon, LeetCodeIcon } from '../components/BrandIcons';
import { validateGitHubId, validateLeetCodeId } from '../utils/handleValidation';

interface SettingsPageProps {
  user: UserProfile;
  connectedSources: ConnectedSources;
  onUserUpdated: () => void;
  onLogout: () => void;
  theme?: 'dark' | 'light';
  onSetTheme?: (theme: 'dark' | 'light') => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  connectedSources,
  onUserUpdated,
  onLogout,
  theme = 'light',
  onSetTheme
}) => {
  const [isPublic, setIsPublic] = useState(user.isPublic);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // Live profile linking state
  const [githubInput, setGithubInput] = useState(user.githubUsername || '');
  const [leetcodeInput, setLeetcodeInput] = useState(user.leetcodeUsername || '');
  const [linkingGithub, setLinkingGithub] = useState(false);
  const [linkingLeetcode, setLinkingLeetcode] = useState(false);
  const [linkNotice, setLinkNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Goals state
  const [dailyLc, setDailyLc] = useState(2);
  const [dailyCommits, setDailyCommits] = useState(2);
  const [dailyCodingMin, setDailyCodingMin] = useState(60);
  const [savingGoals, setSavingGoals] = useState(false);
  const [goalSuccess, setGoalSuccess] = useState(false);

  // API key regeneration (inline confirmation instead of window.confirm)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Export & Delete account state
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setIsPublic(user.isPublic);
    setGithubInput(user.githubUsername || '');
    setLeetcodeInput(user.leetcodeUsername || '');
  }, [user]);

  useEffect(() => {
    const loadGoals = async () => {
      try {
        const dash = await api.getDashboard('7d');
        if (dash?.goals) {
          if (dash.goals.leetcode?.target) setDailyLc(dash.goals.leetcode.target);
          if (dash.goals.commits?.target) setDailyCommits(dash.goals.commits.target);
          if (dash.goals.codingMin?.target) setDailyCodingMin(dash.goals.codingMin.target);
        }
      } catch {
        // Keep defaults if unavailable
      }
    };
    loadGoals();
  }, []);

  const handleTogglePrivacy = async () => {
    try {
      setSavingPrivacy(true);
      const res = await api.updatePrivacy(!isPublic);
      setIsPublic(res.isPublic);
      onUserUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleConnectGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateGitHubId(githubInput);
    if (!check.valid) {
      setLinkNotice({ ok: false, text: check.error || 'Write a correct GitHub ID.' });
      return;
    }
    try {
      setLinkingGithub(true);
      setLinkNotice(null);
      await api.connectGitHub(check.value);
      setLinkNotice({ ok: true, text: `Synced GitHub ID @${check.value}.` });
      onUserUpdated();
      setTimeout(() => setLinkNotice(null), 4000);
    } catch (err: any) {
      setLinkNotice({ ok: false, text: err.message || 'Failed to link GitHub ID.' });
    } finally {
      setLinkingGithub(false);
    }
  };

  const handleConnectLeetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateLeetCodeId(leetcodeInput);
    if (!check.valid) {
      setLinkNotice({ ok: false, text: check.error || 'Write a correct LeetCode ID.' });
      return;
    }
    try {
      setLinkingLeetcode(true);
      setLinkNotice(null);
      await api.connectLeetCode(check.value);
      setLinkNotice({ ok: true, text: `Synced LeetCode ID @${check.value}.` });
      onUserUpdated();
      setTimeout(() => setLinkNotice(null), 4000);
    } catch (err: any) {
      setLinkNotice({ ok: false, text: err.message || 'Failed to link LeetCode ID.' });
    } finally {
      setLinkingLeetcode(false);
    }
  };

  const handleSaveGoals = async () => {
    try {
      setSavingGoals(true);
      await api.updateGoal('daily_leetcode', dailyLc, 'daily');
      await api.updateGoal('daily_commits', dailyCommits, 'daily');
      await api.updateGoal('daily_coding_min', dailyCodingMin, 'daily');
      setGoalSuccess(true);
      setTimeout(() => setGoalSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingGoals(false);
    }
  };

  const handleRegenerateKey = async () => {
    try {
      setRegenerating(true);
      const res = await api.regenerateApiKey();
      setNewKey(res.apiKey);
      setConfirmRegenerate(false);
    } catch (err) {
      console.error(err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExporting(true);
      const token = localStorage.getItem('devprofile_token');
      const res = await fetch(api.downloadExportUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devprofile-export-${user.id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await api.deleteAccount();
      localStorage.removeItem('devprofile_token');
      onLogout();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-[#FF4D24]" />
          <span>Settings &amp; Integrations</span>
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Configure appearance, connected platform handles, daily targets, extension credentials, and data export.
        </p>
      </div>

      <div className="space-y-4">
        {/* Theme Preferences */}
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2 tracking-tight">
                <Palette className="w-4 h-4 text-[#FF4D24]" />
                <span>Appearance Mode</span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Preference is saved locally in your browser.
              </p>
            </div>
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Active: <strong className="text-neutral-900 dark:text-white">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onSetTheme && onSetTheme('light')}
              className={`p-4 rounded-2xl border text-left transition-colors flex items-start gap-3.5 ${
                theme === 'light'
                  ? 'bg-[#FFF1ED] dark:bg-[#FF4D24]/10 border-[#FF4D24]'
                  : 'bg-[#F6F7F9] dark:bg-[#0A0A0C] border-neutral-200 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/40 flex items-center justify-center shrink-0">
                <Sun className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-neutral-900 dark:text-white">Light Theme</span>
                  {theme === 'light' && (
                    <span className="text-[11px] font-semibold text-[#FF4D24]">Selected</span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Clean alabaster surface (#F6F7F9) with crisp hairline borders for daytime clarity.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSetTheme && onSetTheme('dark')}
              className={`p-4 rounded-2xl border text-left transition-colors flex items-start gap-3.5 ${
                theme === 'dark'
                  ? 'bg-[#FFF1ED] dark:bg-[#FF4D24]/10 border-[#FF4D24]'
                  : 'bg-[#F6F7F9] dark:bg-[#0A0A0C] border-neutral-200 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-[#0A0A0C] text-[#FF4D24] border border-white/15 flex items-center justify-center shrink-0">
                <Moon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-neutral-900 dark:text-white">Dark Theme</span>
                  {theme === 'dark' && (
                    <span className="text-[11px] font-semibold text-[#FF4D24]">Selected</span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Obsidian studio canvas (#0A0A0C) tuned for low-light focus sessions.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Connected Integrations */}
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white tracking-tight">Connected Handles</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Link public GitHub and LeetCode handles to sync repositories, commits, and solved problems.
              </p>
            </div>
            {linkNotice && (
              <span
                className={`text-xs font-medium ${
                  linkNotice.ok ? 'text-[#659B00] dark:text-[#C8F96D]' : 'text-[#FF4D24]'
                }`}
              >
                {linkNotice.text}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* GitHub */}
            <div className="p-4 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center text-neutral-800 dark:text-white shrink-0">
                    <GitHubIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-neutral-900 dark:text-white block">GitHub</span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono truncate block">
                      {connectedSources.github.connected ? `@${connectedSources.github.username}` : 'Not connected'}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-medium shrink-0 ${
                    connectedSources.github.connected ? 'text-[#659B00] dark:text-[#C8F96D]' : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {connectedSources.github.connected ? 'Synced' : 'Unlinked'}
                </span>
              </div>

              <form onSubmit={handleConnectGitHub} className="flex gap-2">
                <label htmlFor="settings-github-input" className="sr-only">
                  GitHub username
                </label>
                <input
                  id="settings-github-input"
                  type="text"
                  value={githubInput}
                  onChange={(e) => setGithubInput(e.target.value)}
                  placeholder="e.g. abcdev"
                  className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.1] text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#FF4D24] font-mono"
                />
                <button
                  type="submit"
                  disabled={linkingGithub}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-[#0A0A0C] text-xs font-semibold disabled:opacity-50 whitespace-nowrap transition-colors"
                >
                  {linkingGithub ? 'Syncing...' : connectedSources.github.connected ? 'Update' : 'Connect'}
                </button>
              </form>
            </div>

            {/* LeetCode */}
            <div className="p-4 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center shrink-0">
                    <LeetCodeIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-neutral-900 dark:text-white block">LeetCode</span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono truncate block">
                      {connectedSources.leetcode.connected ? `@${connectedSources.leetcode.username}` : 'Not connected'}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-medium shrink-0 ${
                    connectedSources.leetcode.connected ? 'text-[#659B00] dark:text-[#C8F96D]' : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {connectedSources.leetcode.connected ? 'Synced' : 'Unlinked'}
                </span>
              </div>

              <form onSubmit={handleConnectLeetCode} className="flex gap-2">
                <label htmlFor="settings-leetcode-input" className="sr-only">
                  LeetCode username
                </label>
                <input
                  id="settings-leetcode-input"
                  type="text"
                  value={leetcodeInput}
                  onChange={(e) => setLeetcodeInput(e.target.value)}
                  placeholder="e.g. abcdev"
                  className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.1] text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#FF4D24] font-mono"
                />
                <button
                  type="submit"
                  disabled={linkingLeetcode}
                  className="px-3 py-1.5 rounded-xl bg-[#FF4D24] hover:bg-[#E83E16] text-white text-xs font-semibold disabled:opacity-50 whitespace-nowrap transition-colors"
                >
                  {linkingLeetcode ? 'Syncing...' : connectedSources.leetcode.connected ? 'Update' : 'Connect'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Daily Goals */}
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
          <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white tracking-tight">Daily Consistency Targets</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 mb-4">
            Thresholds used to compute your daily consistency score and streak status.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="goal-daily-lc" className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1.5">
                LeetCode Solves / Day
              </label>
              <input
                id="goal-daily-lc"
                type="number"
                min="1"
                max="20"
                value={dailyLc}
                onChange={(e) => setDailyLc(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.1] text-xs font-mono tabular-nums text-neutral-900 dark:text-white focus:outline-none focus:border-[#FF4D24]"
              />
            </div>
            <div>
              <label htmlFor="goal-daily-commits" className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1.5">
                GitHub Commits / Day
              </label>
              <input
                id="goal-daily-commits"
                type="number"
                min="1"
                max="30"
                value={dailyCommits}
                onChange={(e) => setDailyCommits(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.1] text-xs font-mono tabular-nums text-neutral-900 dark:text-white focus:outline-none focus:border-[#FF4D24]"
              />
            </div>
            <div>
              <label htmlFor="goal-daily-minutes" className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1.5">
                Coding Minutes / Day
              </label>
              <input
                id="goal-daily-minutes"
                type="number"
                min="15"
                max="600"
                step="15"
                value={dailyCodingMin}
                onChange={(e) => setDailyCodingMin(Math.max(15, parseInt(e.target.value, 10) || 15))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.1] text-xs font-mono tabular-nums text-neutral-900 dark:text-white focus:outline-none focus:border-[#FF4D24]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveGoals}
              disabled={savingGoals}
              className="px-4 py-2 rounded-xl bg-[#FF4D24] hover:bg-[#E83E16] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingGoals ? 'Saving...' : 'Save Targets'}</span>
            </button>
            {goalSuccess && (
              <span className="text-xs text-[#659B00] dark:text-[#C8F96D] font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Targets updated</span>
              </span>
            )}
          </div>
        </div>

        {/* Public Portfolio Visibility */}
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2 tracking-tight">
                <Globe className="w-4 h-4 text-[#FF4D24]" />
                <span>Public Portfolio Visibility</span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                When enabled, your portfolio page (<code className="text-[#FF4D24] font-mono">/portfolio/{user.publicSlug}</code>) can be shared externally.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTogglePrivacy}
              disabled={savingPrivacy}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isPublic
                  ? 'bg-[#659B00] hover:bg-[#538000] dark:bg-[#C8F96D] dark:hover:bg-[#b8eb5c] text-white dark:text-[#0A0A0C]'
                  : 'bg-neutral-100 dark:bg-[#0A0A0C] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/[0.1] hover:bg-neutral-200 dark:hover:bg-white/[0.08]'
              }`}
            >
              {isPublic ? 'Publicly Visible' : 'Private'}
            </button>
          </div>
        </div>

        {/* Extension Key Management */}
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
          <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white mb-1 flex items-center gap-2 tracking-tight">
            <Key className="w-4 h-4 text-amber-500" />
            <span>Extension Key Management</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
            Regenerating your key revokes any previously configured VS Code extension key.
          </p>

          {newKey ? (
            <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border border-amber-300 dark:border-amber-500/30 flex items-center justify-between gap-3 font-mono text-xs text-neutral-900 dark:text-amber-300">
              <span className="truncate">{newKey}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newKey);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold text-[#FF4D24] hover:underline shrink-0"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-[#659B00] dark:text-[#C8F96D]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          ) : confirmRegenerate ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs text-neutral-600 dark:text-neutral-400">Revoke previous key and issue a new one?</span>
              <button
                type="button"
                onClick={handleRegenerateKey}
                disabled={regenerating}
                className="px-3.5 py-1.5 rounded-xl bg-[#FF4D24] hover:bg-[#E83E16] text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                {regenerating ? 'Regenerating...' : 'Confirm Regeneration'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmRegenerate(false)}
                className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#0A0A0C] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/[0.08] text-xs font-medium hover:bg-neutral-200 dark:hover:bg-white/[0.08]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRegenerate(true)}
              className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0A0A0C] dark:hover:bg-white/[0.08] text-neutral-800 dark:text-neutral-100 text-xs font-semibold border border-neutral-200 dark:border-white/[0.08] transition-colors"
            >
              Regenerate API Key
            </button>
          )}
        </div>

        {/* Data Export & Account Deletion */}
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white tracking-tight">Data Export &amp; Account Deletion</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Download your full JSON archive or permanently remove all stored records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportData}
              disabled={exporting}
              className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0A0A0C] dark:hover:bg-white/[0.08] text-neutral-800 dark:text-neutral-100 text-xs font-semibold border border-neutral-200 dark:border-white/[0.08] inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#FF4D24]" />
              <span>{exporting ? 'Preparing JSON...' : 'Export All Data (JSON)'}</span>
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 rounded-xl bg-[#FFF1ED] dark:bg-[#FF4D24]/10 hover:bg-[#FFE3DB] dark:hover:bg-[#FF4D24]/20 text-[#FF4D24] border border-[#FF4D24]/25 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account &amp; Data</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  {deleting ? 'Deleting...' : 'Confirm Permanent Deletion'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-[#0A0A0C] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/[0.08] text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
