// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { HeaderThemeToggle } from './ThemeToggle';
import AuthChip from './AuthChip';

interface AppHeaderProps {
  onOpenSettings: () => void;
  onNavigateHome: () => void;
}

export default function AppHeader({ onOpenSettings, onNavigateHome }: AppHeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={onNavigateHome}
          aria-label="Return to Decisions"
          className="flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
        >
          <img
            src="/spert-favicon-ahp.png"
            alt=""
            className="mr-2 h-7 w-7 rounded-lg ring-1 ring-white/20 block dark:hidden"
          />
          <img
            src="/spert-favicon-ahp-dark.png"
            alt=""
            className="mr-2 h-7 w-7 rounded-lg ring-1 ring-white/20 hidden dark:block"
          />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            SPERT<span className="text-gray-300 dark:text-gray-500 text-xs align-super">®</span> AHP
          </h1>
        </button>
        <div className="flex items-center gap-2">
          <HeaderThemeToggle />
          <AuthChip onOpenSettings={onOpenSettings} />
        </div>
      </div>
    </header>
  );
}
