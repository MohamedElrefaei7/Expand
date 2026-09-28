import { describe, expect, it } from 'vitest';
import {
  applyToPoint,
  invert,
  multiply,
  rotationDegrees,
  scaling,
  translation,
} from './affine';

describe('affine matrices', () => {
  it('applies transforms in explicit right-to-left order', () => {
    const matrix = multiply(translation(10, 20), scaling(2));
    expect(applyToPoint(matrix, { x: 3, y: 4 })).toEqual({ x: 16, y: 28 });
  });

  it('round-trips arbitrary points through an inverse', () => {
    const matrix = multiply(
      translation(-48.5, 113.25),
      multiply(rotationDegrees(27), scaling(3.2, 1.7)),
    );
    const inverse = invert(matrix);

    for (const point of [
      { x: 0, y: 0 },
      { x: 12.4, y: -88.1 },
      { x: -301.2, y: 44.75 },
    ]) {
      const reconstructed = applyToPoint(
        inverse,
        applyToPoint(matrix, point),
      );
      expect(reconstructed.x).toBeCloseTo(point.x, 10);
      expect(reconstructed.y).toBeCloseTo(point.y, 10);
    }
  });
});

