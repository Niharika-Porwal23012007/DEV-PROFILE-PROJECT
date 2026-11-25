import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  ExternalLink,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  ChevronDown
} from 'lucide-react';
import { api } from '../api/client';
import { UserProfile, ConnectedSources } from '../types';
import { formatSyncTimestamp } from '../utils/dashboardMetrics';

interface NavbarProps {
  user: UserProfile | null;
  connectedSources?: ConnectedSources | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLogout: () => void;
  onSyncComplete?: () => void;
  onSwitchProfile?: (profile: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  connectedSources,
  theme,
  onToggleTheme,
  onLogout,
  onSyncComplete,
  onSwitchProfile
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    api.getProfiles().then(res => setProfiles(res.profiles || [])).catch(() => {});
  }, [user]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncError(null);
      setSyncMessage(null);
      const res = await api.syncNow();

      const ghStatus = res.results?.github?.success ? 'GitHub' : '';
      const lcStatus = res.results?.leetcode?.syncStatus === 'success' ? 'LeetCode' : '';
      const summary = [ghStatus, lcStatus].filter(Boolean).join(' & ');

      setSyncMessage(summary ? `Synced ${summary}` : 'Sync complete');
      if (onSyncComplete) onSyncComplete();
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      setSyncError(err.message || 'Sync cooldown active');
      setTimeout(() => setSyncError(null), 4500);
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectProfile = async (p: any) => {
    setShowProfileMenu(false);
    try {
      const res = await api.registerOrLogin({
        email: p.email,
        githubUsername: p.github_username,
        leetcodeUsername: p.leetcode_username
      });
      localStorage.setItem('devprofile_token', res.token);
      if (onSwitchProfile) onSwitchProfile(res.user);
    } catch (e) {
      console.error(e);
    }
  };

  const latestSyncIso =
    connectedSources?.github?.lastSynced || connectedSources?.leetcode?.lastSynced || null;

  return (
    <header className="h-14 border-b border-neutral-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#131316]/95 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 transition-colors">
      {/* Brand Zone */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[#FF4D24] flex items-center justify-center font-mono font-bold text-white text-xs tracking-tight">
          DP
        </div>
        <span className="font-display font-bold text-base tracking-tight text-[#111114] dark:text-white whitespace-nowrap">
          DevProfile
        </span>
      </div>

      {/* Action Zone */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {syncMessage && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-xl font-medium whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{syncMessage}</span>
          </div>
        )}

        {syncError && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-xl font-medium whitespace-nowrap">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{syncError}</span>
          </div>
        )}

        {!syncMessage && !syncError && (
          <span className="hidden lg:inline text-xs text-neutral-500 dark:text-neutral-400 tabular-nums mr-1 whitespace-nowrap">
            {formatSyncTimestamp(latestSyncIso)}
          </span>
        )}

        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-[#1B1B20] hover:bg-neutral-50 dark:hover:bg-white/[0.08] text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-white/[0.08] transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D24]"
          title="Sync latest GitHub commits and LeetCode solves"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#FF4D24] ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing' : 'Sync'}</span>
        </button>

        {user && (
          <a
            href={`/portfolio/${user.publicSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-[#1B1B20] hover:bg-neutral-50 dark:hover:bg-white/[0.08] text-[#111114] dark:text-white border border-neutral-200 dark:border-white/[0.08] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D24]"
          >
            <span>Public Portfolio</span>
            <ExternalLink className="w-3 h-3 text-[#FF4D24]" />
          </a>
        )}

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.08] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D24]"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-neutral-700" />
          )}
        </button>

        {user && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-expanded={showProfileMenu}
              aria-label="Account menu"
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D24]"
            >
              <div className="w-6 h-6 rounded-lg bg-[#FF4D24] flex items-center justify-center font-bold text-xs text-white uppercase">
                {user.name.charAt(0)}
              </div>
              <span className="hidden md:inline text-xs font-semibold text-[#111114] dark:text-white max-w-[140px] truncate">
                {user.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#131316] border border-neutral-200 dark:border-white/[0.1] rounded-2xl shadow-xl p-2 z-50">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 border-b border-neutral-100 dark:border-white/[0.06]">
                  Switch Developer Profile
                </div>
                <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProfile(p)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                        p.id === user.id
                          ? 'bg-[#FFF1ED] dark:bg-[#FF4D24]/15 text-[#FF4D24] font-semibold'
                          : 'hover:bg-neutral-100 dark:hover:bg-white/[0.05] text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-semibold truncate">{p.name}</div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono truncate">
                          @{p.github_username || p.leetcode_username || 'dev'}
                        </div>
                      </div>
                      {p.id === user.id && (
                        <span className="text-[11px] font-semibold text-[#FF4D24]">Active</span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="pt-1.5 border-t border-neutral-100 dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out or switch ID</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
