// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

/**
 * `guardModelDoc` — the shape guard on every Firestore read of a model.
 *
 * ⚠️ THE MUST-PASS FIXTURE IS THE HALF THAT MATTERS. A guard that sets aside a
 * value the app writes becomes data loss the next time that part is saved. So
 * the first test builds a model from the app's own writers — createModelDoc,
 * createStructureDoc, createResponseDoc, serializeSynthesisForFirestore — plus
 * every optional field, and asserts the guard changes NOTHING. If a writer
 * starts producing a new value, add it here first.
 */
import { describe, it, expect } from 'vitest';
import { guardModelDoc, guardComparisonMap, roleOf } from '../cloudReadGuard';
import { createModelDoc, createStructureDoc, createResponseDoc } from '../../core/models/AHPModel';
import { serializeSynthesisForFirestore, tryDeserializeSynthesis } from '../firestoreSynthesisCodec';
import { comparisonsWithin, checkConnectivity, llsmWeights } from '../../core/math/matrix';

type Doc = Record<string, unknown>;

function legitimateDoc(): Doc {
  const meta = createModelDoc('Pick a vendor', 'Choose the best vendor', 'owner-uid');
  const items = (p: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${p}-${i}`, label: i === 0 ? '' : `${p} ${i}`, description: i % 2 ? 'd'.repeat(3000) : '' }));
  const structure = createStructureDoc(items('criterion', 12), items('alternative', 9));
  const response = { ...createResponseDoc('owner-uid'), status: 'submitted', criteriaMatrix: { '0,1': 3, '0,2': 1 / 9, '10,11': 9 }, alternativeMatrices: { 'criterion-0': { '0,8': 0.2 } }, cr: { criteria: 0.04 } };
  const synthesis = serializeSynthesisForFirestore('syn-1', {
    summary: { criteriaWeights: [0.5, 0.5], localPriorities: [[0.4, 0.6], [0.7, 0.3]] },
    individual: { individualPriorities: {}, individualCR: {}, individualAlternativeScores: {}, individualLocalPriorities: { 'owner-uid': [[1]] }, individualIncompleteCriteria: {} },
  } as never, null);
  return {
    owner: 'owner-uid', members: { 'owner-uid': 'owner', 'ed-uid': 'editor', 'v-uid': 'viewer' },
    ...meta, status: 'synthesized', synthesisStatus: 'current', publishedSynthesisId: 'syn-1', completionTier: 2,
    updatedAt: '2026-10-29T00:00:00.000Z', order: 3,
    resultsVisibility: { showAggregatedToVoters: true, showOwnRankingsToVoters: false },
    ...structure, structureVersion: 7,
    collaborators: [{ userId: 'owner-uid', role: 'owner', isVoting: true }, { userId: 'ed-uid', role: 'editor', isVoting: false }],
    responses: { 'owner-uid': response, 'ed-uid': createResponseDoc('ed-uid') },
    synthesis, _changeLog: [{ action: 'created', timestamp: 1, actor: 'owner-uid' }], schemaVersion: 1,
  };
}

describe('guardModelDoc — must-pass: everything the app writes', () => {
  it('fires no rule and changes nothing on a model built by the app\'s own writers', () => {
    const doc = legitimateDoc();
    const before = structuredClone(doc);
    const { setAside } = guardModelDoc(doc);
    expect(setAside).toEqual([]);
    expect(doc).toEqual(before);
    expect(tryDeserializeSynthesis(doc['synthesis'] as never)).not.toBeNull();
  });

  it('leaves absent optional fields absent', () => {
    const doc: Doc = { title: 'Legacy', criteria: [], alternatives: [] };
    expect(guardModelDoc(doc).setAside).toEqual([]);
    expect('order' in doc).toBe(false);
    expect('resultsVisibility' in doc).toBe(false);
  });
});

const HOSTILE = { evil: 'HOSTILE-VALUE' };
const cases: Array<[string, (d: Doc) => void, string, (d: Doc) => void]> = [
  ['title is an object', (d) => { d['title'] = HOSTILE; }, 'model.title', (d) => expect(d['title']).toBe('')],
  ['createdAt is a string', (d) => { d['createdAt'] = 'x'; }, 'model.createdAt', (d) => expect(d['createdAt']).toBe(0)],
  ['status is unknown', (d) => { d['status'] = 'exploded'; }, 'model.status', (d) => expect(d['status']).toBe('open')],
  ['completionTier is 7', (d) => { d['completionTier'] = 7; }, 'model.completionTier', (d) => expect(d['completionTier']).toBe(4)],
  ['disagreementConfig is a number', (d) => { d['disagreementConfig'] = 5; }, 'model.disagreementConfig', (d) => expect((d['disagreementConfig'] as Doc)['preset']).toBe('standard')],
  ['criteria is a string', (d) => { d['criteria'] = 'x'; }, 'criteria', (d) => expect(d['criteria']).toEqual([])],
  ['a criterion has no label', (d) => { (d['criteria'] as unknown[]).push({ id: 'c-x' }); }, 'criteria', (d) => expect(d['criteria']).toHaveLength(12)],
  ['an alternative is null', (d) => { (d['alternatives'] as unknown[]).push(null); }, 'alternatives', (d) => expect(d['alternatives']).toHaveLength(9)],
  ['a collaborator role is unknown', (d) => { (d['collaborators'] as unknown[]).push({ userId: 'x', role: 'god', isVoting: true }); }, 'collaborators', (d) => expect(d['collaborators']).toHaveLength(2)],
  ['responses is an array', (d) => { d['responses'] = [1]; }, 'responses', (d) => expect(d['responses']).toEqual({})],
  ['a response is a number', (d) => { (d['responses'] as Doc)['x'] = 5; }, 'responses', (d) => expect(Object.keys(d['responses'] as Doc)).toEqual(['owner-uid', 'ed-uid'])],
  ['a comparison key is reversed', (d) => { ((d['responses'] as Doc)['owner-uid'] as Doc)['criteriaMatrix'] = { '2,1': 3, '0,1': 2 }; }, 'response.criteriaMatrix', (d) => expect(((d['responses'] as Doc)['owner-uid'] as Doc)['criteriaMatrix']).toEqual({ '0,1': 2 })],
  ['a comparison value is not finite', (d) => { ((d['responses'] as Doc)['owner-uid'] as Doc)['alternativeMatrices'] = { c: { '0,1': 'x' } }; }, 'response.alternativeMatrices', (d) => expect(((d['responses'] as Doc)['owner-uid'] as Doc)['alternativeMatrices']).toEqual({ c: {} })],
  ['a comparison key is outside the matrix (12 criteria)', (d) => { ((d['responses'] as Doc)['owner-uid'] as Doc)['criteriaMatrix'] = { '0,1': 2, '0,12': 3, '0,99999': 4 }; }, 'response.criteriaMatrix', (d) => expect(((d['responses'] as Doc)['owner-uid'] as Doc)['criteriaMatrix']).toEqual({ '0,1': 2 })],
  ['synthesis is a string', (d) => { d['synthesis'] = 'x'; }, 'model.synthesis', (d) => expect(d['synthesis']).toBeNull()],
  ['members is a string', (d) => { d['members'] = 'x'; }, 'model.members', (d) => expect(d['members']).toEqual({})],
];

describe('guardModelDoc — hostile shapes are set aside, the rest loads', () => {
  it.each(cases)('%s', (_label, damage, rule, check) => {
    const doc = legitimateDoc();
    damage(doc);
    expect(guardModelDoc(doc).setAside).toContain(rule);
    check(doc);
    expect(doc['goal']).toBe('Choose the best vendor');
  });

  it('never throws on junk at any level', () => {
    for (const junk of [null, 0, 'x', [], [null], {}, HOSTILE, true]) {
      expect(() => guardModelDoc(junk)).not.toThrow();
      for (const key of ['criteria', 'alternatives', 'collaborators', 'responses', 'synthesis', 'members', '_changeLog', 'title']) {
        const doc = legitimateDoc();
        doc[key] = junk;
        expect(() => guardModelDoc(doc), `${key} = ${JSON.stringify(junk)}`).not.toThrow();
      }
    }
  });

  it('keeps a "__proto__" layer key an own property', () => {
    const map = guardComparisonMap(JSON.parse('{"__proto__": 1, "0,1": 2}'), 'r', new Set());
    expect(map).toEqual({ '0,1': 2 });
    const doc = legitimateDoc();
    ((doc['responses'] as Doc)['owner-uid'] as Doc)['alternativeMatrices'] = JSON.parse('{"__proto__": {"0,1": 2}}');
    guardModelDoc(doc);
    const alt = ((doc['responses'] as Doc)['owner-uid'] as Doc)['alternativeMatrices'] as Doc;
    expect(Object.getPrototypeOf(alt)).toBe(Object.prototype);
  });

  it('reads an unknown member role as viewer', () => {
    expect(roleOf({ u: 'god' }, 'u')).toBe('viewer');
    expect(roleOf('x', 'u')).toBe('viewer');
    expect(roleOf({ u: 'editor' }, 'u')).toBe('editor');
  });

  it('treats a synthesis whose stored arrays cannot be parsed as absent', () => {
    const doc = legitimateDoc();
    ((doc['synthesis'] as Doc)['summary'] as Doc)['localPriorities'] = '[[not json';
    expect(tryDeserializeSynthesis(doc['synthesis'] as never)).toBeNull();
  });
});

describe('comparisonsWithin — keys that fit the matrix', () => {
  it('drops keys past the end, so the maths cannot index outside its arrays', () => {
    const stored = { '0,1': 2, '0,99999': 3, '1,2': 4, '2,1': 5, 'a,b': 6 };
    expect(() => checkConnectivity(3, stored)).toThrow(TypeError);
    const within = comparisonsWithin(3, stored);
    expect(within).toEqual({ '0,1': 2, '1,2': 4 });
    expect(checkConnectivity(3, within).connected).toBe(true);
    expect(llsmWeights(3, within).weights).toHaveLength(3);
  });

  it('keeps every key of a legitimate response unchanged', () => {
    const stored = { '0,1': 3, '0,2': 1 / 9, '1,2': 9 };
    expect(comparisonsWithin(3, stored)).toEqual(stored);
  });
});
