// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import type { User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Build the merge payload for a profile write. The shape is:
 *   { displayName, email (lowercased), photoURL, updatedAt }
 *
 * serverTimestamp() is placed at the end of the literal so a future
 * spread of caller-provided fields cannot inadvertently overwrite it
 * (Lesson 29 — serverTimestamp must always land last).
 */
function buildPayload(user: User) {
  return {
    displayName: user.displayName ?? '',
    email: (user.email ?? '').toLowerCase(),
    photoURL: user.photoURL ?? null,
    updatedAt: serverTimestamp(),
  };
}

/**
 * Write or update the per-app profile document at
 * spertahp_profiles/{uid}. Used by the Sharing UI's email→uid lookup.
 * Background-write — caller does NOT await; failures are logged via
 * console.error and swallowed so a profile-write hiccup never blocks
 * sign-in.
 */
export function writeSpertahpProfile(user: User): void {
  if (!db) return;
  void setDoc(doc(db, 'spertahp_profiles', user.uid), buildPayload(user), {
    merge: true,
  }).catch((err) => {
    console.error(
      'Failed to update profile:',
      (err as { code?: string }).code ?? 'unknown',
    );
  });
}

/**
 * Write or update the suite-wide profile document at
 * spertsuite_profiles/{uid}. Used by cross-app invitation Cloud
 * Functions (Gantt, Scheduler, etc.) for email→uid resolution. Same
 * payload shape as the per-app write — AHP intentionally does not
 * apply normalizeDisplayName here so what the user sees in the
 * Sharing roster matches what other SPERT apps see.
 *
 * Background-write — see writeSpertahpProfile.
 */
export function writeSpertsuiteProfile(user: User): void {
  if (!db) return;
  void setDoc(doc(db, 'spertsuite_profiles', user.uid), buildPayload(user), {
    merge: true,
  }).catch((err) => {
    console.error(
      'Failed to update suite profile:',
      (err as { code?: string }).code ?? 'unknown',
    );
  });
}
