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
    // The frame's caution notice (`.sf-notice--caution`, contract §3 "Notices slot").
    <div className="sf-notice sf-notice--caution">
      <p>
        <strong>Your data exists only in this browser</strong> and can be lost without warning.{' '}
        Export at the end of every session to protect your work.
      </p>
      <button
        type="button"
        onClick={dismissCautionForThisLoad}
        className="sf-notice-dismiss"
      >
        Got it
      </button>
    </div>
  );
}
