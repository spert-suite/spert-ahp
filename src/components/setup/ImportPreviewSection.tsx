// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useRef, useEffect } from 'react';
import type { UseImportStateReturn } from '../../hooks/useImportState';
import type {
  AHPConflictMap,
  ImportDecision,
  ParseError,
} from '../../storage/import-utils';

// ── PerModelDecisionRows ─────────────────────────────────────────────────────
// Shared between the preview and replace-confirm phases. Replace-confirm
// passes disabled=true so the user sees context for what they're confirming.
interface PerModelDecisionRowsProps {
  envelopes: Array<{ meta: { title: string } }>;
  conflicts: AHPConflictMap;
  decisions: Map<number, ImportDecision>;
  disabled: boolean;
  onDecisionChange: (index: number, decision: ImportDecision) => void;
}

function PerModelDecisionRows({
  envelopes,
  conflicts,
  decisions,
  disabled,
  onDecisionChange,
}: PerModelDecisionRowsProps) {
  return (
    <div className="space-y-2">
      {envelopes.map((env, i) => {
        const conflict = conflicts.get(i)!;
        const decision = decisions.get(i) ?? 'skip';
        const replaceTooltip =
          conflict.replaceGateReason === 'multiple-candidates'
            ? 'Multiple existing decisions share this name — replace cannot disambiguate. Choose Add or Skip.'
            : conflict.replaceGateReason === 'not-owner'
              ? 'You are not the owner of this decision.'
              : undefined;
        return (
          <div
            key={i}
            className="border rounded p-3 flex items-center gap-4 border-gray-200 dark:border-gray-700"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
                {env.meta.title || '(untitled)'}
              </p>
              {conflict.type !== 'none' && conflict.existingTitle && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  {conflict.type === 'id' ? 'ID match' : 'Name match'}: "
                  {conflict.existingTitle}"
                  {conflict.replaceGateReason === 'multiple-candidates' && ' (multiple)'}
                </span>
              )}
              {conflict.type === 'none' && (
                <span className="text-xs text-green-600 dark:text-green-400">New</span>
              )}
            </div>
            <div className="flex gap-3 text-xs">
              {(['skip', 'add', 'replace'] as const).map((opt) => (
                <label key={opt} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`decision-${i}`}
                    value={opt}
                    checked={decision === opt}
                    disabled={
                      disabled ||
                      (opt === 'replace' && (conflict.type === 'none' || conflict.replaceGated))
                    }
                    title={
                      opt === 'replace'
                        ? replaceTooltip
                        : opt === 'add'
                          ? 'Creates a new copy of this decision, owned by you. The original is unchanged.'
                          : undefined
                    }
                    onChange={() => onDecisionChange(i, opt)}
                    className="accent-blue-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── InvalidEnvelopeRows ──────────────────────────────────────────────────────
// Bundle-level parse errors surfaced inline in the preview so users see
// which envelopes were rejected before they confirm what to import.
function InvalidEnvelopeRows({ parseErrors }: { parseErrors: ParseError[] }) {
  if (parseErrors.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-red-700 dark:text-red-400">
        {parseErrors.length} decision{parseErrors.length !== 1 ? 's' : ''} in this bundle cannot be
        imported:
      </p>
      {parseErrors.map((p, i) => (
        <div
          key={i}
          className="border rounded p-3 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
        >
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            Item {p.index}: {p.title}
          </p>
          <p className="text-xs text-red-700 dark:text-red-400 mt-1">{p.reason}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ImportPreviewSection({
  importState,
}: {
  importState: UseImportStateReturn;
}) {
  const {
    phase,
    handleDecisionChange,
    handleConfirmImport,
    handleCancelPreview,
    handleCancelReplaceAll,
    handleReplaceAllConfirmed,
    handleDismissBanner,
  } = importState;

  // Programmatic focus on preview open — accessibility per pitfall #31.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (phase.tag === 'preview') {
      headingRef.current?.focus();
    }
  }, [phase.tag]);

  if (phase.tag === 'idle') return null;

  if (phase.tag === 'parsing') {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 p-4">Reading file…</div>
    );
  }

  if (phase.tag === 'applying') {
    return <div className="text-sm text-gray-500 dark:text-gray-400 p-4">Importing…</div>;
  }

  if (phase.tag === 'banner') {
    const { result } = phase;
    const parts: string[] = [];
    if (result.addedCount > 0) parts.push(`${result.addedCount} added`);
    if (result.replacedCount > 0) parts.push(`${result.replacedCount} replaced`);
    if (result.skippedCount > 0) parts.push(`${result.skippedCount} skipped`);
    if (result.errorCount > 0) parts.push(`${result.errorCount} failed`);
    const summary = !result.ok
      ? result.abortReason ?? 'Import aborted.'
      : parts.length > 0
        ? `Import complete: ${parts.join(', ')}.`
        : 'No decisions were imported.';
    const isError = !result.ok || result.errorCount > 0;
    return (
      <div
        role={isError ? 'alert' : 'status'}
        aria-live={isError ? 'assertive' : 'polite'}
        className={`rounded-md border p-3 text-sm space-y-2 ${
          isError
            ? 'border-red-200 dark:border-red-800'
            : 'border-green-200 dark:border-green-800'
        }`}
      >
        <p
          className={
            isError ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
          }
        >
          {summary}
        </p>
        {result.errors.slice(0, 2).map((e, i) => (
          <p key={i} className="text-red-600 dark:text-red-400 text-xs">
            "{e.title}": {e.reason}
          </p>
        ))}
        {result.errors.length > 2 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            +{result.errors.length - 2} more error
            {result.errors.length - 2 !== 1 ? 's' : ''}
          </p>
        )}
        <button
          onClick={handleDismissBanner}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 underline"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (phase.tag === 'preview') {
    const parseErrors =
      phase.parsed.type === 'bundle' ? phase.parsed.parseErrors : [];
    const validCount = phase.parsed.envelopes.length;
    return (
      <div className="space-y-4">
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="text-sm font-semibold text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 rounded outline-none"
        >
          Review import ({validCount} decision{validCount !== 1 ? 's' : ''})
        </h3>
        <InvalidEnvelopeRows parseErrors={parseErrors} />
        {validCount > 0 && (
          <PerModelDecisionRows
            envelopes={phase.parsed.envelopes}
            conflicts={phase.conflicts}
            decisions={phase.decisions}
            disabled={false}
            onDecisionChange={handleDecisionChange}
          />
        )}
        <div className="flex gap-2">
          <button
            onClick={handleConfirmImport}
            disabled={validCount === 0}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Import
          </button>
          <button
            onClick={handleCancelPreview}
            className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (phase.tag === 'replace-confirm') {
    const dedupNote =
      phase.dedupedCount && phase.dedupedCount > 0
        ? ` Note: ${phase.dedupedCount} of your replace selection${phase.dedupedCount !== 1 ? 's target decisions' : ' targets a decision'} that another selection is already replacing; only the first selection per decision will apply.`
        : '';
    return (
      <div className="space-y-4">
        <PerModelDecisionRows
          envelopes={phase.parsed.envelopes}
          conflicts={phase.conflicts}
          decisions={phase.decisions}
          disabled={true}
          onDecisionChange={() => {}}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="replace-confirm-heading"
          className="border border-amber-200 dark:border-amber-800 rounded-lg p-4 bg-amber-50 dark:bg-amber-900/20 space-y-3"
        >
          <p
            id="replace-confirm-heading"
            className="text-sm font-semibold text-amber-900 dark:text-amber-200"
          >
            Confirm Replace
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {phase.replaceCount} existing decision{phase.replaceCount !== 1 ? 's' : ''} will be
            permanently overwritten. Existing collaborators will remain members, but they will
            need to resubmit their comparisons — their previous judgments are not carried over
            because the decision structure is being replaced. This cannot be undone.
            {dedupNote}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleReplaceAllConfirmed}
              className="px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
            >
              Confirm Replace
            </button>
            <button
              onClick={handleCancelReplaceAll}
              className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
