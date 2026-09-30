import {
  applyToPoint,
  multiply,
  scaling,
  setCanvasTransform,
  translation,
  type AffineMatrix,
  type Point,
} from '../geometry/affine';
import { millimetersToPixels, type PaperPreset } from '../geometry/paper';
import {
  sheetCornersWorld,
  worldToPagePixelsMatrix,
  type SheetPlacement,
} from '../geometry/sheet';
import { drawWorldArtwork } from './artwork';

function tracePolygon(context: CanvasRenderingContext2D, points: Point[]) {
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.closePath();
}

function boundsOfPoints(points: Point[]) {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

function worldToPreviewMatrix(
  width: number,
  height: number,
  sheets: SheetPlacement[],
  paper: PaperPreset,
): AffineMatrix {
  const allCorners = sheets.flatMap((sheet) => sheetCornersWorld(sheet, paper));
  const bounds = boundsOfPoints(allCorners);
  const padding = 32;
  const scale = Math.min(
    (width - padding * 2) / (bounds.maxX - bounds.minX),
    (height - padding * 2) / (bounds.maxY - bounds.minY),
  );
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return multiply(
    translation(width / 2, height / 2),
    multiply(scaling(scale), translation(-centerX, -centerY)),
  );
}

export function drawAssembledPreview(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  sheets: SheetPlacement[],
  paper: PaperPreset,
  pixelRatio = 1,
) {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width * pixelRatio, height * pixelRatio);
  const worldToPreview = multiply(
    scaling(pixelRatio),
    worldToPreviewMatrix(width, height, sheets, paper),
  );

  sheets.forEach((sheet, sheetIndex) => {
    const corners = sheetCornersWorld(sheet, paper);

    context.save();
    setCanvasTransform(context, worldToPreview);
    tracePolygon(context, corners);
    context.clip();
    drawWorldArtwork(context);
    context.restore();

    context.save();
    setCanvasTransform(context, worldToPreview);
    tracePolygon(context, corners);
    context.strokeStyle = sheetIndex === 0 ? '#2469ce' : '#ea713f';
    context.lineWidth = (2 * pixelRatio) / worldToPreview.a;
    context.stroke();
    context.restore();

    const labelPoint = applyToPoint(
      worldToPreview,
      corners[0] ?? { x: 0, y: 0 },
    );
    context.save();
    context.fillStyle = sheetIndex === 0 ? '#2469ce' : '#ea713f';
    context.beginPath();
    context.arc(
      labelPoint.x + 18 * pixelRatio,
      labelPoint.y + 18 * pixelRatio,
      14 * pixelRatio,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.fillStyle = '#f7f2e6';
    context.font = `700 ${12 * pixelRatio}px Trebuchet MS`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(
      sheet.label,
      labelPoint.x + 18 * pixelRatio,
      labelPoint.y + 18 * pixelRatio,
    );
    context.restore();
  });
}

function drawPageOverlay(
  context: CanvasRenderingContext2D,
  sheet: SheetPlacement,
  paper: PaperPreset,
  dpi: number,
) {
  const pixelsPerMillimeter = millimetersToPixels(1, dpi);
  const width = millimetersToPixels(paper.widthMm, dpi);
  const height = millimetersToPixels(paper.heightMm, dpi);
  const margin = 8 * pixelsPerMillimeter;

  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.strokeStyle = '#202b3d';
  context.lineWidth = Math.max(1, 0.35 * pixelsPerMillimeter);
  context.setLineDash([2 * pixelsPerMillimeter, 2 * pixelsPerMillimeter]);
  context.strokeRect(
    margin,
    margin,
    width - margin * 2,
    height - margin * 2,
  );
  context.setLineDash([]);

  const squareSize = 25.4 * pixelsPerMillimeter;
  const squareX = margin + 3 * pixelsPerMillimeter;
  const squareY = height - margin - squareSize - 3 * pixelsPerMillimeter;
  context.fillStyle = '#f7f2e6';
  context.fillRect(
    squareX - 1.5 * pixelsPerMillimeter,
    squareY - 1.5 * pixelsPerMillimeter,
    squareSize + 3 * pixelsPerMillimeter,
    squareSize + 8 * pixelsPerMillimeter,
  );
  context.strokeRect(squareX, squareY, squareSize, squareSize);
  context.fillStyle = '#202b3d';
  context.font = `${Math.round(3.5 * pixelsPerMillimeter)}px Trebuchet MS`;
  context.fillText(
    '25.4 mm',
    squareX,
    squareY + squareSize + 1.5 * pixelsPerMillimeter,
  );

  const labelX = margin + 3 * pixelsPerMillimeter;
  const labelY = margin + 3 * pixelsPerMillimeter;
  context.fillStyle = '#f7f2e6';
  context.fillRect(
    labelX,
    labelY,
    72 * pixelsPerMillimeter,
    17 * pixelsPerMillimeter,
  );
  context.fillStyle = '#202b3d';
  context.font = `700 ${Math.round(5 * pixelsPerMillimeter)}px Georgia`;
  context.fillText(`EXPAND · SHEET ${sheet.label}`, labelX, labelY);
  context.font = `${Math.round(3.2 * pixelsPerMillimeter)}px Trebuchet MS`;
  context.fillText(
    `Place at ${sheet.rotationDeg > 0 ? '+' : ''}${sheet.rotationDeg}° · print at 100%`,
    labelX,
    labelY + 7 * pixelsPerMillimeter,
  );
  context.restore();
}

export function renderFixturePage(
  sheet: SheetPlacement,
  paper: PaperPreset,
  dpi: number,
) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(millimetersToPixels(paper.widthMm, dpi));
  canvas.height = Math.round(millimetersToPixels(paper.heightMm, dpi));

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D rendering is not available.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  setCanvasTransform(context, worldToPagePixelsMatrix(sheet, paper, dpi));
  drawWorldArtwork(context);
  drawPageOverlay(context, sheet, paper, dpi);

  return canvas;
}
