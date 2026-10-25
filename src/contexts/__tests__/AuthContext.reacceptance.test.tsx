// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import type { User } from 'firebase/auth';

// Re-acceptance when the Terms / Privacy Policy edition changes. Unlike
// AuthContext.test.tsx, this file does NOT mock ../../lib/consent: the real
// TOS_VERSION is what decides. The stored editions are literals on purpose —
// '10-05-2026' is the edition users accepted before October 26, 2026.

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const { mockOnAuthStateChanged, mockSignInWithPopup, mockPerformSignOut, stored } = vi.hoisted(
  () => ({
    mockOnAuthStateChanged: vi.fn(),
    mockSignInWithPopup: vi.fn().mockResolvedValue(undefined),
    mockPerformSignOut: vi.fn().mockResolvedValue(undefined),
    stored: { tosVersion: '' },
  }),
);

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: mockOnAuthStateChanged,
  signInWithPopup: mockSignInWithPopup,
  OAuthProvider: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock('../../lib/firebase', () => ({
  auth: { __mock: true },
  db: { __mock: true },
  functions: null,
  isFirebaseAvailable: true,
}));

vi.mock('../../lib/performSignOutWithCleanup', () => ({
  performSignOutWithCleanup: mockPerformSignOut,
}));

vi.mock('../../lib/callables', () => ({
  callClaimPendingInvitations: vi.fn(() => Promise.resolve({ claimed: [] })),
}));

vi.mock('../../lib/profileWrites', () => ({
  writeSpertahpProfile: vi.fn(),
  writeSpertsuiteProfile: vi.fn(),
}));

vi.mock('../../lib/featureFlags', () => ({ INVITATIONS_ENABLED: false }));

// The users/{uid} consent record holds whatever `stored.tosVersion` says.
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(() =>
    Promise.resolve({
      exists: () => true,
      data: () => ({ tosVersion: stored.tosVersion }),
    }),
  ),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => ({ __type: 'serverTimestamp' })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
type AuthCallback = (user: User | null) => Promise<void>;
let capturedCallback: AuthCallback | null = null;

const returningUser = {
  uid: 'user-1',
  emailVerified: true,
  providerData: [{ providerId: 'google.com' }],
} as unknown as User;

const LS_ACCEPTED = 'ahp/tos-accepted-version';

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('AuthContext — re-acceptance of a new Terms / Privacy edition', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockSignInWithPopup.mockResolvedValue(undefined);
    mockPerformSignOut.mockResolvedValue(undefined);
    capturedCallback = null;
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: AuthCallback) => {
      capturedCallback = cb;
      return () => {};
    });
  });

  it('signs out a returning user whose recorded acceptance is the October 5, 2026 edition', async () => {
    localStorage.setItem(LS_ACCEPTED, '10-05-2026');
    stored.tosVersion = '10-05-2026';
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await capturedCallback!(returningUser);
    });

    expect(mockPerformSignOut).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
  });

  it('keeps a returning user whose recorded acceptance is the October 26, 2026 edition', async () => {
    stored.tosVersion = '10-26-2026';
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await capturedCallback!(returningUser);
    });

    expect(mockPerformSignOut).not.toHaveBeenCalled();
    expect(result.current.user).toBe(returningUser);
  });

  it('shows the consent dialog before sign-in when this device accepted the October 5 edition', async () => {
    localStorage.setItem(LS_ACCEPTED, '10-05-2026');
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(mockSignInWithPopup).not.toHaveBeenCalled();
  });

  it('goes straight to sign-in when this device accepted the October 26 edition', async () => {
    localStorage.setItem(LS_ACCEPTED, '10-26-2026');
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
  });
});
