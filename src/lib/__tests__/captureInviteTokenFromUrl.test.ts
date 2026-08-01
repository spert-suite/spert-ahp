// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  captureInviteTokenFromUrl,
  INVITE_SESSION_KEY,
} from '../captureInviteTokenFromUrl';

function setUrl(url: string) {
  window.history.replaceState({}, '', url);
}

describe('captureInviteTokenFromUrl', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setUrl('/');
  });

  it('captures the ?invite= param, persists it to sessionStorage, and strips the URL', () => {
    setUrl('/?invite=tok123');
    const result = captureInviteTokenFromUrl(true);
    expect(result).toBe('tok123');
    expect(sessionStorage.getItem(INVITE_SESSION_KEY)).toBe('tok123');
    // Query string should be stripped so a reload doesn't replay the banner.
    expect(window.location.search).toBe('');
  });

  it('returns null and writes nothing when enabled=false', () => {
    setUrl('/?invite=tok123');
    const result = captureInviteTokenFromUrl(false);
    expect(result).toBeNull();
    expect(sessionStorage.getItem(INVITE_SESSION_KEY)).toBeNull();
    // URL is NOT stripped when disabled — the function is a no-op.
    expect(window.location.search).toBe('?invite=tok123');
  });

  it('returns null when no ?invite= param is present', () => {
    setUrl('/some-page');
    const result = captureInviteTokenFromUrl(true);
    expect(result).toBeNull();
    expect(sessionStorage.getItem(INVITE_SESSION_KEY)).toBeNull();
  });

  it('is idempotent — second call returns null because the URL is already stripped', () => {
    setUrl('/?invite=tok123');
    expect(captureInviteTokenFromUrl(true)).toBe('tok123');
    expect(captureInviteTokenFromUrl(true)).toBeNull();
  });

  it('preserves URL fragment when stripping the invite param', () => {
    setUrl('/dashboard?invite=tok123#voting');
    captureInviteTokenFromUrl(true);
    expect(window.location.pathname).toBe('/dashboard');
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('#voting');
  });

  it('preserves other query params when stripping invite', () => {
    setUrl('/?invite=tok123&utm_source=email&ref=ahp');
    captureInviteTokenFromUrl(true);
    // Order-independent check — preserve the other two.
    const params = new URLSearchParams(window.location.search);
    expect(params.get('invite')).toBeNull();
    expect(params.get('utm_source')).toBe('email');
    expect(params.get('ref')).toBe('ahp');
  });
});
