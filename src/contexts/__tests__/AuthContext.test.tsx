// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import type { User } from 'firebase/auth';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const { mockOnAuthStateChanged, mockSignOut, mockPerformSignOut } = vi.hoisted(() => ({
  mockOnAuthStateChanged: vi.fn(),
  mockSignOut: vi.fn().mockResolvedValue(undefined),
  mockPerformSignOut: vi.fn().mockResolvedValue(undefined),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: mockOnAuthStateChanged,
  signOut: mockSignOut,
  signInWithPopup: vi.fn(),
  OAuthProvider: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock('../../lib/firebase', () => ({
  auth: { __mock: true },
  db: null,
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

vi.mock('../../lib/consent', () => ({
  TOS_VERSION: '04-05-2026',
  APP_ID: 'spert-ahp',
  TOS_URL: '',
  PRIVACY_URL: '',
  hasAcceptedCurrentTos: vi.fn(() => true),
  recordLocalAcceptance: vi.fn(),
  setWritePending: vi.fn(),
  clearWritePending: vi.fn(),
  consumeWritePending: vi.fn(() => false),
  peekWritePending: vi.fn(() => false),
  clearLocalConsent: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({ tosVersion: '04-05-2026' }),
  })),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => ({ __type: 'serverTimestamp' })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
type AuthCallback = (user: User | null) => Promise<void>;
let capturedCallback: AuthCallback | null = null;

function setupOnAuthStateChanged() {
  capturedCallback = null;
  mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: AuthCallback) => {
    capturedCallback = cb;
    return () => {};
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('AuthContext — path 3 sign-out', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Restore default mock implementation cleared by vi.clearAllMocks()
    mockPerformSignOut.mockResolvedValue(undefined);
    setupOnAuthStateChanged();
  });

  it('E1: invokes performSignOutWithCleanup on externally-revoked session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(capturedCallback).not.toBeNull();

    await act(async () => {
      await capturedCallback!(null);
    });

    expect(mockPerformSignOut).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('E1: setUser(null) and setLoading(false) run even if cleanup throws', async () => {
    // Override for this test only; restored by vi.clearAllMocks() in next beforeEach
    mockPerformSignOut.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await capturedCallback!(null);
    });

    // Despite the throw, state must be cleared
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
