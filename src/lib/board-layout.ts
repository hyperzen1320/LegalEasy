// Where a list sits on the Work Flow canvas before anybody drags it.
//
// Lists are created with position {0,0} — the canvas lays them out on
// first open and remembers where they were dropped after that. Anything
// that adds a list to a board the canvas has ALREADY laid out has to
// place it itself, or it lands on top of the first column. These are the
// numbers that first pass uses, in one place so the two agree.
//
// Deliberately free of any model import: this is arithmetic, and the
// client canvas may want it one day.

export const CANVAS_GRID = {
  stepX: 360,
  stepY: 460,
  perRow: 4,
  originX: 60,
  originY: 80,
} as const;

/** The nth slot of the canvas grid, reading left to right, top to bottom. */
export function canvasSlot(index: number): { x: number; y: number } {
  const i = Math.max(0, Math.floor(index));
  return {
    x: (i % CANVAS_GRID.perRow) * CANVAS_GRID.stepX + CANVAS_GRID.originX,
    y: Math.floor(i / CANVAS_GRID.perRow) * CANVAS_GRID.stepY + CANVAS_GRID.originY,
  };
}
