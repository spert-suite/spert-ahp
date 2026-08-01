// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect } from 'vitest';
import { parseBulkEmails } from '../parseBulkEmails';

describe('parseBulkEmails', () => {
  it('returns empty arrays for empty input', () => {
    expect(parseBulkEmails('')).toEqual({ valid: [], invalid: [] });
    expect(parseBulkEmails('   ')).toEqual({ valid: [], invalid: [] });
  });

  it('splits on commas', () => {
    expect(parseBulkEmails('a@x.com, b@x.com,c@x.com')).toEqual({
      valid: ['a@x.com', 'b@x.com', 'c@x.com'],
      invalid: [],
    });
  });

  it('splits on semicolons', () => {
    expect(parseBulkEmails('a@x.com; b@x.com;c@x.com')).toEqual({
      valid: ['a@x.com', 'b@x.com', 'c@x.com'],
      invalid: [],
    });
  });

  it('splits on newlines and whitespace', () => {
    const input = 'a@x.com\nb@x.com\r\nc@x.com\td@x.com';
    expect(parseBulkEmails(input)).toEqual({
      valid: ['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com'],
      invalid: [],
    });
  });

  it('preserves original case and dedups case-insensitively', () => {
    expect(parseBulkEmails('  Alice@Example.COM ')).toEqual({
      valid: ['Alice@Example.COM'],
      invalid: [],
    });
    expect(parseBulkEmails('b@x.com, a@x.com, B@X.COM, a@x.com')).toEqual({
      valid: ['b@x.com', 'a@x.com'],
      invalid: [],
    });
  });

  it('handles mixed separators in one input', () => {
    expect(parseBulkEmails('a@x.com,b@x.com;c@x.com d@x.com\ne@x.com')).toEqual({
      valid: ['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com', 'e@x.com'],
      invalid: [],
    });
  });

  // Lesson 42: invalid-format tokens are partitioned out so callers can
  // surface them as "invalid" chips and skip the CF call when nothing valid.
  it('partitions invalid-format tokens into the invalid array', () => {
    const r = parseBulkEmails('a@b.com notanemail c@d.com');
    expect(r.valid).toEqual(['a@b.com', 'c@d.com']);
    expect(r.invalid).toEqual(['notanemail']);
  });

  it('returns all tokens as invalid when none match EMAIL_RE', () => {
    const r = parseBulkEmails('foo bar baz');
    expect(r.valid).toEqual([]);
    expect(r.invalid).toEqual(['foo', 'bar', 'baz']);
  });

  it('treats malformed addresses (no @ or no TLD) as invalid', () => {
    const r = parseBulkEmails('alice@example, bob@, @charlie.com, dave@x.com');
    expect(r.valid).toEqual(['dave@x.com']);
    expect(r.invalid).toEqual(['alice@example', 'bob@', '@charlie.com']);
  });
});
