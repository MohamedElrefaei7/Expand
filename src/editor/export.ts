import { PDFDocument } from 'pdf-lib';
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
  setCanvasTransform(context, multiply(worldToPagePixelsMatrix(sheet, paper, dpi), imageToWorld));
  context.drawImage(image, 0, 0);

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
}: {
  paper: PaperPreset;
  tiles: ExportTile[];
  imageUrl: string;
  imagePlacement: ImagePlacement;
  worldScaleMm: number;
  dpi?: number;
}) {
  const image = await loadImage(imageUrl);
  const document = await PDFDocument.create();
  document.setTitle('Expand tiled photo layout');
  document.setSubject('Local browser-generated tiled photo PDF');
  document.setCreator('Expand');
  const widthPoints = millimetersToPdfPoints(paper.widthMm);
  const heightPoints = millimetersToPdfPoints(paper.heightMm);

  for (const tile of tiles) {
    const canvas = renderPage(tile, paper, image, imagePlacement, worldScaleMm, dpi);
    const png = await document.embedPng(await canvasToPngBytes(canvas));
    const page = document.addPage([widthPoints, heightPoints]);
    page.drawImage(png, { x: 0, y: 0, width: widthPoints, height: heightPoints });
    canvas.width = 1;
    canvas.height = 1;
  }
  return document.save();
}
