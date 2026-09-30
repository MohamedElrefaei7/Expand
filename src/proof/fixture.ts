import type { SheetPlacement } from '../geometry/sheet';

export const DEFAULT_FIXTURE_ANGLES = {
  a: -12,
  b: 15,
} as const;

/** Center-to-center wall spacing. It deliberately leaves a visible gap. */
export const FIXTURE_CENTER_SPACING_MM = 340;

export function createFixtureSheets(
  angleA: number = DEFAULT_FIXTURE_ANGLES.a,
  angleB: number = DEFAULT_FIXTURE_ANGLES.b,
): SheetPlacement[] {
  return [
    {
      id: 'sheet-a',
      label: 'A',
      centerXmm: -FIXTURE_CENTER_SPACING_MM / 2,
      centerYmm: 0,
      rotationDeg: angleA,
    },
    {
      id: 'sheet-b',
      label: 'B',
      centerXmm: FIXTURE_CENTER_SPACING_MM / 2,
      centerYmm: 0,
      rotationDeg: angleB,
    },
  ];
}
