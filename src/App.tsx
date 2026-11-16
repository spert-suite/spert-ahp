// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useEffect, useRef, useState } from 'react';
import AppHeader from './components/shell/AppHeader';
import AppFooter from './components/shell/AppFooter';
import AboutPage from './components/shell/AboutPage';
import ChangelogPage from './components/shell/ChangelogPage';
import DashboardPanel from './components/setup/DashboardPanel';
import DecisionPanel from './components/setup/DecisionPanel';
import ComparisonPanel from './components/comparison/ComparisonPanel';
import ResultsPanel from './components/results/ResultsPanel';
import ManagePanel from './components/settings/ManagePanel';
import GlobalSettingsPanel from './components/settings/GlobalSettingsPanel';
import InvitationBanner from './components/shell/InvitationBanner';
import CloudLoadNotice from './components/shell/CloudLoadNotice';
import FirstRunBanner from './components/shell/FirstRunBanner';
import LocalStorageCaution from './components/shell/LocalStorageCaution';
import ContentErrorBoundary from './components/shell/ContentErrorBoundary';
import AppTabBar from './components/shell/AppTabBar';
import { TABS, type TabName } from './components/shell/appTabs';
import { useUserId } from './hooks/useUserId';
import { useAHP } from './hooks/useAHP';
import { useTheme } from './hooks/useTheme';
import { useStorage } from './contexts/StorageContext';
import { registerSignOutCleanup } from './lib/signOutCleanupRegistry';

type Page = TabName | 'About' | 'Changelog';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('Dashboard');
  const userId = useUserId();
  const ahpState = useAHP(userId);
  const { mode } = useStorage();
  useTheme(); // Initialize theme on mount

  // Register the in-memory state reset with the centralized sign-out registry.
  // The ref indirection keeps the registered callback stable while still
  // dispatching through the latest closeModel identity.
  const closeModelRef = useRef(ahpState.closeModel);
  useEffect(() => {
    closeModelRef.current = ahpState.closeModel;
  }, [ahpState.closeModel]);
  useEffect(() => {
    const deregister = registerSignOutCleanup(() => closeModelRef.current());
    return deregister;
  }, []);

  // C4: on cloud→local mode transition, close any open cloud model so the
  // UI doesn't dead-end with a stale modelId that the LocalStorageAdapter
  // can't serve. Depends on `mode` (the transition trigger) and
  // `ahpState.closeModel` (memoized with empty deps in useAHP, so stable).
  useEffect(() => {
    if (mode === 'local' && ahpState.modelId) {
      ahpState.closeModel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ahpState.closeModel]);

  // Fall back to Dashboard when an open decision closes from under the
  // user (delete, sign-out, cloud→local mode flip) while they're on a
  // model-scoped tab. Forward navigation to Decision after open/load is
  // driven explicitly by DashboardPanel via onDecisionOpened so that
  // re-clicking the already-loaded card still navigates — relying on a
  // null→truthy transition would silently no-op in that case.
  const prevModelIdRef = useRef<string | null | undefined>(ahpState.modelId);
  useEffect(() => {
    const prev = prevModelIdRef.current;
    if (prev && !ahpState.modelId && (activePage === 'Manage' || activePage === 'Decision')) {
      setActivePage('Dashboard');
    }
    prevModelIdRef.current = ahpState.modelId;
  }, [ahpState.modelId, activePage]);

  const isTab = (TABS as readonly string[]).includes(activePage);

  const handleNavigateHome = () => {
    ahpState.closeModel();
    setActivePage('Dashboard');
  };

  const renderContent = () => {
    switch (activePage) {
      case 'Dashboard':
        return <DashboardPanel ahpState={ahpState} userId={userId} onDecisionOpened={() => setActivePage('Decision')} />;
      case 'Decision':
        return ahpState.modelId
          ? <DecisionPanel ahpState={ahpState} />
          : (
            <div className="space-y-4 max-w-md">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No decision open</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Create a new decision or load an existing one from the Dashboard.
              </p>
              <button
                onClick={() => setActivePage('Dashboard')}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
            </div>
          );
      case 'Compare':
        return <ComparisonPanel ahpState={ahpState} userId={userId} />;
      case 'Results':
        return <ResultsPanel ahpState={ahpState} userId={userId} />;
      case 'Manage':
        return <ManagePanel ahpState={ahpState} />;
      case 'Settings':
        return <GlobalSettingsPanel />;
      case 'About':
        return <AboutPage onNavigate={(p) => setActivePage(p as Page)} />;
      case 'Changelog':
        return <ChangelogPage />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <AppHeader
        onOpenSettings={() => setActivePage('Settings')}
        onNavigateHome={handleNavigateHome}
      />

      <AppTabBar
        activePage={activePage}
        modelOpen={!!ahpState.modelId}
        onSelect={setActivePage}
      />

      <main className="flex-1 p-6">
        <div className={isTab ? 'max-w-4xl mx-auto' : ''}>
          {/* App-wide notices, in suite order: invitation, terms, caution.
              Other app-wide banners (CloudLoadNotice) follow the group. */}
          <InvitationBanner />
          <FirstRunBanner />
          <LocalStorageCaution />
          {ahpState.modelId && <CloudLoadNotice modelId={ahpState.modelId} title={ahpState.model?.title ?? ''} />}
          <ContentErrorBoundary resetKey={`${activePage}:${ahpState.modelId ?? ''}`} onBackToDashboard={handleNavigateHome}>
            {renderContent()}
          </ContentErrorBoundary>
        </div>
      </main>

      <AppFooter onNavigate={(p) => setActivePage(p as Page)} />
    </div>
  );
}
