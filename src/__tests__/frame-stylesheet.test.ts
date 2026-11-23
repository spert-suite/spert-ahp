// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * The SPERT® Suite app frame's stylesheet (FRAME26), vendored byte for byte from the canonical copy in
 * spert-suite-docs (`suite/frame/spert-frame.css`). Every adopting app pins the same md5, so a local edit, or a copy
 * that missed a canonical change, fails here, not in a user's window.
 *
 * If this fails because the canonical file changed: copy it again (`cp`), check `md5 -q` against the md5 the campaign
 * gives you, and update PINNED in the same commit. Never edit the vendored copy to make this pass.
 *
 * It sits in `src/__tests__/`, which `tsc -b` never compiles (as `copyright-headers.test.ts` explains), so it was
 * type-checked standalone under `--strict --noUncheckedIndexedAccess --noUnusedLocals --noUnusedParameters`.
 */
const PINNED = '6e1fa767afb862d5f7efc8a216abd29b';
const SRC = join(process.cwd(), 'src');
const VENDORED = join(SRC, 'styles', 'spert-frame.css');
const INDEX_CSS = join(SRC, 'index.css');
/** An import of the stylesheet, in CSS (`@import "…spert-frame.css"`) or in a module (`import '…spert-frame.css'`). */
const IMPORTS_IT = /(?:@import\s+(?:url\()?|import\s+|from\s+)["'][^"']*spert-frame\.css["']/g;

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe('the vendored frame stylesheet', () => {
  it('is byte-identical to the canonical copy whose md5 is pinned here', () => {
    const md5 = createHash('md5').update(readFileSync(VENDORED)).digest('hex');
    expect(md5).toBe(PINNED);
  });

  it('is imported exactly once, by index.css, unlayered', () => {
    const css = readFileSync(INDEX_CSS, 'utf8');
    const imports = Array.from(css.matchAll(IMPORTS_IT)).map((m) => m[0]);
    expect(imports).toEqual(['@import "./styles/spert-frame.css"']);
    // A layer() would put it under Tailwind's utilities, and any utility could then move the frame (contract §9.2).
    const line = css.split('\n').find((l) => l.includes('spert-frame.css') && l.trimStart().startsWith('@import'));
    expect(line).toBe('@import "./styles/spert-frame.css";');
  });

  it('is imported by nothing else under src/', () => {
    const others = filesUnder(SRC)
      .filter((f) => /\.(?:css|ts|tsx|js|jsx|mjs)$/.test(f) && f !== INDEX_CSS && !f.includes('__tests__'))
      .filter((f) => Array.from(readFileSync(f, 'utf8').matchAll(IMPORTS_IT)).length > 0)
      .map((f) => relative(SRC, f));
    expect(others).toEqual([]);
  });

  it('the importer check can see an import (must-find control)', () => {
    expect(Array.from('import "../styles/spert-frame.css";'.matchAll(IMPORTS_IT))).toHaveLength(1);
    expect(Array.from("@import url('./styles/spert-frame.css');".matchAll(IMPORTS_IT))).toHaveLength(1);
    expect(Array.from('/* spert-frame.css is vendored */'.matchAll(IMPORTS_IT))).toHaveLength(0);
  });
});
