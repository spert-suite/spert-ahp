// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

// The app's pages that the navigation row leads to, in row order (FRAME26, v0.19.0). It lives in a plain .ts
// module, not in AppTabBar.tsx, because exporting a constant from a component file trips
// react-refresh/only-export-components, which would move the lint ratchet in shipgate.config.json.
//
// Two zones (contract §3, "Navigation zones"):
// - WORK_TABS, on the left: the collection first ("Decisions", named by its noun), then the open decision's views.
//   Manage shows only while a decision is open.
// - APP_TABS, on the right: Settings · About, always in that order, then the Help Center link.
//
// The Help Center link is deliberately NOT here: it leaves the app, so it is never a tab.
export const WORK_TABS = ['Decisions', 'Decision', 'Compare', 'Results', 'Manage'] as const;
export const APP_TABS = ['Settings', 'About'] as const;
export type TabName = (typeof WORK_TABS)[number] | (typeof APP_TABS)[number];
