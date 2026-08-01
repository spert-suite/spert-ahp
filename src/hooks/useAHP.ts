// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useReducer, useCallback, useEffect } from 'react';
import { useStorage } from '../contexts/StorageContext';
import {
  createModelDoc,
  createStructureDoc,
  createCollaboratorDoc,
  createResponseDoc,
} from '../core/models/AHPModel';
import {
  deserializeSynthesisFromFirestore,
  type FirestoreSynthesis,
} from '../storage/firestoreSynthesisCodec';
import { computeSynthesis } from './synthesisPipeline';
import { getSynthesisGeneration } from '../lib/synthesisGeneration';
import type {
  AHPState,
  AHPAction,
  UseAHPReturn,
  ModelDoc,
  StructureDoc,
  CollaboratorDoc,
  ComparisonMap,
  ResponseDoc,
} from '../types/ahp';

const initialState: AHPState = {
  modelId: null,
  model: null,
  structure: null,
  collaborators: [],
  responses: {},
  synthesis: null,
  loading: false,
  error: null,
};

function reducer(state: AHPState, action: AHPAction): AHPState {
  switch (action.type) {
    case 'SET_MODEL':
      return {
        ...state,
        modelId: action.payload.modelId,
        model: action.payload.meta,
        structure: action.payload.structure,
        error: null,
      };
    case 'SET_STRUCTURE':
      return { ...state, structure: action.payload };
    case 'SET_COLLABORATORS':
      return { ...state, collaborators: action.payload };
    case 'SET_RESPONSE':
      return {
        ...state,
        responses: {
          ...state.responses,
          [action.payload.userId]: action.payload.response,
        },
      };
    case 'SET_SYNTHESIS':
      return { ...state, synthesis: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'UPDATE_MODEL':
      return { ...state, model: state.model ? { ...state.model, ...action.payload } : null };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useAHP(userId: string): UseAHPReturn {
  const { adapter: storage } = useStorage();
  const [state, dispatch] = useReducer(reducer, initialState);

  const createModel = useCallback(async (title: string, goal: string): Promise<string> => {
    const modelId = `model-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const meta = createModelDoc(title, goal, userId);
    const structure = createStructureDoc();

    await storage.createModel(modelId, meta, structure);

    const collab = createCollaboratorDoc(userId, 'owner', true);
    await storage.addCollaborator(modelId, collab);

    const response = createResponseDoc(userId);
    await storage.createResponse(modelId, response);

    dispatch({
      type: 'SET_MODEL',
      payload: { modelId, meta, structure },
    });
    dispatch({ type: 'SET_COLLABORATORS', payload: [collab] });
    dispatch({
      type: 'SET_RESPONSE',
      payload: { userId, response },
    });

    return modelId;
  }, [userId, storage]);

  const loadModel = useCallback(async (modelId: string): Promise<void> => {
    const data = await storage.getModel(modelId);
    if (!data) {
      dispatch({ type: 'SET_ERROR', payload: `Model ${modelId} not found` });
      return;
    }

    dispatch({
      type: 'SET_MODEL',
      payload: { modelId, meta: data.meta, structure: data.structure },
    });

    const collabs = await storage.getCollaborators(modelId);
    dispatch({ type: 'SET_COLLABORATORS', payload: collabs });

    // Self-heal: if the current user is a collaborator without a response slot,
    // create one. Covers legacy shared models where addCollaborator did not
    // initialize the slot. Firestore rules permit editors to write
    // responses.{theirOwnUid}, so this works for both owners and editors.
    const isMember = collabs.some((c) => c.userId === userId);
    if (isMember) {
      const ownResponse = await storage.getResponse(modelId, userId);
      if (!ownResponse) {
        const fresh = createResponseDoc(userId);
        try {
          await storage.createResponse(modelId, fresh);
        } catch (err) {
          console.error('Failed to self-heal response slot:', err);
        }
      }
    }

    for (const collab of collabs) {
      const response = await storage.getResponse(modelId, collab.userId);
      if (response) {
        dispatch({
          type: 'SET_RESPONSE',
          payload: { userId: collab.userId, response },
        });
      }
    }

    if (data.meta.publishedSynthesisId) {
      const syn = await storage.getSynthesis(modelId, data.meta.publishedSynthesisId);
      if (syn) {
        dispatch({ type: 'SET_SYNTHESIS', payload: syn });
      }
    }
  }, [userId, storage]);

  const updateModel = useCallback(async (partialMeta: Partial<ModelDoc>): Promise<void> => {
    if (!state.modelId) return;
    await storage.updateModel(state.modelId, partialMeta);
    dispatch({ type: 'UPDATE_MODEL', payload: partialMeta });
  }, [state.modelId, storage]);

  const updateStructure = useCallback(async (newStructure: StructureDoc): Promise<void> => {
    if (!state.modelId) return;
    await storage.updateStructure(state.modelId, newStructure);
    dispatch({ type: 'SET_STRUCTURE', payload: newStructure });

    if (state.model?.synthesisStatus === 'current') {
      await storage.updateModel(state.modelId, { synthesisStatus: 'out_of_date' });
      dispatch({ type: 'UPDATE_MODEL', payload: { synthesisStatus: 'out_of_date' } });
    }
  }, [state.modelId, state.model?.synthesisStatus, storage]);

  const saveComparisons = useCallback(async (layer: string, comparisons: ComparisonMap): Promise<void> => {
    if (!state.modelId) return;

    // Optimistic local update — compute the next ResponseDoc from current state.
    // We don't read-after-write from storage because (a) in cloud mode that's a
    // wasted Firestore read + race condition, (b) we know exactly what we just wrote.
    // onSnapshot will reconcile any concurrent edits by other users in cloud mode.
    // Intentional non-rollback on storage failure (v0.15.0 audit finding #4):
    // the SET_ERROR dispatch below is the user-visible signal; rolling back
    // would require snapshotting prior response state and reverting on
    // catch, which adds complexity not justified by the failure frequency.
    const currentResponse = state.responses[userId];
    if (currentResponse) {
      const nextResponse: ResponseDoc = {
        ...currentResponse,
        ...(layer === 'criteria'
          ? { criteriaMatrix: { ...currentResponse.criteriaMatrix, ...comparisons } }
          : {
              alternativeMatrices: {
                ...currentResponse.alternativeMatrices,
                [layer]: { ...(currentResponse.alternativeMatrices[layer] ?? {}), ...comparisons },
              },
            }),
        lastModifiedAt: Date.now(),
      };
      dispatch({ type: 'SET_RESPONSE', payload: { userId, response: nextResponse } });
    }

    try {
      await storage.saveComparisons(state.modelId, userId, layer, comparisons);
    } catch (err) {
      // A3: a sign-out race or permission error surfaces here instead of
      // becoming an unhandled rejection. The optimistic local dispatch
      // above already reflected the user's edit; we just surface the
      // failure and stop.
      console.error('saveComparisons failed:', err);
      dispatch({
        type: 'SET_ERROR',
        payload: 'Save failed — you may have been signed out. Reload to continue.',
      });
      return;
    }

    if (state.model?.synthesisStatus === 'current') {
      await storage.updateModel(state.modelId, { synthesisStatus: 'out_of_date' });
      dispatch({ type: 'UPDATE_MODEL', payload: { synthesisStatus: 'out_of_date' } });
    }
  }, [state.modelId, userId, state.responses, state.model?.synthesisStatus, storage]);

  const runSynthesis = useCallback(async () => {
    if (!state.modelId || !state.structure || !state.model) return;

    // G1: capture generation at dispatch. bumpSynthesisGeneration() in
    // performSignOutWithCleanup() (Pass 2) increments the counter — guards
    // below discard stale results from any sign-out that occurs mid-pipeline.
    const myGen = getSynthesisGeneration();

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'UPDATE_MODEL', payload: { synthesisStatus: 'computing' } });
    await storage.updateModel(state.modelId, { synthesisStatus: 'computing' });
    // Note: initial updateModel (above) is intentionally not preceded by a gen-check.
    // If sign-out fires during this first await, the write may succeed with 'computing'
    // status but subsequent gen-checks will prevent further dispatches or writes.
    if (getSynthesisGeneration() !== myGen) return;

    try {
      const { synthesisId, bundle } = await computeSynthesis({
        modelId: state.modelId,
        structure: state.structure,
        model: state.model,
        storage,
      });
      if (getSynthesisGeneration() !== myGen) return; // sign-out during computeSynthesis

      await storage.saveSynthesis(state.modelId, synthesisId, bundle);
      if (getSynthesisGeneration() !== myGen) return; // sign-out during saveSynthesis

      await storage.updateModel(state.modelId, {
        synthesisStatus: 'current',
        publishedSynthesisId: synthesisId,
      });
      if (getSynthesisGeneration() !== myGen) return; // sign-out during final updateModel

      dispatch({ type: 'SET_SYNTHESIS', payload: bundle });
      dispatch({
        type: 'UPDATE_MODEL',
        payload: { synthesisStatus: 'current', publishedSynthesisId: synthesisId },
      });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (err) {
      if (getSynthesisGeneration() !== myGen) return;
      await storage.updateModel(state.modelId, { synthesisStatus: 'out_of_date' });
      dispatch({ type: 'SET_ERROR', payload: (err as Error).message });
      dispatch({ type: 'UPDATE_MODEL', payload: { synthesisStatus: 'out_of_date' } });
    }
  }, [state.modelId, state.structure, state.model, storage]);

  const closeModel = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const deleteModel = useCallback(async (): Promise<void> => {
    if (!state.modelId) return;
    await storage.deleteModel(state.modelId);
    dispatch({ type: 'RESET' });
  }, [state.modelId, storage]);

  // Real-time subscription. In local mode this is a no-op. In cloud mode the
  // FirestoreAdapter delivers the monolithic document whenever any field
  // changes (with echo prevention for our own writes). We decode the doc and
  // dispatch the relevant state updates.
  useEffect(() => {
    if (!state.modelId) return;
    const unsub = storage.subscribeModel(state.modelId, (raw) => {
      if (!raw || typeof raw !== 'object') return;
      const d = raw as Record<string, unknown>;

      // Meta
      const meta: ModelDoc = {
        title: d['title'] as string,
        goal: d['goal'] as string,
        createdBy: d['createdBy'] as string,
        createdAt: d['createdAt'] as number,
        status: d['status'] as ModelDoc['status'],
        completionTier: d['completionTier'] as ModelDoc['completionTier'],
        synthesisStatus: d['synthesisStatus'] as ModelDoc['synthesisStatus'],
        disagreementConfig: d['disagreementConfig'] as ModelDoc['disagreementConfig'],
        publishedSynthesisId: (d['publishedSynthesisId'] as string | null) ?? null,
        _originRef: d['_originRef'] as string,
        _changeLog: (d['_changeLog'] as ModelDoc['_changeLog']) ?? [],
        resultsVisibility: (d['resultsVisibility'] as ModelDoc['resultsVisibility']) ?? {
          showAggregatedToVoters: false,
          showOwnRankingsToVoters: true,
        },
      };
      const structure: StructureDoc = {
        criteria: (d['criteria'] as StructureDoc['criteria']) ?? [],
        alternatives: (d['alternatives'] as StructureDoc['alternatives']) ?? [],
        structureVersion: (d['structureVersion'] as number) ?? 0,
      };
      dispatch({
        type: 'SET_MODEL',
        payload: { modelId: state.modelId!, meta, structure },
      });

      // Collaborators
      const collabs = (d['collaborators'] as CollaboratorDoc[]) ?? [];
      dispatch({ type: 'SET_COLLABORATORS', payload: collabs });

      // Responses — dispatch one per user
      const responses = (d['responses'] as Record<string, ResponseDoc>) ?? {};
      for (const [uid, response] of Object.entries(responses)) {
        dispatch({ type: 'SET_RESPONSE', payload: { userId: uid, response } });
      }

      // Synthesis
      const synthesis = d['synthesis'] as FirestoreSynthesis | null;
      if (synthesis && synthesis.synthesisId === meta.publishedSynthesisId) {
        dispatch({
          type: 'SET_SYNTHESIS',
          payload: deserializeSynthesisFromFirestore(synthesis),
        });
      }
    });
    return unsub;
  }, [state.modelId, storage]);

  // I2: listen for access-revoked events dispatched by FirestoreAdapter when a
  // permission-denied error fires on the snapshot subscription. Reset state so
  // the revoked model is removed from memory and the user returns to the dashboard.
  //
  // Known limitation: any Firestore write already in-flight when revocation fires
  // will fail with one permission-denied error, surfaced via SET_ERROR in
  // saveComparisons. Subsequent writes do not occur after RESET clears modelId.
  // No infinite-loop risk (AHP has no diff-based save cache).
  useEffect(() => {
    const onRevoked = (e: Event) => {
      const { modelId: revokedId } = (e as CustomEvent<{ modelId: string }>).detail;
      if (revokedId !== state.modelId) return;
      dispatch({ type: 'RESET' });
    };
    window.addEventListener('spert:access-revoked', onRevoked);
    return () => window.removeEventListener('spert:access-revoked', onRevoked);
  }, [state.modelId]);

  return {
    ...state,
    createModel,
    loadModel,
    updateModel,
    updateStructure,
    saveComparisons,
    runSynthesis,
    closeModel,
    deleteModel,
    storage,
  };
}
