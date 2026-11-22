// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { HeaderThemeToggle } from './ThemeToggle';
import AuthChip from './AuthChip';

/**
 * The header title's colour (HDR26, v0.18.51): AHP's favicon amber, `#f59e0b`, as a gradient from its light end on
 * the left to its dark end on the right, drawn once on each word ("SPERT", "AHP"). The ® between them keeps its own
 * colour. Each theme's ramp is checked at every point against the header behind it, at 3 : 1, because the title is
 * 20 px bold at every width, which is large text: light `#cd8515` → `#845200` on white, weakest 3.01; dark
 * `#ffc785` → `#ce8400` on `gray-800` (`#1e2939`), weakest 4.83. The light ramp clears the bar by a hundredth on
 * purpose; a change to either end, or to the header's background, needs a new measurement
 * (`__tests__/AppHeader.title-gradient.test.ts`). For the same reason the button below has no hover fade: at 80 %
 * opacity the light title would fall to about 2.4 : 1.
 *
 * Two fallbacks draw the title as solid text instead, in the `<h1>`'s own colours: under `prefers-contrast: more`,
 * near-black in light mode and near-white in dark mode; and in print, near-black. In the compiled CSS each fallback
 * comes after the class it overrides, at the same specificity, so it wins, and print comes after the increased-
 * contrast colours, so a dark-mode print is never near-white.
 *
 * ONE literal string, never assembled: Tailwind writes CSS only for class names it finds whole in the source, and
 * with `text-transparent` and no gradient the title is invisible. The space before "AHP" sits OUTSIDE the gradient
 * spans, as text of the `<h1>`: inside a span, jsdom's accessible-name computation trims it.
 */
const TITLE_GRADIENT =
  'bg-gradient-to-r from-[#cd8515] to-[#845200] dark:from-[#ffc785] dark:to-[#ce8400] bg-clip-text text-transparent print:bg-none print:text-gray-900 contrast-more:bg-none contrast-more:text-gray-900 dark:contrast-more:text-gray-100';

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
          className="flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
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
            <span className={TITLE_GRADIENT}>SPERT</span><span className="text-gray-300 dark:text-gray-500 text-xs align-super">®</span>{' '}<span className={TITLE_GRADIENT}>AHP</span>
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
