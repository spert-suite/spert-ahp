// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { DISAGREEMENT_PRESETS } from './constants';
import { getOrCreateWorkspaceId } from '../../hooks/useSession';
import type {
  ModelDoc,
  StructureDoc,
  StructuredItem,
  CollaboratorDoc,
  CollaboratorRole,
  ResponseDoc,
  ValidationResult,
} from '../../types/ahp';

export function createModelDoc(title: string, goal: string, userId: string): ModelDoc {
  const now = Date.now();
  return {
    title,
    goal,
    createdBy: userId,
    createdAt: now,
    status: 'setup',
    completionTier: 4,
    synthesisStatus: null,
    disagreementConfig: {
      preset: 'standard',
      thresholds: { ...DISAGREEMENT_PRESETS['standard']! },
      configuredBy: userId,
      configuredAt: now,
    },
    publishedSynthesisId: null,
    _originRef: getOrCreateWorkspaceId(),
    _changeLog: [{ action: 'created', timestamp: now, actor: userId }],
  };
}

export function createStructureDoc(
  criteria: StructuredItem[] = [],
  alternatives: StructuredItem[] = [],
): StructureDoc {
  return {
    criteria,
    alternatives,
    structureVersion: 0,
  };
}

export function createCollaboratorDoc(
  userId: string,
  role: CollaboratorRole = 'owner',
  isVoting = true,
): CollaboratorDoc {
  return {
    userId,
    role,
    isVoting,
  };
}

export function createResponseDoc(userId: string): ResponseDoc {
  return {
    userId,
    status: 'in_progress',
    criteriaMatrix: {},
    alternativeMatrices: {},
    cr: {},
    lastModifiedAt: Date.now(),
    structureVersionAtSubmission: 0,
  };
}

export function validateModelDoc(doc: unknown): ValidationResult {
  const errors: string[] = [];

  if (!doc) {
    return { valid: false, errors: ['Document is null or undefined'] };
  }
  const d = doc as Record<string, unknown>;
  if (typeof d.title !== 'string' || (d.title as string).trim() === '') {
    errors.push('title is required and must be a non-empty string');
  }
  if (typeof d.goal !== 'string') {
    errors.push('goal must be a string');
  }
  if (typeof d.createdBy !== 'string' || (d.createdBy as string).trim() === '') {
    errors.push('createdBy is required');
  }
  if (typeof d.createdAt !== 'number') {
    errors.push('createdAt must be a timestamp');
  }
  const validStatuses = ['setup', 'open', 'closed', 'synthesized', 'reopened'];
  if (!validStatuses.includes(d.status as string)) {
    errors.push(`status must be one of: ${validStatuses.join(', ')}`);
  }
  if (![1, 2, 3, 4].includes(d.completionTier as number)) {
    errors.push('completionTier must be 1, 2, 3, or 4');
  }

  return { valid: errors.length === 0, errors };
}
