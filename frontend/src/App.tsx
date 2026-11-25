import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { InsightsPage } from './pages/InsightsPage';
import { PlannerPage } from './pages/PlannerPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { DraftsPage } from './pages/DraftsPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './api/client';
import { UserProfile, ConnectedSources } from './types';

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sources, setSources] = useState<ConnectedSources | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncVersion, setSyncVersion] = useState<number>(0);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('devprofile_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('devprofile_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const path = window.location.pathname;
  if (path.startsWith('/portfolio/')) {
    const slug = path.replace('/portfolio/', '').split('/')[0];
    return <PortfolioPage publicSlug={slug} />;
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('devprofile_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadUserProfile = async (silent = false) => {
    const token = localStorage.getItem('devprofile_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      const res = await api.getMe();
      setUser(res.user);
      setSources(res.connectedSources);

      const rev = await api.getTodayReviews();
      setReviewCount((rev.dueToday || []).length);
    } catch (err) {
      console.warn('Session expired or invalid:', err);
      localStorage.removeItem('devprofile_token');
      setUser(null);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('devprofile_token');
    setUser(null);
    setSources(null);
  };

  const handleLoginSuccess = () => {
    loadUserProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0A0A0C] text-neutral-700 dark:text-neutral-200 flex items-center justify-center text-sm font-medium">
        <div className="animate-spin mr-3 w-4 h-4 border-2 border-[#FF4D24] border-t-transparent rounded-full" />
        <span>Loading your workspace...</span>
      </div>
    );
  }

  if (!user || !sources) {
    return (
      <LandingPage
        theme={theme}
        onToggleTheme={toggleTheme}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0A0A0C] text-[#111114] dark:text-[#F5F5F7] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <Navbar
        user={user}
        connectedSources={sources}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        onSyncComplete={() => {
          setSyncVersion(v => v + 1);
          loadUserProfile(true);
        }}
        onSwitchProfile={() => loadUserProfile(false)}
      />

      <div className="flex flex-1 min-w-0">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          reviewCount={reviewCount}
          connectedSources={sources}
        />

        <div className="flex-1 flex flex-col min-w-0 app-ambient-canvas">
          {/* Mobile Navigation Bar */}
          <nav
            aria-label="Mobile sections"
            className="md:hidden border-b border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#131316] px-4 py-2 flex items-center gap-1.5 overflow-x-auto"
          >
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'insights', label: 'Diagnostics' },
              { id: 'planner', label: "Today's Plan" },
              { id: 'reviews', label: reviewCount > 0 ? `Reviews (${reviewCount})` : 'Reviews' },
              { id: 'drafts', label: 'Drafts' },
              { id: 'onboarding', label: 'Extension' },
              { id: 'settings', label: 'Settings' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCurrentTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  currentTab === tab.id
                    ? 'bg-[#FF4D24] text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/[0.06]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1240px] mx-auto w-full">
            {currentTab === 'dashboard' && (
              <DashboardPage
                onNavigateTab={setCurrentTab}
                refreshKey={syncVersion}
                user={user}
                connectedSources={sources}
              />
            )}
            {currentTab === 'insights' && <InsightsPage />}
            {currentTab === 'planner' && <PlannerPage />}
            {currentTab === 'reviews' && <ReviewsPage onReviewUpdated={loadUserProfile} />}
            {currentTab === 'drafts' && <DraftsPage />}
            {currentTab === 'onboarding' && <OnboardingPage />}
            {currentTab === 'settings' && (
              <SettingsPage
                user={user}
                connectedSources={sources}
                onUserUpdated={loadUserProfile}
                onLogout={handleLogout}
                theme={theme}
                onSetTheme={setTheme}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
