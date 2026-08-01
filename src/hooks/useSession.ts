// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useState } from 'react';

const SESSION_KEY = 'ahp/sessionUserId';
const WORKSPACE_KEY = 'ahp/workspaceId';

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Returns a stable workspace UUID for this browser. Used for model
 * fingerprinting (_originRef) so that provenance is preserved across
 * local → cloud migration. Generated once, never changes.
 */
export function getOrCreateWorkspaceId(): string {
  let id = localStorage.getItem(WORKSPACE_KEY);
  if (!id) {
    // crypto.randomUUID is available in all modern browsers
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ws-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(WORKSPACE_KEY, id);
  }
  return id;
}

export function useSession(): { userId: string } {
  const [userId] = useState(getOrCreateSessionId);
  return { userId };
}
