// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AppFooter from '../components/shell/AppFooter';

describe('E2E: component smoke tests (JSX)', () => {
  it('footer links have correct URLs', () => {
    const { container } = render(<AppFooter />);
    const links = container.querySelectorAll('a');
    const hrefs = Array.from(links).map((a) => a.href);

    expect(hrefs).toContain('https://spertsuite.com/');
    expect(hrefs).toContain('https://spertsuite.com/TOS.pdf');
    expect(hrefs).toContain('https://spertsuite.com/PRIVACY.pdf');
    expect(hrefs).toContain('https://github.com/famousdavis/spert-ahp/blob/main/LICENSE');
    expect(hrefs).toHaveLength(4);
  });
});
