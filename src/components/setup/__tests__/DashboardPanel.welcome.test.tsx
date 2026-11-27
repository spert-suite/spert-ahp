// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { AuthContext } from '../../../contexts/AuthContext';
import { StorageContext } from '../../../contexts/StorageContext';
import DashboardPanel from '../DashboardPanel';
import type { ModelIndexEntry, UseAHPReturn } from '../../../types/ahp';

/**
 * v0.20.0 (FRAME26 clean-up W; contract §3 and §7, stylesheet v3): with no saved decision, the Welcome panel stands in
 * for the tile grid: the frame's `.sf-empty`, "Welcome to SPERT® AHP", two lines and one button, "Create New Decision",
 * doing what the toolbar's New Decision does. AHP has no sample, so no second button and no note. Until v0.20.0 it was
 * a dashed box with "No saved decisions yet. Click New Decision to start." William approved the words (2026-11-26).
 */
function setup(models: ModelIndexEntry[] = []) {
  const storage = {
    listModels: vi.fn(async () => models),
    reorderModels: vi.fn(async () => {}),
    deleteModel: vi.fn(async () => {}),
  };
  const createModel = vi.fn(async () => {});
  const ahpState = { storage, loadModel: vi.fn(async () => {}), createModel } as unknown as UseAHPReturn;
  const auth = { user: null, loading: false, firebaseAvailable: false };
  const storageCtx = { adapter: storage, mode: 'local', isCloudAvailable: false, cloudDataLoaded: true, setCloudDataLoaded: () => {} };
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={auth as never}>
        <StorageContext.Provider value={storageCtx as never}>{children}</StorageContext.Provider>
      </AuthContext.Provider>
    );
  }
  const onDecisionOpened = vi.fn();
  render(<DashboardPanel ahpState={ahpState} userId="u1" onDecisionOpened={onDecisionOpened} />, { wrapper: Wrapper });
  return { createModel, onDecisionOpened };
}

const panel = () => document.querySelector('[data-sf="empty"]') as HTMLElement | null;

describe('the Welcome panel', () => {
  it('is the frame’s .sf-empty, hooked, its title the brand’s with the ® in .sf-mark', async () => {
    setup();
    await screen.findByText(/^Create a decision to name your goal/);
    const p = panel()!;
    expect(p.className).toBe('sf-empty');
    const title = p.querySelector('h2')!;
    expect(title.className).toBe('sf-empty-title');
    expect(title.innerHTML).toBe('Welcome to SPERT<span class="sf-mark">®</span> AHP');
  });

  it('holds the two lines and one button, in that order, and no note', async () => {
    setup();
    await screen.findByText(/^Create a decision to name your goal/);
    const p = panel()!;
    expect([...p.children].map((k) => k.className)).toEqual(['sf-empty-title', 'sf-empty-text', 'sf-empty-text', 'sf-empty-actions']);
    const lines = [...p.querySelectorAll('.sf-empty-text')].map((x) => x.textContent!.replace(/\s+/g, ' ').trim());
    expect(lines).toEqual([
      'Weigh your alternatives against the criteria that matter to you, two at a time, and see which one ranks first and how consistent your judgments are.',
      'Create a decision to name your goal, then add its criteria and alternatives.',
    ]);
    const buttons = within(p.querySelector('.sf-empty-actions') as HTMLElement).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Create New Decision']);
    expect(buttons[0]!.className).toBe('sf-btn px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700');
    expect(p.querySelector('.sf-empty-note')).toBeNull();
  });

  it('carries none of the old box’s own classes or words', async () => {
    setup();
    await screen.findByText(/^Create a decision to name your goal/);
    const html = panel()!.outerHTML;
    for (const old of ['sf-below', 'border-dashed', 'rounded-lg', 'p-8', 'text-center', 'No saved decisions yet']) {
      expect(html, old).not.toContain(old);
    }
  });

  it('Create New Decision creates an untitled decision and opens it, as the toolbar’s New Decision does', async () => {
    const { createModel, onDecisionOpened } = setup();
    await screen.findByText(/^Create a decision to name your goal/);
    fireEvent.click(screen.getByRole('button', { name: 'Create New Decision' }));
    expect(createModel).toHaveBeenCalledWith('', '');
    expect(onDecisionOpened).toHaveBeenCalledTimes(1);
  });

  it('goes once a decision exists', async () => {
    const decision: ModelIndexEntry = { modelId: 'm1', title: 'Pick a vendor', status: 'setup', createdAt: Date.UTC(2026, 10, 1), order: 0, role: 'owner' };
    setup([decision]);
    await screen.findByText('Pick a vendor');
    expect(panel()).toBeNull();
    expect(document.querySelector('.sf-empty')).toBeNull();
  });
});
