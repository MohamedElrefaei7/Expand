import { PDFDocument, rgb } from 'pdf-lib';
import { multiply, scaling, setCanvasTransform, translation } from '../geometry/affine';
import { millimetersToPdfPoints, millimetersToPixels, type PaperPreset } from '../geometry/paper';
import { worldToPagePixelsMatrix } from '../geometry/sheet';

export interface ExportTile {
  id: string;
  label: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
}

export interface ImagePlacement {
  scalePercent: number;
  offsetX: number;
  offsetY: number;
}

export interface PrintScale {
  x: number;
  y: number;
}

export interface RegistrationOffset {
  /** Positive values are the printer's measured right/down placement error in millimeters. */
  x: number;
  y: number;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The image could not be read for export.'));
    image.src = url;
  });
}

function canvasToPngBytes(canvas: HTMLCanvasElement) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('The print page could not be encoded.')); return; }
      blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer))).catch(reject);
    }, 'image/png');
  });
}

function renderPage(
  tile: ExportTile,
  paper: PaperPreset,
  image: HTMLImageElement,
  imagePlacement: ImagePlacement,
  worldScaleMm: number,
  dpi: number,
  safeMarginMm: number,
  printScale: PrintScale,
  registrationOffsetMm: RegistrationOffset,
) {
  const canvas = document.createElement('canvas');
  const width = Math.round(millimetersToPixels(paper.widthMm, dpi));
  const height = Math.round(millimetersToPixels(paper.heightMm, dpi));
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D rendering is not available.');

  context.fillStyle = '#f7f2e6';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  const safeMarginPixels = millimetersToPixels(safeMarginMm, dpi);

  const imageAspect = image.naturalWidth / image.naturalHeight;
  const imageLeftUnits = (100 - imagePlacement.scalePercent) / 2 + imagePlacement.offsetX;
  const imageTopUnits = (100 - imagePlacement.scalePercent / imageAspect) / 2 + imagePlacement.offsetY;
  const imageWorldWidth = imagePlacement.scalePercent * worldScaleMm;
  const imageWorldLeft = (imageLeftUnits - 50) * worldScaleMm;
  const imageWorldTop = (imageTopUnits - 50) * worldScaleMm;
  const sheet = {
    id: tile.id,
    label: String(tile.label),
    centerXmm: (tile.x + tile.width / 2 - 50) * worldScaleMm,
    centerYmm: (tile.y + tile.height / 2 - 50) * worldScaleMm,
    rotationDeg: tile.rotationDeg,
  };
  const imageToWorld = multiply(
    translation(imageWorldLeft, imageWorldTop),
    scaling(imageWorldWidth / image.naturalWidth),
  );
  context.save();
  context.beginPath();
  context.rect(safeMarginPixels, safeMarginPixels, width - safeMarginPixels * 2, height - safeMarginPixels * 2);
  context.clip();
  const compensatePrinterScaling = multiply(
    translation(width / 2, height / 2),
    multiply(scaling(printScale.x, printScale.y), translation(-width / 2, -height / 2)),
  );
  const compensateRegistration = translation(
    -millimetersToPixels(registrationOffsetMm.x, dpi),
    -millimetersToPixels(registrationOffsetMm.y, dpi),
  );
  setCanvasTransform(context, multiply(compensateRegistration, multiply(compensatePrinterScaling, multiply(worldToPagePixelsMatrix(sheet, paper, dpi), imageToWorld))));
  context.drawImage(image, 0, 0);
  context.restore();

  context.setTransform(1, 0, 0, 1, 0, 0);
  const pixelsPerMillimeter = millimetersToPixels(1, dpi);
  context.fillStyle = 'rgba(247, 242, 230, 0.88)';
  context.fillRect(8 * pixelsPerMillimeter, 8 * pixelsPerMillimeter, 55 * pixelsPerMillimeter, 11 * pixelsPerMillimeter);
  context.fillStyle = '#202b3d';
  context.font = `700 ${Math.round(3.3 * pixelsPerMillimeter)}px Trebuchet MS`;
  context.fillText(`EXPAND · TILE ${tile.label}`, 11 * pixelsPerMillimeter, 11.5 * pixelsPerMillimeter);
  context.font = `${Math.round(2.5 * pixelsPerMillimeter)}px Trebuchet MS`;
  context.fillText(`Place at ${tile.rotationDeg > 0 ? '+' : ''}${tile.rotationDeg}°`, 11 * pixelsPerMillimeter, 16 * pixelsPerMillimeter);
  return canvas;
}

export async function generateLayoutPdf({
  paper,
  tiles,
  imageUrl,
  imagePlacement,
  worldScaleMm,
  dpi = 150,
  safeMarginMm = 0,
  printScale = { x: 1, y: 1 },
  registrationOffsetMm = { x: 0, y: 0 },
}: {
  paper: PaperPreset;
  tiles: ExportTile[];
  imageUrl: string;
  imagePlacement: ImagePlacement;
  worldScaleMm: number;
  dpi?: number;
  safeMarginMm?: number;
  printScale?: PrintScale;
  registrationOffsetMm?: RegistrationOffset;
}) {
  const image = await loadImage(imageUrl);
  const document = await PDFDocument.create();
  document.setTitle('Expand tiled photo layout');
  document.setSubject('Local browser-generated tiled photo PDF');
  document.setCreator('Expand');
  const widthPoints = millimetersToPdfPoints(paper.widthMm);
  const heightPoints = millimetersToPdfPoints(paper.heightMm);

  for (const tile of tiles) {
    const canvas = renderPage(tile, paper, image, imagePlacement, worldScaleMm, dpi, safeMarginMm, printScale, registrationOffsetMm);
    const png = await document.embedPng(await canvasToPngBytes(canvas));
    const page = document.addPage([widthPoints, heightPoints]);
    page.drawImage(png, { x: 0, y: 0, width: widthPoints, height: heightPoints });
    canvas.width = 1;
    canvas.height = 1;
  }
  return document.save();
}

/** A one-page physical test for paper scale and printer registration. */
export async function generateCalibrationPdf({ paper }: { paper: PaperPreset }) {
  const document = await PDFDocument.create();
  document.setTitle('Expand printer border calibration');
  document.setSubject('Measure the first visible ruler line on each paper edge.');
  document.setCreator('Expand');
  const width = millimetersToPdfPoints(paper.widthMm);
  const height = millimetersToPdfPoints(paper.heightMm);
  const millimeter = millimetersToPdfPoints(1);
  const page = document.addPage([width, height]);
  const ink = rgb(0.12, 0.17, 0.24);
  const muted = rgb(0.32, 0.36, 0.42);
  const blue = rgb(0.19, 0.36, 0.73);
  const edge = 5 * millimeter;
  const centerX = width / 2;
  const centerY = height / 2;

  page.drawText('EXPAND · PRINTER ALIGNMENT CHECK', { x: 34 * millimeter, y: height - 34 * millimeter, size: 16, color: ink });
  page.drawText(`Print on ${paper.label} at Actual size / 100%. Do not use Fit to page.`, { x: 34 * millimeter, y: height - 42 * millimeter, size: 9, color: muted });
  page.drawText('Measure from the physical paper edge to each bold 5 mm line, then enter those four distances in Expand.', { x: 34 * millimeter, y: height - 48 * millimeter, size: 9, color: muted });

  page.drawLine({ start: { x: centerX - 26 * millimeter, y: height - edge }, end: { x: centerX + 26 * millimeter, y: height - edge }, thickness: 2, color: blue });
  page.drawText('TOP · 5 mm LINE', { x: centerX - 24 * millimeter, y: height - 15 * millimeter, size: 11, color: ink });
  page.drawLine({ start: { x: centerX - 26 * millimeter, y: edge }, end: { x: centerX + 26 * millimeter, y: edge }, thickness: 2, color: blue });
  page.drawText('BOTTOM · 5 mm LINE', { x: centerX - 30 * millimeter, y: 14 * millimeter, size: 11, color: ink });
  page.drawLine({ start: { x: edge, y: centerY - 26 * millimeter }, end: { x: edge, y: centerY + 26 * millimeter }, thickness: 2, color: blue });
  page.drawText('LEFT', { x: 11 * millimeter, y: centerY + 31 * millimeter, size: 10, color: ink });
  page.drawText('5 mm', { x: 11 * millimeter, y: centerY + 25 * millimeter, size: 10, color: ink });
  page.drawLine({ start: { x: width - edge, y: centerY - 26 * millimeter }, end: { x: width - edge, y: centerY + 26 * millimeter }, thickness: 2, color: blue });
  page.drawText('RIGHT', { x: width - 30 * millimeter, y: centerY + 31 * millimeter, size: 10, color: ink });
  page.drawText('5 mm', { x: width - 29 * millimeter, y: centerY + 25 * millimeter, size: 10, color: ink });
  const squareSize = 100 * millimeter;
  const squareX = (width - squareSize) / 2;
  const squareY = (height - squareSize) / 2 - 3 * millimeter;
  page.drawRectangle({ x: squareX, y: squareY, width: squareSize, height: squareSize, borderColor: ink, borderWidth: 1.5 });
  page.drawText('PRINT-SCALE CHECK', { x: squareX + 25 * millimeter, y: squareY + squareSize / 2 + 7 * millimeter, size: 12, color: ink });
  page.drawText('Measure this square edge to edge.', { x: squareX + 19 * millimeter, y: squareY + squareSize / 2, size: 9, color: muted });
  page.drawText('It should be exactly 100 mm wide and 100 mm tall.', { x: squareX + 11 * millimeter, y: squareY + squareSize / 2 - 6 * millimeter, size: 9, color: muted });
  return document.save();
}
