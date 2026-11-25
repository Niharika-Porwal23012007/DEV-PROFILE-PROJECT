import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api/client';
import { LeetCodeIcon, VSCodeIcon } from '../components/BrandIcons';
import { validateLeetCodeId } from '../utils/handleValidation';

export const OnboardingPage: React.FC = () => {
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [connectingLc, setConnectingLc] = useState(false);
  const [lcStatus, setLcStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleConnectLeetcode = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateLeetCodeId(leetcodeUsername);
    if (!check.valid) {
      setLcStatus({ ok: false, text: check.error || 'Please write a correct LeetCode ID.' });
      return;
    }
    try {
      setConnectingLc(true);
      setLcStatus(null);
      await api.connectLeetCode(check.value);
      setLcStatus({ ok: true, text: `Connected LeetCode profile for @${check.value}.` });
    } catch (err: any) {
      setLcStatus({ ok: false, text: err.message || 'Unable to connect LeetCode ID.' });
    } finally {
      setConnectingLc(false);
    }
  };

  const handleGenerateKey = async () => {
    try {
      setGeneratingKey(true);
      const res = await api.regenerateApiKey();
      setApiKey(res.apiKey);
    } catch (err: any) {
      console.error(err);
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleCopyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-[#FF4D24]" />
          <span>Editor Extension Setup</span>
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Complete these three steps to link your LeetCode handle, generate an extension key, and log coding sessions.
        </p>
      </div>

      <div className="space-y-4">
        {/* Step 1: Connect LeetCode */}
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-6 rounded-lg bg-[#FF4D24] text-white font-display font-bold text-xs flex items-center justify-center tabular-nums shrink-0">
              1
            </span>
            <div className="flex items-center gap-2.5 min-w-0">
              <LeetCodeIcon className="w-5 h-5 shrink-0" />
              <div>
                <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white tracking-tight">Connect LeetCode Public Profile</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Uses public profile stats only; no passwords or cookies needed.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleConnectLeetcode} className="flex flex-col sm:flex-row gap-2.5 max-w-md">
            <label htmlFor="onboarding-leetcode-handle" className="sr-only">
              LeetCode username
            </label>
            <input
              id="onboarding-leetcode-handle"
              type="text"
              value={leetcodeUsername}
              onChange={(e) => setLeetcodeUsername(e.target.value)}
              placeholder="e.g. abcdev"
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.1] text-xs font-mono text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-[#FF4D24]"
            />
            <button
              type="submit"
              disabled={connectingLc}
              className="px-4 py-2 rounded-xl bg-[#FF4D24] hover:bg-[#E83E16] text-white text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {connectingLc ? 'Verifying...' : 'Connect'}
            </button>
          </form>

          {lcStatus && (
            <div
              className={`mt-3 text-xs flex items-center gap-2 ${
                lcStatus.ok ? 'text-[#659B00] dark:text-[#C8F96D]' : 'text-[#FF4D24]'
              }`}
            >
              {lcStatus.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{lcStatus.text}</span>
            </div>
          )}
        </div>

        {/* Step 2: VS Code Personal API Key */}
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-6 rounded-lg bg-[#FF4D24] text-white font-display font-bold text-xs flex items-center justify-center tabular-nums shrink-0">
              2
            </span>
            <div className="flex items-center gap-2.5 min-w-0">
              <VSCodeIcon className="w-5 h-5 shrink-0" />
              <div>
                <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white tracking-tight">Generate VS Code Extension Key</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Stored hashed on the server and shown once upon generation.</p>
              </div>
            </div>
          </div>

          {apiKey ? (
            <div className="space-y-2.5 max-w-xl">
              <div className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.1] flex items-center justify-between gap-3 font-mono text-xs text-neutral-900 dark:text-neutral-100">
                <span className="truncate">{apiKey}</span>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold text-[#FF4D24] hover:underline shrink-0"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-[#659B00] dark:text-[#C8F96D]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Store this key safely; it will not be shown again once you navigate away.</span>
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateKey}
              disabled={generatingKey}
              className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0A0A0C] dark:hover:bg-white/[0.08] text-neutral-800 dark:text-neutral-100 text-xs font-semibold border border-neutral-200 dark:border-white/[0.08] transition-colors"
            >
              {generatingKey ? 'Generating...' : 'Generate Extension Key'}
            </button>
          )}
        </div>

        {/* Step 3: Install Extension Instructions */}
        <div className="bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-6 rounded-lg bg-[#FF4D24] text-white font-display font-bold text-xs flex items-center justify-center tabular-nums shrink-0">
              3
            </span>
            <div className="flex items-center gap-2.5 min-w-0">
              <Terminal className="w-5 h-5 text-neutral-500 dark:text-neutral-400 shrink-0" />
              <div>
                <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-white tracking-tight">Configure the Companion Extension</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Located in the repository <code className="font-mono text-[#FF4D24]">/extension</code> directory.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-xs text-neutral-600 dark:text-neutral-300">
            <div className="p-4 rounded-xl bg-[#0A0A0C] text-neutral-200 font-mono text-xs border border-white/[0.08] space-y-2 overflow-x-auto">
              <div className="text-neutral-500"># 1. Compile the extension package</div>
              <div className="text-[#FF4D24]">cd extension &amp;&amp; npm run compile</div>
              <div className="text-neutral-500 pt-1"># 2. Launch Extension Host via F5 in VS Code, or install packaged VSIX</div>
              <div className="text-neutral-500 pt-1"># 3. Open VS Code Settings and configure your key</div>
              <div className="text-[#C8F96D]">DevProfile: Api Key &rarr; [Paste generated key]</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.06]">
                <div className="font-semibold text-neutral-900 dark:text-white mb-2">Available Commands</div>
                <ul className="space-y-1.5 text-neutral-600 dark:text-neutral-400 text-xs">
                  <li>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">DevProfile: Start Problem</span> — Start DSA timer
                  </li>
                  <li>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">DevProfile: Mark Solved</span> — Log solve &amp; review status
                  </li>
                  <li>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">DevProfile: Pomodoro Start/Stop</span> — 25m focus block
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#F6F7F9] dark:bg-[#0A0A0C] border border-neutral-200 dark:border-white/[0.06]">
                <div className="font-semibold text-neutral-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#659B00] dark:text-[#C8F96D]" />
                  <span>Privacy Boundary</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  File contents and source code are never read or transmitted. Only workspace name, language identifier, and elapsed active minutes are recorded.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
