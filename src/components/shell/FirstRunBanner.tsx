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
    // The frame's info notice (`.sf-notice--info`, contract §3 "Notices slot"): its colours, padding, radius and the
    // 28 px outlined "Got it" are the stylesheet's, and the links inherit the notice's text colour, underlined.
    <div className="sf-notice sf-notice--info">
      <p>
        SPERT® Suite web apps are free to use. No account is required to use them. By accessing or
        using this app, you agree to our{' '}
        <a
          href={TOS_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Terms of Service
        </a>{' '}
        and{' '}
        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>
        . If you choose to enable optional Cloud Storage, you&rsquo;ll be asked to explicitly confirm
        your agreement.
      </p>
      <button
        type="button"
        onClick={markFirstRunSeen}
        className="sf-notice-dismiss"
      >
        Got it
      </button>
    </div>
  );
}
