// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

/**
 * Render a changelog entry's stored date for display.
 *
 * Lives in its own module rather than inside ChangelogPage.tsx so that the guard
 * in src/__tests__/changelog-dates.test.ts can import the REAL function. Testing
 * a re-implementation would have agreed with itself while the page showed
 * "Invalid date" — which is exactly what happened for ten days across v0.18.34
 * and v0.18.35.
 *
 * Exporting it from the page component instead would work, but trips
 * react-refresh/only-export-components: a file that exports both a component and
 * a plain function breaks fast refresh.
 *
 * INPUT FORMAT IS ISO, `YYYY-MM-DD`, and that is load-bearing rather than a
 * preference: this splits on "-" and reads the pieces positionally, so a
 * long-form date such as "August 24, 2026" yields one piece, produces NaN, and
 * renders as the literal words "Invalid date".
 */
export function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year!, month! - 1, day);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
