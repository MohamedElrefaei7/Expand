import {
  applyToPoint,
  invert,
  multiply,
  rotationDegrees,
  scaling,
  translation,
  type AffineMatrix,
  type Point,
} from './affine';
import { millimetersToPixels, type PaperPreset } from './paper';

export interface SheetPlacement {
  id: string;
  label: string;
  centerXmm: number;
  centerYmm: number;
  rotationDeg: number;
}

export function sheetLocalToWorldMatrix(
  sheet: SheetPlacement,
): AffineMatrix {
  return multiply(
    translation(sheet.centerXmm, sheet.centerYmm),
    rotationDegrees(sheet.rotationDeg),
  );
}

export function worldToSheetLocalMatrix(
  sheet: SheetPlacement,
): AffineMatrix {
  return invert(sheetLocalToWorldMatrix(sheet));
}

export function sheetLocalToPagePixelsMatrix(
  paper: PaperPreset,
  dpi: number,
): AffineMatrix {
  const pixelsPerMillimeter = millimetersToPixels(1, dpi);

  return multiply(
    translation(
      millimetersToPixels(paper.widthMm, dpi) / 2,
      millimetersToPixels(paper.heightMm, dpi) / 2,
    ),
    scaling(pixelsPerMillimeter),
  );
}

/** Maps upright world millimeters into one physical sheet's raster pixels. */
export function worldToPagePixelsMatrix(
  sheet: SheetPlacement,
  paper: PaperPreset,
  dpi: number,
): AffineMatrix {
  return multiply(
    sheetLocalToPagePixelsMatrix(paper, dpi),
    worldToSheetLocalMatrix(sheet),
  );
}

export function pagePixelsToWorldMatrix(
  sheet: SheetPlacement,
  paper: PaperPreset,
  dpi: number,
): AffineMatrix {
  return invert(worldToPagePixelsMatrix(sheet, paper, dpi));
}

export function sheetCornersWorld(
  sheet: SheetPlacement,
  paper: PaperPreset,
): Point[] {
  const halfWidth = paper.widthMm / 2;
  const halfHeight = paper.heightMm / 2;
  const matrix = sheetLocalToWorldMatrix(sheet);

  return [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ].map((point) => applyToPoint(matrix, point));
}

export function isWorldPointOnSheet(
  point: Point,
  sheet: SheetPlacement,
  paper: PaperPreset,
) {
  const local = applyToPoint(worldToSheetLocalMatrix(sheet), point);
  return (
    Math.abs(local.x) <= paper.widthMm / 2 &&
    Math.abs(local.y) <= paper.heightMm / 2
  );
}

/**
 * True only when the interior of two physical sheets intersects. Touching at
 * an edge is allowed; production templates use a positive gap by default.
 */
export function sheetsOverlap(
  first: SheetPlacement,
  second: SheetPlacement,
  paper: PaperPreset,
): boolean {
  const firstCorners = sheetCornersWorld(first, paper);
  const secondCorners = sheetCornersWorld(second, paper);
  const polygons = [firstCorners, secondCorners];
  const epsilon = 1e-7;

  for (const polygon of polygons) {
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      if (!start || !end) continue;

      const axis = { x: -(end.y - start.y), y: end.x - start.x };
      const project = (corners: Point[]) => {
        const values = corners.map((corner) => corner.x * axis.x + corner.y * axis.y);
        return { min: Math.min(...values), max: Math.max(...values) };
      };
      const firstProjection = project(firstCorners);
      const secondProjection = project(secondCorners);

      if (
        firstProjection.max <= secondProjection.min + epsilon ||
        secondProjection.max <= firstProjection.min + epsilon
      ) {
        return false;
      }
    }
  }

  return true;
}
