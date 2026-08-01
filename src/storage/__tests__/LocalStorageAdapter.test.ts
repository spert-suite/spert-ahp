// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from '../LocalStorageAdapter';
import { ERROR_CODES } from '../../core/models/constants';
import {
  createModelDoc,
  createStructureDoc,
  createCollaboratorDoc,
  createResponseDoc,
} from '../../core/models/AHPModel';
import type { CollaboratorDoc, DisagreementConfig, SynthesisBundle } from '../../types/ahp';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  // ─── Model CRUD ──────────────────────────────────────────────

  describe('model CRUD', () => {
    it('create and retrieve a model', async () => {
      const meta = createModelDoc('Test', 'Goal', 'user1');
      const structure = createStructureDoc();
      await adapter.createModel('m1', meta, structure);

      const result = await adapter.getModel('m1');
      expect(result).not.toBeNull();
      expect(result!.meta.title).toBe('Test');
      expect(result!.structure.structureVersion).toBe(0);
    });

    it('getModel returns null for nonexistent', async () => {
      expect(await adapter.getModel('nope')).toBeNull();
    });

    it('updateModel merges fields', async () => {
      const meta = createModelDoc('Test', 'Goal', 'user1');
      await adapter.createModel('m1', meta, createStructureDoc());
      await adapter.updateModel('m1', { status: 'open' });

      const result = await adapter.getModel('m1');
      expect(result!.meta.status).toBe('open');
      expect(result!.meta.title).toBe('Test'); // unchanged
    });

    it('updateModel deep merges disagreementConfig', async () => {
      const meta = createModelDoc('Test', 'Goal', 'user1');
      await adapter.createModel('m1', meta, createStructureDoc());
      await adapter.updateModel('m1', {
        disagreementConfig: { thresholds: { agreement: 0.20 } } as unknown as DisagreementConfig,
      });

      const result = await adapter.getModel('m1');
      expect(result!.meta.disagreementConfig.thresholds.agreement).toBe(0.20);
      // mild should still exist from preset
      expect(result!.meta.disagreementConfig.thresholds.mild).toBe(0.35);
    });

    it('updateModel allows tier change with empty response (no comparisons)', async () => {
      const meta = createModelDoc('Test', 'Goal', 'user1');
      await adapter.createModel('m1', meta, createStructureDoc());
      await adapter.createResponse('m1', createResponseDoc('user1'));

      // Empty response doc (no actual comparisons) should NOT lock the tier
      await adapter.updateModel('m1', { completionTier: 2 });
      expect((await adapter.getModel('m1'))!.meta.completionTier).toBe(2);
    });

    it('updateModel TIER_LOCKED when actual comparisons exist', async () => {
      const meta = createModelDoc('Test', 'Goal', 'user1');
      await adapter.createModel('m1', meta, createStructureDoc());
      await adapter.createResponse('m1', createResponseDoc('user1'));

      // Save actual comparison data
      await adapter.saveComparisons('m1', 'user1', 'criteria', { '0,1': 3 });

      try {
        await adapter.updateModel('m1', { completionTier: 2 });
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as { code: string }).code).toBe(ERROR_CODES.TIER_LOCKED);
      }
    });

    it('updateModel allows same tier even with comparisons', async () => {
      const meta = createModelDoc('Test', 'Goal', 'user1');
      await adapter.createModel('m1', meta, createStructureDoc());
      await adapter.createResponse('m1', createResponseDoc('user1'));
      await adapter.saveComparisons('m1', 'user1', 'criteria', { '0,1': 3 });

      // Same tier should not throw
      await adapter.updateModel('m1', { completionTier: 4 });
      expect((await adapter.getModel('m1'))!.meta.completionTier).toBe(4);
    });

    it('deleteModel removes all data', async () => {
      await adapter.createModel('m1', createModelDoc('T', 'G', 'u'), createStructureDoc());
      await adapter.deleteModel('m1');
      expect(await adapter.getModel('m1')).toBeNull();
      expect(await adapter.listModels()).toEqual([]);
    });

    it('listModels returns index', async () => {
      await adapter.createModel('m1', createModelDoc('A', 'G', 'u'), createStructureDoc());
      await adapter.createModel('m2', createModelDoc('B', 'G', 'u'), createStructureDoc());
      const list = await adapter.listModels();
      expect(list.length).toBe(2);
      expect(list[0]!.title).toBe('A');
      expect(list[1]!.title).toBe('B');
    });

    it('listModels returns role=owner for every entry (local mode)', async () => {
      await adapter.createModel('m1', createModelDoc('A', 'G', 'u'), createStructureDoc());
      const list = await adapter.listModels();
      expect(list[0]!.role).toBe('owner');
    });
  });

  // ─── replaceModelFromBundle (v0.16.0) ───────────────────────────────
  describe('replaceModelFromBundle', () => {
    it('throws when the model does not exist (no orphan write)', async () => {
      const bundle = {
        meta: createModelDoc('New', 'G', 'u'),
        structure: createStructureDoc(),
        collaborators: [createCollaboratorDoc('u', 'owner', true)],
        responses: { u: createResponseDoc('u') },
        synthesis: null,
      };
      await expect(
        adapter.replaceModelFromBundle('does-not-exist', bundle),
      ).rejects.toThrow(/not found/);
    });

    it('preserves order, createdAt, createdBy, _originRef from existing meta', async () => {
      const originalMeta = createModelDoc('Original', 'G', 'original-user');
      originalMeta.createdAt = 1_000_000;
      originalMeta._originRef = 'original-workspace';
      await adapter.createModel('m1', originalMeta, createStructureDoc());

      const bundle = {
        meta: { ...createModelDoc('Replaced', 'NewGoal', 'importer'), createdAt: 9_999_999, _originRef: 'importer-workspace' },
        structure: createStructureDoc(),
        collaborators: [createCollaboratorDoc('importer', 'owner', true)],
        responses: { importer: createResponseDoc('importer') },
        synthesis: null,
      };
      await adapter.replaceModelFromBundle('m1', bundle);

      const loaded = await adapter.getModel('m1');
      expect(loaded!.meta.title).toBe('Replaced');
      expect(loaded!.meta.goal).toBe('NewGoal');
      // Identity fields preserved from existing
      expect(loaded!.meta.createdAt).toBe(1_000_000);
      expect(loaded!.meta.createdBy).toBe('original-user');
      expect(loaded!.meta._originRef).toBe('original-workspace');
    });

    it('clears old collaborators and responses, writes new ones from bundle', async () => {
      await adapter.createModel('m1', createModelDoc('A', 'G', 'old-user'), createStructureDoc());
      await adapter.addCollaborator('m1', createCollaboratorDoc('stale-user', 'editor', true));
      await adapter.createResponse('m1', createResponseDoc('stale-user'));

      const bundle = {
        meta: createModelDoc('Replaced', 'G', 'importer'),
        structure: createStructureDoc(),
        collaborators: [createCollaboratorDoc('importer', 'owner', true)],
        responses: { importer: createResponseDoc('importer') },
        synthesis: null,
      };
      await adapter.replaceModelFromBundle('m1', bundle);

      const collabs = await adapter.getCollaborators('m1');
      expect(collabs.map((c) => c.userId)).toEqual(['importer']);
      expect(await adapter.getResponse('m1', 'stale-user')).toBeNull();
      expect(await adapter.getResponse('m1', 'importer')).not.toBeNull();
    });

    it('updates title/status in modelIndex while preserving order', async () => {
      await adapter.createModel('m1', createModelDoc('A', 'G', 'u'), createStructureDoc());
      await adapter.createModel('m2', createModelDoc('B', 'G', 'u'), createStructureDoc());

      const bundle = {
        meta: { ...createModelDoc('A-Replaced', 'G', 'u'), status: 'closed' as const },
        structure: createStructureDoc(),
        collaborators: [createCollaboratorDoc('u', 'owner', true)],
        responses: { u: createResponseDoc('u') },
        synthesis: null,
      };
      await adapter.replaceModelFromBundle('m1', bundle);

      const list = await adapter.listModels();
      expect(list[0]!.modelId).toBe('m1');
      expect(list[0]!.title).toBe('A-Replaced');
      expect(list[0]!.status).toBe('closed');
      expect(list[1]!.modelId).toBe('m2');
    });
  });

  // ─── Comparisons ─────────────────────────────────────────────

  describe('comparisons', () => {
    beforeEach(async () => {
      await adapter.createModel('m1', createModelDoc('T', 'G', 'u'), createStructureDoc());
      await adapter.createResponse('m1', createResponseDoc('user1'));
    });

    it('saveComparisons throws on j<=i', async () => {
      await expect(
        adapter.saveComparisons('m1', 'user1', 'criteria', { '1,0': 3 })
      ).rejects.toThrow();
    });

    it('saveComparisons and getComparisons round-trip', async () => {
      await adapter.saveComparisons('m1', 'user1', 'criteria', { '0,1': 3, '0,2': 5 });
      const result = await adapter.getComparisons('m1', 'user1', 'criteria');
      expect(result['0,1']).toBe(3);
      expect(result['0,2']).toBe(5);
    });

    it('getComparisons returns upper-triangle only', async () => {
      await adapter.saveComparisons('m1', 'user1', 'criteria', { '0,1': 3 });
      const result = await adapter.getComparisons('m1', 'user1', 'criteria');
      // Only '0,1' should exist, not '1,0'
      expect(Object.keys(result)).toEqual(['0,1']);
    });

    it('saveComparisons for alternative layer', async () => {
      await adapter.saveComparisons('m1', 'user1', 'crit-1', { '0,1': 7 });
      const result = await adapter.getComparisons('m1', 'user1', 'crit-1');
      expect(result['0,1']).toBe(7);
    });

    it('getComparisons returns empty for no response', async () => {
      const result = await adapter.getComparisons('m1', 'nouser', 'criteria');
      expect(result).toEqual({});
    });
  });

  // ─── Synthesis ───────────────────────────────────────────────

  describe('synthesis', () => {
    it('save and retrieve synthesis documents', async () => {
      await adapter.createModel('m1', createModelDoc('T', 'G', 'u'), createStructureDoc());
      const docs = {
        summary: { method: 'AIJ', synthesizedAt: Date.now() },
        individual: { user1: { weights: [0.5, 0.3, 0.2] } },
        diagnostics: { items: [] },
      } as unknown as Partial<SynthesisBundle>;
      await adapter.saveSynthesis('m1', 'syn1', docs);
      const result = await adapter.getSynthesis('m1', 'syn1');
      expect(result!.summary.method).toBe('AIJ');
      expect((result!.individual as unknown as { user1: { weights: number[] } }).user1.weights).toEqual([0.5, 0.3, 0.2]);
    });

    it('getSynthesis returns null for nonexistent', async () => {
      await adapter.createModel('m1', createModelDoc('T', 'G', 'u'), createStructureDoc());
      expect(await adapter.getSynthesis('m1', 'nope')).toBeNull();
    });
  });

  // ─── Collaborators ──────────────────────────────────────────

  describe('collaborators', () => {
    it('add and retrieve collaborators', async () => {
      await adapter.createModel('m1', createModelDoc('T', 'G', 'u'), createStructureDoc());
      await adapter.addCollaborator('m1', createCollaboratorDoc('user1', 'owner', true));
      await adapter.addCollaborator('m1', createCollaboratorDoc('user2', 'editor', true));

      const collabs = await adapter.getCollaborators('m1');
      expect(collabs.length).toBe(2);
      expect(collabs[0]!.userId).toBe('user1');
      expect(collabs[1]!.userId).toBe('user2');
    });

    // Regression: v0.8.2 — addCollaborator must initialize a response slot
    // for the new collaborator. Without it, the collaborator's first
    // saveComparisons call throws "Response not found" and their judgments
    // never reach storage. See PR #20.
    it('addCollaborator creates a response slot for the new collaborator', async () => {
      await adapter.createModel('m1', createModelDoc('T', 'G', 'u'), createStructureDoc());
      await adapter.addCollaborator('m1', createCollaboratorDoc('student1', 'editor', true));

      const response = await adapter.getResponse('m1', 'student1');
      expect(response).not.toBeNull();
      expect(response!.userId).toBe('student1');
      expect(response!.criteriaMatrix).toEqual({});
      expect(response!.alternativeMatrices).toEqual({});
    });

    it('addCollaborator + saveComparisons works without explicit createResponse', async () => {
      await adapter.createModel('m1', createModelDoc('T', 'G', 'u'), createStructureDoc());
      await adapter.addCollaborator('m1', createCollaboratorDoc('student1', 'editor', true));

      // The bug was that this threw "Response for student1 not found".
      await expect(
        adapter.saveComparisons('m1', 'student1', 'criteria', { '0,1': 3 }),
      ).resolves.not.toThrow();

      const result = await adapter.getComparisons('m1', 'student1', 'criteria');
      expect(result['0,1']).toBe(3);
    });

    it('addCollaborator preserves an existing response slot on re-add', async () => {
      await adapter.createModel('m1', createModelDoc('T', 'G', 'u'), createStructureDoc());
      await adapter.addCollaborator('m1', createCollaboratorDoc('student1', 'editor', true));
      await adapter.saveComparisons('m1', 'student1', 'criteria', { '0,1': 5 });

      // Re-adding the same user (e.g., role change via add-then-update flow)
      // must not wipe their existing judgments.
      await adapter.addCollaborator('m1', createCollaboratorDoc('student1', 'editor', true));

      const result = await adapter.getComparisons('m1', 'student1', 'criteria');
      expect(result['0,1']).toBe(5);
    });
  });

  // ─── Subscriptions (Phase 1 no-ops) ────────────────────────

  describe('subscriptions', () => {
    it('subscribeModel returns no-op unsubscribe', () => {
      const unsub = adapter.subscribeModel('m1', () => {});
      expect(typeof unsub).toBe('function');
      unsub(); // should not throw
    });

  });

  // ─── Schema version ────────────────────────────────────────

  describe('schema version', () => {
    it('sets schema version on construction', () => {
      expect(localStorage.getItem('ahp/schemaVersion')).toBe('1');
    });
  });

  // ─── Invitations (cloud-only stubs) ────────────────────────

  describe('invitation stubs', () => {
    it('listPendingInvites returns empty array (no cloud invites in local mode)', async () => {
      expect(await adapter.listPendingInvites('m1')).toEqual([]);
    });

    it('revokeInvite is a silent no-op in local mode', async () => {
      await expect(adapter.revokeInvite('any-token-id')).resolves.toBeUndefined();
    });

    it('resendInvite is a silent no-op in local mode', async () => {
      await expect(adapter.resendInvite('any-token-id')).resolves.toBeUndefined();
    });

    it('removeCollaborator drops the doc and prunes the list', async () => {
      const meta = createModelDoc('Test', 'Goal', 'owner');
      await adapter.createModel('m1', meta, createStructureDoc());
      const collab: CollaboratorDoc = createCollaboratorDoc('alice', 'editor', true);
      await adapter.addCollaborator('m1', collab);

      expect((await adapter.getCollaborators('m1')).map((c) => c.userId)).toEqual([
        'alice',
      ]);
      await adapter.removeCollaborator('m1', 'alice');
      expect(await adapter.getCollaborators('m1')).toEqual([]);
    });

    it('removeCollaborator is a no-op for unknown users', async () => {
      const meta = createModelDoc('Test', 'Goal', 'owner');
      await adapter.createModel('m1', meta, createStructureDoc());
      // Should not throw even though no collaborators exist.
      await expect(adapter.removeCollaborator('m1', 'ghost')).resolves.toBeUndefined();
    });

    // Lesson 28 — gates the cloud auto-flip on invite-link landing.
    it('hasLocalProjects returns false when modelIndex is empty', async () => {
      // Fresh adapter — schemaVersion key is set, but no modelIndex yet.
      expect(await adapter.hasLocalProjects()).toBe(false);
    });

    it('hasLocalProjects returns true after a model is created', async () => {
      await adapter.createModel('m1', createModelDoc('Test', 'Goal', 'owner'), createStructureDoc());
      expect(await adapter.hasLocalProjects()).toBe(true);
    });
  });
});
