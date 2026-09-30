import { describe, expect, it } from 'vitest';
import { createFixtureSheets } from '../proof/fixture';
import { applyToPoint } from './affine';
import {
  MILLIMETERS_PER_INCH,
  PAPER_PRESETS,
  millimetersToPdfPoints,
} from './paper';
import {
  pagePixelsToWorldMatrix,
  sheetsOverlap,
  worldToPagePixelsMatrix,
} from './sheet';

describe('paper dimensions', () => {
  it('stores exact Letter and A4 dimensions in millimeters', () => {
    expect(PAPER_PRESETS.letter.widthMm).toBeCloseTo(
      8.5 * MILLIMETERS_PER_INCH,
      10,
    );
    expect(PAPER_PRESETS.letter.heightMm).toBeCloseTo(
      11 * MILLIMETERS_PER_INCH,
      10,
    );
    expect(PAPER_PRESETS.a4).toMatchObject({ widthMm: 210, heightMm: 297 });
  });

  it('maps physical page dimensions to PDF points', () => {
    expect(millimetersToPdfPoints(PAPER_PRESETS.letter.widthMm)).toBeCloseTo(612, 10);
    expect(millimetersToPdfPoints(PAPER_PRESETS.letter.heightMm)).toBeCloseTo(792, 10);
    expect(millimetersToPdfPoints(PAPER_PRESETS.a4.widthMm)).toBeCloseTo(595.2756, 3);
    expect(millimetersToPdfPoints(PAPER_PRESETS.a4.heightMm)).toBeCloseTo(841.8898, 3);
  });
});

describe('world to printed sheet reconstruction', () => {
  const sheets = createFixtureSheets();

  for (const paper of Object.values(PAPER_PRESETS)) {
    for (const sheet of sheets) {
      it(`round-trips world samples on ${paper.id} sheet ${sheet.label}`, () => {
        const worldToPage = worldToPagePixelsMatrix(sheet, paper, 150);
        const pageToWorld = pagePixelsToWorldMatrix(sheet, paper, 150);

        for (const worldPoint of [
          { x: 0, y: 0 },
          { x: -42.25, y: 63.75 },
          { x: 88.5, y: -51.125 },
        ]) {
          const reconstructed = applyToPoint(
            pageToWorld,
            applyToPoint(worldToPage, worldPoint),
          );
          expect(reconstructed.x).toBeCloseTo(worldPoint.x, 9);
          expect(reconstructed.y).toBeCloseTo(worldPoint.y, 9);
        }
      });
    }

    it(`keeps the fixture tiles separate throughout the ${paper.id} angle range`, () => {
      for (const angleA of [-30, 30]) {
        for (const angleB of [-30, 30]) {
          const [first, second] = createFixtureSheets(angleA, angleB);
          expect(sheetsOverlap(first!, second!, paper)).toBe(false);
        }
      }
    });
  }

  it('counter-rotates printed content so a horizontal world vector reconstructs horizontally', () => {
    for (const sheet of sheets) {
      const paper = PAPER_PRESETS.letter;
      const worldToPage = worldToPagePixelsMatrix(sheet, paper, 150);
      const pageToWorld = pagePixelsToWorldMatrix(sheet, paper, 150);
      const pageStart = applyToPoint(worldToPage, { x: -10, y: 25 });
      const pageEnd = applyToPoint(worldToPage, { x: 10, y: 25 });
      const reconstructedStart = applyToPoint(pageToWorld, pageStart);
      const reconstructedEnd = applyToPoint(pageToWorld, pageEnd);

      expect(reconstructedEnd.y - reconstructedStart.y).toBeCloseTo(0, 9);
      expect(reconstructedEnd.x - reconstructedStart.x).toBeCloseTo(20, 9);
    }
  });

  it('detects overlapping physical sheets', () => {
    const [first, second] = createFixtureSheets();
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(
      sheetsOverlap(
        first!,
        { ...second!, centerXmm: first!.centerXmm + 10 },
        PAPER_PRESETS.letter,
      ),
    ).toBe(true);
  });
});
