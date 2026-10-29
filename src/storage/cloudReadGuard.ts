// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

/**
 * Shape guard for model documents read from Firestore.
 *
 * `FirestoreAdapter` used to cast `snap.data() as FirestoreModelDoc` with no
 * runtime check, and the rules allowlist field NAMES only. A document another
 * user can write — a co-member, or while project creation is unrestricted any
 * signed-in user — could put an object where a title belongs, or a comparison
 * key outside the matrix, and crash the dashboard or the Compare tab.
 *
 * Shape only: type and container, never length or count. Everything an app
 * writer produces passes unchanged (the must-pass fixture in
 * cloudReadGuard.test.ts). A field of the wrong type is reset to a neutral
 * value, an item of the wrong shape is set aside, and the rest of the model
 * loads. It never throws and never writes back; it returns the ids of the
 * rules that fired.
 */

import type { CollaboratorRole, ModelStatus, ResponseStatus, SynthesisStatus } from '../types/ahp';
import { DISAGREEMENT_PRESETS } from '../core/models/constants';

type Obj = Record<string, unknown>;
type Hits = Set<string>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

const STATUSES: readonly ModelStatus[] = ['setup', 'open', 'closed', 'synthesized', 'reopened'];
const ROLES: readonly CollaboratorRole[] = ['owner', 'editor', 'viewer'];
const SYNTHESIS_STATUSES: readonly SynthesisStatus[] = ['current', 'out_of_date', 'computing'];
const RESPONSE_STATUSES: readonly ResponseStatus[] = ['in_progress', 'submitted'];

/** Reset `o[key]` to `fallback` when present and failing `ok`; absent stays absent. */
function field(o: Obj, key: string, ok: (v: unknown) => boolean, fallback: unknown, rule: string, hits: Hits): void {
  if (o[key] === undefined || ok(o[key])) return;
  o[key] = fallback;
  hits.add(rule);
}

const isString = (v: unknown) => typeof v === 'string';
const isNumber = (v: unknown) => typeof v === 'number';
const oneOf = <T,>(values: readonly T[]) => (v: unknown) => values.includes(v as T);

/** A list: a non-list becomes `[]`, items failing `keep` are set aside. */
function list(o: Obj, key: string, keep: (v: unknown) => boolean, rule: string, hits: Hits): Obj[] {
  const v = o[key];
  if (!Array.isArray(v)) {
    if (v !== undefined && v !== null) hits.add(rule);
    o[key] = [];
    return [];
  }
  const kept = v.filter(keep) as Obj[];
  if (kept.length !== v.length) {
    o[key] = kept;
    hits.add(rule);
  }
  return kept;
}

const keepItem = (v: unknown) => isObj(v) && typeof v['id'] === 'string' && typeof v['label'] === 'string';
const keepCollaborator = (v: unknown) =>
  isObj(v) && typeof v['userId'] === 'string' && oneOf(ROLES)(v['role']);

/**
 * A comparison map: string "i,j" keys with integer i < j < n and finite numeric
 * values — what `saveComparisons` accepts for an n-item layer. A key outside the
 * matrix names no real pair, so it is SET ASIDE, never clamped onto one: moving
 * "0,99999" to "0,2" would apply someone's judgment to a pair they never rated.
 * (`comparisonsWithin` in core/math/matrix repeats the range check where the
 * maths runs, for data that never came through here.)
 */
export function guardComparisonMap(v: unknown, rule: string, hits: Hits, n = Infinity): Record<string, number> {
  if (!isObj(v)) {
    if (v !== undefined && v !== null) hits.add(rule);
    return {};
  }
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v)) {
    const m = /^(\d+),(\d+)$/.exec(k);
    if (m && Number(m[1]) < Number(m[2]) && Number(m[2]) < n && typeof val === 'number' && Number.isFinite(val)) out[k] = val;
    else hits.add(rule);
  }
  return out;
}

function guardResponse(r: Obj, hits: Hits, nCriteria: number, nAlternatives: number): void {
  field(r, 'status', oneOf(RESPONSE_STATUSES), 'in_progress', 'response.status', hits);
  r['criteriaMatrix'] = guardComparisonMap(r['criteriaMatrix'], 'response.criteriaMatrix', hits, nCriteria);
  const alt = r['alternativeMatrices'];
  if (isObj(alt)) {
    // Object.fromEntries, not assignment: a "__proto__" layer key must stay an own property.
    r['alternativeMatrices'] = Object.fromEntries(
      Object.entries(alt).map(([layer, comp]) => [layer, guardComparisonMap(comp, 'response.alternativeMatrices', hits, nAlternatives)]),
    );
  } else {
    if (alt !== undefined && alt !== null) hits.add('response.alternativeMatrices');
    r['alternativeMatrices'] = {};
  }
  field(r, 'cr', isObj, {}, 'response.cr', hits);
  field(r, 'lastModifiedAt', isNumber, 0, 'response.lastModifiedAt', hits);
}

function guardResponses(d: Obj, hits: Hits, nCriteria: number, nAlternatives: number): void {
  const v = d['responses'];
  if (v === undefined || v === null) return;
  if (!isObj(v)) { d['responses'] = {}; hits.add('responses'); return; }
  const kept = Object.entries(v).filter(([, r]) => isObj(r));
  if (kept.length !== Object.keys(v).length) hits.add('responses');
  for (const [, r] of kept) guardResponse(r as Obj, hits, nCriteria, nAlternatives);
  // Object.fromEntries defines own properties: a "__proto__" key cannot reach the prototype.
  d['responses'] = Object.fromEntries(kept);
}

/** Normalise a raw model document in place; returns the rule ids that fired. */
export function guardModelDoc(raw: unknown): { doc: Obj; setAside: string[] } {
  const hits: Hits = new Set();
  const d: Obj = isObj(raw) ? raw : {};
  for (const key of ['title', 'goal', 'createdBy', '_originRef']) field(d, key, isString, '', `model.${key}`, hits);
  field(d, 'createdAt', isNumber, 0, 'model.createdAt', hits);
  field(d, 'status', oneOf(STATUSES), 'open', 'model.status', hits);
  field(d, 'completionTier', (v) => v === 1 || v === 2 || v === 3 || v === 4, 4, 'model.completionTier', hits);
  field(d, 'synthesisStatus', (v) => v === null || oneOf(SYNTHESIS_STATUSES)(v), null, 'model.synthesisStatus', hits);
  field(d, 'publishedSynthesisId', (v) => v === null || isString(v), null, 'model.publishedSynthesisId', hits);
  field(d, 'disagreementConfig', isObj, {
    preset: 'standard', thresholds: { ...DISAGREEMENT_PRESETS['standard']! }, configuredBy: '', configuredAt: 0,
  }, 'model.disagreementConfig', hits);
  field(d, 'resultsVisibility', isObj, undefined, 'model.resultsVisibility', hits);
  field(d, 'structureVersion', isNumber, 0, 'model.structureVersion', hits);
  field(d, 'order', isNumber, undefined, 'model.order', hits);
  field(d, 'synthesis', (v) => v === null || isObj(v), null, 'model.synthesis', hits);
  field(d, 'members', isObj, {}, 'model.members', hits);
  const criteria = list(d, 'criteria', keepItem, 'criteria', hits);
  const alternatives = list(d, 'alternatives', keepItem, 'alternatives', hits);
  for (const item of [...criteria, ...alternatives]) field(item, 'description', isString, '', 'item.description', hits);
  for (const c of list(d, 'collaborators', keepCollaborator, 'collaborators', hits)) {
    field(c, 'isVoting', (v) => typeof v === 'boolean', false, 'collaborator.isVoting', hits);
  }
  if (d['_changeLog'] !== undefined) list(d, '_changeLog', isObj, '_changeLog', hits);
  // After the item lists, so comparison keys are checked against the matrix sizes.
  guardResponses(d, hits, criteria.length, alternatives.length);
  return { doc: d, setAside: [...hits] };
}

/** A member's role for the dashboard: an unknown value reads as the most restrictive. */
export function roleOf(members: unknown, uid: string): CollaboratorRole {
  const role = isObj(members) ? members[uid] : undefined;
  return oneOf(ROLES)(role) ? (role as CollaboratorRole) : 'viewer';
}
