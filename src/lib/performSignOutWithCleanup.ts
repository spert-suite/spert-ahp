// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';
import { clearLocalConsent } from './consent';
import { runSignOutCleanup } from './signOutCleanupRegistry';
import { bumpSynthesisGeneration } from './synthesisGeneration';
import { HAS_UPLOADED_KEY } from '../storage/migration';
import { INVITE_SESSION_KEY } from './captureInviteTokenFromUrl';

const ATTRIBUTION_KEY = 'ahp/exportAttribution';

// Must match MODE_KEY in StorageContext.tsx. Duplicated here to avoid
// importing a React module into a plain utility.
const STORAGE_MODE_KEY = 'ahp/storageMode';
const MODELS_PREFIX = 'ahp/models/';
const MODEL_INDEX_KEY = 'ahp/modelIndex';

// Intentionally NOT cleared on sign-out:
//   - ahp/sessionUserId, ahp/workspaceId — random browser-scoped opaque
//     identifiers used as `_originRef` fingerprints by migration.ts and
//     the change-log path. They are not PII. Clearing them would break
//     workspace continuity for repeated local→cloud migrations on the
//     same device.
//   - spert-theme — user UI preference, not user-scoped.
// All other ahp/* keys ARE cleared (consent, attribution, migration
// flag) — see v0.12.2 audit F5. The sessionStorage invite token is
// also cleared so the next user on the same tab does not inherit a
// stale pre_auth landing state (v0.15.0 audit finding #5).

/**
 * Clear all local project data (model index + all per-model keys).
 * Called only when signing out of cloud mode to prevent the previous
 * cloud user's local decisions from appearing in the next user's
 * migration prompt when they switch to cloud mode.
 *
 * NOT called in local-mode sign-out — doing so would destroy the user's
 * only data copy.
 *
 * Edge case: if a user signs into cloud, switches the UI to local mode,
 * then signs out, storageMode reads 'local' at sign-out time and this
 * function does NOT run. The cloud-era local data persists. This is
 * correct: in local mode the data may be the user's only copy.
 *
 * Iterates a key snapshot to avoid mutation-during-iteration bugs.
 */
export function clearLocalProjectData(): void {
  localStorage.removeItem(MODEL_INDEX_KEY);
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(MODELS_PREFIX)) keysToRemove.push(k);
  }
  for (const k of keysToRemove) localStorage.removeItem(k);
}

export async function performSignOutWithCleanup(): Promise<void> {
  // G1: discard in-flight synthesis before clearing credentials.
  // Must be first so any in-flight runSynthesis awaits short-circuit
  // before the store is zeroed.
  bumpSynthesisGeneration();
  clearLocalConsent();
  localStorage.removeItem(ATTRIBUTION_KEY);
  localStorage.removeItem(HAS_UPLOADED_KEY);
  try {
    sessionStorage.removeItem(INVITE_SESSION_KEY);
  } catch {
    // sessionStorage unavailable — non-fatal.
  }
  // E2a: read mode BEFORE runSignOutCleanup(), which resets it to 'local'
  // via the StorageContext registry callback.
  const storageMode = localStorage.getItem(STORAGE_MODE_KEY);
  if (storageMode === 'cloud') {
    clearLocalProjectData();
  }
  await runSignOutCleanup();
  if (auth) await firebaseSignOut(auth);
}
