// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useAuth, getFirstName } from '../../contexts/AuthContext';
import { useStorage } from '../../contexts/StorageContext';

interface AuthChipProps {
  /** Opens the Cloud Storage modal. All three chip states (signed-out,
   *  signed-in + local, signed-in + cloud) call this on click. */
  onOpenSettings: () => void;
}

/** The avatar's fill: white initials on it measure 4.55 : 1. Used only as the avatar's background. */
const BRAND = '#0070f3';

/*
 * The account chip, on the frame's `.sf-chip` (FRAME26, contract §3 and §7): 30 px tall in every state, min-width 163,
 * max-width 240, its right edge at R. Its colours are the frame's, never this file's:
 *   - the state segment (`.sf-chip-state`) is the muted text colour: 4.84 : 1 on white, 6.82 on #101828;
 *   - the action segment (`.sf-chip-act`) is the link colour: 5.25 / 6.73;
 *   - on hover the whole chip takes `--sf-hover` (#f9fafb / #1e2939), where the same two measure 4.63 / 5.64 and
 *     5.02 / 5.56 (`.sf-chip:hover`, canonical since the AHP pilot).
 * No colour is set inline or by a utility on the chip or its segments: the stylesheet is unlayered, so it would win
 * anyway, and an inline colour would also beat the theme (the bug that left "Sign in" at 3.22 : 1 in dark mode until
 * v0.19.0). `__tests__/AuthChip.frame.test.tsx` holds this.
 */

export default function AuthChip({ onOpenSettings }: AuthChipProps) {
  const { user, firebaseAvailable, loading } = useAuth();
  const { mode } = useStorage();

  // Hide entirely when Firebase isn't configured — no sign-in option exists
  if (!firebaseAvailable) return null;
  if (loading) return null;

  // Signed in + cloud: avatar + name | cloud icon → opens Cloud Storage modal
  if (user && mode === 'cloud') {
    const firstName = getFirstName(user);
    const initial = (firstName[0] ?? '?').toUpperCase();
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Open cloud storage settings"
        className="sf-chip"
        data-sf="chip"
      >
        <span className="sf-chip-state">
          <span
            className="w-[22px] h-[22px] shrink-0 rounded-full flex items-center justify-center text-white text-[11px] font-medium"
            style={{ backgroundColor: BRAND }}
          >
            {initial}
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{firstName}</span>
        </span>
        <span className="sf-chip-act">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9H17.5a4.5 4.5 0 0 1 0 9z" />
          </svg>
        </span>
      </button>
    );
  }

  // Signed in + local: avatar + name | lock icon → opens Cloud Storage modal
  if (user && mode === 'local') {
    const firstName = getFirstName(user);
    const initial = (firstName[0] ?? '?').toUpperCase();
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Open cloud storage settings"
        className="sf-chip"
        data-sf="chip"
      >
        <span className="sf-chip-state">
          <span
            className="w-[22px] h-[22px] shrink-0 rounded-full flex items-center justify-center text-white text-[11px] font-medium"
            style={{ backgroundColor: BRAND }}
          >
            {initial}
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{firstName}</span>
        </span>
        {/* The lock says "local only": muted, like the signed-out chip's, not the action colour. */}
        <span className="sf-chip-act">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-gray-500 dark:text-gray-400">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      </button>
    );
  }

  // Signed out: lock icon + "Local only" | "Sign in"
  return (
    <button
      type="button"
      onClick={onOpenSettings}
      aria-label="Sign in"
      className="sf-chip"
      data-sf="chip"
    >
      <span className="sf-chip-state">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>Local only</span>
      </span>
      <span className="sf-chip-act">Sign in</span>
    </button>
  );
}
