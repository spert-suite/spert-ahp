// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import type { SynthesisBundle } from '../types/ahp';

/**
 * Shape of the `synthesis` field as it lives inside a Firestore model doc.
 * Firestore does not support nested arrays, so `summary.localPriorities`
 * (number[][]) and `individual.individualLocalPriorities`
 * (Record<string, number[][]>) are persisted as JSON strings and decoded on
 * read. Every other field passes through unchanged.
 */
export interface FirestoreSynthesis {
  synthesisId: string;
  summary: SynthesisBundle['summary'];
  individual: SynthesisBundle['individual'];
  diagnostics: SynthesisBundle['diagnostics'];
}

/**
 * Encode an in-memory SynthesisBundle into the Firestore-safe shape by
 * deep-cloning and replacing nested-array fields with JSON strings.
 *
 * `docs` may be a partial bundle (the existing saveSynthesis API) — any
 * fields not provided are pulled from `existing` when present so partial
 * writes don't drop data.
 */
export function serializeSynthesisForFirestore(
  synthesisId: string,
  docs: Partial<SynthesisBundle>,
  existing?: FirestoreSynthesis | null,
): Record<string, unknown> {
  const merged = {
    synthesisId,
    summary: docs.summary ?? (existing?.summary as SynthesisBundle['summary']),
    individual: docs.individual ?? (existing?.individual as SynthesisBundle['individual']),
    diagnostics: docs.diagnostics ?? (existing?.diagnostics as SynthesisBundle['diagnostics']),
  };

  const toWrite = JSON.parse(JSON.stringify(merged)) as Record<string, unknown>;

  if (merged.summary?.localPriorities) {
    (toWrite['summary'] as Record<string, unknown>)['localPriorities'] =
      JSON.stringify(merged.summary.localPriorities);
  }
  if (merged.individual?.individualLocalPriorities) {
    (toWrite['individual'] as Record<string, unknown>)['individualLocalPriorities'] =
      JSON.stringify(merged.individual.individualLocalPriorities);
  }

  return toWrite;
}

/**
 * Decode a stored synthesis back into an in-memory SynthesisBundle by
 * parsing the JSON-stringified nested-array fields. Passes through when the
 * fields are already in their runtime array form (e.g., written by a codec
 * that produced plain objects, or decoded in tests).
 */
export function deserializeSynthesisFromFirestore(raw: FirestoreSynthesis): SynthesisBundle {
  const summary = { ...raw.summary };
  if (typeof summary.localPriorities === 'string') {
    summary.localPriorities = JSON.parse(summary.localPriorities) as number[][];
  }

  const rawIndividual = raw.individual ?? ({} as SynthesisBundle['individual']);
  const individual: SynthesisBundle['individual'] = {
    individualPriorities: rawIndividual.individualPriorities ?? {},
    individualCR: rawIndividual.individualCR ?? {},
    individualAlternativeScores: rawIndividual.individualAlternativeScores ?? {},
    individualLocalPriorities:
      typeof rawIndividual.individualLocalPriorities === 'string'
        ? (JSON.parse(rawIndividual.individualLocalPriorities) as Record<string, number[][]>)
        : rawIndividual.individualLocalPriorities ?? {},
    individualIncompleteCriteria: rawIndividual.individualIncompleteCriteria ?? {},
  };

  return {
    summary,
    individual,
    diagnostics: raw.diagnostics,
  };
}
