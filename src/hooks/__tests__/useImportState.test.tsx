// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useImportState } from '../useImportState';
import { LocalStorageAdapter } from '../../storage/LocalStorageAdapter';
import type { AHPExportEnvelope, ModelDoc, StorageAdapter, StructureDoc } from '../../types/ahp';

const USER = 'user-A';

function meta(overrides: Partial<ModelDoc> = {}): ModelDoc {
  return {
    title: 'Sample',
    goal: 'Goal',
    createdBy: 'alice',
    createdAt: 1,
    status: 'open',
    completionTier: 4,
    synthesisStatus: null,
    disagreementConfig: { preset: 'standard', thresholds: { agreement: 0.15, mild: 0.35 } },
    publishedSynthesisId: null,
    _originRef: 'ws',
    _changeLog: [],
    ...overrides,
  };
}

function structure(): StructureDoc {
  return {
    criteria: [{ id: 'c1', label: 'C1', description: '' }],
    alternatives: [{ id: 'a1', label: 'A1', description: '' }],
    structureVersion: 1,
  };
}

function envelope(over: Partial<AHPExportEnvelope> = {}): AHPExportEnvelope {
  return {
    spertAhpExportVersion: 1,
    appVersion: '0.16.0',
    exportedAt: 0,
    sourceModelId: 'source-model',
    _exportedBy: null,
    _storageRef: 'ws',
    meta: meta(),
    structure: structure(),
    collaborators: [{ userId: 'alice', role: 'owner', isVoting: true }],
    responses: {
      alice: {
        userId: 'alice',
        status: 'in_progress',
        criteriaMatrix: {},
        alternativeMatrices: {},
        cr: {},
        lastModifiedAt: 0,
        structureVersionAtSubmission: 1,
      },
    },
    synthesis: null,
    ...over,
  };
}

function makeFileLike(content: unknown): File {
  // jsdom's File does not implement .text() reliably. Build a minimal
  // File-shaped object that the hook can await .text() against.
  const json = JSON.stringify(content);
  return {
    text: () => Promise.resolve(json),
  } as unknown as File;
}

function makeChangeEvent(file: File): React.ChangeEvent<HTMLInputElement> {
  // Stub input that exposes files + value (the hook reads e.target.files and
  // sets e.target.value to '' in the finally block).
  const target = { files: [file] as unknown as FileList, value: '' };
  return { target, currentTarget: target } as unknown as React.ChangeEvent<HTMLInputElement>;
}

const makeFile = makeFileLike;

interface Harness {
  storage: StorageAdapter;
  loadModel: ReturnType<typeof vi.fn>;
  onDecisionOpened: ReturnType<typeof vi.fn>;
  mode: 'local' | 'cloud';
  cloudDataLoaded: boolean;
}

function makeHarness(overrides: Partial<Harness> = {}): Harness {
  return {
    storage: new LocalStorageAdapter(),
    loadModel: vi.fn(async () => {}),
    onDecisionOpened: vi.fn(),
    mode: 'local',
    cloudDataLoaded: true,
    ...overrides,
  };
}

describe('useImportState — file pick and parsing phase', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('handleFileChange transitions through parsing phase', async () => {
    const harness = makeHarness();
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );

    expect(result.current.phase.tag).toBe('idle');
    expect(result.current.isBusy).toBe(false);

    // For a single envelope with no conflicts in local mode, AD-9 fires —
    // phase transitions parsing → applying → idle (auto-load).
    await act(async () => {
      await result.current.handleFileChange(makeChangeEvent(makeFile(envelope())));
    });

    await waitFor(() => {
      expect(result.current.phase.tag).toBe('idle');
    });
    expect(harness.loadModel).toHaveBeenCalledTimes(1);
    expect(harness.onDecisionOpened).toHaveBeenCalledTimes(1);
  });

  it('cloud mode suppresses AD-9 fast-path → preview shown', async () => {
    const harness = makeHarness({ mode: 'cloud' });
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );

    await act(async () => {
      await result.current.handleFileChange(makeChangeEvent(makeFile(envelope())));
    });

    expect(result.current.phase.tag).toBe('preview');
    expect(harness.loadModel).not.toHaveBeenCalled();
  });

  it('parse error → importError set, phase returns to idle', async () => {
    const harness = makeHarness();
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );

    await act(async () => {
      await result.current.handleFileChange(makeChangeEvent(makeFile({ foo: 'bar' })));
    });

    expect(result.current.phase.tag).toBe('idle');
    expect(result.current.importError).toMatch(/Unrecognized export format/);
  });
});

describe('useImportState — C1 reentrancy guard separation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('AD-9 fast-path actually writes (not falsely blocked by reentrancy guard)', async () => {
    // Regression test for Doc15-C1: prior R6 design pre-set applyActiveRef
    // before runApply, which caused the reentrancy guard inside runApply to
    // early-return and the write never happened. R7 separates the refs.
    const harness = makeHarness();
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );

    await act(async () => {
      await result.current.handleFileChange(makeChangeEvent(makeFile(envelope())));
    });

    await waitFor(() => {
      expect(result.current.phase.tag).toBe('idle');
    });
    // The fast-path must have actually performed a write — loadModel was called
    // with a non-empty modelId, and the storage now has exactly one model.
    expect(harness.loadModel).toHaveBeenCalledTimes(1);
    const list = await harness.storage.listModels();
    expect(list).toHaveLength(1);
  });
});

describe('useImportState — C2 bundle parse errors', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('bundle with mix of valid and invalid envelopes shows preview with both', async () => {
    const bundle = {
      spertAhpBundleVersion: 1,
      appVersion: '0.16.0',
      exportedAt: 0,
      models: [
        envelope(),
        envelope({ sourceModelId: 's2', meta: meta({ title: '' }) }), // empty title → parseError
      ],
    };
    const harness = makeHarness();
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );

    await act(async () => {
      await result.current.handleFileChange(makeChangeEvent(makeFile(bundle)));
    });

    expect(result.current.phase.tag).toBe('preview');
    if (result.current.phase.tag === 'preview' && result.current.phase.parsed.type === 'bundle') {
      expect(result.current.phase.parsed.envelopes).toHaveLength(1);
      expect(result.current.phase.parsed.parseErrors).toHaveLength(1);
    }
  });

  it('bundle with all-invalid envelopes transitions directly to banner', async () => {
    const bundle = {
      spertAhpBundleVersion: 1,
      appVersion: '0.16.0',
      exportedAt: 0,
      models: [
        envelope({ meta: meta({ title: '' }) }),
        envelope({ sourceModelId: 's2', meta: meta({ title: '' }) }),
      ],
    };
    const harness = makeHarness();
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );

    await act(async () => {
      await result.current.handleFileChange(makeChangeEvent(makeFile(bundle)));
    });

    expect(result.current.phase.tag).toBe('banner');
    if (result.current.phase.tag === 'banner') {
      expect(result.current.phase.result.ok).toBe(false);
      expect(result.current.phase.result.errorCount).toBe(2);
      expect(result.current.phase.result.abortReason).toMatch(/No valid decisions/);
    }
  });
});

describe('useImportState — H1 parsing phase / isBusy', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('isBusy is true in non-idle, non-banner phases', () => {
    const harness = makeHarness();
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );
    // Idle → not busy
    expect(result.current.isBusy).toBe(false);
  });

  it('handleDecisionChange is a no-op outside preview phase', () => {
    const harness = makeHarness();
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );
    act(() => {
      result.current.handleDecisionChange(0, 'replace');
    });
    expect(result.current.phase.tag).toBe('idle');
  });
});

describe('useImportState — preview → confirm flows', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('cancel from replace-confirm returns to preview', async () => {
    // Seed an existing model that the import will conflict with by ID
    const storage = new LocalStorageAdapter();
    await storage.createModel('source-model', meta({ title: 'Existing' }), structure());
    const harness = makeHarness({ storage, mode: 'cloud' });
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );

    await act(async () => {
      await result.current.handleFileChange(makeChangeEvent(makeFile(envelope())));
    });
    expect(result.current.phase.tag).toBe('preview');

    // Switch decision to replace
    act(() => {
      result.current.handleDecisionChange(0, 'replace');
    });

    act(() => {
      result.current.handleConfirmImport();
    });
    expect(result.current.phase.tag).toBe('replace-confirm');

    act(() => {
      result.current.handleCancelReplaceAll();
    });
    expect(result.current.phase.tag).toBe('preview');
  });

  it('handleConfirmImport without replace decisions goes straight to applying', async () => {
    const harness = makeHarness({ mode: 'cloud' }); // cloud → preview shown for single envelope
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );

    await act(async () => {
      await result.current.handleFileChange(makeChangeEvent(makeFile(envelope())));
    });

    await act(async () => {
      result.current.handleConfirmImport();
      // Let microtasks run for the void runApply to set applying then exit
      await Promise.resolve();
    });

    await waitFor(() => {
      // After apply completes for a single add with no skips: auto-load → idle
      expect(result.current.phase.tag).toBe('idle');
    });
    expect(harness.loadModel).toHaveBeenCalled();
  });
});

describe('useImportState — spert:models-changed dispatch', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('dispatches spert:models-changed on a successful write', async () => {
    const harness = makeHarness();
    const listener = vi.fn();
    window.addEventListener('spert:models-changed', listener);

    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );
    await act(async () => {
      await result.current.handleFileChange(makeChangeEvent(makeFile(envelope())));
    });
    await waitFor(() => {
      expect(result.current.phase.tag).toBe('idle');
    });
    expect(listener).toHaveBeenCalled();

    window.removeEventListener('spert:models-changed', listener);
  });
});

describe('useImportState — StrictMode mount safety (regression)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('runApply exit transition fires under StrictMode (isMountedRef false-positive regression)', async () => {
    // StrictMode in dev mounts → cleans up → re-mounts. Earlier code only
    // set isMountedRef.current=false in the cleanup, never =true in the
    // setup, so after the dev double-invoke the ref stayed false and
    // setPhase(banner) at runApply exit was silently swallowed. Live UI
    // appeared "stuck on Importing…" while the write actually completed.
    const harness = makeHarness();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.StrictMode, null, children);
    const { result } = renderHook(
      () => useImportState({ ...harness, userId: USER }),
      { wrapper },
    );

    // Bundle with one valid + one invalid envelope → preview phase (since
    // parseErrors > 0 suppresses AD-9 fast-path).
    const bundle = {
      spertAhpBundleVersion: 1, appVersion: '0.16.0', exportedAt: 0,
      models: [envelope(), envelope({ sourceModelId: 's2', meta: meta({ title: '' }) })],
    };
    await act(async () => {
      await result.current.handleFileChange(makeChangeEvent(makeFile(bundle)));
    });
    expect(result.current.phase.tag).toBe('preview');

    await act(async () => {
      result.current.handleConfirmImport();
      // Yield microtasks so the void runApply can complete.
      await new Promise((r) => setTimeout(r, 0));
    });

    // Must reach banner — not stuck in applying.
    await waitFor(() => {
      expect(result.current.phase.tag).toBe('banner');
    });
  });
});

describe('useImportState — banner dismiss', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('handleDismissBanner clears banner phase to idle', async () => {
    const harness = makeHarness();
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );

    // Force a banner via all-invalid bundle
    const bundle = {
      spertAhpBundleVersion: 1,
      appVersion: '0.16.0',
      exportedAt: 0,
      models: [envelope({ meta: meta({ title: '' }) })],
    };
    await act(async () => {
      await result.current.handleFileChange(makeChangeEvent(makeFile(bundle)));
    });
    expect(result.current.phase.tag).toBe('banner');

    act(() => {
      result.current.handleDismissBanner();
    });
    expect(result.current.phase.tag).toBe('idle');
    expect(result.current.importError).toBeNull();
  });
});

describe('useImportState — cloudDataLoaded gate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('isCloudNotReady is true when mode is cloud and cloudDataLoaded is false', () => {
    const harness = makeHarness({ mode: 'cloud', cloudDataLoaded: false });
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );
    expect(result.current.isCloudNotReady).toBe(true);
  });

  it('isCloudNotReady is false in local mode regardless of cloudDataLoaded', () => {
    const harness = makeHarness({ mode: 'local', cloudDataLoaded: false });
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );
    expect(result.current.isCloudNotReady).toBe(false);
  });

  it('isCloudNotReady is false when mode is cloud and cloudDataLoaded is true', () => {
    const harness = makeHarness({ mode: 'cloud', cloudDataLoaded: true });
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );
    expect(result.current.isCloudNotReady).toBe(false);
  });

  it('handleConfirmImport sets importError and stays in preview when isCloudNotReady', async () => {
    // Cloud mode suppresses the AD-9 fast-path; preview is always shown.
    const harness = makeHarness({ mode: 'cloud', cloudDataLoaded: false });
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );

    await act(async () => {
      await result.current.handleFileChange(makeChangeEvent(makeFile(envelope())));
    });
    expect(result.current.phase.tag).toBe('preview');

    act(() => {
      result.current.handleConfirmImport();
    });
    expect(result.current.phase.tag).toBe('preview');
    expect(result.current.importError).toMatch(/still loading/);
  });

  it('handleReplaceAllConfirmed sets importError and stays in replace-confirm when isCloudNotReady', async () => {
    // Start with cloudDataLoaded: true so handleConfirmImport can advance
    // to replace-confirm, then toggle to false to test the gate.
    const harness = makeHarness({ mode: 'cloud', cloudDataLoaded: true });
    const existingId = 'model-existing-1';
    await harness.storage.createModel(existingId, meta(), structure());

    const { result, rerender } = renderHook(
      ({ cdl }: { cdl: boolean }) =>
        useImportState({ ...harness, cloudDataLoaded: cdl, userId: USER }),
      { initialProps: { cdl: true } },
    );

    // Pick a file whose sourceModelId matches the existing model → ID conflict.
    await act(async () => {
      await result.current.handleFileChange(
        makeChangeEvent(makeFile(envelope({ sourceModelId: existingId }))),
      );
    });
    expect(result.current.phase.tag).toBe('preview');

    act(() => {
      result.current.handleDecisionChange(0, 'replace');
    });
    // cloudDataLoaded: true → handleConfirmImport passes its gate.
    act(() => {
      result.current.handleConfirmImport();
    });
    expect(result.current.phase.tag).toBe('replace-confirm');

    // Toggle to false — simulates cloud data becoming unavailable mid-flow.
    rerender({ cdl: false });

    act(() => {
      result.current.handleReplaceAllConfirmed();
    });
    expect(result.current.phase.tag).toBe('replace-confirm');
    expect(result.current.importError).toMatch(/still loading/);
  });
});

describe('useImportState — runApply finally block regression (pitfall #27)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('isBusy false and phase idle after applyImportMerge rejects', async () => {
    // Cloud mode + cloudDataLoaded: true: AD-9 fast-path suppressed,
    // preview is shown, confirm-time guard passes.
    const harness = makeHarness({ mode: 'cloud', cloudDataLoaded: true });
    const { result } = renderHook(() =>
      useImportState({ ...harness, userId: USER }),
    );

    await act(async () => {
      await result.current.handleFileChange(makeChangeEvent(makeFile(envelope())));
    });
    expect(result.current.phase.tag).toBe('preview');

    // applyImportMerge's first await is storage.listModels() (Layer 2 re-fetch).
    // Rejecting it causes applyImportMerge to throw, exercising the finally block.
    vi.spyOn(harness.storage, 'listModels').mockRejectedValueOnce(
      new Error('Network failure'),
    );

    await act(async () => {
      result.current.handleConfirmImport();
    });

    expect(result.current.isBusy).toBe(false);
    expect(result.current.phase.tag).toBe('idle');
    expect(result.current.importError).toMatch(/Network failure/);
  });
});
