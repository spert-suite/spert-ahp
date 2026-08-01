// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent, FocusEvent, KeyboardEvent } from 'react';

/**
 * Buffered text field hook with focus guard and unmount-commit.
 *
 * Focus guard: while the field is focused, incoming storeValue changes
 * (from peer snapshots or external updates) do NOT overwrite the draft.
 *
 * Unmount-commit: when the component unmounts with the field focused
 * (tab navigation without blur — React does NOT fire onBlur on unmount),
 * the current draft is committed. All reads go through refs so the cleanup
 * has no stale closures.
 *
 * Sign-out note: if unmount is triggered by sign-out, onCommit may attempt
 * a Firestore write. updateModel guards on state.modelId (null after RESET),
 * so the write is typically a no-op. In the worst case a single write
 * succeeds against a session about to be revoked — not a data integrity issue.
 *
 * Ref-during-render note: draftRef.current and onCommitRef.current are
 * assigned during render (not in useEffect). This is intentional — it ensures
 * the unmount-commit cleanup always reads the latest values synchronously.
 * Using useEffect for these assignments would make them stale at cleanup time.
 */
export function useBufferedField({
  storeValue,
  onCommit,
}: {
  storeValue: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(storeValue);
  const isFocusedRef = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft; // eslint-disable-line react-hooks/refs -- intentional latest-value sync for unmount-cleanup access
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit; // eslint-disable-line react-hooks/refs -- intentional latest-value sync for unmount-cleanup access

  // Resync draft from store when not focused (peer snapshot, external reset)
  useEffect(() => {
    if (!isFocusedRef.current) setDraft(storeValue);
  }, [storeValue]);

  // Commit on unmount if focused. Empty deps: all reads go through refs.
  useEffect(() => {
    return () => {
      if (isFocusedRef.current) {
        onCommitRef.current(draftRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft(e.target.value);
    },
    [],
  );

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true;
  }, []);

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      isFocusedRef.current = false;
      onCommitRef.current(e.target.value);
    },
    [],
  );

  // Enter commits without requiring blur. This is a UX improvement over the
  // pre-v0.18.0 behavior (Enter did nothing in item labels; title/goal had no
  // keyboard submit path). Documented in the v0.18.0 changelog.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        isFocusedRef.current = false;
        onCommitRef.current(draftRef.current);
      }
    },
    [],
  );

  return { draft, handleChange, handleFocus, handleBlur, handleKeyDown };
}
