// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAHP } from '../useAHP';
import { TestProviders } from '../../__tests__/test-utils';

describe('useAHP', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a model with correct defaults', async () => {
    const { result } = renderHook(() => useAHP('test-user'), { wrapper: TestProviders });

    await act(async () => {
      await result.current.createModel('Test Decision', 'Find the best option');
    });

    expect(result.current.modelId).toBeTruthy();
    expect(result.current.model!.title).toBe('Test Decision');
    expect(result.current.model!.status).toBe('setup');
    expect(result.current.model!.completionTier).toBe(4);
    expect(result.current.model!.synthesisStatus).toBeNull();
    expect(result.current.structure!.criteria).toEqual([]);
    expect(result.current.structure!.alternatives).toEqual([]);
    expect(result.current.collaborators.length).toBe(1);
    expect(result.current.collaborators[0]!.role).toBe('owner');
    expect(result.current.collaborators[0]!.isVoting).toBe(true);
  });

  it('updates structure', async () => {
    const { result } = renderHook(() => useAHP('test-user'), { wrapper: TestProviders });

    await act(async () => {
      await result.current.createModel('Test', 'Goal');
    });

    const newStructure = {
      criteria: [
        { id: 'c1', label: 'Cost', description: '' },
        { id: 'c2', label: 'Quality', description: '' },
      ],
      alternatives: [
        { id: 'a1', label: 'Option A', description: '' },
        { id: 'a2', label: 'Option B', description: '' },
      ],
      structureVersion: 1,
    };

    await act(async () => {
      await result.current.updateStructure(newStructure);
    });

    expect(result.current.structure!.criteria.length).toBe(2);
    expect(result.current.structure!.alternatives.length).toBe(2);
  });

  it('saves and retrieves comparisons', async () => {
    const { result } = renderHook(() => useAHP('test-user'), { wrapper: TestProviders });

    await act(async () => {
      await result.current.createModel('Test', 'Goal');
    });

    await act(async () => {
      await result.current.saveComparisons('criteria', { '0,1': 3 });
    });

    // Verify through storage
    const comp = await result.current.storage.getComparisons(
      result.current.modelId!,
      'test-user',
      'criteria',
    );
    expect(comp['0,1']).toBe(3);
  });

  it('loads a previously created model', async () => {
    const { result: r1 } = renderHook(() => useAHP('test-user'), { wrapper: TestProviders });
    let modelId: string | undefined;

    await act(async () => {
      modelId = await r1.current.createModel('Saved Model', 'Test persistence');
    });

    // New hook instance loading existing model
    const { result: r2 } = renderHook(() => useAHP('test-user'), { wrapper: TestProviders });

    await act(async () => {
      await r2.current.loadModel(modelId!);
    });

    expect(r2.current.model!.title).toBe('Saved Model');
    expect(r2.current.collaborators.length).toBe(1);
  });

  it('deletes a model', async () => {
    const { result } = renderHook(() => useAHP('test-user'), { wrapper: TestProviders });

    await act(async () => {
      await result.current.createModel('To Delete', 'Goal');
    });

    await act(async () => {
      await result.current.deleteModel();
    });

    expect(result.current.modelId).toBeNull();
    expect(result.current.model).toBeNull();
  });

  // Regression: v0.8.2 — when a collaborator opens a shared model and finds
  // no response slot for themselves (legacy data created before
  // addCollaborator initialized the slot), loadModel must self-heal by
  // creating one. Without this, their first saveComparisons throws.
  // See PR #20.
  it('loadModel self-heals a missing response slot for a current-user collaborator', async () => {
    // Owner creates the model and adds a second collaborator
    const { result: owner } = renderHook(() => useAHP('owner-user'), { wrapper: TestProviders });
    let modelId: string | undefined;
    await act(async () => {
      modelId = await owner.current.createModel('Shared Decision', 'Goal');
    });
    await act(async () => {
      await owner.current.storage.addCollaborator(modelId!, {
        userId: 'student-user',
        role: 'editor',
        isVoting: true,
      });
    });

    // Simulate legacy data: remove the student's response slot, leaving
    // them in the collaborator list but with no response storage.
    localStorage.removeItem(`ahp/models/${modelId}/responses/student-user`);
    const responseListKey = `ahp/models/${modelId}/responseList`;
    const list: string[] = JSON.parse(localStorage.getItem(responseListKey) ?? '[]');
    localStorage.setItem(
      responseListKey,
      JSON.stringify(list.filter((u) => u !== 'student-user')),
    );

    // Sanity: the slot really is gone.
    expect(await owner.current.storage.getResponse(modelId!, 'student-user')).toBeNull();

    // Student opens the model — loadModel should self-heal.
    const { result: student } = renderHook(() => useAHP('student-user'), { wrapper: TestProviders });
    await act(async () => {
      await student.current.loadModel(modelId!);
    });

    const healedResponse = await student.current.storage.getResponse(modelId!, 'student-user');
    expect(healedResponse).not.toBeNull();
    expect(healedResponse!.userId).toBe('student-user');

    // And saveComparisons now works for them.
    await act(async () => {
      await student.current.saveComparisons('criteria', { '0,1': 4 });
    });
    const result = await student.current.storage.getComparisons(modelId!, 'student-user', 'criteria');
    expect(result['0,1']).toBe(4);
  });

  // Regression: v0.12.1 — loadModel previously had `[storage]` as its
  // useCallback dep array, omitting `userId`. After a rerender with a new
  // userId (e.g. sign-out + sign-in within the same React tree), loadModel
  // closed over the original userId and the self-heal logic operated on
  // the wrong slot. Fix: include userId in the dep array.
  it('loadModel uses the current userId after the hook is re-rendered with a new userId', async () => {
    // Owner creates the model and adds 'user-b' as an editor.
    const { result: owner } = renderHook(() => useAHP('owner-user'), { wrapper: TestProviders });
    let modelId: string | undefined;
    await act(async () => {
      modelId = await owner.current.createModel('Shared Decision', 'Goal');
    });
    await act(async () => {
      await owner.current.storage.addCollaborator(modelId!, {
        userId: 'user-b',
        role: 'editor',
        isVoting: true,
      });
    });

    // Wipe user-b's response slot so loadModel must self-heal it.
    localStorage.removeItem(`ahp/models/${modelId}/responses/user-b`);
    const responseListKey = `ahp/models/${modelId}/responseList`;
    const list: string[] = JSON.parse(localStorage.getItem(responseListKey) ?? '[]');
    localStorage.setItem(
      responseListKey,
      JSON.stringify(list.filter((u) => u !== 'user-b')),
    );

    // Render useAHP under a non-member user first, then rerender as user-b
    // (the actual collaborator). Pre-fix, loadModel would close over the
    // initial 'user-a' (a non-member) and skip self-heal entirely.
    const { result: hook, rerender } = renderHook(({ uid }: { uid: string }) => useAHP(uid), {
      wrapper: TestProviders,
      initialProps: { uid: 'user-a' },
    });
    rerender({ uid: 'user-b' });

    await act(async () => {
      await hook.current.loadModel(modelId!);
    });

    // Bug-present behavior would leave user-b's slot still missing.
    const healed = await hook.current.storage.getResponse(modelId!, 'user-b');
    expect(healed).not.toBeNull();
    expect(healed!.userId).toBe('user-b');
  });

  it('marks synthesis out_of_date when comparisons change after current', async () => {
    const { result } = renderHook(() => useAHP('test-user'), { wrapper: TestProviders });

    await act(async () => {
      await result.current.createModel('Test', 'Goal');
    });

    // Simulate synthesisStatus = 'current'
    await act(async () => {
      await result.current.updateModel({ synthesisStatus: 'current' });
    });

    expect(result.current.model!.synthesisStatus).toBe('current');

    await act(async () => {
      await result.current.saveComparisons('criteria', { '0,1': 5 });
    });

    expect(result.current.model!.synthesisStatus).toBe('out_of_date');
  });
});
