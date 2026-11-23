// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import type { ReactNode } from 'react';

interface HeadingRowProps {
  /** The page's heading: the page's one `h1`. */
  children: ReactNode;
  /** The full text, shown on hover when a long heading is cut short with an ellipsis (contract §7, "Long names"). */
  title?: string;
  /** The page's own toolbar, flush right on the row (the Decisions screen's Export All · Import · New Decision). */
  toolbar?: ReactNode;
}

/**
 * The frame's heading row (FRAME26, contract §3): the page's `h1`, 24 / 32 / 700 at the column's left edge, with the
 * toolbar flush right, 24 px under the frame. Every screen has exactly one, and it is the page's only `h1`: the brand
 * title is not a heading.
 *
 * ⚠️ Render it as a DIRECT child of `main`, never inside a wrapper: a capped screen (`.sf-main--capped`, exception X4)
 * caps every child of `main` except this row, which stays full width. A screen component therefore returns a fragment,
 * `<><HeadingRow>…</HeadingRow><div>…body…</div></>`.
 */
export default function HeadingRow({ children, title, toolbar }: HeadingRowProps) {
  return (
    <div className="sf-headrow" data-sf="headrow">
      <h1 className="sf-heading" data-sf="heading" title={title}>
        {children}
      </h1>
      {toolbar && (
        <div className="sf-toolbar" data-sf="toolbar">
          {toolbar}
        </div>
      )}
    </div>
  );
}
