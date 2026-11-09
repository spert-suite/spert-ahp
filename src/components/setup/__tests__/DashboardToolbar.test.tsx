// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { AuthContext } from '../../../contexts/AuthContext';
import { StorageContext } from '../../../contexts/StorageContext';
import DashboardPanel from '../DashboardPanel';
import type { ModelIndexEntry, UseAHPReturn } from '../../../types/ahp';

// Export All's in-flight state: hold the export open until the test releases it.
let releaseExport: (() => void) | null = null;
vi.mock('../../../storage/exportAllModels', () => ({
  exportAllModels: vi.fn(
    () =>
      new Promise((resolve) => {
        releaseExport = () => resolve({});
      }),
  ),
}));

const MODEL: ModelIndexEntry = {
  modelId: 'm1',
  title: 'Pick a vendor',
  createdAt: '2026-11-01T00:00:00.000Z',
  order: 0,
} as ModelIndexEntry;

function setup(opts: { models?: ModelIndexEntry[]; mode?: 'local' | 'cloud'; cloudDataLoaded?: boolean } = {}) {
  const models = opts.models ?? [];
  const storage = {
    listModels: vi.fn(async () => models),
    reorderModels: vi.fn(async () => {}),
    deleteModel: vi.fn(async () => {}),
  };
  const ahpState = {
    storage,
    loadModel: vi.fn(async () => {}),
    createModel: vi.fn(async () => {}),
  } as unknown as UseAHPReturn;
  const auth = {
    user: null,
    loading: false,
    firebaseAvailable: false,
    signInError: null,
    clearSignInError: () => {},
    signInWithGoogle: async () => {},
    signInWithMicrosoft: async () => {},
    signOut: async () => {},
  };
  const storageCtx = {
    adapter: storage,
    mode: opts.mode ?? 'local',
    isCloudAvailable: false,
    switchMode: () => {},
    cloudDataLoaded: opts.cloudDataLoaded ?? true,
    // Held as given, so a "cloud still loading" state stays put.
    setCloudDataLoaded: () => {},
  };
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={auth as never}>
        <StorageContext.Provider value={storageCtx as never}>{children}</StorageContext.Provider>
      </AuthContext.Provider>
    );
  }
  const onDecisionOpened = vi.fn();
  render(<DashboardPanel ahpState={ahpState} userId="u1" onDecisionOpened={onDecisionOpened} />, {
    wrapper: Wrapper,
  });
  return { ahpState, onDecisionOpened };
}

function toolbarButtons(): HTMLButtonElement[] {
  const heading = screen.getByRole('heading', { name: 'Decisions' });
  const row = heading.parentElement!;
  return within(row).getAllByRole('button') as HTMLButtonElement[];
}

beforeEach(() => {
  releaseExport = null;
});

describe('Dashboard toolbar', () => {
  it('renders Export All · Import · New Decision, in that order, beside the Decisions heading', async () => {
    setup({ models: [MODEL] });
    await screen.findByText('Pick a vendor');
    const buttons = toolbarButtons();
    expect(buttons.map((b) => b.textContent)).toEqual(['Export All', 'Import', 'New Decision']);
  });

  it('gives accessible names that begin with the visible label and describe decisions', async () => {
    setup({ models: [MODEL] });
    await screen.findByText('Pick a vendor');
    const names = toolbarButtons().map((b) => b.getAttribute('aria-label') ?? b.textContent);
    expect(names).toEqual(['Export all decisions as JSON', 'Import decisions from JSON', 'New Decision']);
    toolbarButtons().forEach((b) => {
      const visible = (b.textContent ?? '').toLowerCase();
      expect((b.getAttribute('aria-label') ?? b.textContent ?? '').toLowerCase().startsWith(visible)).toBe(true);
    });
  });

  it('draws one 16 px icon per button, hidden from assistive tech, and no leading "+"', async () => {
    setup({ models: [MODEL] });
    await screen.findByText('Pick a vendor');
    for (const b of toolbarButtons()) {
      const svgs = b.querySelectorAll('svg');
      expect(svgs).toHaveLength(1);
      expect(svgs[0].getAttribute('aria-hidden')).toBe('true');
      expect(svgs[0].getAttribute('width')).toBe('16');
      expect(b.textContent?.startsWith('+')).toBe(false);
    }
  });

  it('does not use role="toolbar"', async () => {
    setup();
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it('with no decisions: every button still renders, Export All disabled, the rest enabled', async () => {
    setup();
    await screen.findByText(/No saved decisions yet/);
    const [exportAll, importBtn, newDecision] = toolbarButtons();
    expect(exportAll.textContent).toBe('Export All');
    expect(exportAll.disabled).toBe(true);
    expect(importBtn.disabled).toBe(false);
    expect(newDecision.disabled).toBe(false);
  });

  it('empty-state help names the button without the "+"', async () => {
    setup();
    const p = await screen.findByText(/No saved decisions yet/);
    expect(p.textContent).toBe('No saved decisions yet. Click New Decision to start.');
  });

  it('Export All: disabled while exporting, shows "Exporting…", and the name follows the visible text', async () => {
    // The finished export clicks a download anchor; jsdom cannot navigate, so stub it.
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    setup({ models: [MODEL] });
    await screen.findByText('Pick a vendor');
    fireEvent.click(toolbarButtons()[0]);
    const exportAll = toolbarButtons()[0];
    expect(exportAll.textContent).toBe('Exporting…');
    expect(exportAll.disabled).toBe(true);
    expect(exportAll.hasAttribute('aria-label')).toBe(false);
    await act(async () => { releaseExport?.(); });
    expect(toolbarButtons()[0].disabled).toBe(false);
    expect(toolbarButtons()[0].textContent).toBe('Export All');
    click.mockRestore();
  });

  it('Import: disabled while cloud decisions load, with the explaining note kept', async () => {
    setup({ mode: 'cloud', cloudDataLoaded: false });
    const importBtn = toolbarButtons()[1];
    expect(importBtn.disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toBe(
      'Cloud decisions are still loading — import will be available in a moment.',
    );
  });

  it('Import: disabled and aria-busy while reading a file, shows "Reading…", name follows the visible text', async () => {
    setup();
    await screen.findByText(/No saved decisions yet/);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const neverReads = { text: () => new Promise<string>(() => {}) };
    await act(async () => {
      fireEvent.change(input, { target: { files: [neverReads] } });
    });
    const importBtn = toolbarButtons()[1];
    expect(importBtn.textContent).toBe('Reading…');
    expect(importBtn.disabled).toBe(true);
    expect(importBtn.getAttribute('aria-busy')).toBe('true');
    expect(importBtn.hasAttribute('aria-label')).toBe(false);
  });

  it('New Decision creates a draft and opens it (no gate)', async () => {
    const { ahpState, onDecisionOpened } = setup();
    fireEvent.click(toolbarButtons()[2]);
    expect(ahpState.createModel).toHaveBeenCalledWith('', '');
    expect(onDecisionOpened).toHaveBeenCalled();
  });
});
