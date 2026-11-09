// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useSyncExternalStore } from 'react';
import { useStorage } from '../../contexts/StorageContext';
import {
  dismissCautionForThisLoad,
  isCautionDismissedThisLoad,
  isLocalStorageWarningSuppressed,
  subscribeNotices,
} from '../../lib/appNotices';

function isCautionHidden(): boolean {
  return isLocalStorageWarningSuppressed() || isCautionDismissedThisLoad();
}

/**
 * The suite-wide local-mode caution. Shown on each page load while the
 * EFFECTIVE storage mode is local (`useStorage().mode` — cloud only when
 * Firebase is configured, the user is signed in and chose cloud). "Got it"
 * hides it until the next page load; the only permanent off-switch is the
 * Settings checkbox. Wording is identical across the SPERT® Suite. Adapted from
 * SPERT® Forecaster's `LocalStorageWarningBanner`.
 */
export default function LocalStorageCaution() {
  const { mode } = useStorage();
  const hidden = useSyncExternalStore(subscribeNotices, isCautionHidden);
  if (mode !== 'local' || hidden) return null;

  return (
    <div className="mb-4 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 flex items-start justify-between gap-3">
      <p className="text-sm text-gray-800 dark:text-gray-200">
        <strong>Your data exists only in this browser</strong> and can be lost without warning.{' '}
        Export at the end of every session to protect your work.
      </p>
      <button
        type="button"
        onClick={dismissCautionForThisLoad}
        className="shrink-0 px-3 py-1 text-xs font-medium rounded-md border border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/50 transition-colors"
      >
        Got it
      </button>
    </div>
  );
}
