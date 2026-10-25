// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, beforeEach } from 'vitest';
import { hasAcceptedCurrentTos, recordLocalAcceptance } from '../consent';

// The stored values are literals on purpose: each names a real edition. A user
// who accepted the October 5, 2026 editions must be asked again for the
// October 26, 2026 editions; one who accepted October 26 must not be.
describe('consent — local acceptance record', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('asks again when the stored acceptance is the October 5, 2026 edition', () => {
    localStorage.setItem('ahp/tos-accepted-version', '10-05-2026');
    expect(hasAcceptedCurrentTos()).toBe(false);
  });

  it('does not ask again when the stored acceptance is the October 26, 2026 edition', () => {
    localStorage.setItem('ahp/tos-accepted-version', '10-26-2026');
    expect(hasAcceptedCurrentTos()).toBe(true);
  });

  it('asks when nothing has been accepted on this device', () => {
    expect(hasAcceptedCurrentTos()).toBe(false);
  });

  it('records the current edition, which then counts as accepted', () => {
    recordLocalAcceptance();
    expect(hasAcceptedCurrentTos()).toBe(true);
  });
});
