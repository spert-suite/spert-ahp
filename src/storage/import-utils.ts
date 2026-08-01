// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

// Level 4 import utilities — v0.16.0
//
// parseAndClassifyImport detects single vs bundle envelopes, validates per
// envelope, and (for bundles) collects per-envelope errors instead of aborting
// the entire import. detectAHPImportConflicts identifies ID and name collisions
// against the user's existing decisions. applyImportMerge runs the actual
// writes with Layer 2 conflict re-detection.
//
// See SPERT AHP v0.16.0 Level 4 Import Implementation Plan (R7) for design
// decisions AD-1 through AD-12.

import type { AHPBundleExport } from './exportAllModels';
import type {
  AHPExportEnvelope,
  ModelIndexEntry,
  StorageAdapter,
} from '../types/ahp';
import { validateModelDoc } from '../core/models/AHPModel';
import { buildBundleFromEnvelope, generateModelId } from './importModel';

// ── Size constants ──────────────────────────────────────────────────────────
// Byte-accurate via TextEncoder — UTF-16 string.length undercounts non-ASCII
// payloads (e.g., CJK titles, emoji). Firestore enforces document size in
// bytes; we match that here so the per-envelope cap actually protects writes.
function byteLength(s: string): number {
  return new TextEncoder().encode(s).byteLength;
}

const MAX_PARSE_BYTES = 10 * 1024 * 1024; // 10 MB outer cap

// 900 KB per envelope. Firestore doc limit is 1 MB; the headroom covers
// metadata and the slot-only response merge on replace.
export const MAX_ENVELOPE_BYTES = 900 * 1024;

// ── Types ───────────────────────────────────────────────────────────────────

export interface ParseError {
  /** 1-indexed position in the bundle for user-facing messages. */
  index: number;
  title: string;
  reason: string;
}

export type ParsedAHPImport =
  | { type: 'single'; envelopes: [AHPExportEnvelope]; parseErrors: [] }
  | { type: 'bundle'; envelopes: AHPExportEnvelope[]; parseErrors: ParseError[] };

export type ImportDecision = 'skip' | 'add' | 'replace';
export type ConflictType = 'id' | 'name' | 'none';
export type ReplaceGateReason = 'not-owner' | 'multiple-candidates' | null;

export interface AHPConflictEntry {
  type: ConflictType;
  existingModelId: string | null;
  existingTitle: string | null;
  /** True when the 'replace' radio must be disabled. */
  replaceGated: boolean;
  /** When replaceGated is true, why. UI tooltip surfaces this. */
  replaceGateReason: ReplaceGateReason;
}
export type AHPConflictMap = Map<number, AHPConflictEntry>;

export interface AHPImportResult {
  ok: boolean;
  addedCount: number;
  replacedCount: number;
  skippedCount: number;
  errorCount: number;
  /** Per-envelope errors from allSettled rejections + parseErrors carried in. */
  errors: Array<{ title: string; reason: string }>;
  /** Set when exactly one model was written, errorCount===0, skippedCount===0. */
  autoLoadModelId: string | null;
  /** Set when ok===false — describes why the apply was aborted. */
  abortReason?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// ── Type guards ──────────────────────────────────────────────────────────────
/**
 * Verified from emitter: exportAllModels.ts sets spertAhpBundleVersion: 1 at
 * the top level. Element count is checked separately in parseAndClassifyImport
 * so we can produce a dedicated "Bundle export contains no models." error.
 */
export function isAHPBundleExport(v: unknown): v is AHPBundleExport {
  return (
    isObject(v) &&
    'spertAhpBundleVersion' in v &&
    v['spertAhpBundleVersion'] === 1 &&
    Array.isArray(v['models'])
  );
}

/**
 * Verified from emitter: exportModel.ts sets spertAhpExportVersion: 1 at the
 * top level. Also validates required structural fields.
 */
export function isAHPSingleExport(v: unknown): v is AHPExportEnvelope {
  return (
    isObject(v) &&
    'spertAhpExportVersion' in v &&
    v['spertAhpExportVersion'] === 1 &&
    isObject(v['meta']) &&
    isObject(v['structure']) &&
    Array.isArray(v['collaborators']) &&
    isObject(v['responses']) &&
    typeof v['sourceModelId'] === 'string'
  );
}

// ── Normalize ────────────────────────────────────────────────────────────────
/**
 * Canonical title normalization for conflict detection. NFC ensures
 * consistent handling of composed vs decomposed Unicode. Called identically
 * in detectAHPImportConflicts and any future preview-time computation.
 */
export function normalizeModelTitle(title: string): string {
  return title.trim().toLowerCase().normalize('NFC');
}

// ── Parse and classify ───────────────────────────────────────────────────────
export function parseAndClassifyImport(rawJson: string): ParsedAHPImport {
  const rawBytes = byteLength(rawJson);
  if (rawBytes > MAX_PARSE_BYTES) {
    throw new Error(
      `Import file too large: ${(rawBytes / 1024 / 1024).toFixed(1)} MB exceeds the ${MAX_PARSE_BYTES / 1024 / 1024} MB limit.`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Invalid JSON: could not parse the file.');
  }

  if (isAHPBundleExport(parsed)) {
    if (parsed.models.length === 0) {
      throw new Error('Bundle export contains no models.');
    }
    // Bundle path: collect per-envelope errors instead of throwing on the
    // first failure. The preview shows invalid envelopes as disabled red
    // rows; valid envelopes can still be imported. This preserves the
    // round-trip property "Export All → Import" even when the source has
    // an untitled draft that would otherwise fail validateModelDoc.
    const validEnvelopes: AHPExportEnvelope[] = [];
    const parseErrors: ParseError[] = [];
    const rawEnvelopes = parsed.models;
    for (let i = 0; i < rawEnvelopes.length; i++) {
      const env = rawEnvelopes[i];
      const userIndex = i + 1;
      const reportedTitle =
        isObject(env) && isObject((env as Record<string, unknown>)['meta'])
          ? (((env as Record<string, unknown>)['meta'] as Record<string, unknown>)[
              'title'
            ] as string | undefined) ?? '(untitled)'
          : '(untitled)';

      if (!isAHPSingleExport(env)) {
        parseErrors.push({
          index: userIndex,
          title: reportedTitle || '(untitled)',
          reason:
            'Missing required fields (meta, structure, collaborators, responses, or sourceModelId).',
        });
        continue;
      }
      const validation = validateModelDoc(env.meta);
      if (!validation.valid) {
        parseErrors.push({
          index: userIndex,
          title: env.meta.title || '(untitled)',
          reason: `Invalid meta: ${validation.errors.join('; ')}`,
        });
        continue;
      }
      const envBytes = byteLength(JSON.stringify(env));
      if (envBytes > MAX_ENVELOPE_BYTES) {
        parseErrors.push({
          index: userIndex,
          title: env.meta.title || '(untitled)',
          reason: `Decision is too large (${(envBytes / 1024).toFixed(0)} KB). The per-model limit is ${(MAX_ENVELOPE_BYTES / 1024).toFixed(0)} KB.`,
        });
        continue;
      }
      validEnvelopes.push(env);
    }
    return { type: 'bundle', envelopes: validEnvelopes, parseErrors };
  }

  if (isAHPSingleExport(parsed)) {
    // Single path retains strict-throw — no preview to surface errors against.
    const validation = validateModelDoc(parsed.meta);
    if (!validation.valid) {
      throw new Error(`Malformed export meta: ${validation.errors.join('; ')}`);
    }
    const envBytes = byteLength(JSON.stringify(parsed));
    if (envBytes > MAX_ENVELOPE_BYTES) {
      throw new Error(
        `Decision is too large (${(envBytes / 1024).toFixed(0)} KB). The per-model limit is ${(MAX_ENVELOPE_BYTES / 1024).toFixed(0)} KB.`,
      );
    }
    return { type: 'single', envelopes: [parsed], parseErrors: [] };
  }

  throw new Error(
    'Unrecognized export format. Expected a SPERT AHP single-decision export ' +
      'or a bundle export (from Export All).',
  );
}

// ── Conflict detection ───────────────────────────────────────────────────────
export function detectAHPImportConflicts(
  envelopes: AHPExportEnvelope[],
  existing: ModelIndexEntry[],
): AHPConflictMap {
  const conflicts: AHPConflictMap = new Map();
  const existingById = new Map(existing.map((e) => [e.modelId, e]));

  // Multimap keyed by normalized title — handles dup-titled existing models.
  // Empty titles are excluded so untitled drafts don't all collapse to '',
  // which would surface false conflicts across multiple drafts.
  const existingByNormTitle = new Map<string, ModelIndexEntry[]>();
  for (const e of existing) {
    const norm = normalizeModelTitle(e.title);
    if (norm.length === 0) continue;
    const arr = existingByNormTitle.get(norm);
    if (arr) arr.push(e);
    else existingByNormTitle.set(norm, [e]);
  }

  for (let i = 0; i < envelopes.length; i++) {
    const env = envelopes[i]!;
    const incomingNorm = normalizeModelTitle(env.meta.title);
    const nameMatches = incomingNorm.length > 0
      ? existingByNormTitle.get(incomingNorm) ?? []
      : [];
    const idMatch = existingById.get(env.sourceModelId);

    if (idMatch) {
      conflicts.set(i, {
        type: 'id',
        existingModelId: idMatch.modelId,
        existingTitle: idMatch.title,
        replaceGated: idMatch.role !== 'owner',
        replaceGateReason: idMatch.role !== 'owner' ? 'not-owner' : null,
      });
    } else if (nameMatches.length === 1) {
      const m = nameMatches[0]!;
      conflicts.set(i, {
        type: 'name',
        existingModelId: m.modelId,
        existingTitle: m.title,
        replaceGated: m.role !== 'owner',
        replaceGateReason: m.role !== 'owner' ? 'not-owner' : null,
      });
    } else if (nameMatches.length > 1) {
      // Multi-candidate name match — gate replace because we can't
      // disambiguate which existing decision to overwrite. User can still
      // choose Add or Skip. UI tooltip explains the ambiguity.
      conflicts.set(i, {
        type: 'name',
        existingModelId: null,
        existingTitle: nameMatches[0]!.title,
        replaceGated: true,
        replaceGateReason: 'multiple-candidates',
      });
    } else {
      conflicts.set(i, {
        type: 'none',
        existingModelId: null,
        existingTitle: null,
        replaceGated: false,
        replaceGateReason: null,
      });
    }
  }
  return conflicts;
}

// ── Default decisions ────────────────────────────────────────────────────────
export function computeDefaultDecisions(
  envelopes: AHPExportEnvelope[],
  conflicts: AHPConflictMap,
): Map<number, ImportDecision> {
  const decisions = new Map<number, ImportDecision>();
  for (let i = 0; i < envelopes.length; i++) {
    decisions.set(i, conflicts.get(i)!.type === 'none' ? 'add' : 'skip');
  }
  return decisions;
}

// ── Conflict equality ─────────────────────────────────────────────────────────
/**
 * Full-tuple equality for the Layer 2 stale-data guard. Compares all five
 * fields so a mid-preview rename, role demotion, or candidate-set change is
 * detected and the apply is aborted.
 */
export function conflictMapsEqual(a: AHPConflictMap, b: AHPConflictMap): boolean {
  if (a.size !== b.size) return false;
  for (const [i, aEntry] of a) {
    const bEntry = b.get(i);
    if (!bEntry) return false;
    if (aEntry.type !== bEntry.type) return false;
    if (aEntry.existingModelId !== bEntry.existingModelId) return false;
    if (aEntry.existingTitle !== bEntry.existingTitle) return false;
    if (aEntry.replaceGated !== bEntry.replaceGated) return false;
    if (aEntry.replaceGateReason !== bEntry.replaceGateReason) return false;
  }
  return true;
}

// ── Apply ─────────────────────────────────────────────────────────────────────
export async function applyImportMerge(
  storage: StorageAdapter,
  envelopes: AHPExportEnvelope[],
  decisions: Map<number, ImportDecision>,
  originalConflicts: AHPConflictMap,
  userId: string,
): Promise<AHPImportResult> {
  // Layer 2 conflictMapsEqual abort is a backstop. The primary defense is
  // the cloudDataLoaded gate in StorageContext, which disables the import
  // path until DashboardPanel's mount-time listModels() resolves.
  const freshExisting = await storage.listModels();
  const freshConflicts = detectAHPImportConflicts(envelopes, freshExisting);
  if (!conflictMapsEqual(originalConflicts, freshConflicts)) {
    return {
      ok: false,
      addedCount: 0,
      replacedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: [],
      autoLoadModelId: null,
      abortReason: 'The list of decisions changed while you were reviewing. Please try again.',
    };
  }

  // Same-slot dedup — must run BEFORE allSettled. First-incoming wins;
  // subsequent same-slot replaces are demoted to 'skip'. Promise.allSettled
  // fires writes in parallel; two replaces to the same existingModelId would
  // be non-deterministic (last-writer-wins). Do not move this block after the
  // writes array is built.
  const claimedSlots = new Set<string>();
  const effectiveDecisions = new Map(decisions);
  for (let i = 0; i < envelopes.length; i++) {
    if ((effectiveDecisions.get(i) ?? 'skip') !== 'replace') continue;
    const slot = freshConflicts.get(i)?.existingModelId;
    if (!slot) continue;
    if (claimedSlots.has(slot)) {
      effectiveDecisions.set(i, 'skip');
    } else {
      claimedSlots.add(slot);
    }
  }

  const writes = envelopes.map(
    (env, i): Promise<{ action: 'added' | 'replaced' | 'skipped'; modelId: string | null }> => {
      const decision = effectiveDecisions.get(i) ?? 'skip';
      const conflict = freshConflicts.get(i)!;
      if (decision === 'skip') {
        return Promise.resolve({ action: 'skipped', modelId: null });
      }
      if (decision === 'add') {
        return Promise.resolve().then(async () => {
          const bundle = buildBundleFromEnvelope(env, userId);
          const newModelId = generateModelId();
          await storage.createModelFromBundle(newModelId, bundle);
          return { action: 'added' as const, modelId: newModelId };
        });
      }
      // 'replace'
      if (!conflict.existingModelId || conflict.replaceGated) {
        return Promise.resolve().then(() => {
          const why =
            conflict.replaceGateReason === 'multiple-candidates'
              ? `Cannot replace "${conflict.existingTitle ?? env.meta.title}" — multiple existing decisions share this name.`
              : conflict.replaceGateReason === 'not-owner'
                ? `Cannot replace "${conflict.existingTitle ?? env.meta.title}" — you are not the owner.`
                : 'Internal error: replace decision has no target.';
          throw new Error(why);
        });
      }
      return Promise.resolve().then(async () => {
        const bundle = buildBundleFromEnvelope(env, userId);
        await storage.replaceModelFromBundle(conflict.existingModelId!, bundle);
        return { action: 'replaced' as const, modelId: conflict.existingModelId };
      });
    },
  );

  const results = await Promise.allSettled(writes);

  let addedCount = 0;
  let replacedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const writtenModelIds: string[] = [];
  const errors: AHPImportResult['errors'] = [];

  // Indexed loop — preserves O(n) and is stable regardless of result-object
  // equality; Promise.allSettled preserves order, so results[i] aligns with
  // envelopes[i].
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    if (r.status === 'fulfilled') {
      if (r.value.action === 'added') {
        addedCount++;
        if (r.value.modelId) writtenModelIds.push(r.value.modelId);
      }
      if (r.value.action === 'replaced') {
        replacedCount++;
        if (r.value.modelId) writtenModelIds.push(r.value.modelId);
      }
      if (r.value.action === 'skipped') {
        skippedCount++;
      }
    } else {
      errorCount++;
      errors.push({
        title: envelopes[i]?.meta.title || '(untitled)',
        reason: (r.reason as Error)?.message ?? 'Unknown error',
      });
    }
  }

  // Auto-load: exactly one write, no errors, no skips. Skips mean the user
  // made multi-model decisions and deserves a banner. Both add and replace
  // single-writes auto-load.
  const autoLoadModelId =
    writtenModelIds.length === 1 && errorCount === 0 && skippedCount === 0
      ? writtenModelIds[0]!
      : null;

  return {
    ok: true,
    addedCount,
    replacedCount,
    skippedCount,
    errorCount,
    errors,
    autoLoadModelId,
  };
}
