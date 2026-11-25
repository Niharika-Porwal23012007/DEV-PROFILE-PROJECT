import React from 'react';
import {
  LayoutGrid,
  TrendingUp,
  Sparkles,
  Brain,
  Share2,
  Terminal,
  Sliders
} from 'lucide-react';
import { GitHubLogo, LeetCodeLogo, VSCodeLogo } from './BrandIcons';
import { ConnectedSources } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  reviewCount?: number;
  connectedSources?: ConnectedSources | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  reviewCount = 0,
  connectedSources
}) => {
  const analyticsItems = [
    { id: 'dashboard', label: 'Activity Dashboard', icon: LayoutGrid },
    { id: 'insights', label: 'Skill Gaps & Diagnostics', icon: TrendingUp },
    { id: 'planner', label: 'Daily Action Agenda', icon: Sparkles },
    { id: 'reviews', label: 'Spaced Repetition', icon: Brain, count: reviewCount }
  ];

  const workspaceItems = [
    { id: 'drafts', label: 'LinkedIn Draft Station', icon: Share2 },
    { id: 'onboarding', label: 'Editor Extension Setup', icon: Terminal },
    { id: 'settings', label: 'Settings', icon: Sliders }
  ];

  const renderNavButton = (item: { id: string; label: string; icon: any; count?: number }) => {
    const Icon = item.icon;
    const isActive = currentTab === item.id;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setCurrentTab(item.id)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D24] ${
          isActive
            ? 'bg-[#FF4D24] text-white font-semibold'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-[#111114] dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.05]'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-neutral-400 dark:text-neutral-500'}`} />
          <span className="truncate">{item.label}</span>
        </span>

        {typeof item.count === 'number' && item.count > 0 && (
          <span
            className={`text-[11px] font-mono font-semibold tabular-nums px-1.5 py-0.5 rounded-md shrink-0 ${
              isActive
                ? 'bg-white/20 text-white'
                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
            }`}
          >
            {item.count} due
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-64 shrink-0 border-r border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#131316] px-3 py-5 hidden md:flex flex-col justify-between md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:overflow-y-auto transition-colors">
      <div className="space-y-6">
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wide">
            Analytics &amp; Planning
          </div>
          <nav aria-label="Analytics navigation" className="space-y-1">
            {analyticsItems.map(renderNavButton)}
          </nav>
        </div>

        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wide">
            Publish &amp; Configure
          </div>
          <nav aria-label="Workspace navigation" className="space-y-1">
            {workspaceItems.map(renderNavButton)}
          </nav>
        </div>
      </div>

      {/* Connected Sources Summary */}
      <div className="border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-3.5 bg-[#F6F7F9] dark:bg-[#0A0A0C] space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
          <span>Connected Sources</span>
          <span className="text-emerald-600 dark:text-[#C8F96D]">Active</span>
        </div>

        <div className="divide-y divide-neutral-200/80 dark:divide-white/[0.06] text-xs">
          <div className="py-1.5 flex items-center justify-between">
            <span className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 font-medium">
              <GitHubLogo className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </span>
            <span className={`text-[11px] font-medium ${connectedSources?.github?.connected ? 'text-emerald-600 dark:text-[#C8F96D]' : 'text-neutral-400'}`}>
              {connectedSources?.github?.connected ? 'Synced' : 'Unlinked'}
            </span>
          </div>

          <div className="py-1.5 flex items-center justify-between">
            <span className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 font-medium">
              <LeetCodeLogo className="w-3.5 h-3.5" />
              <span>LeetCode</span>
            </span>
            <span className={`text-[11px] font-medium ${connectedSources?.leetcode?.connected ? 'text-emerald-600 dark:text-[#C8F96D]' : 'text-neutral-400'}`}>
              {connectedSources?.leetcode?.connected ? 'Synced' : 'Unlinked'}
            </span>
          </div>

          <div className="pt-1.5 flex items-center justify-between">
            <span className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 font-medium">
              <VSCodeLogo className="w-3.5 h-3.5" />
              <span>VS Code</span>
            </span>
            <span className="text-[11px] font-medium text-[#FF4D24]">
              Ready
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
