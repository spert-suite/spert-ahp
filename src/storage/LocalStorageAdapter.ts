// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { CURRENT_SCHEMA_VERSION, ERROR_CODES } from '../core/models/constants';
import { getOrCreateWorkspaceId } from '../hooks/useSession';
import type {
  StorageAdapter,
  ModelDoc,
  StructureDoc,
  CollaboratorDoc,
  ResponseDoc,
  ModelIndexEntry,
  ComparisonMap,
  SynthesisBundle,
  AHPExportBundle,
  PendingInvite,
} from '../types/ahp';

const PREFIX = 'ahp';

function key(...parts: string[]): string {
  return `${PREFIX}/${parts.join('/')}`;
}

function getJSON<T>(k: string): T | null {
  const raw = localStorage.getItem(k);
  return raw ? (JSON.parse(raw) as T) : null;
}

function setJSON(k: string, value: unknown): void {
  localStorage.setItem(k, JSON.stringify(value));
}

function removeKey(k: string): void {
  localStorage.removeItem(k);
}

function validateUpperTriangle(comparisons: ComparisonMap): void {
  for (const ck of Object.keys(comparisons)) {
    const [i, j] = ck.split(',').map(Number) as [number, number];
    if (j <= i) {
      throw new Error(`saveComparisons: invalid key '${ck}' — j must be > i (upper-triangle only)`);
    }
  }
}

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target } as Record<string, unknown>;
  for (const k of Object.keys(source)) {
    const sv = source[k as keyof T];
    const tv = target[k as keyof T];
    if (
      sv !== null &&
      typeof sv === 'object' &&
      !Array.isArray(sv) &&
      tv !== null &&
      typeof tv === 'object' &&
      !Array.isArray(tv)
    ) {
      result[k] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      result[k] = sv;
    }
  }
  return result as T;
}

interface CodedError extends Error {
  code?: string;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor() {
    this._ensureSchemaVersion();
  }

  private _ensureSchemaVersion(): void {
    const version = localStorage.getItem(`${PREFIX}/schemaVersion`);
    if (!version) {
      localStorage.setItem(`${PREFIX}/schemaVersion`, String(CURRENT_SCHEMA_VERSION));
    }
  }

  // ─── Model CRUD ──────────────────────────────────────────────────

  async createModel(modelId: string, metaDoc: ModelDoc, structureDoc: StructureDoc): Promise<void> {
    setJSON(key('models', modelId, 'meta'), metaDoc);
    setJSON(key('models', modelId, 'structure'), structureDoc);

    const index = getJSON<ModelIndexEntry[]>(key('modelIndex')) ?? [];
    const nextOrder = index.reduce((max, e) => Math.max(max, e.order ?? -1), -1) + 1;
    index.push({
      modelId,
      title: metaDoc.title,
      status: metaDoc.status,
      createdAt: metaDoc.createdAt,
      order: nextOrder,
      role: 'owner',
    });
    setJSON(key('modelIndex'), index);
  }

  async createModelFromBundle(modelId: string, bundle: AHPExportBundle): Promise<void> {
    await this.createModel(modelId, bundle.meta, bundle.structure);

    for (const c of bundle.collaborators) {
      await this.addCollaborator(modelId, c);
    }

    for (const responseDoc of Object.values(bundle.responses)) {
      await this.createResponse(modelId, responseDoc);
    }

    if (bundle.synthesis && bundle.meta.publishedSynthesisId) {
      await this.saveSynthesis(modelId, bundle.meta.publishedSynthesisId, bundle.synthesis);
    }
  }

  async replaceModelFromBundle(existingModelId: string, bundle: AHPExportBundle): Promise<void> {
    const existingMeta = getJSON<ModelDoc>(key('models', existingModelId, 'meta'));
    // Guard: throw if the model does not exist rather than silently creating
    // an orphan doc without a matching modelIndex entry.
    if (!existingMeta) {
      throw new Error(`replaceModelFromBundle: model ${existingModelId} not found in local storage.`);
    }

    // Preserve identity fields from existing meta — consistent with the
    // Firestore adapter. _changeLog comes from the bundle (provenance).
    const preservedMeta: ModelDoc = {
      ...bundle.meta,
      createdAt: existingMeta.createdAt,
      createdBy: existingMeta.createdBy,
      _originRef: existingMeta._originRef,
    };
    setJSON(key('models', existingModelId, 'meta'), preservedMeta);
    setJSON(key('models', existingModelId, 'structure'), bundle.structure);

    // Clear existing collaborator and response lists, then rewrite.
    const oldCollabList = getJSON<string[]>(key('models', existingModelId, 'collaboratorList')) ?? [];
    for (const uid of oldCollabList) {
      removeKey(key('models', existingModelId, 'collaborators', uid));
    }
    setJSON(key('models', existingModelId, 'collaboratorList'), []);

    const oldResponseList = getJSON<string[]>(key('models', existingModelId, 'responseList')) ?? [];
    for (const uid of oldResponseList) {
      removeKey(key('models', existingModelId, 'responses', uid));
    }
    setJSON(key('models', existingModelId, 'responseList'), []);

    // addCollaborator creates a fresh empty response slot as a side-effect.
    // The subsequent createResponse loop overwrites that slot with the actual
    // response doc. Two writes per key — functionally correct; do not remove
    // the createResponse loop thinking addCollaborator is sufficient.
    for (const c of bundle.collaborators) {
      await this.addCollaborator(existingModelId, c);
    }
    for (const responseDoc of Object.values(bundle.responses)) {
      await this.createResponse(existingModelId, responseDoc);
    }
    if (bundle.synthesis && bundle.meta.publishedSynthesisId) {
      await this.saveSynthesis(existingModelId, bundle.meta.publishedSynthesisId, bundle.synthesis);
    }

    // Preserve order and role; update title/status in modelIndex.
    const index = getJSON<ModelIndexEntry[]>(key('modelIndex')) ?? [];
    const entry = index.find((e) => e.modelId === existingModelId);
    if (entry) {
      entry.title = bundle.meta.title;
      entry.status = bundle.meta.status;
      setJSON(key('modelIndex'), index);
    }
  }

  async getModel(modelId: string): Promise<{ meta: ModelDoc; structure: StructureDoc } | null> {
    const meta = getJSON<ModelDoc>(key('models', modelId, 'meta'));
    if (!meta) return null;
    // Backwards compat: fill in fingerprinting fields on read for pre-v0.2.0 models.
    // Read-only fill — do not write back (keeps reads idempotent).
    if (!meta._originRef) meta._originRef = getOrCreateWorkspaceId();
    if (!meta._changeLog) meta._changeLog = [];
    if (!meta.resultsVisibility) meta.resultsVisibility = { showAggregatedToVoters: false, showOwnRankingsToVoters: true };
    const structure = getJSON<StructureDoc>(key('models', modelId, 'structure'))!;
    return { meta, structure };
  }

  async updateModel(modelId: string, partialMeta: Partial<ModelDoc>): Promise<void> {
    const meta = getJSON<ModelDoc>(key('models', modelId, 'meta'));
    if (!meta) throw new Error(`Model ${modelId} not found`);

    if (
      'completionTier' in partialMeta &&
      partialMeta.completionTier !== meta.completionTier
    ) {
      const responsesExist = this._hasAnyResponses(modelId);
      if (responsesExist) {
        const err: CodedError = new Error('Cannot change completionTier after responses exist');
        err.code = ERROR_CODES.TIER_LOCKED;
        throw err;
      }
    }

    const merged = deepMerge(meta as unknown as Record<string, unknown>, partialMeta as unknown as Record<string, unknown>);
    setJSON(key('models', modelId, 'meta'), merged);

    const index = getJSON<ModelIndexEntry[]>(key('modelIndex')) ?? [];
    const entry = index.find((e) => e.modelId === modelId);
    if (entry) {
      if ('title' in partialMeta) entry.title = partialMeta.title!;
      if ('status' in partialMeta) entry.status = partialMeta.status!;
      setJSON(key('modelIndex'), index);
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    const prefix = key('models', modelId);
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) removeKey(k);

    const index = getJSON<ModelIndexEntry[]>(key('modelIndex')) ?? [];
    const filtered = index.filter((e) => e.modelId !== modelId);
    setJSON(key('modelIndex'), filtered);
  }

  async listModels(): Promise<ModelIndexEntry[]> {
    const entries = getJSON<ModelIndexEntry[]>(key('modelIndex')) ?? [];
    // Local mode: the device-owner created every entry. role is always 'owner'.
    // The map ensures legacy entries persisted before v0.16.0 also carry the field.
    return entries
      .map((e) => ({ ...e, role: 'owner' as const }))
      .sort((a, b) => {
        const ao = a.order ?? Number.MAX_SAFE_INTEGER;
        const bo = b.order ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return a.createdAt - b.createdAt;
      });
  }

  async reorderModels(orderedIds: string[]): Promise<void> {
    const index = getJSON<ModelIndexEntry[]>(key('modelIndex')) ?? [];
    const positionByModelId = new Map<string, number>();
    orderedIds.forEach((id, idx) => positionByModelId.set(id, idx));
    for (const entry of index) {
      const pos = positionByModelId.get(entry.modelId);
      if (pos !== undefined) entry.order = pos;
    }
    setJSON(key('modelIndex'), index);
  }

  // ─── Structure ───────────────────────────────────────────────────

  async getStructure(modelId: string): Promise<StructureDoc | null> {
    return getJSON<StructureDoc>(key('models', modelId, 'structure'));
  }

  async updateStructure(modelId: string, structureDoc: StructureDoc): Promise<void> {
    setJSON(key('models', modelId, 'structure'), structureDoc);
  }

  // ─── Collaborators ──────────────────────────────────────────────

  async addCollaborator(modelId: string, collaboratorDoc: CollaboratorDoc): Promise<void> {
    const k = key('models', modelId, 'collaborators', collaboratorDoc.userId);
    setJSON(k, collaboratorDoc);

    const listKey = key('models', modelId, 'collaboratorList');
    const list = getJSON<string[]>(listKey) ?? [];
    if (!list.includes(collaboratorDoc.userId)) {
      list.push(collaboratorDoc.userId);
      setJSON(listKey, list);
    }

    // Mirror FirestoreAdapter: ensure a response slot exists so the new
    // collaborator's first saveComparisons call doesn't throw "Response not
    // found". Preserve any pre-existing slot.
    const responseKey = key('models', modelId, 'responses', collaboratorDoc.userId);
    if (getJSON<ResponseDoc>(responseKey) === null) {
      const fresh: ResponseDoc = {
        userId: collaboratorDoc.userId,
        status: 'in_progress',
        criteriaMatrix: {},
        alternativeMatrices: {},
        cr: {},
        lastModifiedAt: Date.now(),
        structureVersionAtSubmission: 0,
      };
      setJSON(responseKey, fresh);
      const responseListKey = key('models', modelId, 'responseList');
      const responseList = getJSON<string[]>(responseListKey) ?? [];
      if (!responseList.includes(collaboratorDoc.userId)) {
        responseList.push(collaboratorDoc.userId);
        setJSON(responseListKey, responseList);
      }
    }
  }

  async getCollaborators(modelId: string): Promise<CollaboratorDoc[]> {
    const listKey = key('models', modelId, 'collaboratorList');
    const list = getJSON<string[]>(listKey) ?? [];
    return list
      .map((userId) => getJSON<CollaboratorDoc>(key('models', modelId, 'collaborators', userId)))
      .filter((c): c is CollaboratorDoc => c !== null);
  }

  async updateCollaborator(modelId: string, userId: string, partial: Partial<CollaboratorDoc>): Promise<void> {
    const k = key('models', modelId, 'collaborators', userId);
    const current = getJSON<CollaboratorDoc>(k);
    if (!current) throw new Error(`Collaborator ${userId} not found`);
    setJSON(k, { ...current, ...partial });
  }

  async removeCollaborator(modelId: string, userId: string): Promise<void> {
    // Sharing is cloud-only, but we still keep local-mode behavior
    // consistent so dev tooling and tests don't crash. Drop the
    // collaborator doc and prune the index list.
    removeKey(key('models', modelId, 'collaborators', userId));
    const listKey = key('models', modelId, 'collaboratorList');
    const list = getJSON<string[]>(listKey) ?? [];
    setJSON(listKey, list.filter((id) => id !== userId));
  }

  // ─── Responses ──────────────────────────────────────────────────

  async getResponse(modelId: string, userId: string): Promise<ResponseDoc | null> {
    return getJSON<ResponseDoc>(key('models', modelId, 'responses', userId));
  }

  async createResponse(modelId: string, responseDoc: ResponseDoc): Promise<void> {
    const k = key('models', modelId, 'responses', responseDoc.userId);
    setJSON(k, responseDoc);

    const listKey = key('models', modelId, 'responseList');
    const list = getJSON<string[]>(listKey) ?? [];
    if (!list.includes(responseDoc.userId)) {
      list.push(responseDoc.userId);
      setJSON(listKey, list);
    }
  }

  async updateResponse(modelId: string, userId: string, partial: Partial<ResponseDoc>): Promise<void> {
    const k = key('models', modelId, 'responses', userId);
    const current = getJSON<ResponseDoc>(k);
    if (!current) throw new Error(`Response for ${userId} not found`);
    setJSON(k, { ...current, ...partial, lastModifiedAt: Date.now() });
  }

  // ─── Comparisons ───────────────────────────────────────────────

  async saveComparisons(modelId: string, userId: string, layer: string, comparisons: ComparisonMap): Promise<void> {
    validateUpperTriangle(comparisons);

    const response = getJSON<ResponseDoc>(key('models', modelId, 'responses', userId));
    if (!response) throw new Error(`Response for ${userId} not found`);

    if (layer === 'criteria') {
      response.criteriaMatrix = { ...response.criteriaMatrix, ...comparisons };
    } else {
      if (!response.alternativeMatrices) response.alternativeMatrices = {};
      response.alternativeMatrices[layer] = {
        ...(response.alternativeMatrices[layer] ?? {}),
        ...comparisons,
      };
    }

    response.lastModifiedAt = Date.now();
    setJSON(key('models', modelId, 'responses', userId), response);
  }

  async getComparisons(modelId: string, userId: string, layer: string): Promise<ComparisonMap> {
    const response = getJSON<ResponseDoc>(key('models', modelId, 'responses', userId));
    if (!response) return {};

    let comparisons: ComparisonMap;
    if (layer === 'criteria') {
      comparisons = response.criteriaMatrix ?? {};
    } else {
      comparisons = response.alternativeMatrices?.[layer] ?? {};
    }

    const result: ComparisonMap = {};
    for (const [ck, value] of Object.entries(comparisons)) {
      const [i, j] = ck.split(',').map(Number) as [number, number];
      if (i < j) {
        result[ck] = value;
      }
    }
    return result;
  }

  // ─── Synthesis ──────────────────────────────────────────────────

  async saveSynthesis(modelId: string, synthesisId: string, docs: Partial<SynthesisBundle>): Promise<void> {
    const base = key('models', modelId, 'syntheses', synthesisId);
    if (docs.summary) setJSON(`${base}/summary`, docs.summary);
    if (docs.individual) setJSON(`${base}/individual`, docs.individual);
    if (docs.diagnostics) setJSON(`${base}/diagnostics`, docs.diagnostics);
  }

  async getSynthesis(modelId: string, synthesisId: string): Promise<SynthesisBundle | null> {
    const base = key('models', modelId, 'syntheses', synthesisId);
    const summary = getJSON<SynthesisBundle['summary']>(`${base}/summary`);
    if (!summary) return null;
    return {
      summary,
      individual: getJSON<SynthesisBundle['individual']>(`${base}/individual`)!,
      diagnostics: getJSON<SynthesisBundle['diagnostics']>(`${base}/diagnostics`)!,
    };
  }

  // ─── Subscriptions (Phase 1 no-ops) ────────────────────────────

  subscribeModel(_modelId: string, _callback: (data: unknown) => void): () => void {
    return () => {};
  }

  // ─── Pending invitations (cloud-only feature) ─────────────────

  async listPendingInvites(_modelId: string): Promise<PendingInvite[]> {
    // Invitations are a cloud-only feature; local mode has no inbox.
    return [];
  }

  async revokeInvite(_tokenId: string): Promise<void> {
    // Cloud-only; local mode silently no-ops.
  }

  async resendInvite(_tokenId: string): Promise<void> {
    // Cloud-only; local mode silently no-ops.
  }

  async updateInvite(_tokenId: string, _isVoting: boolean): Promise<void> {
    // Cloud-only; local mode silently no-ops.
  }

  async hasLocalProjects(): Promise<boolean> {
    const index = getJSON<ModelIndexEntry[]>(key('modelIndex')) ?? [];
    return index.length > 0;
  }

  // ─── Internal helpers ──────────────────────────────────────────

  private _hasAnyResponses(modelId: string): boolean {
    const listKey = key('models', modelId, 'responseList');
    const list = getJSON<string[]>(listKey) ?? [];
    for (const userId of list) {
      const response = getJSON<ResponseDoc>(key('models', modelId, 'responses', userId));
      if (response && Object.keys(response.criteriaMatrix ?? {}).length > 0) {
        return true;
      }
    }
    return false;
  }
}
