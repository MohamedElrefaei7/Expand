import type { Point } from '../geometry/affine';
import type { SheetPlacement } from '../geometry/sheet';

export const DEFAULT_FIXTURE_ANGLES = {
  a: -12,
  b: 15,
} as const;

export const COMMON_TARGETS: Array<Point & { id: string }> = [
  { id: '1', x: 0, y: -72 },
  { id: '2', x: 0, y: 0 },
  { id: '3', x: 0, y: 72 },
];

export function createFixtureSheets(
  angleA: number = DEFAULT_FIXTURE_ANGLES.a,
  angleB: number = DEFAULT_FIXTURE_ANGLES.b,
): SheetPlacement[] {
  return [
    {
      id: 'sheet-a',
      label: 'A',
      centerXmm: -55,
      centerYmm: 0,
      rotationDeg: angleA,
    },
    {
      id: 'sheet-b',
      label: 'B',
      centerXmm: 55,
      centerYmm: 0,
      rotationDeg: angleB,
    },
  ];
}
