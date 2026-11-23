// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { APP_TABS, WORK_TABS, type TabName } from './appTabs';

// This app's page in the SPERT® Suite Help Center. Module-local: the link below is its only
// consumer. Deliberately not exported, so the tests compare the address as a literal and a
// wrong address here cannot satisfy them.
const HELP_CENTER_URL = 'https://spertsuite.com/help/ahp';

interface AppTabBarProps {
  /** The page currently shown. 'Changelog' (or any page no item leads to) marks nothing active. */
  activePage: string;
  /** Whether a decision model is open. The Manage item is shown only when one is. */
  modelOpen: boolean;
  onSelect: (page: TabName) => void;
}

function Tab({ page, activePage, onSelect }: { page: TabName; activePage: string; onSelect: (page: TabName) => void }) {
  // The active item is marked by `aria-current="page"` alone: the frame's stylesheet draws its underline and colour
  // from that attribute, at the same weight as every other item, so nothing moves when the selection changes. The
  // attribute is omitted, not "false", on every other item.
  return (
    <button
      type="button"
      onClick={() => onSelect(page)}
      className="sf-tab"
      aria-current={activePage === page ? 'page' : undefined}
    >
      {page}
    </button>
  );
}

/**
 * The frame's navigation row (FRAME26, contract §3): a full-width 44 px band under the brand row. Two zones:
 * the work items on the left (Decisions, the collection, first; then the open decision's views), and
 * Settings · About · Help Center ↗ on the right, always in that order. Compare and Results stay visible with no
 * decision open (they render a gated message); Manage appears only while one is open.
 */
export default function AppTabBar({ activePage, modelOpen, onSelect }: AppTabBarProps) {
  const workTabs = WORK_TABS.filter((tab) => tab !== 'Manage' || modelOpen);

  return (
    <nav className="sf-nav" data-sf="nav">
      <div className="sf-col sf-nav-row">
        <div className="sf-nav-work" data-sf="nav-work">
          {workTabs.map((tab) => (
            <Tab key={tab} page={tab} activePage={activePage} onSelect={onSelect} />
          ))}
        </div>
        <div className="sf-nav-app" data-sf="nav-app">
          {APP_TABS.map((tab) => (
            <Tab key={tab} page={tab} activePage={activePage} onSelect={onSelect} />
          ))}
          {/* Help Center: a LINK that leaves the app, never a tab. So it is not in APP_TABS, not a
              <button>, and never carries aria-current. It sits after About, at the row's right-hand
              end, as quiet 400-weight text (the frame's `.sf-help`), so it never reads as one more
              view of the app. The arrow is decoration, hidden from assistive technology; the
              visually hidden text gives the accessible name "Help Center (opens in a new tab)".
              ⚠️ The spaces are their own text nodes, outside the spans: with a space inside a
              span, the accessible-name computation trims it and gives
              "Help Center(opens in a new tab)" (measured in both pilots). */}
          <a href={HELP_CENTER_URL} target="_blank" rel="noopener noreferrer" className="sf-help">
            Help Center{' '}<span aria-hidden="true">↗</span>{' '}
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
