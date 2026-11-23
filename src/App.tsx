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
import HeadingRow from './components/shell/HeadingRow';
import { type TabName } from './components/shell/appTabs';
import { useUserId } from './hooks/useUserId';
import { useAHP } from './hooks/useAHP';
import { useTheme } from './hooks/useTheme';
import { useStorage } from './contexts/StorageContext';
import { registerSignOutCleanup } from './lib/signOutCleanupRegistry';

type Page = TabName | 'Changelog';

/** The pages that show the open decision. Their heading row is App's: the decision's name (contract §7). */
const DECISION_PAGES: readonly Page[] = ['Decision', 'Compare', 'Results', 'Manage'];

/** The `h1` on a decision page: the decision's title, else "Untitled decision" (the tiles' wording), else none open. */
function decisionHeading(modelId: string | null | undefined, title: string | undefined): string {
  if (!modelId) return 'No decision open';
  return title?.trim() || 'Untitled decision';
}

export default function App() {
  const [activePage, setActivePage] = useState<Page>('Decisions');
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

  // Fall back to Decisions when an open decision closes from under the
  // user (delete, sign-out, cloud→local mode flip) while they're on a
  // model-scoped tab. Forward navigation to Decision after open/load is
  // driven explicitly by DashboardPanel via onDecisionOpened so that
  // re-clicking the already-loaded card still navigates — relying on a
  // null→truthy transition would silently no-op in that case.
  const prevModelIdRef = useRef<string | null | undefined>(ahpState.modelId);
  useEffect(() => {
    const prev = prevModelIdRef.current;
    if (prev && !ahpState.modelId && (activePage === 'Manage' || activePage === 'Decision')) {
      setActivePage('Decisions');
    }
    prevModelIdRef.current = ahpState.modelId;
  }, [ahpState.modelId, activePage]);

  const handleNavigateHome = () => {
    ahpState.closeModel();
    setActivePage('Decisions');
  };

  const renderContent = () => {
    switch (activePage) {
      case 'Decisions':
        return <DashboardPanel ahpState={ahpState} userId={userId} onDecisionOpened={() => setActivePage('Decision')} />;
      case 'Decision':
        return ahpState.modelId
          ? <DecisionPanel ahpState={ahpState} />
          : (
            <div className="space-y-4 max-w-md">
              {/* "No decision open" is this page's h1, in App's heading row above. */}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Create a new decision or load an existing one from Decisions.
              </p>
              <button
                onClick={() => setActivePage('Decisions')}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Go to Decisions
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

  // The frame (FRAME26, contract §3): skip link, brand row, navigation row, notices slot, then `main` and the footer,
  // all in the one 1600 px column. Every screen but the Decisions collection is capped at 896 px (exception X4: forms,
  // ratings and prose), with its heading row kept full width.
  const heading = DECISION_PAGES.includes(activePage) ? decisionHeading(ahpState.modelId, ahpState.model?.title) : null;
  const content = (
    <ContentErrorBoundary resetKey={`${activePage}:${ahpState.modelId ?? ''}`} onBackToDashboard={handleNavigateHome}>
      {renderContent()}
    </ContentErrorBoundary>
  );

  return (
    <div className="sf-app" data-sf="app">
      <a href="#main" className="sf-skip" data-sf="skip">Skip to main content</a>

      <AppHeader
        onOpenSettings={() => setActivePage('Settings')}
        onNavigateHome={handleNavigateHome}
      />

      <AppTabBar
        activePage={activePage}
        modelOpen={!!ahpState.modelId}
        onSelect={setActivePage}
      />

      {/* App-wide notices, in suite order: invitation, terms, caution. Other app-wide banners (CloudLoadNotice)
          follow the group. An empty slot takes no space. */}
      <div className="sf-col sf-notices" data-sf="notices">
        <InvitationBanner />
        <FirstRunBanner />
        <LocalStorageCaution />
        {ahpState.modelId && <CloudLoadNotice modelId={ahpState.modelId} title={ahpState.model?.title ?? ''} />}
      </div>

      <main id="main" className={activePage === 'Decisions' ? 'sf-col sf-main' : 'sf-col sf-main sf-main--capped'} data-sf="main">
        {heading === null ? content : (
          // A decision page's heading row is App's, and sits outside the error boundary, so a view that fails keeps
          // its h1. Its body starts 16 px under the row, as on every other screen.
          <>
            <HeadingRow title={heading}>{heading}</HeadingRow>
            <div className="sf-below">{content}</div>
          </>
        )}
      </main>

      <AppFooter onNavigate={(p) => setActivePage(p as Page)} />
    </div>
  );
}
