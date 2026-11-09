// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StorageContext } from '../../../contexts/StorageContext';
import { LocalStorageAdapter } from '../../../storage/LocalStorageAdapter';
import FirstRunBanner from '../FirstRunBanner';
import LocalStorageCaution from '../LocalStorageCaution';
import GlobalSettingsPanel from '../../settings/GlobalSettingsPanel';
import {
  FIRST_RUN_SEEN_KEY,
  SUPPRESS_LOCAL_STORAGE_WARNING_KEY,
  resetNoticeStateForTests,
} from '../../../lib/appNotices';

// GlobalSettingsPanel renders StorageSection, which needs auth; stub it so
// this file tests only the Notifications switch.
vi.mock('../../settings/StorageSection', () => ({ default: () => null }));

const TERMS_START = /SPERT® Suite web apps are free to use\./;
const CAUTION_TEXT = /Your data exists only in this browser/;

function storageWrapper(mode: 'local' | 'cloud') {
  const value = {
    adapter: new LocalStorageAdapter(),
    mode,
    isCloudAvailable: true,
    switchMode: () => {},
    cloudDataLoaded: true,
    setCloudDataLoaded: () => {},
  };
  return function Wrapper({ children }: { children: ReactNode }) {
    return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
  };
}

beforeEach(() => {
  localStorage.clear();
  resetNoticeStateForTests(); // a fresh page load
});

describe('FirstRunBanner (terms notice)', () => {
  it('shows the exact wording and both links on a first visit', () => {
    render(<FirstRunBanner />);
    const p = screen.getByText(TERMS_START);
    expect(p.textContent).toBe(
      'SPERT® Suite web apps are free to use. No account is required to use them. By accessing or ' +
        'using this app, you agree to our Terms of Service and Privacy Policy. If you choose to enable ' +
        'optional Cloud Storage, you’ll be asked to explicitly confirm your agreement.',
    );
    expect(screen.getByRole('link', { name: 'Terms of Service' }).getAttribute('href')).toBe('https://spertsuite.com/TOS.pdf');
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe('https://spertsuite.com/PRIVACY.pdf');
  });

  it('"Got it" hides it and stores spert_firstRun_seen for good', () => {
    const { unmount } = render(<FirstRunBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText(TERMS_START)).toBeNull();
    expect(localStorage.getItem(FIRST_RUN_SEEN_KEY)).toBe('true');
    unmount();
    resetNoticeStateForTests(); // next page load
    render(<FirstRunBanner />);
    expect(screen.queryByText(TERMS_START)).toBeNull();
  });

  it('stays hidden when the key is already set', () => {
    localStorage.setItem('spert_firstRun_seen', 'true');
    render(<FirstRunBanner />);
    expect(screen.queryByText(TERMS_START)).toBeNull();
  });
});

describe('LocalStorageCaution', () => {
  it('shows the exact wording in local mode', () => {
    render(<LocalStorageCaution />, { wrapper: storageWrapper('local') });
    const p = screen.getByText(CAUTION_TEXT).closest('p');
    expect(p?.textContent).toBe(
      'Your data exists only in this browser and can be lost without warning. Export at the end of every session to protect your work.',
    );
    expect(screen.getByText('Your data exists only in this browser').tagName).toBe('STRONG');
  });

  it('does not show in cloud mode', () => {
    render(<LocalStorageCaution />, { wrapper: storageWrapper('cloud') });
    expect(screen.queryByText(CAUTION_TEXT)).toBeNull();
  });

  it('"Got it" hides it until the next page load, surviving a remount (navigation)', () => {
    const { unmount } = render(<LocalStorageCaution />, { wrapper: storageWrapper('local') });
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText(CAUTION_TEXT)).toBeNull();
    unmount();
    render(<LocalStorageCaution />, { wrapper: storageWrapper('local') });
    expect(screen.queryByText(CAUTION_TEXT)).toBeNull();
    // "Got it" is not permanent: nothing was written, and a new load shows it again.
    expect(localStorage.getItem(SUPPRESS_LOCAL_STORAGE_WARNING_KEY)).toBeNull();
  });

  it('shows again on the next page load after "Got it"', () => {
    const { unmount } = render(<LocalStorageCaution />, { wrapper: storageWrapper('local') });
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    unmount();
    resetNoticeStateForTests(); // next page load
    render(<LocalStorageCaution />, { wrapper: storageWrapper('local') });
    expect(screen.queryByText(CAUTION_TEXT)).not.toBeNull();
  });

  it('stays hidden while the Settings switch is off', () => {
    localStorage.setItem('ahp/suppressLocalStorageWarning', 'true');
    render(<LocalStorageCaution />, { wrapper: storageWrapper('local') });
    expect(screen.queryByText(CAUTION_TEXT)).toBeNull();
  });

  it('has no "Don\'t show again" control of its own', () => {
    render(<LocalStorageCaution />, { wrapper: storageWrapper('local') });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});

describe('Settings switch: "Warn me on startup when using local storage"', () => {
  it('is on by default, with the agreed description', () => {
    render(<GlobalSettingsPanel />);
    const box = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Warn me on startup when using local storage' });
    expect(box.checked).toBe(true);
    const desc = document.getElementById(box.getAttribute('aria-describedby') ?? '');
    expect(desc?.textContent).toBe(
      'Shows a caution banner each time the app opens while your data is stored locally in this browser.',
    );
  });

  it('turning it off writes the key and hides the caution at once; on clears it', () => {
    render(
      <>
        <LocalStorageCaution />
        <GlobalSettingsPanel />
      </>,
      { wrapper: storageWrapper('local') },
    );
    expect(screen.queryByText(CAUTION_TEXT)).not.toBeNull();
    const box = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Warn me on startup when using local storage' });
    fireEvent.click(box);
    expect(box.checked).toBe(false);
    expect(localStorage.getItem(SUPPRESS_LOCAL_STORAGE_WARNING_KEY)).toBe('true');
    expect(screen.queryByText(CAUTION_TEXT)).toBeNull();
    fireEvent.click(box);
    expect(box.checked).toBe(true);
    expect(localStorage.getItem(SUPPRESS_LOCAL_STORAGE_WARNING_KEY)).toBeNull();
    expect(screen.queryByText(CAUTION_TEXT)).not.toBeNull();
  });
});
