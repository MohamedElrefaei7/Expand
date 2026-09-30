export interface Point {
  x: number;
  y: number;
}

/** Canvas-compatible 2D affine matrix. */
export interface AffineMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const IDENTITY_MATRIX: AffineMatrix = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
};

/** Returns a matrix that applies `right` first and `left` second. */
export function multiply(
  left: AffineMatrix,
  right: AffineMatrix,
): AffineMatrix {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

export function translation(x: number, y: number): AffineMatrix {
  return { ...IDENTITY_MATRIX, e: x, f: y };
}

export function scaling(x: number, y = x): AffineMatrix {
  return { a: x, b: 0, c: 0, d: y, e: 0, f: 0 };
}

/** Positive angles rotate clockwise in Expand's y-down world coordinates. */
export function rotationDegrees(degrees: number): AffineMatrix {
  const radians = (degrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return {
    a: cosine,
    b: sine,
    c: -sine,
    d: cosine,
    e: 0,
    f: 0,
  };
}

export function invert(matrix: AffineMatrix): AffineMatrix {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;

  if (Math.abs(determinant) < Number.EPSILON) {
    throw new Error('Cannot invert a singular affine matrix.');
  }

  return {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / determinant,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / determinant,
  };
}

export function applyToPoint(matrix: AffineMatrix, point: Point): Point {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

export function setCanvasTransform(
  context: CanvasRenderingContext2D,
  matrix: AffineMatrix,
) {
  context.setTransform(
    matrix.a,
    matrix.b,
    matrix.c,
    matrix.d,
    matrix.e,
    matrix.f,
  );
}
