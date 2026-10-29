// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

/**
 * Which open models had part of their data set aside by `guardModelDoc` (storage/cloudReadGuard.ts).
 *
 * Module-level, like `signOutCleanupRegistry`, because the guard runs inside
 * FirestoreAdapter and the notice renders in `App`; neither knows the
 * other. Read through `useSyncExternalStore` (see `CloudLoadNotice`). Holds
 * model ids only — never a value from the document.
 */

const flagged = new Set<string>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/**
 * Log the rules that fired and, for a model the user is opening, raise the
 * notice. The dashboard list passes `notify: false`: nobody has opened it yet, and
 * opening it runs the guard again.
 */
export function reportGuardedLoad(modelId: string, rules: string[], notify: boolean): void {
  if (rules.length === 0) return;
  console.warn(`[cloud-load-guard] model ${modelId}: ${rules.join(', ')}`);
  if (!notify || flagged.has(modelId)) return;
  flagged.add(modelId);
  emit();
}

export function isGuardedLoad(modelId: string): boolean {
  return flagged.has(modelId);
}

export function dismissGuardedLoad(modelId: string): void {
  if (flagged.delete(modelId)) emit();
}

export function subscribeGuardedLoads(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
