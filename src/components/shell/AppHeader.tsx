// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import type { MouseEvent } from 'react';
import { HeaderThemeToggle } from './ThemeToggle';
import AuthChip from './AuthChip';

/*
 * The frame's brand row (FRAME26, contract §3): a 56 px band on the page ground, in the shared 1600 px column.
 *
 * The brand is ONE LINK to the collection screen. AHP has no routes, and its root URL is the Decisions screen: a fresh
 * load never reopens a decision. So the link points at "/" and, on a plain click, handles the navigation itself
 * (close the open decision, show Decisions). A modified or middle click is left to the browser, which opens Decisions
 * in a new tab. It has no aria-label: its accessible name is its visible title, "SPERT® AHP" (WCAG 2.5.3, label in
 * name; contract §3, "Brand link").
 *
 * The title is NOT a heading. The page's one `h1` is the heading row's, in `main` (contract §2).
 *
 * The title's colour (HDR26, v0.18.51; moved onto the frame at v0.19.0): AHP's favicon amber, `#f59e0b`, as a gradient
 * from its light end on the left to its dark end on the right, drawn once on each word ("SPERT", "AHP") with the frame's
 * `.sf-grad`. The ramps are `--app-grad-light` and `--app-grad-dark`, set once on `:root` in `src/index.css`. The ®
 * between the words is the frame's muted `.sf-mark`. Each ramp is checked at every point against the page ground, at
 * 3 : 1, because the title is 24 px bold, which is large text: light `#cd8515` → `#845200` on `#ffffff`, weakest
 * 3.01; dark `#ffc785` → `#ce8400` on `#101828`, weakest 5.85. The light ramp clears the bar by a hundredth on
 * purpose; a change to either end, or to the ground, needs a new measurement
 * (`__tests__/AppHeader.title-gradient.test.ts`). For the same reason the brand has no hover fade: at 80 % opacity
 * the light title would fall to about 2.4 : 1.
 *
 * The fallbacks are the frame's, not this file's: under `prefers-contrast: more` the title is solid in the frame's
 * heading colour (`#333333` / `#e2e8f0`), and in print it is solid black (`spert-frame.css`, `.sf-grad`).
 *
 * The space before "AHP" sits OUTSIDE the gradient spans, as text of the title: inside a span, jsdom's
 * accessible-name computation trims it.
 */

interface AppHeaderProps {
  onOpenSettings: () => void;
  onNavigateHome: () => void;
}

export default function AppHeader({ onOpenSettings, onNavigateHome }: AppHeaderProps) {
  const handleBrandClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onNavigateHome();
  };

  return (
    <header className="sf-bar">
      <div className="sf-col sf-bar-row">
        <a href="/" onClick={handleBrandClick} className="sf-brand" data-sf="brand">
          <img
            src="/spert-favicon-ahp.png"
            alt=""
            className="sf-icon sf-icon--light ring-1 ring-white/20"
            data-sf="favicon"
          />
          <img
            src="/spert-favicon-ahp-dark.png"
            alt=""
            className="sf-icon sf-icon--dark ring-1 ring-white/20"
            data-sf="favicon"
          />
          <span className="sf-title" data-sf="title">
            <span className="sf-grad">SPERT</span><span className="sf-mark">®</span>{' '}<span className="sf-grad">AHP</span>
          </span>
        </a>
        <p className="sf-tagline" data-sf="tagline">Decision-making with the Analytic Hierarchy Process</p>
        <div className="sf-utils" data-sf="utils">
          <HeaderThemeToggle />
          <AuthChip onOpenSettings={onOpenSettings} />
        </div>
      </div>
    </header>
  );
}
