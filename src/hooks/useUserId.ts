// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useAuth } from '../contexts/AuthContext';
import { useStorage } from '../contexts/StorageContext';
import { useSession } from './useSession';

/**
 * Returns the active userId based on storage mode.
 * - Local mode: localStorage-persisted session ID (e.g. "user-1712345678-abc123")
 * - Cloud mode: Firebase uid from the authenticated user
 *
 * The userId is always a string; only the source differs. Components that
 * receive userId as a prop don't need to know which source it came from.
 */
export function useUserId(): string {
  const { mode } = useStorage();
  const { user } = useAuth();
  const { userId: localId } = useSession();
  return mode === 'cloud' && user ? user.uid : localId;
}
