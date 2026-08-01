// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

function sortKeysReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort());
  }
  return value;
}

export async function hashObject(obj: Record<string, unknown>): Promise<string> {
  const sorted = JSON.stringify(obj, sortKeysReplacer);
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(sorted),
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
