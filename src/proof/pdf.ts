import { PDFDocument } from 'pdf-lib';
import { millimetersToPdfPoints, type PaperPreset } from '../geometry/paper';
import type { SheetPlacement } from '../geometry/sheet';
import { renderFixturePage } from './render';

interface FixturePdfOptions {
  paper: PaperPreset;
  sheets: SheetPlacement[];
  dpi: number;
}

function canvasToPngBytes(canvas: HTMLCanvasElement) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('The proof canvas could not be encoded.'));
        return;
      }

      blob
        .arrayBuffer()
        .then((buffer) => resolve(new Uint8Array(buffer)))
        .catch(reject);
    }, 'image/png');
  });
}

export async function generateFixturePdf({
  paper,
  sheets,
  dpi,
}: FixturePdfOptions) {
  const document = await PDFDocument.create();
  const widthPoints = millimetersToPdfPoints(paper.widthMm);
  const heightPoints = millimetersToPdfPoints(paper.heightMm);

  document.setTitle('photile Milestone 0 Geometry Proof');
  document.setSubject('Two-sheet rotated paper transform validation fixture');
  document.setCreator('photile browser geometry proof');

  for (const sheet of sheets) {
    const canvas = renderFixturePage(sheet, paper, dpi);
    const pngBytes = await canvasToPngBytes(canvas);
    const image = await document.embedPng(pngBytes);
    const page = document.addPage([widthPoints, heightPoints]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: widthPoints,
      height: heightPoints,
    });
    canvas.width = 1;
    canvas.height = 1;
  }

  return document.save();
}

