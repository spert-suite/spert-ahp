// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { type ReactNode } from 'react';
import { LocalStorageAdapter } from '../storage/LocalStorageAdapter';
import { StorageContext } from '../contexts/StorageContext';
import { AuthContext } from '../contexts/AuthContext';
import type { StorageAdapter } from '../types/ahp';

/**
 * Test wrapper providing a local-mode LocalStorageAdapter via StorageContext
 * and a signed-out AuthContext. Use with renderHook's `wrapper` option.
 */
export function TestProviders({ children }: { children: ReactNode }) {
  const adapter = new LocalStorageAdapter();
  return <TestProvidersWithAdapter adapter={adapter}>{children}</TestProvidersWithAdapter>;
}

/**
 * Variant that accepts an injected StorageAdapter — used by tests that need
 * to drive subscription callbacks or mock storage behavior.
 */
export function TestProvidersWithAdapter({
  adapter,
  children,
}: {
  adapter: StorageAdapter;
  children: ReactNode;
}) {
  return (
    <AuthContext.Provider
      value={{
        user: null,
        loading: false,
        firebaseAvailable: false,
        signInError: null,
        clearSignInError: () => {},
        signInWithMicrosoft: async () => {},
        signInWithGoogle: async () => {},
        signOut: async () => {},
      }}
    >
      <StorageContext.Provider
        value={{
          adapter,
          mode: 'local',
          isCloudAvailable: false,
          switchMode: () => {},
          cloudDataLoaded: true,
          setCloudDataLoaded: () => {},
        }}
      >
        {children}
      </StorageContext.Provider>
    </AuthContext.Provider>
  );
}
