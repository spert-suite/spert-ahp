// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useTheme, type Theme } from '../../hooks/useTheme';

const THEME_LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

const NEXT_THEME: Record<Theme, Theme> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

const CURRENT_THEME_ICON: Record<Theme, () => React.JSX.Element> = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
};

export function HeaderThemeToggle() {
  const { theme, setTheme, isInitialized } = useTheme();

  if (!isInitialized) {
    return <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />;
  }

  const nextTheme = NEXT_THEME[theme];
  const Icon = CURRENT_THEME_ICON[theme];

  // The frame's 32 × 32 theme button (`.sf-theme`, contract §3). Its icons draw in `currentColor`, the frame's muted
  // text colour (4.84 : 1 on white, 6.82 on #101828), at full opacity: they carry state (which theme is on), so they
  // are held to the 3 : 1 non-text bar. Never give them a fixed fill or an opacity again: the old amber sun measured
  // 2.15 : 1 on white, and 1.72 at the button's former 70 % opacity.
  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className="sf-theme"
      data-sf="theme"
      aria-label={`Theme: ${THEME_LABELS[theme]}. Switch to ${THEME_LABELS[nextTheme]}`}
      title={`Theme: ${THEME_LABELS[theme]}`}
    >
      <Icon />
    </button>
  );
}
