// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { TABS, type TabName } from './appTabs';

// This app's page in the SPERT® Suite Help Center. Module-local: the link below is its only
// consumer. Deliberately not exported, so the tests compare the address as a literal and a
// wrong address here cannot satisfy them.
const HELP_CENTER_URL = 'https://spertsuite.com/help/ahp';

interface AppTabBarProps {
  /** The page currently shown. 'Changelog' (or any non-bar page) highlights nothing. */
  activePage: string;
  /** Whether a decision model is open. The Manage tab is shown only when one is. */
  modelOpen: boolean;
  onSelect: (page: TabName | 'About') => void;
}

/**
 * The tab bar under the app header. Moved out of App.tsx unchanged at v0.18.50 so it can be
 * rendered and tested on its own; the Help Center link at its right-hand end is the only
 * addition.
 */
export default function AppTabBar({ activePage, modelOpen, onSelect }: AppTabBarProps) {
  // The Manage tab only appears when a model is loaded. Compare and Results
  // intentionally remain always-visible (they render gated messages internally).
  const visibleTabs = TABS.filter((tab) => tab !== 'Manage' || modelOpen);

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-5xl mx-auto flex px-6">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onSelect(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activePage === tab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            {tab}
          </button>
        ))}
        <button
          key="About"
          onClick={() => onSelect('About')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activePage === 'About'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
        >
          About
        </button>
        {/* Help Center: a LINK that leaves the app, never a tab. So it is not in TABS, not a
            <button>, and has none of the tabs' bottom-border styling. It sits after About, at
            the bar's right-hand end, as quiet text in the inactive tabs' greys, underlined on
            hover, so it never reads as one more view of the app. The arrow is decoration,
            hidden from assistive technology; the visually hidden text gives the accessible
            name "Help Center (opens in a new tab)". ⚠️ The spaces are their own text nodes,
            outside the spans: with a space inside a span, the accessible-name computation
            trims it and gives "Help Center(opens in a new tab)" (measured in both pilots). */}
        <a
          href={HELP_CENTER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto self-center whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:underline underline-offset-2"
        >
          Help Center{' '}<span aria-hidden="true">↗</span>{' '}
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </nav>
  );
}
