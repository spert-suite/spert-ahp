// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

type CleanupCallback = () => Promise<void> | void;

const callbacks: CleanupCallback[] = [];

// Returns a deregister handle so callers can remove the callback when their
// owning component unmounts. Without this, the module-level array grows on
// every remount (StrictMode double-invoke, route resets, error-boundary
// recovery) and accumulates closures over stale React state — v0.15.0
// audit finding #2.
export function registerSignOutCleanup(fn: CleanupCallback): () => void {
  callbacks.push(fn);
  return () => {
    const idx = callbacks.indexOf(fn);
    if (idx !== -1) callbacks.splice(idx, 1);
  };
}

export async function runSignOutCleanup(): Promise<void> {
  for (const fn of callbacks) {
    try {
      await fn();
    } catch (err) {
      console.error('signOutCleanup callback failed:', err);
    }
  }
}

export function clearSignOutCleanupRegistry(): void {
  callbacks.length = 0;
}
