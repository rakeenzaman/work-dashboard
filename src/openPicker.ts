import type { MouseEvent } from 'react';

/** Opens the native date picker on any click, not just on the tiny calendar glyph. */
export function openPicker(e: MouseEvent<HTMLInputElement>) {
  try {
    e.currentTarget.showPicker();
  } catch {
    // Unsupported or not allowed; the input still works by typing.
  }
}
