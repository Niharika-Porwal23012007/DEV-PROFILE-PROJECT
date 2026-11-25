import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  UserPlus,
  LogIn,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus
} from 'lucide-react';
import { api } from '../api/client';
import { GitHubLogo, LeetCodeLogo, VSCodeLogo, LinkedInLogo } from '../components/BrandIcons';
import {
  validateGitHubId,
  validateLeetCodeId,
  validateLoginForm,
  validateOptionalEmail
} from '../utils/handleValidation';

interface LandingPageProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLoginSuccess: (token: string, user: any) => void;
}

const WORKFLOW_STAGES = [
  {
    id: 'connect',
    step: '01',
    title: 'Connect & Sync',
    subtitle: 'Public handles & zero-friction IDE telemetry',
    description:
      'Link your GitHub handle, LeetCode profile, and the VS Code companion extension. Only public commit counts, repository metadata, solved topics, and active editor minutes are ingested—never source code.',
    outcome: 'Live multi-source ingestion ledger updated automatically every cycle.',
    highlights: [
      'Strict format validation for GitHub & LeetCode handles',
      '2-minute idle-aware VS Code session batching',
      'Zero passwords or session cookies required'
    ]
  },
  {
    id: 'diagnose',
    step: '02',
    title: 'Diagnose & Plan',
    subtitle: 'Algorithmic gaps & rolling build-vs-study drift',
    description:
      'Compare topic coverage against your personal baseline and benchmark 14-day vs 28-day trends. Each morning produces a deterministic 3-task daily plan across practice, project building, and review.',
    outcome: '100-point daily index (40 DSA · 30 Git · 30 IDE) with 1 weekly streak freeze.',
    highlights: [
      'Ranks weakest DSA topics by depth deficit',
      'Flags practice-heavy or build-heavy drift early',
      '4-pillar Interview Readiness benchmark score'
    ]
  },
  {
    id: 'publish',
    step: '03',
    title: 'Retain & Publish',
    subtitle: 'Spaced repetition & anti-fabrication proof',
    description:
      'Problems that take over 40 minutes or feel difficult enter a 3, 7, and 21-day Ebbinghaus review queue. Share verified milestones via LinkedIn drafts or your public portfolio URL.',
    outcome: 'Recruiter-ready public record grounded strictly in real database rows.',
    highlights: [
      'Pattern note scratchpad per algorithmic problem',
      'Anti-fabrication guard blocks inflated draft claims',
      'Toggleable public portfolio at /portfolio/:slug'
    ]
  }
];

const FAQ_ITEMS = [
  {
    q: 'How does DevProfile sync my GitHub and LeetCode data?',
    a: 'DevProfile queries public GitHub REST/GraphQL endpoints for repository commits and metadata, and public LeetCode GraphQL endpoints for solved problem counts and topic distributions. No passwords or private browser cookies are required.'
  },
  {
    q: 'Does the VS Code extension read or upload my source code?',
    a: 'No. The companion extension records only elapsed active minutes, language identifiers, and workspace project names with a 2-minute idle timeout. File names are off by default and code content is never read or transmitted.'
  },
  {
    q: 'How is the 0–100 Daily Consistency Score calculated?',
    a: 'Up to 40 points come from LeetCode solves, up to 30 points from GitHub commits, and up to 30 points from focused VS Code coding minutes relative to your configured daily targets. Scoring 30 or above preserves your active streak, backed by 1 freeze safeguard per week.'
  },
  {
    q: 'Can I test everything right away without connecting personal accounts?',
    a: 'Yes. Click Instant Demo in the header or switch to Saved Profiles to explore the pre-seeded developer workspace with 35 days of realistic commits, solves, reviews, and drafts.'
  },
  {
    q: 'How do I export or delete my account data?',
    a: 'Inside Telemetry & Settings, you can download a complete JSON archive of every stored record in one click or permanently delete your account and all associated rows.'
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({
  theme,
  onToggleTheme,
  onLoginSuccess
}) => {
  const [authMode, setAuthMode] = useState<'quick' | 'custom'>('custom');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeStage, setActiveStage] = useState<string>('connect');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [leetcodeUsername, setLeetcodeUsername] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getProfiles().then(res => setProfiles(res.profiles || [])).catch(() => {});
  }, []);

  const ghTrimmed = githubUsername.trim();
  const lcTrimmed = leetcodeUsername.trim();
  const emailTrimmed = email.trim();

  const ghLiveCheck = ghTrimmed ? validateGitHubId(ghTrimmed) : null;
  const lcLiveCheck = lcTrimmed ? validateLeetCodeId(lcTrimmed) : null;
  const emailLiveCheck = emailTrimmed ? validateOptionalEmail(emailTrimmed) : null;

  const showGhError = Boolean(ghLiveCheck && !ghLiveCheck.valid);
  const showLcError = Boolean(lcLiveCheck && !lcLiveCheck.valid);
  const showEmailError = Boolean(emailLiveCheck && !emailLiveCheck.valid);
  const missingBothIds = submitted && !ghTrimmed && !lcTrimmed;

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError(null);

    const validation = validateLoginForm({
      githubUsername,
      leetcodeUsername,
      email
    });

    if (!validation.valid) {
      setError(validation.formError || 'Please enter a valid GitHub ID or LeetCode ID.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.registerOrLogin({
        name: name.trim() || undefined,
        email: emailTrimmed || undefined,
        githubUsername: ghTrimmed || undefined,
        leetcodeUsername: lcTrimmed || undefined
      });

      localStorage.setItem('devprofile_token', res.token);
      onLoginSuccess(res.token, res.user);
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please check your ID format and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = async (p: any) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.registerOrLogin({
        email: p.email,
        githubUsername: p.github_username || 'abcdev',
        leetcodeUsername: p.leetcode_username || 'abcdev'
      });
      localStorage.setItem('devprofile_token', res.token);
      onLoginSuccess(res.token, res.user);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate profile');
    } finally {
      setLoading(false);
    }
  };

  const launchDemo = () => {
    const demoProfile = profiles.find(p => p.id === 'usr_abc_001') || {
      email: 'abc@devprofile.io',
      name: 'ABC',
      github_username: 'abcdev',
      leetcode_username: 'abcdev'
    };
    handleQuickSelect(demoProfile);
  };

  const currentStage = WORKFLOW_STAGES.find(s => s.id === activeStage) || WORKFLOW_STAGES[0];

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0A0A0C] text-[#111114] dark:text-[#F5F5F7] flex flex-col transition-colors">
      {/* 3-Zone Outcrowd-Inspired Header */}
      <header className="sticky top-0 z-40 px-4 sm:px-6 pt-3">
        <div className="max-w-[1200px] mx-auto rounded-2xl border border-neutral-200 dark:border-white/[0.08] bg-white/90 dark:bg-[#131316]/90 backdrop-blur-md px-5 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a href="/" className="flex items-center gap-2.5 shrink-0 whitespace-nowrap">
            <span className="w-7 h-7 rounded-lg bg-[#FF4D24] flex items-center justify-center font-mono font-bold text-white text-xs tracking-tight">
              DP
            </span>
            <span className="font-display font-bold text-base tracking-tight text-[#111114] dark:text-white">
              DevProfile
            </span>
          </a>

          {/* Zone 2: Clean Typography Nav Links */}
          <nav aria-label="Landing sections" className="hidden md:flex items-center gap-7 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            <a href="#platform" className="hover:text-[#111114] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Platform
            </a>
            <a href="#workflow" className="hover:text-[#111114] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Workflow
            </a>
            <a href="#capabilities" className="hover:text-[#111114] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Capabilities
            </a>
            <a href="#faq" className="hover:text-[#111114] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Questions
            </a>
            <a href="/portfolio/abc" className="hover:text-[#111114] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Portfolio
            </a>
          </nav>

          {/* Zone 3: Single Primary Action + Theme Switch */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.08] transition-colors shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
            </button>

            <button
              type="button"
              onClick={launchDemo}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#FF4D24] hover:bg-[#E83E16] text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              Instant Demo
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        {/* Hero Stage with Subtle Ambient Illumination */}
        <section id="platform" className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(255,77,36,0.12),transparent_62%)]"
          />

          <div className="relative max-w-[1200px] mx-auto px-6 pt-12 pb-16 lg:pt-16 lg:pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
              {/* Left Column: Editorial Headline + Interactive Showcase Bento */}
              <div className="lg:col-span-7 space-y-8">
                <div className="space-y-4">
                  <div className="text-xs font-semibold tracking-wide text-[#FF4D24]">
                    Engineering Analytics &amp; Daily Action Planner
                  </div>

                  <h1
                    className="font-display font-bold tracking-tight text-[#111114] dark:text-white leading-[1.06] max-w-2xl"
                    style={{ fontSize: 'clamp(2.35rem, 4.3vw, 3.75rem)', textWrap: 'balance' }}
                  >
                    Turn daily code &amp; problem solving into verified career momentum.
                  </h1>

                  <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 max-w-xl leading-relaxed">
                    Unify GitHub commits, LeetCode problem solving, and VS Code active focus time into one transparent daily index—complete with weakness diagnostics, spaced repetition, and recruiter-ready portfolios.
                  </p>
                </div>

                {/* Outcrowd-style High-Contrast Bento Preview Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
                  {/* Dark Telemetry Preview Card */}
                  <div className="sm:col-span-7 rounded-2xl bg-[#131316] text-white border border-white/[0.08] p-5 flex flex-col justify-between gap-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-neutral-400">Daily Consistency</span>
                      <span className="text-xs font-mono text-[#C8F96D] tabular-nums">40 · 30 · 30</span>
                    </div>

                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <div className="font-display text-4xl font-bold tracking-tight tabular-nums">
                          86<span className="text-lg font-medium text-neutral-500">/100</span>
                        </div>
                        <div className="text-xs text-neutral-400 mt-1">
                          Streak active · 1 freeze safeguard
                        </div>
                      </div>

                      {/* Mini Outcrowd-style Bar Preview */}
                      <div className="flex items-end gap-1.5 h-16 shrink-0" aria-hidden="true">
                        {[38, 62, 54, 78, 92, 68, 86].map((h, i) => (
                          <div
                            key={i}
                            className={`w-2.5 rounded-t ${
                              i === 6
                                ? 'bg-[#FF4D24]'
                                : i === 4
                                ? 'bg-[#C8F96D]'
                                : 'bg-white/15'
                            }`}
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Crisp White Contrast Card (Outcrowd Signature Pop) */}
                  <div className="sm:col-span-5 rounded-2xl bg-white text-[#111114] border border-neutral-200 dark:border-transparent p-5 flex flex-col justify-between gap-4">
                    <div className="text-xs font-semibold text-neutral-500">
                      Synchronized Pipelines
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 text-xs font-semibold">
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] flex items-center gap-2">
                        <GitHubLogo className="w-4 h-4 shrink-0" />
                        <span>GitHub</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] flex items-center gap-2">
                        <LeetCodeLogo className="w-4 h-4 shrink-0" />
                        <span>LeetCode</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] flex items-center gap-2">
                        <VSCodeLogo className="w-4 h-4 shrink-0" />
                        <span>VS Code</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F6F7F9] flex items-center gap-2">
                        <LinkedInLogo className="w-4 h-4 shrink-0" />
                        <span>LinkedIn</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Open Your Workspace Card */}
              <div className="lg:col-span-5">
                <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 space-y-5">
                  <div>
                    <h2 className="font-display font-bold text-lg text-[#111114] dark:text-white tracking-tight">
                      Open Your Workspace
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Enter a valid GitHub ID or LeetCode ID, or select a saved profile.
                    </p>
                  </div>

                  <div className="flex bg-[#F6F7F9] dark:bg-[#0A0A0C] p-1 rounded-xl border border-neutral-200 dark:border-white/[0.08] text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setAuthMode('custom')}
                      className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                        authMode === 'custom'
                          ? 'bg-white dark:bg-[#1E1E24] text-[#111114] dark:text-white shadow-sm'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-[#111114] dark:hover:text-white'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Connect IDs</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('quick')}
                      className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                        authMode === 'quick'
                          ? 'bg-white dark:bg-[#1E1E24] text-[#111114] dark:text-white shadow-sm'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-[#111114] dark:hover:text-white'
                      }`}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Saved Profiles ({profiles.length})</span>
                    </button>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400 flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {authMode === 'custom' && (
                    <form onSubmit={handleCustomLogin} noValidate className="space-y-3.5 text-xs">
                      <div>
                        <label htmlFor="landing-name" className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                          Display Name <span className="font-normal text-neutral-400">(optional)</span>
                        </label>
                        <input
                          id="landing-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. ABC"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.1] text-[#111114] dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF4D24]/25 focus:border-[#FF4D24]"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label htmlFor="landing-gh" className="font-semibold text-neutral-700 dark:text-neutral-300">
                            GitHub ID
                          </label>
                          {ghLiveCheck?.valid && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Valid format</span>
                            </span>
                          )}
                        </div>
                        <input
                          id="landing-gh"
                          type="text"
                          value={githubUsername}
                          onChange={(e) => {
                            setGithubUsername(e.target.value);
                            if (error) setError(null);
                          }}
                          placeholder="e.g. abcdev"
                          aria-invalid={showGhError || missingBothIds}
                          aria-describedby="landing-gh-hint"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border text-[#111114] dark:text-white placeholder-neutral-400 font-mono focus:outline-none focus:ring-2 ${
                            showGhError || missingBothIds
                              ? 'border-red-500 dark:border-red-500 focus:ring-red-500/20 focus:border-red-500'
                              : 'border-neutral-200 dark:border-white/[0.1] focus:ring-[#FF4D24]/25 focus:border-[#FF4D24]'
                          }`}
                        />
                        <p
                          id="landing-gh-hint"
                          className={`mt-1 text-[11px] ${
                            showGhError
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : 'text-neutral-500 dark:text-neutral-400'
                          }`}
                        >
                          {showGhError
                            ? ghLiveCheck?.error
                            : '1-39 characters: letters, numbers, or single hyphens (e.g. abcdev)'}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label htmlFor="landing-lc" className="font-semibold text-neutral-700 dark:text-neutral-300">
                            LeetCode ID
                          </label>
                          {lcLiveCheck?.valid && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Valid format</span>
                            </span>
                          )}
                        </div>
                        <input
                          id="landing-lc"
                          type="text"
                          value={leetcodeUsername}
                          onChange={(e) => {
                            setLeetcodeUsername(e.target.value);
                            if (error) setError(null);
                          }}
                          placeholder="e.g. abcdev"
                          aria-invalid={showLcError || missingBothIds}
                          aria-describedby="landing-lc-hint"
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border text-[#111114] dark:text-white placeholder-neutral-400 font-mono focus:outline-none focus:ring-2 ${
                            showLcError || missingBothIds
                              ? 'border-red-500 dark:border-red-500 focus:ring-red-500/20 focus:border-red-500'
                              : 'border-neutral-200 dark:border-white/[0.1] focus:ring-[#FF4D24]/25 focus:border-[#FF4D24]'
                          }`}
                        />
                        <p
                          id="landing-lc-hint"
                          className={`mt-1 text-[11px] ${
                            showLcError
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : 'text-neutral-500 dark:text-neutral-400'
                          }`}
                        >
                          {showLcError
                            ? lcLiveCheck?.error
                            : '3-30 characters: letters, numbers, "-" or "_" (e.g. abcdev, neal_wu)'}
                        </p>
                      </div>

                      <div>
                        <label htmlFor="landing-email" className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                          Email Address <span className="font-normal text-neutral-400">(optional)</span>
                        </label>
                        <input
                          id="landing-email"
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError(null);
                          }}
                          placeholder="developer@example.com"
                          aria-invalid={showEmailError}
                          className={`w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border text-[#111114] dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 ${
                            showEmailError
                              ? 'border-red-500 dark:border-red-500 focus:ring-red-500/20 focus:border-red-500'
                              : 'border-neutral-200 dark:border-white/[0.1] focus:ring-[#FF4D24]/25 focus:border-[#FF4D24]'
                          }`}
                        />
                        {showEmailError && (
                          <p className="mt-1 text-[11px] text-red-600 dark:text-red-400 font-medium">
                            {emailLiveCheck?.error}
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 mt-1 rounded-xl bg-[#FF4D24] hover:bg-[#E83E16] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <span>{loading ? 'Connecting Sources...' : 'Start Tracking Progress'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  )}

                  {authMode === 'quick' && (
                    <div className="space-y-2.5">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Select a profile to enter its analytics workspace:
                      </p>
                      <div className="divide-y divide-neutral-200 dark:divide-white/[0.08] border border-neutral-200 dark:border-white/[0.08] rounded-xl max-h-64 overflow-y-auto">
                        {profiles.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleQuickSelect(p)}
                            disabled={loading}
                            className="w-full px-3.5 py-3 hover:bg-neutral-50 dark:hover:bg-white/[0.04] transition-colors text-left flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-[#FF4D24] flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
                                {p.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-[#111114] dark:text-white truncate">{p.name}</div>
                                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono truncate">
                                  gh: @{p.github_username || 'none'} &middot; lc: @{p.leetcode_username || 'none'}
                                </div>
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-neutral-200 dark:border-white/[0.08] text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Public handle metadata only. Zero passwords or session cookies required.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Statement + 4-Column Metric Grid (Outcrowd Style) */}
        <section className="border-t border-neutral-200 dark:border-white/[0.08] py-16 lg:py-20">
          <div className="max-w-[1200px] mx-auto px-6 space-y-12">
            <h2
              className="font-display text-2xl sm:text-4xl font-semibold tracking-tight leading-[1.2] max-w-4xl text-[#111114] dark:text-white"
              style={{ textWrap: 'balance' }}
            >
              We measure, diagnose, schedule, and verify your engineering progress{' '}
              <span className="text-neutral-400 dark:text-neutral-500">
                with complete transparency and zero fabricated metrics.
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] p-6 flex flex-col justify-between min-h-[176px]">
                <div className="font-display text-4xl font-bold tracking-tight text-[#111114] dark:text-white tabular-nums">
                  40·30·30
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mt-6">
                  Daily composite index weighting algorithmic practice, repository commits, and focused IDE duration.
                </p>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] p-6 flex flex-col justify-between min-h-[176px]">
                <div className="font-display text-4xl font-bold tracking-tight text-[#FF4D24] tabular-nums">
                  3 / 7 / 21d
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mt-6">
                  Automated Ebbinghaus review cadence triggered whenever a problem takes over 40 minutes or feels tough.
                </p>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] p-6 flex flex-col justify-between min-h-[176px]">
                <div className="font-display text-4xl font-bold tracking-tight text-[#111114] dark:text-white tabular-nums">
                  0%
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mt-6">
                  Source code read or uploaded. The VS Code companion logs elapsed workspace minutes and language IDs only.
                </p>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] p-6 flex flex-col justify-between min-h-[176px]">
                <div className="font-display text-4xl font-bold tracking-tight text-[#111114] dark:text-white tabular-nums">
                  3 Tasks
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mt-6">
                  Targeted daily action agenda balancing topic deficits, stale repositories, and due retention reviews.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive 3-Stage Workflow (Outcrowd "Stages" Section) */}
        <section id="workflow" className="border-t border-neutral-200 dark:border-white/[0.08] py-16 lg:py-20">
          <div className="max-w-[1200px] mx-auto px-6 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#111114] dark:text-white">
                  Stages of developer consistency
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 max-w-xl">
                  From raw activity ingestion to verifiable portfolio proof across three connected stages.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Stage Selector Column */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                {WORKFLOW_STAGES.map((stage) => {
                  const isActive = stage.id === activeStage;
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => setActiveStage(stage.id)}
                      className={`text-left rounded-2xl p-5 border transition-colors ${
                        isActive
                          ? 'bg-[#131316] dark:bg-white text-white dark:text-[#111114] border-transparent'
                          : 'bg-white dark:bg-[#131316] text-[#111114] dark:text-white border-neutral-200 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-display font-bold text-lg tracking-tight">
                          {stage.step}. {stage.title}
                        </span>
                        <ArrowRight
                          className={`w-4 h-4 shrink-0 ${
                            isActive
                              ? 'text-[#FF4D24]'
                              : 'text-neutral-400 dark:text-neutral-500'
                          }`}
                        />
                      </div>
                      <p
                        className={`text-xs mt-1.5 ${
                          isActive
                            ? 'text-neutral-300 dark:text-neutral-600'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        {stage.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Stage Detail Card */}
              <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] p-7 sm:p-8 flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="text-xs font-mono font-semibold text-[#FF4D24]">
                    Stage {currentStage.step} · {currentStage.subtitle}
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#111114] dark:text-white">
                    {currentStage.title}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {currentStage.description}
                  </p>

                  <div className="pt-4 border-t border-neutral-200 dark:border-white/[0.08] space-y-2.5">
                    {currentStage.highlights.map((item) => (
                      <div key={item} className="flex items-center gap-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-200">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4D24] shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {currentStage.outcome}
                  </span>
                  <button
                    type="button"
                    onClick={launchDemo}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF4D24] hover:bg-[#E83E16] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Explore in Demo</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Asymmetric Bento Capabilities (Outcrowd "Services" Rhythm) */}
        <section id="capabilities" className="border-t border-neutral-200 dark:border-white/[0.08] py-16 lg:py-20">
          <div className="max-w-[1200px] mx-auto px-6 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#111114] dark:text-white">
                  Built for measurable engineering habits
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 max-w-xl">
                  Six integrated modules working together from a unified developer ledger.
                </p>
              </div>
              <a
                href="/portfolio/abc"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF4D24] hover:underline whitespace-nowrap shrink-0"
              >
                <span>View live sample portfolio</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Row 1 */}
              <div className="md:col-span-7 rounded-2xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] p-7 flex flex-col justify-between min-h-[210px]">
                <div className="text-xs font-mono font-semibold text-[#FF4D24]">01. Activity Ledger</div>
                <div className="mt-6">
                  <h3 className="font-display text-xl font-bold text-[#111114] dark:text-white">
                    Merged Contribution Matrix
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed max-w-lg">
                    Inspect 7-day, 30-day, and 90-day timelines unifying LeetCode solves, GitHub commits, and VS Code active hours in one filterable matrix.
                  </p>
                </div>
              </div>

              <div className="md:col-span-5 rounded-2xl bg-[#131316] text-white border border-white/[0.08] p-7 flex flex-col justify-between min-h-[210px]">
                <div className="text-xs font-mono font-semibold text-[#C8F96D]">02. Diagnostics</div>
                <div className="mt-6">
                  <h3 className="font-display text-xl font-bold text-white">
                    Weakness &amp; Balance Engine
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
                    Ranks algorithmic topics with low medium/hard depth and detects practice-vs-building drift against a 28-day baseline.
                  </p>
                </div>
              </div>

              {/* Row 2 */}
              <div className="md:col-span-5 rounded-2xl bg-[#FFF1ED] dark:bg-[#1C1413] border border-[#FFD6CC] dark:border-[#FF4D24]/25 p-7 flex flex-col justify-between min-h-[210px]">
                <div className="text-xs font-mono font-semibold text-[#FF4D24]">03. Retention</div>
                <div className="mt-6">
                  <h3 className="font-display text-xl font-bold text-[#111114] dark:text-white">
                    Spaced Repetition Queue
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 mt-2 leading-relaxed">
                    Ebbinghaus intervals (3, 7, 21 days) with a built-in pattern note scratchpad for invariants and complexity notes.
                  </p>
                </div>
              </div>

              <div className="md:col-span-7 rounded-2xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] p-7 flex flex-col justify-between min-h-[210px]">
                <div className="text-xs font-mono font-semibold text-[#FF4D24]">04. Daily Action Agenda</div>
                <div className="mt-6">
                  <h3 className="font-display text-xl font-bold text-[#111114] dark:text-white">
                    Deterministic 3-Task Planner
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed max-w-lg">
                    Pairs Gemini planning with a deterministic rule-based fallback so every day starts with one practice problem, one repo milestone, and one review.
                  </p>
                </div>
              </div>

              {/* Row 3 */}
              <div className="md:col-span-6 rounded-2xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] p-7 flex flex-col justify-between min-h-[190px]">
                <div className="text-xs font-mono font-semibold text-neutral-500 dark:text-neutral-400">05. Editor Companion</div>
                <div className="mt-6">
                  <h3 className="font-display text-xl font-bold text-[#111114] dark:text-white">
                    VS Code Focus &amp; Problem Timer
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                    Idle-aware active session logger, live LeetCode solve timer, and Pomodoro cycle directly in your VS Code status bar.
                  </p>
                </div>
              </div>

              <div className="md:col-span-6 rounded-2xl bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] p-7 flex flex-col justify-between min-h-[190px]">
                <div className="text-xs font-mono font-semibold text-neutral-500 dark:text-neutral-400">06. Visibility</div>
                <div className="mt-6">
                  <h3 className="font-display text-xl font-bold text-[#111114] dark:text-white">
                    LinkedIn Drafts &amp; Public Portfolio
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                    Anti-fabrication draft generator grounded strictly in database rows, alongside a shareable portfolio page for recruiters.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Questions & Answers Accordion (Outcrowd Style) */}
        <section id="faq" className="border-t border-neutral-200 dark:border-white/[0.08] py-16 lg:py-20">
          <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-4 space-y-2">
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#111114] dark:text-white">
                Questions and Answers
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Clear details on syncing, scoring, privacy boundaries, and local setup.
              </p>
            </div>

            <div className="lg:col-span-8 divide-y divide-neutral-200 dark:divide-white/[0.08] border-y border-neutral-200 dark:border-white/[0.08]">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={item.q}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="w-full py-5 flex items-center justify-between gap-4 text-left font-display font-semibold text-sm sm:text-base text-[#111114] dark:text-white hover:text-[#FF4D24] dark:hover:text-[#FF4D24] transition-colors"
                    >
                      <span>{item.q}</span>
                      {isOpen ? (
                        <Minus className="w-4 h-4 text-[#FF4D24] shrink-0" />
                      ) : (
                        <Plus className="w-4 h-4 text-neutral-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <p className="pb-5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="border-t border-neutral-200 dark:border-white/[0.08] py-14">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="rounded-3xl bg-[#131316] text-white border border-white/[0.08] p-8 sm:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight">
                  Start measuring what actually ships.
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Launch the pre-seeded demo workspace or connect your GitHub and LeetCode IDs in seconds.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <a
                  href="/portfolio/abc"
                  className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Sample Portfolio
                </a>
                <button
                  type="button"
                  onClick={launchDemo}
                  disabled={loading}
                  className="px-5 py-3 rounded-xl bg-[#FF4D24] hover:bg-[#E83E16] text-white text-xs font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <span>Open Demo Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-neutral-200 dark:border-white/[0.08] py-8 px-6 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-[#FF4D24] flex items-center justify-center font-mono font-bold text-white text-[10px]">
              DP
            </span>
            <span>DevProfile &middot; Developer Analytics &amp; Portfolio Workspace</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#platform" className="hover:text-[#111114] dark:hover:text-white transition-colors">
              Platform
            </a>
            <a href="#workflow" className="hover:text-[#111114] dark:hover:text-white transition-colors">
              Workflow
            </a>
            <a href="/portfolio/abc" className="hover:text-[#111114] dark:hover:text-white transition-colors">
              Portfolio
            </a>
            <span>&copy; {new Date().getFullYear()} DevProfile</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
