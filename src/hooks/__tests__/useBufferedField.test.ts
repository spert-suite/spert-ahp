// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBufferedField } from '../useBufferedField';
import type { ChangeEvent, FocusEvent, KeyboardEvent } from 'react';

// Minimal synthetic event helpers — avoids `as any` casts
function blurEvent(value: string): FocusEvent<HTMLInputElement> {
  return { target: { value } } as FocusEvent<HTMLInputElement>;
}
function changeEvent(value: string): ChangeEvent<HTMLInputElement> {
  return { target: { value } } as ChangeEvent<HTMLInputElement>;
}

describe('useBufferedField', () => {
  it('A3: focus guard prevents storeValue resync while field is focused', () => {
    const { result, rerender } = renderHook(
      ({ storeValue }: { storeValue: string }) =>
        useBufferedField({ storeValue, onCommit: vi.fn() }),
      { initialProps: { storeValue: 'Hello' } },
    );

    expect(result.current.draft).toBe('Hello');

    act(() => { result.current.handleFocus(); });

    // External update arrives (peer snapshot) while field is focused
    rerender({ storeValue: 'World' });

    // Draft must NOT be overwritten while focused
    expect(result.current.draft).toBe('Hello');
  });

  it('A3: storeValue resync occurs when not focused', () => {
    const { result, rerender } = renderHook(
      ({ storeValue }: { storeValue: string }) =>
        useBufferedField({ storeValue, onCommit: vi.fn() }),
      { initialProps: { storeValue: 'Hello' } },
    );

    // Not focused — external update should resync draft
    rerender({ storeValue: 'World' });
    expect(result.current.draft).toBe('World');
  });

  it('A3: unmount-commit fires with current draft if focused at unmount', () => {
    const mockCommit = vi.fn();
    const { result, unmount } = renderHook(() =>
      useBufferedField({ storeValue: 'Hello', onCommit: mockCommit }),
    );

    act(() => { result.current.handleFocus(); });
    act(() => { result.current.handleChange(changeEvent('Hello World')); });

    // Tab switch unmounts without blur
    unmount();

    expect(mockCommit).toHaveBeenCalledWith('Hello World');
  });

  it('A3: blur commits the current value and clears focus guard', () => {
    const mockCommit = vi.fn();
    const { result, rerender } = renderHook(
      ({ storeValue }: { storeValue: string }) =>
        useBufferedField({ storeValue, onCommit: mockCommit }),
      { initialProps: { storeValue: 'Hello' } },
    );

    act(() => { result.current.handleFocus(); });
    act(() => { result.current.handleBlur(blurEvent('Hello World')); });

    expect(mockCommit).toHaveBeenCalledWith('Hello World');

    // Focus guard cleared — next external update should resync
    rerender({ storeValue: 'External Update' });
    expect(result.current.draft).toBe('External Update');
  });

  it('A3: Enter key commits without requiring blur (UX improvement from v0.18.0)', () => {
    const mockCommit = vi.fn();
    const { result } = renderHook(() =>
      useBufferedField({ storeValue: 'Hello', onCommit: mockCommit }),
    );

    act(() => { result.current.handleFocus(); });
    act(() => { result.current.handleChange(changeEvent('Hello World')); });
    act(() => {
      result.current.handleKeyDown(
        { key: 'Enter' } as KeyboardEvent<HTMLInputElement>,
      );
    });

    expect(mockCommit).toHaveBeenCalledWith('Hello World');
  });
});
