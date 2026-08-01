// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from 'firebase/auth';

// Mock firebase/firestore so setDoc / serverTimestamp are observable.
const setDocMock = vi.fn(() => Promise.resolve());
const docMock = vi.fn((db: unknown, col: string, uid: string) => ({ db, col, uid }));
const serverTimestampMock = vi.fn(() => '__SERVER_TS__');

vi.mock('firebase/firestore', () => ({
  doc: (db: unknown, col: string, uid: string) => docMock(db, col, uid),
  setDoc: (...args: unknown[]) => setDocMock(...(args as [unknown, unknown, unknown])),
  serverTimestamp: () => serverTimestampMock(),
}));

// Stub the Firebase module so `db` is non-null inside profileWrites.
vi.mock('../firebase', () => ({
  db: { __mock: true },
}));

import { writeSpertahpProfile, writeSpertsuiteProfile } from '../profileWrites';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'user-123',
    email: 'Alice@Example.COM',
    displayName: 'Alice Smith',
    photoURL: 'https://example.com/photo.png',
    ...overrides,
  } as User;
}

describe('profileWrites', () => {
  beforeEach(() => {
    setDocMock.mockClear();
    docMock.mockClear();
    serverTimestampMock.mockClear();
    setDocMock.mockImplementation(() => Promise.resolve());
  });

  describe('writeSpertahpProfile', () => {
    it('writes to spertahp_profiles/{uid} with the lowercased email', async () => {
      writeSpertahpProfile(makeUser());
      await Promise.resolve(); // flush microtasks for the void/setDoc chain
      expect(docMock).toHaveBeenCalledWith({ __mock: true }, 'spertahp_profiles', 'user-123');
      const [, payload, options] = setDocMock.mock.calls[0]!;
      expect(payload).toMatchObject({
        displayName: 'Alice Smith',
        email: 'alice@example.com', // lowercased
        photoURL: 'https://example.com/photo.png',
        updatedAt: '__SERVER_TS__',
      });
      expect(options).toEqual({ merge: true });
    });

    it("falls back to '' when displayName or email is null", async () => {
      writeSpertahpProfile(makeUser({ displayName: null, email: null }));
      await Promise.resolve();
      const [, payload] = setDocMock.mock.calls[0]!;
      expect(payload).toMatchObject({
        displayName: '',
        email: '', // (null ?? '').toLowerCase() === ''
      });
    });

    it('falls back to null when photoURL is missing', async () => {
      writeSpertahpProfile(makeUser({ photoURL: null }));
      await Promise.resolve();
      const [, payload] = setDocMock.mock.calls[0]!;
      expect(payload).toMatchObject({ photoURL: null });
    });

    it('places serverTimestamp at the end of the payload (Lesson 29)', async () => {
      writeSpertahpProfile(makeUser());
      await Promise.resolve();
      const [, payload] = setDocMock.mock.calls[0]!;
      const keys = Object.keys(payload as Record<string, unknown>);
      // updatedAt MUST be the last key — protects against future
      // accidental overwrite by a spread of later fields.
      expect(keys[keys.length - 1]).toBe('updatedAt');
    });

    it('is fire-and-forget — does not throw when setDoc rejects', () => {
      setDocMock.mockImplementationOnce(() => Promise.reject(new Error('permission-denied')));
      // The void contract: function returns void synchronously and the
      // rejection is swallowed via .catch.
      expect(() => writeSpertahpProfile(makeUser())).not.toThrow();
    });
  });

  describe('writeSpertsuiteProfile', () => {
    it('writes to spertsuite_profiles/{uid} with the lowercased email', async () => {
      writeSpertsuiteProfile(makeUser());
      await Promise.resolve();
      expect(docMock).toHaveBeenCalledWith({ __mock: true }, 'spertsuite_profiles', 'user-123');
      const [, payload, options] = setDocMock.mock.calls[0]!;
      expect(payload).toMatchObject({
        email: 'alice@example.com',
      });
      expect(options).toEqual({ merge: true });
    });

    it('shares the same payload shape as writeSpertahpProfile', async () => {
      writeSpertahpProfile(makeUser());
      writeSpertsuiteProfile(makeUser());
      await Promise.resolve();
      const ahpPayload = setDocMock.mock.calls[0]![1];
      const suitePayload = setDocMock.mock.calls[1]![1];
      // Symmetric writes — only the collection name differs.
      expect(suitePayload).toEqual(ahpPayload);
    });
  });
});
