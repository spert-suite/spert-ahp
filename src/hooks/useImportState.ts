// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

// Level 4 import state machine — v0.16.0
//
// Phase-based discriminated union with two write sites for `applying`
// (entry/exit in runApply). Architecture decisions (AD-1 through AD-12) and
// pitfall references are documented in the v0.16.0 Level 4 Import
// Implementation Plan (R7).

import { useState, useCallback, useEffect, useRef } from 'react';
import type React from 'react';
import type { StorageAdapter } from '../types/ahp';
import type { StorageMode } from '../contexts/StorageContext';
import {
  parseAndClassifyImport,
  detectAHPImportConflicts,
  computeDefaultDecisions,
  applyImportMerge,
  type ParsedAHPImport,
  type ParseError,
  type AHPConflictMap,
  type ImportDecision,
  type AHPImportResult,
} from '../storage/import-utils';

// ── Phase ────────────────────────────────────────────────────────────────────
// `existing: ModelIndexEntry[]` is intentionally absent from preview /
// replace-confirm variants: ImportPreviewSection reads only from `conflicts`
// (which carries existingTitle / existingModelId). Layer 2 re-fetches the
// authoritative list at apply time.
export type ImportPhase =
  | { tag: 'idle' }
  | { tag: 'parsing' }
  | {
      tag: 'preview';
      parsed: ParsedAHPImport;
      conflicts: AHPConflictMap;
      decisions: Map<number, ImportDecision>;
    }
  | {
      tag: 'replace-confirm';
      parsed: ParsedAHPImport;
      conflicts: AHPConflictMap;
      decisions: Map<number, ImportDecision>;
      replaceCount: number;
      /** Only set when > 0. Disclosure for same-slot dedup demotion. */
      dedupedCount?: number;
    }
  | { tag: 'applying' }
  | { tag: 'banner'; result: AHPImportResult };

export interface UseImportStateArgs {
  storage: StorageAdapter;
  /** Used for cloud-mode AD-9 suppression and storage-change error messages. */
  mode: StorageMode;
  userId: string;
  loadModel: (modelId: string) => Promise<void>;
  onDecisionOpened: () => void;
  /** True once the active adapter's initial listModels() has resolved.
   *  Always true in local mode. Passed as a prop (not read from context)
   *  so the hook remains independently testable without a StorageProvider. */
  cloudDataLoaded: boolean;
}

export interface UseImportStateReturn {
  phase: ImportPhase;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importError: string | null;
  /** True when the Import button should be disabled because an import flow
   *  is in progress (parsing / preview / replace-confirm / applying). */
  isBusy: boolean;
  /** True when mode is 'cloud' and cloudDataLoaded is false. DashboardPanel
   *  uses this to disable the Import button and show the hint banner. */
  isCloudNotReady: boolean;
  handleImportClick: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDecisionChange: (index: number, decision: ImportDecision) => void;
  handleConfirmImport: () => void;
  handleCancelPreview: () => void;
  handleCancelReplaceAll: () => void;
  handleReplaceAllConfirmed: () => void;
  handleDismissBanner: () => void;
}

export function useImportState(args: UseImportStateArgs): UseImportStateReturn {
  const { storage, mode, userId, loadModel, onDecisionOpened, cloudDataLoaded } = args;
  const isCloudNotReady = mode === 'cloud' && !cloudDataLoaded;
  const [phase, setPhase] = useState<ImportPhase>({ tag: 'idle' });
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Two distinct refs:
  //   applyActiveRef     — observable by the storage-change effect; true
  //                        while runApply is in flight, used by AD-12.
  //   runApplyEnteredRef — internal reentrancy guard. Only set inside
  //                        runApply's prefix; never pre-set externally.
  // Keeping these separate prevents external code paths (e.g. the AD-9
  // fast-path) from falsely tripping the reentrancy guard.
  const applyActiveRef = useRef(false);
  const runApplyEnteredRef = useRef(false);

  // AD-12: mid-apply storage swap detector. Set true by the storage-change
  // effect when applyActiveRef is true. runApply checks this after
  // applyImportMerge resolves and forces a banner with abort reason.
  const applyStaleRef = useRef(false);

  // Unmount safety — prevents setState on an unmounted component.
  // The setup re-sets to true on every mount so StrictMode's dev
  // double-invoke (mount → cleanup → mount) ends in a true state. Without
  // the setup-side assignment, the first cleanup left current=false even
  // though the component was still mounted, which silently swallowed the
  // runApply exit setPhase call.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Storage-change reset (AD-12: mid-apply detection instead of reset).
  const prevStorageRef = useRef(storage);
  useEffect(() => {
    if (prevStorageRef.current !== storage) {
      prevStorageRef.current = storage;
      if (applyActiveRef.current) {
        // Apply is in flight against the (now-old) adapter. Don't reset
        // phase — let the apply complete and surface the swap via banner.
        applyStaleRef.current = true;
        return;
      }
      if (phase.tag !== 'idle' && phase.tag !== 'banner') {
        setPhase({ tag: 'idle' });
        setImportError(
          mode === 'cloud'
            ? 'Storage mode changed to cloud. Please try importing again.'
            : 'Storage mode changed to local. Please try importing again.',
        );
      }
    }
  }, [storage, mode, phase.tag]);

  const resetToIdle = useCallback(() => {
    setPhase({ tag: 'idle' });
    setImportError(null);
  }, []);

  // ── runApply — declared FIRST so handlers can include it in deps ────────
  const runApply = useCallback(
    async (
      parsed: ParsedAHPImport,
      conflicts: AHPConflictMap,
      decisions: Map<number, ImportDecision>,
    ) => {
      if (runApplyEnteredRef.current) return;
      runApplyEnteredRef.current = true;
      applyActiveRef.current = true;
      applyStaleRef.current = false;
      setPhase({ tag: 'applying' }); // applying write-site 1 of 2

      // The initializer is required for TypeScript definite-assignment: the `finally`
      // below reads phaseOnExit, and on the throw-before-assign path it is only set in
      // `catch`. ESLint's flow analysis can't see that path and calls the init useless;
      // tsc needs it.
      // eslint-disable-next-line no-useless-assignment
      let phaseOnExit: ImportPhase = { tag: 'idle' };
      try {
        const applyResult = await applyImportMerge(
          storage,
          parsed.envelopes,
          decisions,
          conflicts,
          userId,
        );
        // Merge bundle-level parseErrors into the result's errors[] channel.
        // They aren't write failures but they belong in the same surfaced
        // feedback so users see "X added, Y failed (including bundle items
        // that couldn't be imported)".
        const augmentedResult: AHPImportResult =
          parsed.parseErrors.length > 0
            ? {
                ...applyResult,
                errorCount: applyResult.errorCount + parsed.parseErrors.length,
                errors: [
                  ...applyResult.errors,
                  ...parsed.parseErrors.map((p: ParseError) => ({
                    title: `Bundle item ${p.index}: ${p.title}`,
                    reason: p.reason,
                  })),
                ],
              }
            : applyResult;

        if (applyStaleRef.current) {
          // AD-12: storage swapped mid-apply. Do not auto-load and do not
          // dispatch the refresh event — both could target the wrong
          // adapter. The write itself went to the old adapter (irreducible
          // limitation of non-cancellable storage writes).
          phaseOnExit = {
            tag: 'banner',
            result: {
              ...augmentedResult,
              ok: false,
              abortReason:
                'Storage mode changed during import. Some writes may have gone ' +
                'to the previous storage. Please verify your decisions list.',
            },
          };
        } else {
          const shouldAutoLoad =
            augmentedResult.ok &&
            augmentedResult.autoLoadModelId !== null &&
            augmentedResult.errorCount === 0 &&
            augmentedResult.skippedCount === 0;

          if (shouldAutoLoad) {
            phaseOnExit = { tag: 'idle' };
          } else {
            phaseOnExit = { tag: 'banner', result: augmentedResult };
          }

          if (
            augmentedResult.ok &&
            augmentedResult.addedCount + augmentedResult.replacedCount > 0
          ) {
            window.dispatchEvent(new CustomEvent('spert:models-changed'));
          }

          // Auto-load: separate try/catch so a transient loadModel failure
          // doesn't swallow the write success. Degrade to banner — the user
          // sees the write succeeded and can open the model from the list.
          if (shouldAutoLoad) {
            try {
              await loadModel(augmentedResult.autoLoadModelId!);
              onDecisionOpened();
            } catch {
              phaseOnExit = { tag: 'banner', result: augmentedResult };
            }
          }
        }
      } catch (err) {
        // Explicit reset — defensive against future edits that mutate
        // phaseOnExit in the success block before throwing.
        setImportError((err as Error).message);
        phaseOnExit = { tag: 'idle' };
      } finally {
        // applying write-site 2 of 2. Guaranteed to run regardless of throw.
        applyActiveRef.current = false;
        runApplyEnteredRef.current = false;
        if (isMountedRef.current) {
          setPhase(phaseOnExit);
        }
      }
    },
    [storage, userId, loadModel, onDecisionOpened],
  );

  // ── File pick ────────────────────────────────────────────────────────────
  const handleImportClick = useCallback(() => {
    setImportError(null);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImportError(null);
      setPhase({ tag: 'parsing' });
      try {
        const rawJson = await file.text();
        const parsed = parseAndClassifyImport(rawJson);
        // Layer 1: fresh listModels() at file-pick time. The captured map is
        // what Layer 2 will compare against inside applyImportMerge.
        const existing = await storage.listModels();
        const conflicts = detectAHPImportConflicts(parsed.envelopes, existing);
        const decisions = computeDefaultDecisions(parsed.envelopes, conflicts);

        // If every envelope in a bundle failed parse-validation, there is
        // nothing to preview — surface directly as a banner.
        if (parsed.envelopes.length === 0 && parsed.parseErrors.length > 0) {
          setPhase({
            tag: 'banner',
            result: {
              ok: false,
              addedCount: 0,
              replacedCount: 0,
              skippedCount: 0,
              errorCount: parsed.parseErrors.length,
              errors: parsed.parseErrors.map((p) => ({
                title: `Bundle item ${p.index}: ${p.title}`,
                reason: p.reason,
              })),
              autoLoadModelId: null,
              abortReason: 'No valid decisions in this bundle.',
            },
          });
          return;
        }

        // AD-9: auto-confirm fast-path for clean single-envelope imports in
        // LOCAL mode only. Cloud mode is suppressed because Firestore's local
        // cache may return an empty listModels() during the post-sign-in
        // hydration window, making allNone unreliable. Bundles with parse
        // errors are excluded because the user should see what was skipped.
        const allNone = [...conflicts.values()].every((c) => c.type === 'none');
        if (
          parsed.type === 'single' &&
          allNone &&
          mode === 'local' &&
          parsed.parseErrors.length === 0
        ) {
          void runApply(parsed, conflicts, decisions);
          return;
        }
        setPhase({ tag: 'preview', parsed, conflicts, decisions });
      } catch (err) {
        setImportError((err as Error).message);
        setPhase({ tag: 'idle' });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [storage, mode, runApply],
  );

  const handleDecisionChange = useCallback((index: number, decision: ImportDecision) => {
    setPhase((prev) => {
      if (prev.tag !== 'preview') return prev;
      const next = new Map(prev.decisions);
      next.set(index, decision);
      return { ...prev, decisions: next };
    });
  }, []);

  const handleConfirmImport = useCallback(() => {
    if (phase.tag !== 'preview') return;
    if (isCloudNotReady) {
      setImportError(
        'Cloud decisions are still loading — dismiss this message and try again in a moment.',
      );
      return;
    }
    const { parsed, conflicts, decisions } = phase;
    const replacedSlots = new Set<string>();
    let totalReplaceDecisions = 0;
    for (const [i, d] of decisions) {
      if (d !== 'replace') continue;
      totalReplaceDecisions++;
      const slot = conflicts.get(i)?.existingModelId;
      if (slot) replacedSlots.add(slot);
    }
    if (replacedSlots.size > 0) {
      // dedupedCount is deterministic at write time as long as `decisions`
      // is not mutated between this confirm and the replace-confirm modal's
      // confirm button. Replace-confirm is one-way (confirm or
      // cancel-to-preview), so the count is exact.
      const dedupedCount = totalReplaceDecisions - replacedSlots.size;
      setPhase({
        tag: 'replace-confirm',
        parsed,
        conflicts,
        decisions,
        replaceCount: replacedSlots.size,
        ...(dedupedCount > 0 ? { dedupedCount } : {}),
      });
      return;
    }
    void runApply(parsed, conflicts, decisions);
  }, [runApply, phase, isCloudNotReady]);

  const handleCancelReplaceAll = useCallback(() => {
    setPhase((prev) => {
      if (prev.tag !== 'replace-confirm') return prev;
      return {
        tag: 'preview',
        parsed: prev.parsed,
        conflicts: prev.conflicts,
        decisions: prev.decisions,
      };
    });
  }, []);

  const handleReplaceAllConfirmed = useCallback(() => {
    if (phase.tag !== 'replace-confirm') return;
    if (isCloudNotReady) {
      setImportError(
        'Cloud decisions are still loading — dismiss this message and try again in a moment.',
      );
      return;
    }
    const { parsed, conflicts, decisions } = phase;
    void runApply(parsed, conflicts, decisions);
  }, [runApply, phase, isCloudNotReady]);

  const handleCancelPreview = useCallback(() => {
    resetToIdle();
  }, [resetToIdle]);

  const handleDismissBanner = useCallback(() => {
    resetToIdle();
  }, [resetToIdle]);

  // Single source of truth for button-disabled state.
  const isBusy = phase.tag !== 'idle' && phase.tag !== 'banner';

  return {
    phase,
    fileInputRef,
    importError,
    isBusy,
    isCloudNotReady,
    handleImportClick,
    handleFileChange,
    handleDecisionChange,
    handleConfirmImport,
    handleCancelPreview,
    handleCancelReplaceAll,
    handleReplaceAllConfirmed,
    handleDismissBanner,
  };
}
