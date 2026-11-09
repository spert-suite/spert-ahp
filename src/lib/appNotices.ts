// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

/**
 * State for the two app-wide notices (the suite-wide terms notice and the
 * local-mode caution), read through `useSyncExternalStore` by `FirstRunBanner`,
 * `LocalStorageCaution` and the Settings switch.
 *
 * Module-level, like `cloudLoadNotices`, so that:
 *  - the Settings switch hides or shows the caution at once in the same tab;
 *  - the caution's "Got it" lasts until the next page load and no longer —
 *    navigating inside the app, or a remount of the shell, must not bring it back.
 *
 * Both localStorage keys are per-browser preferences and are deliberately kept
 * at sign-out (see `performSignOutWithCleanup.ts`).
 */

/** Suite-wide key: the same name in every SPERT® app. */
export const FIRST_RUN_SEEN_KEY = 'spert_firstRun_seen';

/** 'true' when the user has turned the local-mode caution off in Settings. */
export const SUPPRESS_LOCAL_STORAGE_WARNING_KEY = 'ahp/suppressLocalStorageWarning';

const listeners = new Set<() => void>();
let cautionDismissedThisLoad = false;

function emit(): void {
  for (const l of listeners) l();
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — the in-memory state below still applies this load.
  }
}

/** Subscribe to notice state. Also follows other tabs via the `storage` event. */
export function subscribeNotices(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

// ── Terms notice ────────────────────────────────────────────────────────────

let firstRunSeenThisLoad = false;

export function isFirstRunSeen(): boolean {
  return firstRunSeenThisLoad || read(FIRST_RUN_SEEN_KEY) === 'true';
}

/** "Got it" on the terms notice: dismissed for good. */
export function markFirstRunSeen(): void {
  firstRunSeenThisLoad = true;
  write(FIRST_RUN_SEEN_KEY, 'true');
  emit();
}

// ── Local-mode caution ──────────────────────────────────────────────────────

export function isLocalStorageWarningSuppressed(): boolean {
  return read(SUPPRESS_LOCAL_STORAGE_WARNING_KEY) === 'true';
}

/** The Settings switch — the caution's only permanent off-switch. */
export function setLocalStorageWarningSuppressed(suppressed: boolean): void {
  write(SUPPRESS_LOCAL_STORAGE_WARNING_KEY, suppressed ? 'true' : null);
  emit();
}

export function isCautionDismissedThisLoad(): boolean {
  return cautionDismissedThisLoad;
}

/** "Got it" on the caution: hidden until the next page load. */
export function dismissCautionForThisLoad(): void {
  cautionDismissedThisLoad = true;
  emit();
}

/** Test seam: simulate a fresh page load. */
export function resetNoticeStateForTests(): void {
  cautionDismissedThisLoad = false;
  firstRunSeenThisLoad = false;
  emit();
}
