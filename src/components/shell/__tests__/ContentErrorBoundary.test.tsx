// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

/**
 * v0.18.45 (W4): the page-content error boundary and the cloud-load notice.
 * Before the boundary existed, a render error unmounted the whole app.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import ContentErrorBoundary from '../ContentErrorBoundary';
import CloudLoadNotice from '../CloudLoadNotice';
import { reportGuardedLoad, dismissGuardedLoad } from '../../../lib/cloudLoadNotices';
import PairwiseComparisonLayer from '../../comparison/PairwiseComparisonLayer';
import { guardModelDoc } from '../../../storage/cloudReadGuard';

afterEach(() => { cleanup(); dismissGuardedLoad('m1'); });

function Boom(): never {
  throw new Error('page failed');
}

describe('ContentErrorBoundary', () => {
  it('keeps the rest of the app and offers the way back to the Dashboard', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const back = vi.fn();
    render(<div><p>tabs</p><ContentErrorBoundary resetKey="Compare:m1" onBackToDashboard={back}><Boom /></ContentErrorBoundary></div>);
    expect(screen.getByText('tabs')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('This page could not be displayed');
    fireEvent.click(screen.getByRole('button', { name: 'Back to Dashboard' }));
    expect(back).toHaveBeenCalledTimes(1);
    err.mockRestore();
  });

  it('clears the error when the page or model changes', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(<ContentErrorBoundary resetKey="a" onBackToDashboard={() => {}}><Boom /></ContentErrorBoundary>);
    rerender(<ContentErrorBoundary resetKey="b" onBackToDashboard={() => {}}><p>next page</p></ContentErrorBoundary>);
    expect(screen.getByText('next page')).toBeTruthy();
    err.mockRestore();
  });
});

describe('CloudLoadNotice', () => {
  it('appears for the open model once the guard reports it, names it, and dismisses', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<CloudLoadNotice modelId="m1" title="Vendors" />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => { reportGuardedLoad('m1', ['model.title'], true); });
    expect(screen.getByRole('status').textContent).toContain('Vendors');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).toBeNull();
    act(() => { reportGuardedLoad('m1', ['model.title'], false); });
    expect(screen.queryByRole('status')).toBeNull();
    warn.mockRestore();
  });
});

// Confirms, in a render, a crash the W4 guard fixes: a stored completionTier
// outside 1–4 made COMPARISON_TIERS[tier] undefined inside the Compare layer.
describe('PairwiseComparisonLayer with a stored completionTier', () => {
  const items = [{ id: 'a', label: 'A', description: '' }, { id: 'b', label: 'B', description: '' }, { id: 'c', label: 'C', description: '' }];
  const matrix = {
    comparisons: {}, weights: null, cr: null, connectivity: { connected: true, missingLinks: [] }, converged: true,
    setComparison: () => {}, removeComparison: () => {},
  };
  const renderLayer = (tier: unknown) => render(
    <PairwiseComparisonLayer items={items} tier={tier as 4} matrix={matrix as never} banner={null} isOwner mode="criteria" criterionLabel="" />,
  );

  it('crashed on the raw value, and renders on the value the guard produces', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderLayer(9)).toThrow(TypeError);
    cleanup();
    const { doc } = guardModelDoc({ completionTier: 9 });
    expect(() => renderLayer(doc['completionTier'])).not.toThrow();
    err.mockRestore();
  });
});
