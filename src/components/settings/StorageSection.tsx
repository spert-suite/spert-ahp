// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useStorage } from '../../contexts/StorageContext';
import { useSession } from '../../hooks/useSession';
import { LocalStorageAdapter } from '../../storage/LocalStorageAdapter';
import { FirestoreAdapter } from '../../storage/FirestoreAdapter';
import { uploadLocalToCloud, hasUploadedToCloud, setHasUploadedFlag } from '../../storage/migration';
import { performSignOutWithCleanup } from '../../lib/performSignOutWithCleanup';
import { normalizeDisplayName } from '../../lib/userDisplay';
import { GoogleLogo, MicrosoftLogo } from '../shell/AuthProviderLogos';

type MigrationState =
  | { status: 'idle' }
  | { status: 'confirm'; localCount: number }
  | { status: 'migrating' }
  | { status: 'done'; uploaded: number; skipped: number }
  | { status: 'error'; message: string };

interface StorageSectionProps {
  onClose?: () => void;
}

/**
 * Storage section of the Cloud Storage modal. Follows the suite-standard
 * pattern: both radios always visible, Cloud disabled when not signed in,
 * blue branded sign-in buttons when signed out, suite-standard identity card
 * when signed in. Migration state machine and error handling are unchanged.
 */
export default function StorageSection({ onClose }: StorageSectionProps = {}) {
  const { adapter, mode, switchMode, isCloudAvailable } = useStorage();
  const {
    user,
    loading: authLoading,
    signInWithGoogle,
    signInWithMicrosoft,
    signInError,
    clearSignInError,
  } = useAuth();
  const { userId: localUserId } = useSession();

  const [busy, setBusy] = useState(false);
  const [migration, setMigration] = useState<MigrationState>({ status: 'idle' });
  const [error, setError] = useState<string | null>(null);

  const handleSwitchToLocal = useCallback(() => {
    setError(null);
    setMigration({ status: 'idle' });
    switchMode('local');
  }, [switchMode]);

  const handleSwitchToCloud = useCallback(async () => {
    if (!user) return;
    setError(null);

    // Skip migration dialog if we've already uploaded
    if (hasUploadedToCloud()) {
      switchMode('cloud');
      return;
    }

    // C3: read via the in-context adapter, not a fresh LocalStorageAdapter.
    // Only meaningful when mode === 'local' (the adapter IS a LocalStorageAdapter).
    if (!(adapter instanceof LocalStorageAdapter)) {
      switchMode('cloud');
      return;
    }

    // Count local models to decide whether to offer migration
    const models = await adapter.listModels();
    if (models.length === 0) {
      switchMode('cloud');
      return;
    }

    setMigration({ status: 'confirm', localCount: models.length });
  }, [user, switchMode, adapter]);

  const handleMigrate = useCallback(async () => {
    if (!user) return;
    // C3: migration must read from the in-context adapter. Defensive guard
    // ensures the adapter is the local one before proceeding.
    if (!(adapter instanceof LocalStorageAdapter)) return;
    setBusy(true);
    setMigration({ status: 'migrating' });
    try {
      const cloud = new FirestoreAdapter(user.uid);
      const result = await uploadLocalToCloud(adapter, cloud, localUserId, user.uid);
      setMigration({ status: 'done', uploaded: result.uploaded, skipped: result.skipped });
      switchMode('cloud');
    } catch (e) {
      setMigration({ status: 'error', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }, [user, localUserId, switchMode, adapter]);

  const handleSkipMigration = useCallback(() => {
    setHasUploadedFlag();
    setMigration({ status: 'idle' });
    switchMode('cloud');
  }, [switchMode]);

  const handleSignIn = useCallback(
    async (provider: 'google' | 'microsoft') => {
      setBusy(true);
      setError(null);
      clearSignInError();
      try {
        if (provider === 'google') {
          await signInWithGoogle();
        } else {
          await signInWithMicrosoft();
        }
      } catch (e) {
        // auth/popup-blocked is surfaced via signInError from AuthContext.
        // Other errors show in the local banner.
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [signInWithGoogle, signInWithMicrosoft, clearSignInError],
  );

  const handleSignOut = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await performSignOutWithCleanup();
      onClose?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [onClose]);

  if (!isCloudAvailable) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Storage</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Cloud storage is not configured for this deployment. Data is stored locally in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Storage</h3>

      {/* Mode radios — Cloud is disabled when not signed in */}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="storage-mode"
            checked={mode === 'local'}
            onChange={handleSwitchToLocal}
            disabled={busy}
            className="accent-blue-600"
          />
          <span className="text-gray-900 dark:text-gray-100">Local (browser only)</span>
        </label>
        <label className={`flex items-center gap-2 text-sm ${!user ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <input
            type="radio"
            name="storage-mode"
            checked={mode === 'cloud'}
            onChange={() => { void handleSwitchToCloud(); }}
            disabled={busy || !user}
            className="accent-blue-600"
          />
          <span className={user ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
            Cloud (sync across devices)
          </span>
        </label>
      </div>

      {/* Auth block — identity card when signed in, sign-in buttons when signed out */}
      {user ? (
        <div className="space-y-3">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {normalizeDisplayName(user.displayName) || user.email?.split('@')[0] || ''}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { void handleSignOut(); }}
              disabled={busy}
              className="ml-3 text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 shrink-0 disabled:opacity-50"
            >
              Sign out
            </button>
          </div>

          {mode === 'local' && (
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Keep using local storage
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Sign in to enable cloud storage:
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { void handleSignIn('google'); }}
              disabled={busy || authLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <GoogleLogo />
              Sign in with Google
            </button>
            <button
              onClick={() => { void handleSignIn('microsoft'); }}
              disabled={busy || authLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <MicrosoftLogo />
              Sign in with Microsoft
            </button>
          </div>
        </div>
      )}

      {/* Migration confirm */}
      {migration.status === 'confirm' && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md space-y-2">
          <p className="text-xs text-blue-900 dark:text-blue-200">
            This device has <strong>{migration.localCount}</strong> local decision
            {migration.localCount === 1 ? '' : 's'} stored in your browser.
            Local decisions are not linked to any account — they may have been
            created by you or by a previous user of this browser. Upload them
            to your cloud account?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { void handleMigrate(); }}
              disabled={busy}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Upload
            </button>
            <button
              onClick={handleSkipMigration}
              disabled={busy}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {migration.status === 'migrating' && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-xs text-blue-900 dark:text-blue-200">
          Uploading decisions to cloud…
        </div>
      )}

      {migration.status === 'done' && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-xs text-green-900 dark:text-green-200">
          Uploaded {migration.uploaded} decision{migration.uploaded === 1 ? '' : 's'}
          {migration.skipped > 0 && `, skipped ${migration.skipped} existing`}.
        </div>
      )}

      {migration.status === 'error' && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-900 dark:text-red-200">
          Migration failed: {migration.message}
        </div>
      )}

      {(signInError ?? error) && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-900 dark:text-red-200">
          {signInError ?? error}
        </div>
      )}
    </div>
  );
}
