// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { DISAGREEMENT_PRESETS } from '../core/models/constants';
import { createResponseDoc } from '../core/models/AHPModel';
import { getOrCreateWorkspaceId } from '../hooks/useSession';
import type {
  AHPExportBundle,
  AHPExportEnvelope,
  ChangeLogEntry,
  ComparisonMap,
  CompletionTier,
  DisagreementConfig,
  ModelDoc,
  ModelStatus,
  ResponseDoc,
  ResponseStatus,
  StructureDoc,
  StructuredItem,
} from '../types/ahp';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function generateModelId(): string {
  return `model-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Whitelist pickers ────────────────────────────────────────
// Every imported object goes through an explicit per-field pick so that
// unknown/rogue fields on the JSON payload never propagate into storage.
// Defense-in-depth against audit finding 1.3.

function pickString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function pickNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function pickStatus(v: unknown): ModelStatus {
  return v === 'setup' || v === 'open' || v === 'closed' ||
    v === 'synthesized' || v === 'reopened'
    ? v
    : 'open';
}

function pickCompletionTier(v: unknown): CompletionTier {
  return v === 1 || v === 2 || v === 3 || v === 4 ? v : 4;
}

function pickDisagreementConfig(v: unknown, fallbackUserId: string): DisagreementConfig {
  if (!isObject(v)) {
    return {
      preset: 'standard',
      thresholds: { ...DISAGREEMENT_PRESETS['standard']! },
      configuredBy: fallbackUserId,
      configuredAt: Date.now(),
    };
  }
  const thresholds = isObject(v['thresholds']) ? v['thresholds'] : {};
  return {
    preset: (v['preset'] as DisagreementConfig['preset']) ?? 'standard',
    thresholds: {
      agreement: pickNumber(thresholds['agreement'], 0.15),
      mild: pickNumber(thresholds['mild'], 0.35),
    },
    ...(typeof v['configuredBy'] === 'string' ? { configuredBy: v['configuredBy'] } : {}),
    ...(typeof v['configuredAt'] === 'number' ? { configuredAt: v['configuredAt'] } : {}),
  };
}

function pickResultsVisibility(v: unknown): ModelDoc['resultsVisibility'] {
  if (!isObject(v)) return undefined;
  return {
    showAggregatedToVoters:
      typeof v['showAggregatedToVoters'] === 'boolean' ? v['showAggregatedToVoters'] : false,
    showOwnRankingsToVoters:
      typeof v['showOwnRankingsToVoters'] === 'boolean' ? v['showOwnRankingsToVoters'] : true,
  };
}

function pickChangeLog(v: unknown): ChangeLogEntry[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(isObject)
    .map((e) => ({
      action: pickString(e['action'], 'unknown'),
      timestamp: pickNumber(e['timestamp'], 0),
      ...(typeof e['actor'] === 'string' ? { actor: e['actor'] } : {}),
    }));
}

function pickStructuredItem(v: unknown): StructuredItem {
  const s = isObject(v) ? v : {};
  return {
    id: pickString(s['id']),
    label: pickString(s['label']),
    description: pickString(s['description']),
  };
}

function pickStructure(v: unknown): StructureDoc {
  const s = isObject(v) ? v : {};
  return {
    criteria: Array.isArray(s['criteria']) ? s['criteria'].map(pickStructuredItem) : [],
    alternatives: Array.isArray(s['alternatives']) ? s['alternatives'].map(pickStructuredItem) : [],
    structureVersion: pickNumber(s['structureVersion'], 0),
  };
}

/** Strip to upper-triangle numeric-keyed entries only. Non-numeric keys
 *  (e.g., "abc,def") and non-numeric values are dropped. */
function pickComparisonMap(v: unknown): ComparisonMap {
  if (!isObject(v)) return {};
  const result: ComparisonMap = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val !== 'number' || !Number.isFinite(val)) continue;
    if (!/^\d+,\d+$/.test(k)) continue;
    const [i, j] = k.split(',').map(Number) as [number, number];
    if (i >= j) continue;
    result[k] = val;
  }
  return result;
}

function pickAlternativeMatrices(v: unknown): Record<string, ComparisonMap> {
  if (!isObject(v)) return {};
  const result: Record<string, ComparisonMap> = {};
  for (const [k, val] of Object.entries(v)) {
    result[k] = pickComparisonMap(val);
  }
  return result;
}

function pickResponse(v: unknown, userId: string): ResponseDoc {
  const s = isObject(v) ? v : {};
  const status: ResponseStatus = s['status'] === 'submitted' ? 'submitted' : 'in_progress';
  return {
    userId,
    status,
    criteriaMatrix: pickComparisonMap(s['criteriaMatrix']),
    alternativeMatrices: pickAlternativeMatrices(s['alternativeMatrices']),
    cr: isObject(s['cr']) ? s['cr'] : {},
    lastModifiedAt: pickNumber(s['lastModifiedAt'], Date.now()),
    structureVersionAtSubmission: pickNumber(s['structureVersionAtSubmission'], 0),
  };
}

/**
 * Transform an AHPExportEnvelope into a write-ready AHPExportBundle.
 * Remaps original-owner UID to currentUserId; collapses collaborators to
 * [currentUserId as owner]; whitelist-picks every field; strips synthesis.
 *
 * Does NOT validate the envelope — caller must run validateModelDoc first
 * (parseAndClassifyImport in src/storage/import-utils.ts does this).
 * Does NOT write to storage.
 *
 * Used by the Level 4 bundle import path (v0.16.0).
 * The legacy single-shot import function that duplicated this logic was
 * removed in v0.17.0.
 */
export function buildBundleFromEnvelope(
  envelope: AHPExportEnvelope,
  currentUserId: string,
): AHPExportBundle {
  const metaSource = envelope.meta as unknown as Record<string, unknown>;
  const originalOwner =
    envelope.collaborators.find((c) => c && c.role === 'owner')?.userId
    ?? pickString(metaSource['createdBy']);

  const originalOwnerResponse =
    (envelope.responses as Record<string, unknown>)[originalOwner];

  const rewrittenChangeLog: ChangeLogEntry[] = pickChangeLog(metaSource['_changeLog']).map(
    (e) => (e.actor === originalOwner ? { ...e, actor: currentUserId } : e),
  );
  rewrittenChangeLog.push({
    action: 'imported',
    timestamp: Date.now(),
    actor: currentUserId,
  });

  const incomingStatus = pickStatus(metaSource['status']);
  const resultsVisibility = pickResultsVisibility(metaSource['resultsVisibility']);

  const rewrittenMeta: ModelDoc = {
    title: pickString(metaSource['title']),
    goal: pickString(metaSource['goal']),
    createdBy: currentUserId,
    createdAt: pickNumber(metaSource['createdAt'], Date.now()),
    status: incomingStatus === 'synthesized' ? 'open' : incomingStatus,
    completionTier: pickCompletionTier(metaSource['completionTier']),
    synthesisStatus: null,
    disagreementConfig: pickDisagreementConfig(metaSource['disagreementConfig'], currentUserId),
    publishedSynthesisId: null,
    _originRef: pickString(metaSource['_originRef'], '') || getOrCreateWorkspaceId(),
    _changeLog: rewrittenChangeLog,
    ...(resultsVisibility ? { resultsVisibility } : {}),
  };

  return {
    meta: rewrittenMeta,
    structure: pickStructure(envelope.structure),
    collaborators: [{ userId: currentUserId, role: 'owner', isVoting: true }],
    responses: {
      [currentUserId]: originalOwnerResponse
        ? pickResponse(originalOwnerResponse, currentUserId)
        : createResponseDoc(currentUserId),
    },
    synthesis: null,
  };
}
