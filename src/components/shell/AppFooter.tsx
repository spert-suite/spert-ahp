// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { CHANGELOG } from './changelogData';

interface AppFooterProps {
  onNavigate?: (page: string) => void;
}

/**
 * The frame's footer (FRAME26, contract §3): a full-width 69 px band with a 1 px top rule and two centred lines,
 * flowing after `main`. Wording and destinations are unchanged. The links' colour is the frame's `--sf-link`
 * (`#155dfc` / `#51a2ff`: 5.25 and 6.73 : 1 on the page ground), never a utility here: before the frame they were
 * `text-blue-600` with no dark variant, 3.38 : 1 on the dark ground. `__tests__/AppFooter.colours.test.ts` holds it.
 */
export default function AppFooter({ onNavigate }: AppFooterProps) {
  return (
    <footer className="sf-footer" data-sf="footer">
      <div className="sf-col">
        <div>
          &copy; {new Date().getFullYear()} William W. Davis, MSPM, PMP |{" "}
          <button type="button" onClick={() => onNavigate?.('Changelog')} className="sf-link">
            Version {CHANGELOG[0]?.version ?? 'unknown'}
          </button>
          {" "}| Licensed under GNU GPL v3
        </div>
        <div>
          <a href="https://spertsuite.com" target="_blank" rel="noopener noreferrer">
            SPERT&reg; Suite
          </a>
          {" | "}
          <a href="https://spertsuite.com/TOS.pdf" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>
          {" | "}
          <a href="https://spertsuite.com/PRIVACY.pdf" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          {" | "}
          <a href="https://github.com/famousdavis/spert-ahp/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">
            License
          </a>
        </div>
      </div>
    </footer>
  );
}
