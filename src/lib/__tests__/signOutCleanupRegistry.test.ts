// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerSignOutCleanup,
  runSignOutCleanup,
  clearSignOutCleanupRegistry,
} from '../signOutCleanupRegistry';

describe('signOutCleanupRegistry', () => {
  beforeEach(() => {
    clearSignOutCleanupRegistry();
  });

  it('runs every registered callback in registration order', async () => {
    const order: string[] = [];
    registerSignOutCleanup(() => {
      order.push('a');
    });
    registerSignOutCleanup(async () => {
      order.push('b');
    });
    registerSignOutCleanup(() => {
      order.push('c');
    });

    await runSignOutCleanup();

    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('continues running remaining callbacks when one throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const invoked: string[] = [];

    registerSignOutCleanup(() => {
      invoked.push('first');
    });
    registerSignOutCleanup(() => {
      throw new Error('boom');
    });
    registerSignOutCleanup(() => {
      invoked.push('third');
    });

    await runSignOutCleanup();

    expect(invoked).toEqual(['first', 'third']);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('continues running remaining callbacks when an async one rejects', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const invoked: string[] = [];

    registerSignOutCleanup(async () => {
      invoked.push('first');
    });
    registerSignOutCleanup(async () => {
      throw new Error('async-boom');
    });
    registerSignOutCleanup(() => {
      invoked.push('third');
    });

    await runSignOutCleanup();

    expect(invoked).toEqual(['first', 'third']);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('clearSignOutCleanupRegistry removes all callbacks', async () => {
    const invoked: string[] = [];
    registerSignOutCleanup(() => {
      invoked.push('a');
    });
    clearSignOutCleanupRegistry();

    await runSignOutCleanup();

    expect(invoked).toEqual([]);
  });

  it('returns a deregister handle that removes only the specified callback', async () => {
    const invoked: string[] = [];
    registerSignOutCleanup(() => invoked.push('a'));
    const deregisterB = registerSignOutCleanup(() => invoked.push('b'));
    registerSignOutCleanup(() => invoked.push('c'));

    deregisterB();

    await runSignOutCleanup();

    expect(invoked).toEqual(['a', 'c']);
  });

  it('deregister handle is safe to call twice (idempotent)', async () => {
    const invoked: string[] = [];
    const deregister = registerSignOutCleanup(() => invoked.push('once'));

    deregister();
    deregister();

    await runSignOutCleanup();

    expect(invoked).toEqual([]);
  });

  it('deregister handle does not affect callbacks registered after it', async () => {
    const invoked: string[] = [];
    const deregisterA = registerSignOutCleanup(() => invoked.push('a'));
    deregisterA();
    registerSignOutCleanup(() => invoked.push('b'));

    await runSignOutCleanup();

    expect(invoked).toEqual(['b']);
  });
});
