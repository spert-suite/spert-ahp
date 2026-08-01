// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageProvider, useStorage } from '../StorageContext';
import { useAuth } from '../AuthContext';
import type { AuthContextType } from '../AuthContext';

vi.mock('../AuthContext');
vi.mock('../../lib/firebase', () => ({ isFirebaseAvailable: true, db: null }));
vi.mock('../../storage/FirestoreAdapter');
vi.mock('../../storage/LocalStorageAdapter');
vi.mock('../../lib/signOutCleanupRegistry', () => ({
  registerSignOutCleanup: vi.fn(() => () => {}),
}));

const baseAuth: AuthContextType = {
  user: null,
  loading: false,
  firebaseAvailable: true,
  signInError: null,
  clearSignInError: () => {},
  signInWithMicrosoft: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
};

describe('StorageContext — cloudDataLoaded invariants', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(baseAuth);
    localStorage.clear();
  });

  it('cloudDataLoaded is true in local mode on initial render', () => {
    localStorage.setItem('ahp/storageMode', 'local');
    const { result } = renderHook(() => useStorage(), {
      wrapper: StorageProvider,
    });
    expect(result.current.cloudDataLoaded).toBe(true);
  });

  it('cloudDataLoaded is false in cloud mode before setCloudDataLoaded is called', () => {
    localStorage.setItem('ahp/storageMode', 'cloud');
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      user: { uid: 'user-1' } as ReturnType<typeof useAuth>['user'],
    });
    const { result } = renderHook(() => useStorage(), {
      wrapper: StorageProvider,
    });
    expect(result.current.cloudDataLoaded).toBe(false);
  });

  it('cloudDataLoaded resets to false and adapter swaps in the same render commit on local→cloud transition', () => {
    // Verifies the atomicity claim in StorageContextType JSDoc: cloudDataLoaded
    // and adapter change in the same commit on local→cloud transition.
    localStorage.setItem('ahp/storageMode', 'local');
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      user: { uid: 'user-1' } as ReturnType<typeof useAuth>['user'],
    });
    const { result } = renderHook(() => useStorage(), {
      wrapper: StorageProvider,
    });
    expect(result.current.cloudDataLoaded).toBe(true);
    const localAdapter = result.current.adapter;

    act(() => {
      result.current.switchMode('cloud');
    });

    expect(result.current.cloudDataLoaded).toBe(false);
    expect(result.current.adapter).not.toBe(localAdapter);
  });

  it('setCloudDataLoaded(true) propagates through useStorage()', () => {
    localStorage.setItem('ahp/storageMode', 'cloud');
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      user: { uid: 'user-1' } as ReturnType<typeof useAuth>['user'],
    });
    const { result } = renderHook(() => useStorage(), {
      wrapper: StorageProvider,
    });
    expect(result.current.cloudDataLoaded).toBe(false);

    act(() => {
      result.current.setCloudDataLoaded(true);
    });
    // setCloudDataLoaded is a synchronous useState setter — no waitFor needed.
    expect(result.current.cloudDataLoaded).toBe(true);
  });
});
