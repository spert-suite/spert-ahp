// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useSyncExternalStore } from 'react';
import { TOS_URL, PRIVACY_URL } from '../../lib/consent';
import { isFirstRunSeen, markFirstRunSeen, subscribeNotices } from '../../lib/appNotices';

/**
 * The suite-wide terms notice, shown to every visitor until "Got it" — whether
 * or not they ever sign in. Wording is identical across the SPERT® Suite; do not
 * edit it here alone. Adapted from SPERT® Forecaster's `FirstRunBanner`.
 */
export default function FirstRunBanner() {
  const seen = useSyncExternalStore(subscribeNotices, isFirstRunSeen);
  if (seen) return null;

  return (
    <div className="mb-4 p-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 flex items-start justify-between gap-3">
      <p className="text-sm text-gray-800 dark:text-gray-200">
        SPERT® Suite web apps are free to use. No account is required to use them. By accessing or
        using this app, you agree to our{' '}
        <a
          href={TOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 dark:text-blue-300 underline hover:no-underline"
        >
          Terms of Service
        </a>{' '}
        and{' '}
        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 dark:text-blue-300 underline hover:no-underline"
        >
          Privacy Policy
        </a>
        . If you choose to enable optional Cloud Storage, you&rsquo;ll be asked to explicitly confirm
        your agreement.
      </p>
      <button
        type="button"
        onClick={markFirstRunSeen}
        className="shrink-0 px-3 py-1 text-xs font-medium rounded-md border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
      >
        Got it
      </button>
    </div>
  );
}
