// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { Component } from 'react';
import type { ReactNode } from 'react';

interface ContentErrorBoundaryProps {
  children: ReactNode;
  /** When this changes (page or open model), a caught error is cleared. */
  resetKey: string;
  onBackToDashboard: () => void;
}

interface ContentErrorBoundaryState {
  error: Error | null;
}

/**
 * Around the page content. Without it a render error anywhere unmounted the
 * whole app, leaving a blank page: one malformed decision could take the
 * header, the tabs and the way back to the Dashboard with it.
 */
export default class ContentErrorBoundary extends Component<ContentErrorBoundaryProps, ContentErrorBoundaryState> {
  state: ContentErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ContentErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prev: ContentErrorBoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="space-y-3 max-w-md">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">This page could not be displayed</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{this.state.error.message}</p>
        <button
          type="button"
          onClick={this.props.onBackToDashboard}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }
}
