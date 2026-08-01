// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect } from 'vitest';
import {
  serializeSynthesisForFirestore,
  deserializeSynthesisFromFirestore,
  type FirestoreSynthesis,
} from '../firestoreSynthesisCodec';
import type { SynthesisBundle } from '../../types/ahp';

function sampleBundle(): SynthesisBundle {
  return {
    summary: {
      method: 'AIJ',
      aggregatedWeights: [0.5, 0.3, 0.2],
      localPriorities: [
        [0.6, 0.4, 0.3],
        [0.4, 0.6, 0.7],
      ],
      globalScores: [0.45, 0.55],
      concordance: { kendallW: 0.82, interpretation: 'strong' },
      votersIncluded: ['alice', 'bob'],
      votersExcluded: [],
      synthesizedAt: 1_700_000_000_000,
      synthesisId: 'hash-abc',
      isVotingSnapshot: { alice: true, bob: true },
      pairCoveragePercent: 1.0,
      pairCoverageDiagnostic: 'full',
      confidence: {
        level: 'GREEN',
        signals: {
          voterCount: 2,
          avgCR: 0.05,
          kendallW: 0.82,
          maxCV: 0.10,
          pairCoverage: 1.0,
        },
      },
    },
    individual: {
      individualPriorities: { alice: [0.5, 0.3, 0.2], bob: [0.5, 0.3, 0.2] },
      individualCR: {
        alice: { criteria: { cr: 0.03, isAcceptable: true, lambdaMax: 3.05, ci: 0.025, confidenceLabel: 'GREEN' } },
        bob: { criteria: { cr: 0.04, isAcceptable: true, lambdaMax: 3.07, ci: 0.035, confidenceLabel: 'GREEN' } },
      },
      individualAlternativeScores: { alice: [0.45, 0.55], bob: [0.46, 0.54] },
      individualLocalPriorities: {
        alice: [
          [0.6, 0.4, 0.3],
          [0.4, 0.6, 0.7],
        ],
        bob: [
          [0.55, 0.45, 0.35],
          [0.45, 0.55, 0.65],
        ],
      },
      individualIncompleteCriteria: {},
    },
    diagnostics: {
      disagreement: { items: [] },
      pairwiseAgreement: { '0,1': 0.99 },
    },
  };
}

describe('firestoreSynthesisCodec', () => {
  it('round-trips a full bundle', () => {
    const bundle = sampleBundle();
    const serialized = serializeSynthesisForFirestore('hash-abc', bundle);
    const deserialized = deserializeSynthesisFromFirestore(serialized as unknown as FirestoreSynthesis);
    expect(deserialized).toEqual(bundle);
  });

  it('encodes summary.localPriorities as a JSON string for Firestore', () => {
    const bundle = sampleBundle();
    const serialized = serializeSynthesisForFirestore('hash-abc', bundle) as Record<string, unknown>;
    const serializedSummary = serialized['summary'] as Record<string, unknown>;
    expect(typeof serializedSummary['localPriorities']).toBe('string');
    expect(JSON.parse(serializedSummary['localPriorities'] as string)).toEqual(bundle.summary.localPriorities);
  });

  it('encodes individual.individualLocalPriorities as a JSON string', () => {
    const bundle = sampleBundle();
    const serialized = serializeSynthesisForFirestore('hash-abc', bundle) as Record<string, unknown>;
    const serializedIndividual = serialized['individual'] as Record<string, unknown>;
    expect(typeof serializedIndividual['individualLocalPriorities']).toBe('string');
    expect(JSON.parse(serializedIndividual['individualLocalPriorities'] as string)).toEqual(
      bundle.individual.individualLocalPriorities,
    );
  });

  it('uses existing fields when docs is partial', () => {
    const bundle = sampleBundle();
    const prior = serializeSynthesisForFirestore('old-hash', bundle) as unknown as FirestoreSynthesis;

    // Update only diagnostics
    const updated = serializeSynthesisForFirestore(
      'new-hash',
      { diagnostics: { disagreement: { items: [] }, pairwiseAgreement: { '0,1': 0.5 } } },
      prior,
    ) as Record<string, unknown>;

    expect(updated['synthesisId']).toBe('new-hash');
    // summary preserved from prior
    const summary = updated['summary'] as Record<string, unknown>;
    expect(summary['aggregatedWeights']).toEqual(bundle.summary.aggregatedWeights);
    // diagnostics updated
    expect((updated['diagnostics'] as Record<string, unknown>)['pairwiseAgreement']).toEqual({ '0,1': 0.5 });
  });

  it('deserializer passes through plain-array fields (already-decoded shape)', () => {
    const bundle = sampleBundle();
    // Construct a "Firestore doc" where the nested arrays are already arrays,
    // not JSON strings — this must still deserialize cleanly.
    const raw = {
      synthesisId: 'hash-abc',
      summary: bundle.summary,
      individual: bundle.individual,
      diagnostics: bundle.diagnostics,
    } as FirestoreSynthesis;
    expect(deserializeSynthesisFromFirestore(raw)).toEqual(bundle);
  });

  it('deserializer defaults missing individual sub-fields to empty maps', () => {
    const bundle = sampleBundle();
    const raw = {
      synthesisId: 'hash-abc',
      summary: bundle.summary,
      // Intentionally minimal individual
      individual: {} as SynthesisBundle['individual'],
      diagnostics: bundle.diagnostics,
    } as FirestoreSynthesis;
    const deserialized = deserializeSynthesisFromFirestore(raw);
    expect(deserialized.individual.individualPriorities).toEqual({});
    expect(deserialized.individual.individualCR).toEqual({});
    expect(deserialized.individual.individualAlternativeScores).toEqual({});
    expect(deserialized.individual.individualLocalPriorities).toEqual({});
    expect(deserialized.individual.individualIncompleteCriteria).toEqual({});
  });
});
