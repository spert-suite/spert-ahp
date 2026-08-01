// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

// Lightweight ToS / Privacy Policy consent state for cloud sign-in.
// Mirrors the pattern used by SPERT-CFD (src/lib/consent.ts).

export const TOS_VERSION = '04-05-2026';
export const APP_ID = 'spert-ahp';
export const TOS_URL = 'https://spertsuite.com/TOS.pdf';
export const PRIVACY_URL = 'https://spertsuite.com/PRIVACY.pdf';

const LS_TOS_ACCEPTED_VERSION = 'ahp/tos-accepted-version';
const LS_TOS_WRITE_PENDING = 'ahp/tos-write-pending';

/** Has the user accepted the current ToS version on this device? */
export function hasAcceptedCurrentTos(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(LS_TOS_ACCEPTED_VERSION) === TOS_VERSION;
}

/** Record local ToS acceptance for the current version. */
export function recordLocalAcceptance(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_TOS_ACCEPTED_VERSION, TOS_VERSION);
}

/** Set the write-pending flag before Firebase Auth fires.
 *  Survives the popup round-trip so onAuthStateChanged can detect that this
 *  particular sign-in was preceded by an explicit consent. */
export function setWritePending(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_TOS_WRITE_PENDING, 'true');
}

/** Read and clear the write-pending flag. */
export function consumeWritePending(): boolean {
  if (typeof window === 'undefined') return false;
  const pending = localStorage.getItem(LS_TOS_WRITE_PENDING) === 'true';
  if (pending) localStorage.removeItem(LS_TOS_WRITE_PENDING);
  return pending;
}

/** Read the write-pending flag without clearing it. */
export function peekWritePending(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(LS_TOS_WRITE_PENDING) === 'true';
}

/** Clear the write-pending flag without touching any other consent state.
 *  Used by the popup-failure catch path so a failed sign-in does not leave
 *  the flag lingering for the next auth event. */
export function clearWritePending(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LS_TOS_WRITE_PENDING);
}

/** Clear all local consent state — used on consent-version mismatch sign-out. */
export function clearLocalConsent(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LS_TOS_ACCEPTED_VERSION);
  localStorage.removeItem(LS_TOS_WRITE_PENDING);
}
