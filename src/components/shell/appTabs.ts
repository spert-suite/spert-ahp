// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

// The app's tab views, in bar order. Moved here unchanged from App.tsx (v0.18.50) when the
// tab bar became its own component, AppTabBar. It lives in a plain .ts module, not in
// AppTabBar.tsx, because exporting a constant from a component file trips
// react-refresh/only-export-components, which would move the lint ratchet in
// shipgate.config.json.
//
// The Help Center link is deliberately NOT here: it leaves the app, so it is never a tab.
export const TABS = ['Dashboard', 'Decision', 'Compare', 'Results', 'Manage', 'Settings'] as const;
export type TabName = typeof TABS[number];
