// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { AuthContext } from '../../../contexts/AuthContext';
import { StorageContext } from '../../../contexts/StorageContext';
import { LocalStorageAdapter } from '../../../storage/LocalStorageAdapter';
import InvitationBanner from '../InvitationBanner';

vi.mock('../../../lib/featureFlags', () => ({
  get INVITATIONS_ENABLED() {
    return Boolean((globalThis as Record<string, unknown>).__INVITATIONS_ENABLED);
  },
}));

function setFlag(value: boolean) {
  (globalThis as Record<string, unknown>).__INVITATIONS_ENABLED = value;
}

function setUrl(url: string) {
  window.history.replaceState({}, '', url);
}

interface WrapperOpts {
  signInWithGoogle?: () => Promise<void>;
  signInWithMicrosoft?: () => Promise<void>;
  firebaseAvailable?: boolean;
}

function makeWrapper(opts: WrapperOpts = {}) {
  const auth = {
    user: null,
    loading: false,
    firebaseAvailable: opts.firebaseAvailable ?? true,
    signInError: null,
    clearSignInError: () => {},
    signInWithGoogle: opts.signInWithGoogle ?? (async () => {}),
    signInWithMicrosoft: opts.signInWithMicrosoft ?? (async () => {}),
    signOut: async () => {},
  };
  const storage = {
    adapter: new LocalStorageAdapter(),
    mode: 'local' as const,
    isCloudAvailable: opts.firebaseAvailable ?? true,
    switchMode: () => {},
    cloudDataLoaded: true,
    setCloudDataLoaded: () => {},
  };
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={auth}>
        <StorageContext.Provider value={storage}>{children}</StorageContext.Provider>
      </AuthContext.Provider>
    );
  };
}

describe('InvitationBanner', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setUrl('/');
    setFlag(true);
  });

  afterEach(() => {
    setFlag(false);
  });

  it('renders nothing when no invitation is in flight', () => {
    const { container } = render(<InvitationBanner />, { wrapper: makeWrapper() });
    expect(container.firstChild).toBeNull();
  });

  it('renders the pre-auth message + both sign-in CTAs when ?invite= is captured', () => {
    setUrl('/?invite=tok123');
    render(<InvitationBanner />, { wrapper: makeWrapper() });
    // getByText / getByRole throw if the node is missing — assertion is implicit.
    screen.getByText(/invited to a SPERT AHP decision/i);
    screen.getByRole('button', { name: /sign in with google/i });
    screen.getByRole('button', { name: /sign in with microsoft/i });
  });

  it('replaces the CTAs with an unavailable message when Firebase is not configured', () => {
    setUrl('/?invite=tok123');
    render(<InvitationBanner />, {
      wrapper: makeWrapper({ firebaseAvailable: false }),
    });
    screen.getByText(/cloud sign-in is unavailable/i);
    expect(screen.queryByRole('button', { name: /sign in with google/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /sign in with microsoft/i })).toBeNull();
  });

  it('clicking "Sign in with Google" invokes signInWithGoogle', async () => {
    setUrl('/?invite=tok123');
    const signInWithGoogle = vi.fn(async () => {});
    render(<InvitationBanner />, { wrapper: makeWrapper({ signInWithGoogle }) });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    });
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('clicking "Sign in with Microsoft" invokes signInWithMicrosoft', async () => {
    setUrl('/?invite=tok123');
    const signInWithMicrosoft = vi.fn(async () => {});
    render(<InvitationBanner />, { wrapper: makeWrapper({ signInWithMicrosoft }) });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in with microsoft/i }));
    });
    expect(signInWithMicrosoft).toHaveBeenCalledTimes(1);
  });

  it('renders the claim message after spert:models-changed fires', () => {
    setUrl('/?invite=tok123');
    render(<InvitationBanner />, { wrapper: makeWrapper() });
    screen.getByText(/invited to a SPERT AHP decision/i);
    act(() => {
      window.dispatchEvent(
        new CustomEvent('spert:models-changed', {
          detail: {
            claimed: [
              { appId: 'spertahp', modelId: 'm1', modelName: 'Q3 staffing decision' },
            ],
          },
        }),
      );
    });
    screen.getByText(/added to/i);
    screen.getByText(/Q3 staffing decision/);
  });

  it('dismiss button removes the banner', () => {
    setUrl('/?invite=tok123');
    const { container } = render(<InvitationBanner />, { wrapper: makeWrapper() });
    expect(container.firstChild).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /dismiss invitation banner/i }));
    expect(container.firstChild).toBeNull();
  });
});
