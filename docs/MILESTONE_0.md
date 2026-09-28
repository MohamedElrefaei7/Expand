# Milestone 0: Rotated-Sheet Geometry Proof

## Goal

Prove that photile can sample one upright world-space image onto independently rotated physical sheets and reconstruct that image after printing and placing the sheets at their intended angles.

## Coordinate model

The proof uses four coordinate systems:

1. Image/world space in millimeters.
2. Sheet-local space centered on each physical sheet.
3. Raster page pixels at the selected export DPI.
4. PDF points, where one inch equals 72 points.

For a sheet placement matrix `S` and world image transform `I`, printed content is mapped into sheet-local coordinates by:

```text
image pixel → sheet local = inverse(S) × I
```

The Milestone 0 artwork already lives in world millimeters, so the implemented proof uses `inverse(S)` followed by the millimeter-to-page-pixel transform. Physically placing the printed sheet using `S` reconstructs the original world coordinates.

## Automated validation

Run:

```sh
npm test
npm run typecheck
npm run build
```

The test suite verifies:

- affine composition and inversion;
- sub-nanometer-equivalent numeric round trips for representative points;
- exact US Letter and A4 dimensions;
- correct PDF point dimensions;
- world → page → world reconstruction for both rotated sheets;
- all three shared registration targets remain printable on both paper presets;
- reconstructed world-horizontal artwork remains horizontal.

## Physical validation

1. Start the app with `npm run dev`.
2. Keep the default proof angles: Sheet A at -12° and Sheet B at +15°.
3. Choose US Letter or A4 and download the fixture.
4. Print both pages using **Actual size** or **100%**. Disable “Fit to page.”
5. Measure the printed calibration square. It must be 25.4 mm on each side. If it is not, the PDF viewer or printer scaled the page and the test is invalid.
6. Rotate the sheets to the angles printed on them.
7. Use a bright window, light pad, or pinholes through the centers of registration targets 1–3 to align the two sheets.
8. Confirm the world grid, central axes, diagonal green band, and PHOTILE word remain upright and share the same world coordinates.
9. Measure any visible drift at the three targets and record the maximum.

## Acceptance record

Automated geometry: implemented and passing.  
Letter/A4 dimensions: implemented and passing.  
Physical two-page print: pending.  
Agreed physical tolerance: proposed maximum target drift of 1 mm after confirming the calibration square is exact.

Milestone 0 is complete only after the physical test result and printer/PDF-viewer combination are recorded here.

