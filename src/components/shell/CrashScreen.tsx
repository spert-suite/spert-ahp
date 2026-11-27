// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { Component, useLayoutEffect, type ErrorInfo, type ReactNode } from 'react';

/**
 * The app's outermost crash screen (v0.20.0, FRAME26 clean-up E; contract §7, "Errors"). `main.tsx` wraps every
 * provider in `CrashBoundary`, so an error that `ContentErrorBoundary` (inside `main`, a view error with the frame
 * intact) cannot catch lands here: one in the frame, a provider or `App` itself. Until v0.20.0 such an error unmounted
 * the whole tree and left a blank page. It stays OUTSIDE the frame on purpose: drawn inside it, a fault in the frame
 * would take the crash screen down too. It uses the page ground (#ffffff / #101828) and the frame's heading and muted
 * text colours, in the user's theme (re-applied here, since `useTheme` in App may never have run), and offers one way
 * out, Reload. One wording in every SPERT® app (William, 2026-11-26).
 */

/** The stored theme (`spert-theme`), with "system" read from the OS. Every read is guarded: the fault may be in either. */
function crashIsDark(): boolean {
  let stored: string | null;
  try {
    stored = localStorage.getItem('spert-theme');
  } catch {
    stored = null;
  }
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return document.documentElement.classList.contains('dark');
  }
}

export function CrashScreen({ onReload = () => window.location.reload() }: { onReload?: () => void }) {
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', crashIsDark());
  }, []);
  return (
    <div
      role="alert"
      data-crash-screen=""
      className="flex min-h-screen items-center justify-center bg-white p-8 text-center dark:bg-[#101828]"
    >
      <div className="max-w-md">
        <h1 className="text-xl font-semibold text-[#333333] dark:text-[#e2e8f0]">Something went wrong</h1>
        <p className="mt-2 text-sm text-[#6a7282] dark:text-[#99a1af]">
          SPERT<span className="sf-mark">®</span> AHP could not display this page. Reload to try again.
        </p>
        <button
          type="button"
          onClick={onReload}
          className="mt-6 h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

interface CrashBoundaryProps {
  children: ReactNode;
  /** Tests only: what Reload does. The app reloads the page. */
  onReload?: () => void;
}

export class CrashBoundary extends Component<CrashBoundaryProps, { crashed: boolean }> {
  state = { crashed: false };

  static getDerivedStateFromError(): { crashed: boolean } {
    return { crashed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[CrashBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.crashed) return <CrashScreen onReload={this.props.onReload} />;
    return this.props.children;
  }
}
