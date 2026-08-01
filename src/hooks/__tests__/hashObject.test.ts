// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect } from 'vitest';
import { hashObject } from '../hashObject';

describe('hashObject', () => {
  it('same input produces same hash', async () => {
    const obj = { a: 1, b: 'two', c: [3, 4] };
    const h1 = await hashObject(obj);
    const h2 = await hashObject(obj);
    expect(h1).toBe(h2);
    expect(typeof h1).toBe('string');
    expect(h1.length).toBe(64); // SHA-256 = 32 bytes = 64 hex chars
  });

  it('different input produces different hash', async () => {
    const h1 = await hashObject({ a: 1 });
    const h2 = await hashObject({ a: 2 });
    expect(h1).not.toBe(h2);
  });

  it('key order does not matter', async () => {
    const h1 = await hashObject({ z: 1, a: 2, m: 3 });
    const h2 = await hashObject({ a: 2, m: 3, z: 1 });
    expect(h1).toBe(h2);
  });

  it('nested key order does not matter', async () => {
    const h1 = await hashObject({ outer: { z: 1, a: 2 } });
    const h2 = await hashObject({ outer: { a: 2, z: 1 } });
    expect(h1).toBe(h2);
  });

  it('arrays preserve order', async () => {
    const h1 = await hashObject({ list: [1, 2, 3] });
    const h2 = await hashObject({ list: [3, 2, 1] });
    expect(h1).not.toBe(h2);
  });
});
