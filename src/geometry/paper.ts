export type PaperPresetId = 'letter' | 'a4';

export interface PaperPreset {
  id: PaperPresetId;
  label: string;
  widthMm: number;
  heightMm: number;
}

export const MILLIMETERS_PER_INCH = 25.4;
export const PDF_POINTS_PER_INCH = 72;

export const PAPER_PRESETS: Record<PaperPresetId, PaperPreset> = {
  letter: {
    id: 'letter',
    label: 'US Letter',
    widthMm: 215.9,
    heightMm: 279.4,
  },
  a4: {
    id: 'a4',
    label: 'A4',
    widthMm: 210,
    heightMm: 297,
  },
};

export function millimetersToPixels(millimeters: number, dpi: number) {
  return (millimeters / MILLIMETERS_PER_INCH) * dpi;
}

export function millimetersToPdfPoints(millimeters: number) {
  return (millimeters / MILLIMETERS_PER_INCH) * PDF_POINTS_PER_INCH;
}

