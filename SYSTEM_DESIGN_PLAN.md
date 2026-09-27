# System Design Plan: Browser-Based Tiled Poster Studio

Status: Proposed design brief and implementation plan  
Audience: Product design and engineering  
Initial platform: Desktop-first responsive web application  

## 1. Product Summary

The product turns one personal photo into a large wall composition made from ordinary printer paper. A user uploads a photo, starts from a familiar arrangement such as 2×2, 3×3, a strip, or a cross, then directly moves and rotates individual sheets over the upright photo. The application previews the assembled wall result and exports a print-ready, multi-page PDF without uploading or retaining the source image.

The product is for everyday consumers, not print professionals. It should feel like a playful creative studio while explaining unavoidable print constraints in plain language. The initial visual treatment will remain intentionally low-fidelity so layout and interaction can be tested before committing to branding, color, and typography.

### Primary user action

Arrange ordinary sheets over a photo until the wall-sized composition looks right, then download a correctly scaled PDF that is easy to print and assemble.

### Success criteria

- A first-time user can go from photo to a useful default PDF without reading documentation.
- The on-screen composition and assembled print agree in sheet position, orientation, crop, and scale.
- Users understand how large the result will be and how many sheets it uses before exporting.
- Rotated sheets preserve the photograph's upright world orientation after physical assembly.
- No photo bytes leave the browser.
- Common 2×2 and 3×3 projects remain responsive on ordinary consumer laptops.

## 2. Product Principles

1. **Start successful.** Upload immediately produces a centered, printable 2×2 composition with sensible defaults.
2. **Design in physical units.** The source of truth is millimeters, not screen pixels.
3. **Show the wall result continuously.** Seams, crop, sheet labels, assembled size, and print limitations are visible before export.
4. **Direct manipulation plus precision.** Dragging and rotating are playful; snapping, numeric inputs, keyboard control, undo, and reset make the result dependable.
5. **Progressive disclosure.** Templates and overall size come first; custom placement, edge treatment, exact rotation, and calibration appear as needed.
6. **Privacy by architecture.** The app is a static client application. The source file stays in memory, is never uploaded, and is discarded when the tab closes or the user starts over.
7. **Never conceal print physics.** Hardware margins, image resolution, trim requirements, and “print at 100%” are explained before download.

## 3. Scope

### Functional-wireframe scope

- Local JPEG, PNG, and WebP upload using the browser File API.
- Automatic EXIF-aware orientation during image decoding.
- US Letter and A4 presets.
- Same paper size for every sheet in a project.
- Template presets: 2×2, 3×3, horizontal strip, vertical strip, cross, staggered grid, and blank/freeform.
- Add, duplicate, remove, drag, multi-select, and rotate sheets.
- Grid, edge, center, and rotation-angle snapping; all snapping can be disabled temporarily.
- Upright photograph beneath independently rotated sheets.
- Pan and zoom the photograph behind the sheet arrangement.
- Fit, fill, reset, undo, and redo.
- Three edge modes: trimmed/overlapped, printer-safe, and borderless-printer.
- Live page count, approximate assembled dimensions, image-quality estimate, and printable-area overlay.
- Multi-page PDF export with page labels, optional trim/registration marks, and an assembly map.
- Browser-only processing with visible privacy reassurance.

### Deliberately downstream

- Final palette, typography, illustration style, brand identity, and polished motion.
- Accounts, cloud projects, collaboration, or server-side storage.
- Ordering prints or integrations with commercial print shops.
- Mixed paper sizes within one project.
- Text, stickers, filters, background removal, and general photo editing.
- Automated subject detection or AI cropping.
- HEIC conversion where the browser cannot decode it natively.
- Native mobile applications.
- Multi-photo collages.
- Arbitrary vector cut shapes or nonrectangular physical paper.

## 4. Core Mental Model

The editor is a **wall board**, not a document with pages. The photograph exists upright in wall/world space. Each sheet is a movable rectangular window placed over that world. When a sheet is rotated, the window rotates, but the world behind it does not.

For export, each physical PDF page contains the inverse-transformed part of the photograph. After the user prints the sheet and rotates it on the wall to the angle shown in the assembly map, the photo appears upright and continuous.

This distinction must be present in the data model and geometry engine from the first prototype. Faking it only in the preview would produce incorrect prints.

## 5. Information Architecture

The application has three primary surfaces:

1. **Start:** upload or drop a photo, with privacy and format guidance.
2. **Studio:** arrange sheets and the underlying photograph.
3. **Print check:** resolve warnings, preview pages and assembly map, then download the PDF.

No account, project dashboard, or navigation hierarchy is needed in the MVP.

## 6. Functional Wireframes

### 6.1 Start state

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [Product name]                                      How it works (?) │
│                                                                      │
│              Turn one photo into a wall-size print                   │
│                                                                      │
│        ┌────────────────────────────────────────────────────┐        │
│        │                                                    │        │
│        │             Drop a photo here                      │        │
│        │              [ Choose photo ]                      │        │
│        │        JPEG, PNG, or WebP · up to [limit]          │        │
│        │                                                    │        │
│        └────────────────────────────────────────────────────┘        │
│                                                                      │
│       Your photo stays on this device and is never uploaded.         │
│                                                                      │
│             [small 2×2 assembled-result illustration]                │
└──────────────────────────────────────────────────────────────────────┘
```

Behavior:

- The entire upload field is clickable and supports drag-and-drop and paste.
- Selecting a valid image transitions directly to the Studio with a generated 2×2 default.
- Decoding progress appears in place; the screen does not switch to an empty editor.
- Invalid type, decode failure, or memory risk is explained next to the field with a recovery action.

### 6.2 Studio: no sheet selected

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [← New]  photo.jpg     [Undo] [Redo]     Saved nowhere · Private  [Print →] │
├──────────────────┬──────────────────────────────────────┬───────────────────┤
│ ARRANGEMENT      │                                      │ PROJECT           │
│                  │              WALL BOARD              │                   │
│ Quick layouts    │        ┌──────────┬──────────┐        │ Paper             │
│ [2×2] [3×3]      │        │  1       │       2  │        │ [Letter ▾]        │
│ [Strip] [Cross]  │        │          │          │        │                   │
│ [Staggered]      │        ├──────────┼──────────┤        │ Edge mode         │
│                  │        │  3       │       4  │        │ [Trimmed ▾]       │
│ Sheets           │        │          │          │        │                   │
│ [+ Add sheet]    │        └──────────┴──────────┘        │ Photo             │
│                  │       photo continues beneath         │ [Fill] [Fit]       │
│ Snap             │          every paper window           │ [Reposition]       │
│ [●] Grid         │                                      │                   │
│ [●] Edges        │                                      │ Result             │
│ [●] Angles       │                                      │ 4 sheets           │
│                  │                                      │ 16.5 × 21.5 in     │
├──────────────────┴──────────────────────────────────────┴───────────────────┤
│ [−] 62% [+]  [Fit board]     Grid: 0.25 in      Expected sharpness: Good   │
└─────────────────────────────────────────────────────────────────────────────┘
```

Layout behavior:

- The canvas receives most of the viewport and remains the visual focus.
- The left rail answers “What arrangement do I want?”
- The right inspector answers “What are the exact settings for the project or selection?”
- Rails collapse independently on narrow desktops and become drawers on tablets/phones.
- The top bar contains only project-level actions; canvas tools stay near the canvas.

### 6.3 Studio: sheet selected

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ...                                                                         │
├──────────────────┬──────────────────────────────────────┬───────────────────┤
│ ARRANGEMENT      │                                      │ SHEET 2           │
│                  │          ↻ rotation handle           │                   │
│ ...              │        ┌──────────╱──────────┐        │ Angle             │
│                  │        │         ╱ selected  │        │ [ -12.0°       ]  │
│                  │        │ photo remains       │        │ [Rotate 90°]      │
│                  │        │ upright beneath     │        │                   │
│                  │        └─────────────────────┘        │ Position          │
│                  │                                      │ X [ ... ] Y [ ...]│
│                  │  alignment and snap guides appear    │                   │
│                  │  only during manipulation            │ [Duplicate]       │
│                  │                                      │ [Remove sheet]    │
│                  │                                      │                   │
│                  │                                      │ Assembly label: 2 │
└──────────────────┴──────────────────────────────────────┴───────────────────┘
```

Selection behavior:

- Click selects one sheet; Shift-click adds to selection.
- Drag moves selection. A dedicated handle rotates it.
- Individual paper dimensions do not resize because the physical sheet size is fixed.
- Angle snaps default to 0°, 15°, 30°, 45°, and 90° increments within a tolerance.
- Holding a modifier temporarily bypasses snapping.
- Arrow keys nudge; Shift+arrow uses a larger increment. Numeric fields provide exact positioning and rotation.
- Delete removes a selected sheet after an undoable action, without a confirmation modal.

### 6.4 Photo reposition mode

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Move the photo                                  [Reset] [Done]              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│       Sheets remain fixed and slightly dimmed.                              │
│       Drag the photograph behind them. Pinch/wheel or slider zooms.          │
│                                                                             │
│                    [ Zoom ─────●──── 118% ]                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

This mode prevents the common ambiguity of whether a drag moves paper or the photo. Esc exits and commits; reset returns to the last automatic fit.

### 6.5 Print check

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Print check                                                   [Back to edit]│
├──────────────────────────────────────────────┬──────────────────────────────┤
│ ASSEMBLED PREVIEW                            │ 4 pages · US Letter          │
│                                              │                              │
│ [wall composition with numbered sheets]      │ Edge treatment              │
│                                              │ (●) Trim and overlap         │
│ Click a page to inspect it.                   │ ( ) Printer-safe gutters     │
│                                              │ ( ) Borderless printer       │
│ [Assembly map] [Page 1] [Page 2] [...]       │                              │
│                                              │ Marks                        │
│                                              │ [✓] Cut marks                │
│                                              │ [✓] Page labels              │
│                                              │ [ ] Calibration square       │
│                                              │                              │
│                                              │ ✓ Image quality looks good   │
│                                              │ ! Print at Actual size / 100%│
│                                              │                              │
│                                              │ [Download printable PDF]     │
└──────────────────────────────────────────────┴──────────────────────────────┘
```

Download behavior:

- The button starts a cancellable local render and reports pages completed, not an indefinite spinner.
- The completed file is offered as a Blob download; no server request is involved.
- Print instructions remain visible after download: choose Actual size/100%, disable Fit to page, and test one labeled page when uncertain.

## 7. Interaction Model

### Primary flow

```text
Upload → automatic 2×2 result → choose layout/size → arrange sheets
       → reposition photo → print check → local PDF render → download → assemble
```

### Direct manipulation rules

- Sheet drag updates at animation-frame speed and commits one history entry at drag end.
- Snapping evaluates candidates in this order: exact template anchors, neighboring centers/edges, grid, then angle.
- Only the winning guide on each axis is shown to avoid visual clutter.
- A snap uses separate enter and exit tolerances so the sheet does not flicker at the boundary.
- Multi-selection moves and rotates around the group center, but the paper size of each sheet remains unchanged.
- Applying a template replaces the current arrangement only after the user has materially edited it; use an inline “Replace current arrangement?” disclosure, not a modal.
- Changing between A4 and Letter keeps the composition center and angles, then reflows default templates. Custom layouts preserve centers and flag new overlaps/gaps.

### Undo/redo boundaries

History entries represent user intentions:

- one completed drag;
- one completed rotation;
- a numeric-field commit;
- applying a template;
- add, duplicate, or remove;
- paper or edge-mode change;
- completed photo pan/zoom.

Transient pointer movement is not stored. Keep at least 100 lightweight layout commands; never duplicate source pixel data in history.

## 8. Key States and UX Copy

| State | What the user needs | Recommended copy/action |
|---|---|---|
| Empty | Know what the product does and trust upload | “Turn one photo into a wall-size print.” / “Your photo stays on this device.” |
| Decoding | Progress without fear of upload | “Opening your photo locally…” |
| Default result | Immediate success | Show 2×2 layout, physical dimensions, and “Drag any sheet to change the arrangement.” |
| Sheet selected | Clear manipulation target | Selection outline, handles, angle, position, duplicate/remove |
| Photo mode | Remove move-target ambiguity | “Move the photo” and dim fixed sheets |
| Low resolution | Understand outcome, not jargon | “This may look soft up close. Use fewer sheets or a larger photo.” |
| Printer margins | Understand why edges differ | “Most home printers leave a white edge. Trimmed mode adds guides so the picture can meet cleanly.” |
| Exporting | Local, measurable progress | “Building page 3 of 9 on this device…” plus Cancel |
| Export complete | Correct printing behavior | “Download ready. Print at Actual size / 100%.” |
| Unsupported file | Recover immediately | “This browser can’t open that format. Try JPEG, PNG, or WebP.” |
| Memory guard | Preserve the session | “This photo is too large to process safely here. Choose a smaller copy.” |
| Refresh/close | Avoid unexpected loss | Only warn when a photo is loaded and edits are meaningful; explain that the project is not saved |

## 9. Print and Whitespace Strategy

The browser cannot know a user's exact printer hardware margins. “Remove as much whitespace as possible” therefore becomes an explicit choice rather than an invisible heuristic.

### Edge modes

1. **Trim and overlap — recommended:** extend image content beyond a trim line, add alignment/cut marks, and provide a small configurable overlap. Best visual continuity, but requires cutting paper.
2. **Printer-safe:** inset content by a conservative user-selected margin. No trimming, but visible gutters are expected.
3. **Borderless printer:** render to the physical page boundary. The user confirms their printer supports borderless output.

Default assumptions for the wireframe:

- Trim/overlap mode is recommended but explained before use.
- Printer-safe margin starts at 0.25 in / approximately 6 mm and can be changed.
- Overlap starts at 0.25 in / approximately 6 mm.
- Marks and labels remain outside the final kept image area whenever possible.
- The assembly map shows sheet number, angle, relative position, and trim/overlap order.

### Image quality indicator

Compute the lowest effective source pixels per printed inch across all sheets. Translate it into consumer language:

- **Good:** at least 150 effective PPI.
- **May look soft up close:** 100–149 PPI.
- **Likely blurry:** below 100 PPI.

These are guidance bands for wall viewing, not guarantees. Show the numeric PPI only behind “Details.”

## 10. Technical Architecture

### Recommended stack

- **Application shell:** React + TypeScript + Vite, deployed as static assets.
- **Interactive editor:** `react-konva`/Konva for scene graph, hit testing, transforms, and layered canvas rendering.
- **State:** a small external store such as Zustand, with a custom command/history layer. Geometry remains framework-independent.
- **Geometry:** pure TypeScript affine-matrix and polygon functions using millimeters as canonical units.
- **High-resolution render:** dedicated Web Worker using `OffscreenCanvas` when supported, with a chunked main-thread fallback.
- **Image decode:** Blob/File + `createImageBitmap`, honoring source orientation and creating a separate preview bitmap.
- **PDF assembly:** `pdf-lib` in the browser.
- **Testing:** Vitest for pure logic, Playwright for user flows, and deterministic render fixtures for pixel/PDF verification.

Konva supplies browser canvas objects, events, hit detection, and transform handles, but snapping and editor rules remain application code. Its documentation explicitly supports React bindings and transform handles while noting that snapping must be implemented by the product. The export path must not depend on taking a screenshot of the interactive canvas. ([Konva React](https://konvajs.org/docs/react/index.html), [Transformer](https://konvajs.org/docs/react/Transformer.html))

`OffscreenCanvas` can render in a worker and avoid blocking the UI, while `createImageBitmap` can asynchronously decode and resize browser image sources. `pdf-lib` can create PDFs and embed JPEG/PNG data entirely in the browser. ([OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas), [createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap), [PDF-LIB](https://pdf-lib.js.org/))

### Component boundaries

```text
App shell
├── StartScreen
├── Studio
│   ├── TopBar
│   ├── LayoutLibrary
│   ├── WallCanvas                 interactive preview only
│   ├── ProjectInspector
│   ├── SelectionInspector
│   └── StatusBar
└── PrintCheck
    ├── AssemblyPreview
    ├── PagePreview
    ├── PreflightPanel
    └── ExportProgress

Domain core (no React imports)
├── paperCatalog
├── templateGenerator
├── transformMath
├── snappingEngine
├── coverageAndBounds
├── printPreflight
├── qualityEstimator
└── projectCommands

Render boundary
├── previewAdapter               domain scene → Konva nodes
├── exportWorker                 project snapshot → page raster streams
├── pageRenderer                 one physical sheet at a time
└── pdfAssembler                 page streams → downloadable Blob
```

### Data flow

```text
Local File
   ↓ File API
Blob + metadata ──→ preview ImageBitmap ──→ WallCanvas
   │
   └──────────────→ full-resolution ImageBitmap/Blob reference
                                      │
Project geometry snapshot ────────────┤
                                      ↓
                         Web Worker page renderer
                                      ↓ one page at a time
                         compressed page image bytes
                                      ↓
                              PDF assembler
                                      ↓
                        object URL → user download

No image or project request crosses the network boundary.
```

## 11. Geometry and Rendering Model

### Coordinate systems

- **Image space:** source pixels, origin at image top-left.
- **World space:** physical millimeters on the conceptual wall, origin at project center.
- **Sheet-local space:** millimeters relative to each sheet center.
- **Viewport space:** CSS pixels after pan and zoom.
- **PDF space:** points, where 1 inch = 72 points.
- **Raster space:** page pixels at the selected export DPI.

Never save viewport pixels into the project model. Convert pointer movements through the inverse viewport transform into world millimeters.

### Transform rule

Let:

- `I` map image pixels into world space;
- `S` map a sheet's local millimeter coordinates into world space.

To draw the upright image onto a printable sheet, the page renderer uses:

```text
image pixel → sheet local = inverse(S) × I
```

The sheet-local result is then scaled from millimeters into export pixels or PDF points. When the printed page is physically placed using `S`, its content returns to the intended upright world-space image.

### Preview rendering

For each visible sheet:

1. Transform the sheet rectangle into world/view space.
2. Clip to the paper or printable polygon.
3. Draw the shared photo with the world image transform.
4. Draw trim/safe-area overlay, sheet label, selection state, and rotation handle in separate interaction layers.

Static photo and paper layers should not rerender for every pointer event. Interaction guides and selection handles use a separate lightweight layer.

### Export rendering

For each sheet, sequentially:

1. Create a page-sized `OffscreenCanvas` at the chosen DPI.
2. Fill the paper background.
3. Clip to the mode-specific print/bleed region.
4. Apply `inverse(S) × I`, followed by millimeter-to-pixel scaling.
5. Draw the full-resolution image with high-quality interpolation.
6. Add cut/registration marks and sheet label outside the kept region.
7. Compress to JPEG for opaque photos or PNG when transparency is required.
8. Add the image to a correctly sized PDF page.
9. Release temporary canvas and encoded bytes before proceeding.

Render one page at a time to bound memory. A separate assembly-map page or downloadable guide can be generated from vector shapes and text; default it off in the print PDF so it does not waste paper accidentally.

## 12. Data Model

```ts
type Millimeters = number;
type Degrees = number;

interface PosterProject {
  schemaVersion: 1;
  source: {
    objectUrl: string;          // session-only, revoked on replacement/close
    filename: string;
    mimeType: string;
    pixelWidth: number;
    pixelHeight: number;
  };
  imageTransform: {
    centerXmm: Millimeters;
    centerYmm: Millimeters;
    scaleMmPerPixel: number;
    rotationDeg: 0;             // fixed upright in MVP
  };
  paper: {
    preset: 'letter' | 'a4';
    widthMm: Millimeters;
    heightMm: Millimeters;
  };
  sheets: Sheet[];
  print: {
    edgeMode: 'trim-overlap' | 'printer-safe' | 'borderless';
    safeMarginMm: Millimeters;
    overlapMm: Millimeters;
    marks: boolean;
    labels: boolean;
    calibrationSquare: boolean;
    exportDpi: 150 | 300;
    jpegQuality: number;
  };
}

interface Sheet {
  id: string;
  label: string;
  centerXmm: Millimeters;
  centerYmm: Millimeters;
  rotationDeg: Degrees;
  zIndex: number;
  enabled: boolean;
}

interface EditorViewState {
  selectionIds: string[];
  mode: 'arrange-sheets' | 'reposition-photo';
  viewportPanX: number;
  viewportPanY: number;
  viewportZoom: number;
  snap: {
    grid: boolean;
    objects: boolean;
    angles: boolean;
    gridSizeMm: Millimeters;
  };
}
```

`EditorViewState` is not part of printable project geometry. The image Blob/ImageBitmap is held outside undo snapshots to avoid duplicating large data.

## 13. Template Generation

Templates are functions that accept paper dimensions, gap/overlap, and a center point and return `Sheet[]`. They are not special modes; once created, every sheet is freely editable.

Required generators:

- rectangular grid `(columns, rows)`;
- horizontal/vertical strip `(count)`;
- cross `(armLength)`;
- staggered grid `(columns, rows, offset)`;
- blank with one centered sheet.

The UI should expose friendly presets first. “Custom grid” allows row/column counts within tested bounds. Freeform begins from any preset rather than forcing a blank canvas.

## 14. Snapping Engine

Inputs:

- moving sheet/group geometry;
- stationary sheet geometry;
- project grid size;
- enabled snap families;
- viewport scale, used to keep snap tolerance visually consistent.

Candidate lines:

- left/right/top/bottom edges;
- horizontal and vertical centers;
- intended overlap offsets;
- world origin and template anchors;
- rotation angles.

Output:

- corrected world transform;
- winning horizontal, vertical, and angle guides;
- human-readable hint such as “Aligned centers” or “15°.”

Use pixel-based pointer tolerance converted into world millimeters so snapping feels the same at every zoom level. Test rotated bounding polygons, not only axis-aligned bounding boxes, for overlaps.

## 15. State, Persistence, and Privacy

- Project and source image remain in memory for the active tab only.
- Do not place image bytes, object URLs, or thumbnails in localStorage, IndexedDB, logs, analytics, URLs, or error reports.
- The service worker may cache only the application shell and static assets.
- Revoke object URLs when a photo is replaced and on teardown.
- Re-encoded export pages naturally omit source EXIF/GPS metadata; do not copy metadata into the PDF.
- Use a restrictive Content Security Policy. The production editor should not load third-party scripts that can observe in-memory image data.
- If anonymous analytics are introduced later, restrict them to coarse events such as template choice and export success; never capture filenames, dimensions precise enough to fingerprint, canvas pixels, or project geometry.

## 16. Performance and Failure Strategy

### Budgets

- Pointer manipulation targets 60 fps for 36 or fewer sheets.
- The interactive preview uses a viewport-sized, downscaled bitmap capped to a sensible device-pixel ratio; it never paints the full source image on every frame.
- Export work happens outside the main thread where supported.
- PDF pages render sequentially and report progress.
- All long operations are cancellable between pages.

### Guards

- Inspect type, encoded size, and decoded dimensions before full editor initialization.
- Estimate decoded memory (`width × height × 4`) and export working memory before allocating canvases.
- Use capability-based limits rather than claiming every browser can handle the same maximum.
- Begin with a soft tested target of up to 36 sheets and common phone photos; warn before risky operations.
- If `OffscreenCanvas` is unavailable, use a chunked main-thread renderer that yields between pages and tells the user to keep the tab open.
- On page-render failure, preserve the project, identify the failed page, lower export DPI as a recovery option, and allow retry.

## 17. Accessibility and Responsive Behavior

- Target WCAG 2.2 AA for the application shell and controls.
- Every canvas action has a DOM control equivalent: page list selection, numeric position/angle, duplicate, remove, move order, and snap toggles.
- Provide visible focus, keyboard shortcuts, announcements for selection and completed commands, and non-color-only snap/quality indicators.
- Hit targets are at least 44×44 CSS pixels on touch interfaces.
- Respect reduced motion; no essential information depends on animation.
- Desktop uses persistent left and right rails. Tablet uses one rail plus a contextual drawer. Phone uses staged full-width panels above/below a pannable canvas; essential editing remains available even though the workflow is slower.
- Export and print guidance must remain fully usable on mobile, even if desktop is recommended for custom freeform arrangement.

## 18. Validation and Testing

### Geometry unit tests

- A rotated page exported and then transformed by its placement matrix reconstructs the same world-space sample points.
- Grid/template dimensions are exact in millimeters for Letter and A4.
- Snap enter/exit tolerances do not oscillate.
- Bounding dimensions include arbitrary sheet rotations.
- Photo fit/fill and PPI calculations remain correct across portrait and landscape images.

### Render fixtures

Use a source image with numbered quadrants, diagonal lines, a center cross, and a one-inch reference grid. Generate golden outputs for:

- 2×2 unrotated;
- 3×3 with overlap;
- cross layout;
- sheets at ±15° and 45°;
- A4 and Letter;
- printer-safe and borderless modes.

Compare raster samples and PDF page boxes automatically. Visually inspect actual printed and assembled fixtures during each release candidate.

### End-to-end tests

- Upload → default layout → export.
- Change paper and edge mode.
- Drag/rotate/snap, then undo/redo.
- Reposition image.
- Cancel and restart export.
- Recover from unsupported/corrupt image and simulated worker failure.
- Keyboard-only completion of a 2×2 project.

### Physical print matrix

Test at minimum:

- US Letter and A4;
- macOS Preview, Chrome system print, and Windows PDF printing;
- one inkjet and one laser printer with nonborderless margins;
- one borderless-capable printer;
- Actual size versus Fit-to-page to confirm warnings catch the main failure mode.

## 19. Functional-Wireframe Build Plan

### Milestone 0 — geometry proof

Build a framework-independent transform prototype with a numbered test image. Prove that two rotated exported sheets align after physical rotation.

Exit criteria:

- world/sheet/PDF transforms pass automated sample-point tests;
- a printed two-page rotated fixture aligns within an agreed physical tolerance;
- Letter and A4 dimensions are correct.

### Milestone 1 — low-fidelity studio

Build Start and Studio screens using neutral wireframe styling. Implement upload, 2×2/3×3/cross templates, selection, drag, rotation, snapping, photo reposition, undo/redo, and live dimensions.

Exit criteria:

- five representative nontechnical users can create a custom arrangement without coaching;
- users correctly identify whether they are moving a sheet or the photo;
- all actions have keyboard/control-panel equivalents.

### Milestone 2 — print-correct vertical slice

Add edge modes, preflight, quality estimation, sequential worker rendering, page labels, assembly map, and PDF download.

Exit criteria:

- printed 2×2, 3×3, cross, and rotated fixtures match the preview;
- export does not freeze the UI on the tested browser/device matrix;
- the source image never appears in network traffic, storage, or logs.

### Milestone 3 — usability hardening

Test and refine snapping, warnings, narrow-screen adaptation, memory recovery, keyboard operation, and print instructions. Add the remaining template presets.

Exit criteria:

- users complete upload-to-download with a high first-attempt success rate;
- common print-scaling errors are detected or clearly prevented;
- accessibility and performance budgets pass.

### Milestone 4 — visual design

Only after workflow validation, define brand palette, typography, illustration, sound/motion rules, and polished micro-interactions. Preserve the proven hierarchy and interaction model.

## 20. Metrics for a Later Instrumented Beta

If privacy-preserving analytics are approved later:

- upload-to-editor success rate;
- editor-to-export conversion;
- median time to first export;
- export retry/failure rate by coarse browser category;
- frequency of low-resolution and print-margin warnings;
- template selection distribution;
- undo immediately following a command, as a signal of confusing interaction;
- self-reported “assembled result matched preview.”

Do not collect image content, filename, project geometry, or exact photo dimensions.

## 21. Major Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Rotated-sheet math looks correct on screen but prints incorrectly | Core promise fails | Prove affine transforms and physically assemble fixtures before building the full editor |
| Users expect zero margins from printers that cannot print borderless | Frustration and wasted paper | Explicit edge modes, hardware-neutral explanations, trim preview, and test-page guidance |
| Large photos/PDFs exhaust browser memory | Crash or lost work | Preview downsampling, sequential page rendering, worker isolation, memory estimates, DPI recovery |
| Canvas-only UI excludes keyboard/screen-reader users | Accessibility failure | Mirror every edit in semantic DOM controls and page list |
| Too many controls make the app feel like professional design software | Audience mismatch | Successful defaults, contextual inspector, progressive disclosure, plain-language labels |
| PDF viewer silently scales pages | Physical mismatch | Prominent Actual size/100% instruction, calibration square, labels, and optional test page |
| Template changes destroy custom work | Loss of trust | Undoable commands and replacement warning only after meaningful edits |

## 22. Recommended Design References for Implementation

When moving from this brief into the functional wireframe, consult these Impeccable references:

- `reference/interaction-design.md` for direct manipulation, controls, feedback, and loading states.
- `reference/spatial-design.md` for the three-region editor layout and responsive rail behavior.
- `reference/responsive-design.md` for adapting the studio instead of hiding essential functions.
- `reference/ux-writing.md` for consumer-friendly print constraints and recovery messages.
- `reference/motion-design.md` only after the core interaction is validated; motion should clarify mode and state changes.

## 23. Decisions Locked for the First Wireframe

- Everyday consumer audience.
- Browser-only processing with no upload or persistence of photo data.
- Desktop-first editor with responsive access to essential functions.
- Playful creative-studio interaction model, with final visual identity deferred.
- US Letter and A4.
- One downloadable multi-page PDF.
- Optional overlap and cut marks.
- Movable and rotatable sheets over an upright photograph.
- Mixed paper sizes, accounts, print ordering, advanced editing, and final art direction remain downstream.

## 24. Confirmation Checkpoint

Before implementation, confirm that the mental model and wireframe are correct—especially the distinction between rotating a physical sheet and rotating the underlying photograph. After confirmation, Milestone 0 should be the first engineering work; it removes the highest-risk technical uncertainty before visual design investment.

