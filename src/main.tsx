// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CrashBoundary } from './components/shell/CrashScreen';
import { AuthProvider } from './contexts/AuthContext';
import { StorageProvider } from './contexts/StorageContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* The outermost crash screen (v0.20.0): a fault in the frame, a provider or App shows it, never a blank page. */}
    <CrashBoundary>
      <AuthProvider>
        <StorageProvider>
          <App />
        </StorageProvider>
      </AuthProvider>
    </CrashBoundary>
  </React.StrictMode>
);
