// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { LocalStorageAdapter } from '../storage/LocalStorageAdapter';
import { FirestoreAdapter } from '../storage/FirestoreAdapter';
import { isFirebaseAvailable } from '../lib/firebase';
import { registerSignOutCleanup } from '../lib/signOutCleanupRegistry';
import { useAuth } from './AuthContext';
import type { StorageAdapter } from '../types/ahp';

export type StorageMode = 'local' | 'cloud';

export interface StorageContextType {
  adapter: StorageAdapter;
  /** Effective mode: equal to what the active adapter is backed by. Cloud only
   *  when Firebase is configured, a user is signed in, and the user's persisted
   *  preference is 'cloud'. Otherwise 'local'. */
  mode: StorageMode;
  /** Whether Firebase is configured for this deployment. Used to hide cloud
   *  UI entirely when Firebase isn't available. */
  isCloudAvailable: boolean;
  /** Switch between local and cloud modes. Persists the preference. */
  switchMode: (mode: StorageMode) => void;
  /**
   * True once the active adapter's initial listModels() call has resolved.
   * Always true in local mode. False from the moment a new FirestoreAdapter
   * is created until DashboardPanel's mount-time listModels() completes.
   *
   * NOTE: This signal is currently driven by DashboardPanel's mount-time
   * fetch. A component that needs this signal before DashboardPanel mounts
   * will see false indefinitely. If that use case arises, move the initial
   * listModels() call into StorageProvider and remove setCloudDataLoaded
   * from the context surface.
   */
  cloudDataLoaded: boolean;
  /** Called by DashboardPanel inside its listModels().then() to signal
   *  that the initial fetch has completed. Harmless when state is already true. */
  setCloudDataLoaded: (loaded: boolean) => void;
}

export const StorageContext = createContext<StorageContextType | null>(null);

const MODE_KEY = 'ahp/storageMode';

function getPersistedMode(): StorageMode {
  if (typeof window === 'undefined') return 'local';
  const saved = localStorage.getItem(MODE_KEY);
  return saved === 'cloud' ? 'cloud' : 'local';
}

export function StorageProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  // Persisted preference — what the user selected. Not exposed via context.
  const [persistedMode, setPersistedMode] = useState<StorageMode>(getPersistedMode);

  // Effective mode: cloud only if Firebase available + signed in + user chose cloud.
  // This is the single `mode` field exposed to consumers — equivalent to the
  // adapter-backing mode (canonical pattern from ARCHITECTURE.md §4.4).
  const effectiveMode: StorageMode =
    isFirebaseAvailable && user && persistedMode === 'cloud' ? 'cloud' : 'local';

  // Lazy initializer — avoids new instance on every render (GanttApp lesson 2)
  const [adapter, setAdapter] = useState<StorageAdapter>(() => new LocalStorageAdapter());
  const [ready, setReady] = useState(false);

  // Initialize based on persistedMode + isFirebaseAvailable (not effectiveMode,
  // which would incorrectly compute 'local' during the pre-auth window when
  // user is null). Starts false only when cloud mode is persisted and Firebase
  // is configured — i.e., when a FirestoreAdapter will need its initial
  // listModels() to resolve.
  const [cloudDataLoaded, setCloudDataLoaded] = useState<boolean>(
    () => persistedMode !== 'cloud' || !isFirebaseAvailable,
  );

  // Register the mode-reset cleanup with the centralized sign-out registry.
  // Runs exactly once per mount — the callback writes to localStorage and
  // updates persistedMode so effectiveMode recomputes to 'local' on the
  // next render following sign-out.
  useEffect(() => {
    const deregister = registerSignOutCleanup(() => {
      localStorage.setItem(MODE_KEY, 'local');
      setPersistedMode('local');
    });
    return deregister;
  }, []);

  useEffect(() => {
    // CRITICAL: Hold ready = false while auth is resolving if cloud is preferred.
    // Otherwise we'd briefly create a LocalStorageAdapter, flip ready = true,
    // then re-fire when auth resolves and swap to FirestoreAdapter — flashing
    // local-mode UI with a stale project list before cloud data loads.
    if (authLoading && persistedMode === 'cloud' && isFirebaseAvailable) {
      setReady(false);
      // Defensive: keeps the cloudDataLoaded invariant intact if authLoading
      // re-fires after a prior successful auth (e.g., token refresh). Without
      // this, cloudDataLoaded could remain true across an auth-loading window
      // and rely solely on the ready=false UI gate.
      setCloudDataLoaded(false);
      return;
    }

    // React 18 batches all setState calls inside a useEffect synchronously —
    // cloudDataLoaded, adapter, and ready all change in one commit, with no
    // intermediate render where a new empty FirestoreAdapter is visible
    // alongside a stale cloudDataLoaded=true from the prior mode.
    if (effectiveMode === 'cloud' && user) {
      setCloudDataLoaded(false);
      setAdapter(new FirestoreAdapter(user.uid));
    } else {
      setCloudDataLoaded(true);
      setAdapter(new LocalStorageAdapter());
    }
    setReady(true);
  }, [effectiveMode, user, authLoading, persistedMode]);

  const switchMode = (newMode: StorageMode): void => {
    localStorage.setItem(MODE_KEY, newMode);
    setPersistedMode(newMode);
  };

  // storageReady gate — don't render children until the adapter is settled
  // (SPERT-CFD lesson 25).
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
      </div>
    );
  }

  return (
    <StorageContext.Provider
      value={{
        adapter,
        mode: effectiveMode,
        isCloudAvailable: isFirebaseAvailable,
        switchMode,
        cloudDataLoaded,
        setCloudDataLoaded,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage(): StorageContextType {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorage must be used within StorageProvider');
  return ctx;
}
