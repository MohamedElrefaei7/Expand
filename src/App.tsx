import { type ChangeEvent, type DragEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { PAPER_PRESETS, type PaperPreset, type PaperPresetId } from './geometry/paper';

type TemplateId = 'grid-2' | 'grid-3' | 'strip' | 'cross';
type EditorMode = 'tiles' | 'photo';
type Screen = 'studio' | 'print-check';
type PrintMode = 'safe' | 'borderless';
interface Tile { id: string; label: number; x: number; y: number; width: number; height: number; rotationDeg: number; }
interface DragState { id: string; offsetX: number; offsetY: number; before: Tile[]; }
interface RegistrationMeasurements { top: number; right: number; bottom: number; left: number; }
interface PrintScaleMeasurements { width: number; height: number; }

const templateLabels: Record<TemplateId, string> = { 'grid-2': '2 × 2', 'grid-3': '3 × 3', strip: 'Strip', cross: 'Cross' };

function pageDimensions(height: number, paper: PaperPreset) {
  return { height, width: height * (paper.widthMm / paper.heightMm) };
}

function gridTiles(columns: number, rows: number, paper: PaperPreset, gap: number): Tile[] {
  const height = (82 - gap * (rows - 1)) / rows;
  const { width } = pageDimensions(height, paper);
  const totalWidth = width * columns + gap * (columns - 1);
  const startX = (100 - totalWidth) / 2;
  return Array.from({ length: columns * rows }, (_, index) => ({
    id: `tile-${index + 1}`, label: index + 1,
    x: startX + (index % columns) * (width + gap), y: 9 + Math.floor(index / columns) * (height + gap), width, height, rotationDeg: 0,
  }));
}

function tilesForTemplate(template: TemplateId, paper: PaperPreset, gapMm = 8): Tile[] {
  const gap = Math.max(1.5, gapMm * 0.32);
  if (template === 'grid-2') return gridTiles(2, 2, paper, gap);
  if (template === 'grid-3') return gridTiles(3, 3, paper, gap);
  if (template === 'strip') {
    const { width, height } = pageDimensions(25, paper);
    const stripGap = gap;
    const totalWidth = width * 4 + stripGap * 3;
    return Array.from({ length: 4 }, (_, index) => ({ id: `tile-${index + 1}`, label: index + 1, x: (100 - totalWidth) / 2 + index * (width + stripGap), y: (100 - height) / 2, width, height, rotationDeg: 0 }));
  }
  const { width, height } = pageDimensions(25, paper);
  const crossGap = gap;
  const centerX = (100 - width) / 2;
  const centerY = (100 - height) / 2;
  return [
    { id: 'tile-1', label: 1, x: centerX, y: centerY - height - crossGap, width, height, rotationDeg: 0 }, { id: 'tile-2', label: 2, x: centerX - width - crossGap, y: centerY, width, height, rotationDeg: 0 },
    { id: 'tile-3', label: 3, x: centerX, y: centerY, width, height, rotationDeg: 0 }, { id: 'tile-4', label: 4, x: centerX + width + crossGap, y: centerY, width, height, rotationDeg: 0 },
    { id: 'tile-5', label: 5, x: centerX, y: centerY + height + crossGap, width, height, rotationDeg: 0 },
  ];
}

function tileCorners(tile: Tile) {
  const radians = (tile.rotationDeg * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const centerX = tile.x + tile.width / 2;
  const centerY = tile.y + tile.height / 2;
  return [[-tile.width / 2, -tile.height / 2], [tile.width / 2, -tile.height / 2], [tile.width / 2, tile.height / 2], [-tile.width / 2, tile.height / 2]].map(([x, y]) => ({ x: centerX + x * cosine - y * sine, y: centerY + x * sine + y * cosine }));
}

function tilesIntersect(first: Tile, second: Tile) {
  const firstCorners = tileCorners(first);
  const secondCorners = tileCorners(second);
  for (const polygon of [firstCorners, secondCorners]) {
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index]!;
      const end = polygon[(index + 1) % polygon.length]!;
      const axis = { x: -(end.y - start.y), y: end.x - start.x };
      const project = (points: typeof polygon) => points.map((point) => point.x * axis.x + point.y * axis.y);
      const firstProjection = project(firstCorners);
      const secondProjection = project(secondCorners);
      if (Math.max(...firstProjection) <= Math.min(...secondProjection) || Math.max(...secondProjection) <= Math.min(...firstProjection)) return false;
    }
  }
  return true;
}

function isAllowed(tile: Tile, tiles: Tile[]) {
  return tileCorners(tile).every((point) => point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100) && !tiles.some((other) => other.id !== tile.id && tilesIntersect(tile, other));
}

function safeTilePosition(tile: Tile, tiles: Tile[], x: number, y: number) {
  const proposed = { ...tile, x: Math.round(Math.max(0, Math.min(100 - tile.width, x)) / 2) * 2, y: Math.round(Math.max(0, Math.min(100 - tile.height, y)) / 2) * 2 };
  return isAllowed(proposed, tiles) ? proposed : tile;
}

export function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [imageAspect, setImageAspect] = useState(1.5);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [paperId, setPaperId] = useState<PaperPresetId>('letter');
  const [template, setTemplate] = useState<TemplateId>('grid-2');
  const [tiles, setTiles] = useState<Tile[]>(() => tilesForTemplate('grid-2', PAPER_PRESETS.letter));
  const [selectedId, setSelectedId] = useState('tile-1');
  const [mode, setMode] = useState<EditorMode>('tiles');
  const [photoScale, setPhotoScale] = useState(100);
  const [photoOffsetX, setPhotoOffsetX] = useState(0);
  const [photoOffsetY, setPhotoOffsetY] = useState(0);
  const [gapMm, setGapMm] = useState(8);
  const [screen, setScreen] = useState<Screen>('studio');
  const [printMode, setPrintMode] = useState<PrintMode>('safe');
  const [registrationMeasurements, setRegistrationMeasurements] = useState<RegistrationMeasurements>({ top: 0, right: 0, bottom: 0, left: 0 });
  const [printScaleMeasurements, setPrintScaleMeasurements] = useState<PrintScaleMeasurements>({ width: 0, height: 0 });
  const [history, setHistory] = useState<Tile[][]>([]);
  const [redoHistory, setRedoHistory] = useState<Tile[][]>([]);
  const [exportState, setExportState] = useState<'idle' | 'rendering' | 'ready' | 'error'>('idle');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [calibrationPdfUrl, setCalibrationPdfUrl] = useState<string | null>(null);
  const [calibrationState, setCalibrationState] = useState<'idle' | 'rendering' | 'ready' | 'error'>('idle');
  const [notice, setNotice] = useState('Choose a JPEG, PNG, or WebP image to begin.');
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const paper = PAPER_PRESETS[paperId];
  const selectedTile = tiles.find((tile) => tile.id === selectedId) ?? null;

  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);
  useEffect(() => () => { if (calibrationPdfUrl) URL.revokeObjectURL(calibrationPdfUrl); }, [calibrationPdfUrl]);
  const boardStyle = useMemo(() => ({ backgroundImage: imageUrl ? `url(${imageUrl})` : undefined, backgroundSize: `${photoScale}%`, backgroundPosition: `${50 + photoOffsetX}% ${50 + photoOffsetY}%` }), [imageUrl, photoOffsetX, photoOffsetY, photoScale]);

  const loadImage = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setNotice('Choose a JPEG, PNG, or WebP image. Nothing was uploaded.'); return; }
    const nextUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { setImageAspect(image.naturalWidth / image.naturalHeight); setImageDimensions({ width: image.naturalWidth, height: image.naturalHeight }); };
    image.src = nextUrl;
    setImageUrl((currentUrl) => { if (currentUrl) URL.revokeObjectURL(currentUrl); return nextUrl; });
    setImageName(file.name); setTemplate('grid-2'); setTiles(tilesForTemplate('grid-2', paper, gapMm)); setSelectedId('tile-1'); setHistory([]); setRedoHistory([]); setScreen('studio'); setPdfUrl(null);
    setNotice('Your photo is only open in this browser. Start by moving a tile.');
  };
  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => { loadImage(event.target.files?.[0]); event.target.value = ''; };
  const handleDrop = (event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); loadImage(event.dataTransfer.files[0]); };
  const commitTiles = (nextTiles: Tile[], message: string) => { setHistory((current) => [...current.slice(-49), tiles]); setRedoHistory([]); setTiles(nextTiles); setNotice(message); };
  const applyTemplate = (nextTemplate: TemplateId) => { const nextTiles = tilesForTemplate(nextTemplate, paper, gapMm); setTemplate(nextTemplate); commitTiles(nextTiles, `${templateLabels[nextTemplate]} layout applied. Every page keeps the selected paper shape.`); setSelectedId(nextTiles[0]?.id ?? ''); };
  const changePaper = (nextPaperId: PaperPresetId) => { const nextPaper = PAPER_PRESETS[nextPaperId]; const nextTiles = tilesForTemplate(template, nextPaper, gapMm); setPaperId(nextPaperId); commitTiles(nextTiles, `${nextPaper.label} applied. The layout was reflowed with the correct physical page shape.`); setSelectedId(nextTiles[0]?.id ?? ''); };
  const changeGap = (nextGap: number) => { const nextTiles = tilesForTemplate(template, paper, nextGap); setGapMm(nextGap); commitTiles(nextTiles, `${nextGap} mm gap applied to this ${templateLabels[template]} layout.`); setSelectedId(nextTiles[0]?.id ?? ''); };
  const eventPosition = (event: PointerEvent<HTMLButtonElement>) => { const board = boardRef.current; if (!board) return null; const bounds = board.getBoundingClientRect(); return { x: ((event.clientX - bounds.left) / bounds.width) * 100, y: ((event.clientY - bounds.top) / bounds.height) * 100 }; };
  const beginTileDrag = (event: PointerEvent<HTMLButtonElement>, tile: Tile) => { if (mode !== 'tiles') return; const position = eventPosition(event); if (!position) return; event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { id: tile.id, offsetX: position.x - tile.x, offsetY: position.y - tile.y, before: tiles }; setSelectedId(tile.id); };
  const moveTile = (event: PointerEvent<HTMLButtonElement>) => { const drag = dragRef.current; const position = eventPosition(event); if (!drag || !position) return; setTiles((currentTiles) => currentTiles.map((tile) => tile.id === drag.id ? safeTilePosition(tile, currentTiles, position.x - drag.offsetX, position.y - drag.offsetY) : tile)); };
  const finishTileDrag = () => { if (dragRef.current) { setHistory((current) => [...current.slice(-49), dragRef.current!.before]); setRedoHistory([]); setNotice('Tile placed. It will not overlap another tile.'); } dragRef.current = null; };
  const nudge = (x: number, y: number) => { if (!selectedTile) return; const nextTiles = tiles.map((tile) => tile.id === selectedTile.id ? safeTilePosition(tile, tiles, tile.x + x, tile.y + y) : tile); commitTiles(nextTiles, 'Tile nudged to the nearest valid snap position.'); };
  const rotateSelected = (amount: number) => { if (!selectedTile) return; const candidate = { ...selectedTile, rotationDeg: ((selectedTile.rotationDeg + amount + 180) % 360) - 180 }; if (!isAllowed(candidate, tiles)) { setNotice('That angle would touch another tile or leave the wall board.'); return; } commitTiles(tiles.map((tile) => tile.id === selectedTile.id ? candidate : tile), `Tile ${selectedTile.label} rotated to ${candidate.rotationDeg}°.`); };
  const undo = () => { const previous = history.at(-1); if (!previous) return; setRedoHistory((current) => [...current, tiles]); setTiles(previous); setHistory((current) => current.slice(0, -1)); setNotice('Undid the last layout change.'); };
  const redo = () => { const next = redoHistory.at(-1); if (!next) return; setHistory((current) => [...current, tiles]); setTiles(next); setRedoHistory((current) => current.slice(0, -1)); setNotice('Restored the layout change.'); };
  const exportPdf = async () => { if (!imageUrl || !tiles[0]) return; setExportState('rendering'); try { const { generateLayoutPdf } = await import('./editor/export'); const bytes = await generateLayoutPdf({ paper, tiles, imageUrl, imagePlacement: { scalePercent: photoScale, offsetX: photoOffsetX, offsetY: photoOffsetY }, worldScaleMm: paper.heightMm / tiles[0].height, safeMarginMm: printMode === 'safe' ? 6 : 0, printScale, registrationOffsetMm }); const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' })); setPdfUrl(url); setExportState('ready'); setNotice(`Built ${tiles.length} print-ready pages locally.`); } catch (error) { console.error(error); setExportState('error'); setNotice('The PDF could not be created. Your layout is still safe here.'); } };
  const buildCalibrationPdf = async () => { setCalibrationState('rendering'); try { const { generateCalibrationPdf } = await import('./editor/export'); const bytes = await generateCalibrationPdf({ paper }); const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' })); setCalibrationPdfUrl((current) => { if (current) URL.revokeObjectURL(current); return url; }); setCalibrationState('ready'); } catch (error) { console.error(error); setCalibrationState('error'); } };
  const updateRegistrationMeasurement = (edge: keyof RegistrationMeasurements, value: string) => { const number = Math.max(0, Math.min(15, Number(value) || 0)); setRegistrationMeasurements((current) => ({ ...current, [edge]: number })); };
  const updatePrintScale = (dimension: keyof PrintScaleMeasurements, value: string) => { const parsed = Number(value); const number = value === '' || !Number.isFinite(parsed) ? 0 : Math.max(80, Math.min(110, parsed)); setPrintScaleMeasurements((current) => ({ ...current, [dimension]: number })); };
  const tileImageStyle = (tile: Tile) => {
    const imageLeft = (100 - photoScale) / 2 + photoOffsetX;
    const imageTop = (100 - photoScale / imageAspect) / 2 + photoOffsetY;
    return { width: `${(photoScale / tile.width) * 100}%`, left: `${((imageLeft - tile.x) / tile.width) * 100}%`, top: `${((imageTop - tile.y) / tile.height) * 100}%` };
  };
  const worldScaleMm = tiles[0] ? paper.heightMm / tiles[0].height : 0;
  const effectivePpi = imageDimensions.width && worldScaleMm ? Math.round(imageDimensions.width / ((photoScale * worldScaleMm) / 25.4)) : null;
  const qualityMessage = !effectivePpi ? 'Checking source quality…' : effectivePpi >= 150 ? 'Good for normal wall viewing' : effectivePpi >= 100 ? 'May look soft when viewed closely' : 'Likely blurry when viewed closely';
  const registrationComplete = Object.values(registrationMeasurements).every((measurement) => measurement > 0);
  const registrationOffsetMm = registrationComplete ? { x: (registrationMeasurements.left - registrationMeasurements.right) / 2, y: (registrationMeasurements.top - registrationMeasurements.bottom) / 2 } : { x: 0, y: 0 };
  const scaleCalibrationComplete = printScaleMeasurements.width > 0 && printScaleMeasurements.height > 0;
  const printScale = { x: scaleCalibrationComplete ? 100 / printScaleMeasurements.width : 1, y: scaleCalibrationComplete ? 100 / printScaleMeasurements.height : 1 };
  const printScaleCorrection = scaleCalibrationComplete ? `${Math.round((printScale.x - 1) * 1000) / 10}% width · ${Math.round((printScale.y - 1) * 1000) / 10}% height` : null;
  const registrationCorrection = registrationComplete ? `${Math.abs(registrationOffsetMm.x) < 0.05 ? 'centered horizontally' : `${Math.abs(registrationOffsetMm.x).toFixed(1)} mm ${registrationOffsetMm.x > 0 ? 'left' : 'right'}`} · ${Math.abs(registrationOffsetMm.y) < 0.05 ? 'centered vertically' : `${Math.abs(registrationOffsetMm.y).toFixed(1)} mm ${registrationOffsetMm.y > 0 ? 'up' : 'down'}`}` : null;

  if (!imageUrl) return <main className="start-shell">
    <header className="studio-topbar"><a className="wordmark" href="#top">Expand</a><span className="privacy-note">Private by default</span></header>
    <section className="start-stage" id="top">
      <div className="start-copy"><p className="eyebrow">A wall, one photo at a time</p><h1>Make a big picture out of ordinary paper.</h1><p>Arrange separate printer-paper tiles over one image. Everything stays in this browser.</p></div>
      <label className="upload-zone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileInput} /><span className="upload-mark" aria-hidden="true">+</span><strong>Drop a photo here</strong><span>or choose a JPEG, PNG, or WebP</span><span className="upload-privacy">Never uploaded · never saved</span></label>
      <div className="start-notes" aria-label="What happens next"><span>01 Add your photo</span><span>02 Arrange paper tiles</span><span>03 Print at home</span></div><p className="status-message" role="status">{notice}</p>
    </section>
  </main>;

  if (screen === 'print-check') return <main className="print-check-shell">
    <header className="studio-topbar"><button className="brand-button" type="button" onClick={() => { setScreen('studio'); setImageUrl(null); }}>Expand</button><p className="file-name">Print check</p><div className="top-actions"><span className="privacy-note">Local only</span><button className="history-button" type="button" onClick={() => setScreen('studio')}>← Back to edit</button></div></header>
    <section className="print-check-stage">
      <div className="print-check-intro"><p className="eyebrow">One last look</p><h1>Ready for the printer?</h1><p>This is the moment to make the physical choices. Your artwork stays in this browser while the PDF is made.</p><div className="assembly-map" aria-label={`${tiles.length} separate page arrangement`}>{tiles.map((tile) => <span key={tile.id} style={{ left: `${tile.x}%`, top: `${tile.y}%`, width: `${tile.width}%`, height: `${tile.height}%`, transform: `rotate(${tile.rotationDeg}deg)` }}>{tile.label}</span>)}</div></div>
      <div className="print-check-details">
        <div className="check-summary"><p className="rail-label">Your print</p><dl><div><dt>Pages</dt><dd>{tiles.length} separate {paper.label} sheets</dd></div><div><dt>Wall gap</dt><dd>{gapMm} mm between pages</dd></div><div><dt>Image quality</dt><dd>{qualityMessage}{effectivePpi && <small> · about {effectivePpi} PPI</small>}</dd></div></dl></div>
        <fieldset className="print-mode"><legend>Printer edge setting</legend><label className={printMode === 'safe' ? 'print-mode-choice selected' : 'print-mode-choice'}><input type="radio" name="print-mode" checked={printMode === 'safe'} onChange={() => setPrintMode('safe')} /><span><strong>Leave a 6 mm white edge</strong><small>Best for most home printers. The image stays inside the typical printable area.</small></span></label><label className={printMode === 'borderless' ? 'print-mode-choice selected' : 'print-mode-choice'}><input type="radio" name="print-mode" checked={printMode === 'borderless'} onChange={() => setPrintMode('borderless')} /><span><strong>Fill paper and crop at the printer edge</strong><small>No white edge is added. The image is allowed to run past the paper boundary, so a non-borderless printer crops it instead of leaving a designed border.</small></span></label></fieldset>
        <section className="calibration-panel" aria-labelledby="calibration-heading"><div><p className="rail-label">One-time printer setup</p><h2 id="calibration-heading">Calibrate alignment</h2><p>Print this sheet once on the printer you use for posters. Then measure the distance from each physical paper edge to its bold blue 5 mm line. Expand does the math and shifts the artwork before export.</p></div><div className="calibration-actions"><button className="history-button" type="button" onClick={buildCalibrationPdf} disabled={calibrationState === 'rendering'}>{calibrationState === 'rendering' ? 'Building calibration…' : 'Build calibration PDF'}</button>{calibrationPdfUrl && <a className="text-download" href={calibrationPdfUrl} download={`expand-calibration-${paper.id}.pdf`}>Download calibration PDF</a>}</div><div className="measurement-section"><p>Where did each 5 mm line actually land?</p><div className="margin-inputs">{(['top', 'right', 'bottom', 'left'] as const).map((edge) => <label key={edge} htmlFor={`registration-${edge}`}><span>{edge}</span><input id={`registration-${edge}`} type="number" min="0" max="15" step="0.1" value={registrationMeasurements[edge] || ''} placeholder="5" onChange={(event) => updateRegistrationMeasurement(edge, event.target.value)} /><small>mm</small></label>)}</div></div><div className="scale-inputs"><p>Measure the central square, edge to edge.</p>{(['width', 'height'] as const).map((dimension) => <label key={dimension} htmlFor={`scale-${dimension}`}><span>Printed {dimension}</span><input id={`scale-${dimension}`} type="number" min="80" max="110" step="0.1" value={printScaleMeasurements[dimension] || ''} placeholder="100" onChange={(event) => updatePrintScale(dimension, event.target.value)} /><small>mm</small></label>)}</div><p className="calibration-result">{registrationCorrection || printScaleCorrection ? <><strong>Applied correction:</strong> {registrationCorrection ?? 'No position shift'}{printScaleCorrection && <> · {printScaleCorrection} scale</>}</> : 'Enter the four line measurements to calculate the automatic alignment correction.'}</p></section>
        <div className="home-print-note"><p className="rail-label">When the PDF opens</p><ol><li>Select <strong>{paper.label}</strong> in the print dialog.</li><li>Choose <strong>Actual size</strong> or <strong>100%</strong>—not “Fit to page.”</li><li>Keep every page separate, then mount them with the {gapMm} mm gap shown in the layout.</li></ol></div>
        <div className="check-actions"><button className="print-button" type="button" onClick={exportPdf} disabled={exportState === 'rendering'}>{exportState === 'rendering' ? 'Building your PDF…' : `Build ${tiles.length}-page PDF →`}</button>{pdfUrl && <a className="pdf-ready-link" href={pdfUrl} download={`expand-layout-${paper.id}.pdf`}>Download PDF</a>}<p className="status-message" role="status">{notice}</p></div>
      </div>
    </section>
  </main>;

  return <main className="studio-shell">
    <header className="studio-topbar"><button className="brand-button" type="button" onClick={() => setImageUrl(null)}>Expand</button><p className="file-name">{imageName}</p><div className="top-actions"><button className="history-button" type="button" onClick={undo} disabled={!history.length}>Undo</button><button className="history-button" type="button" onClick={redo} disabled={!redoHistory.length}>Redo</button><span className="privacy-note">Local only</span><button className="print-button" type="button" onClick={() => setScreen('print-check')}>Print check →</button></div></header>
    <section className="studio-layout">
      <aside className="left-rail" aria-label="Arrangement tools"><div><p className="rail-label">Quick layouts</p><div className="template-grid">{(Object.keys(templateLabels) as TemplateId[]).map((id) => <button key={id} className={template === id ? 'template-button active' : 'template-button'} type="button" onClick={() => applyTemplate(id)}>{templateLabels[id]}</button>)}</div></div><div className="rail-divider" /><div><p className="rail-label">Edit</p><button className={mode === 'tiles' ? 'mode-button active' : 'mode-button'} type="button" onClick={() => { setMode('tiles'); setNotice('Tile mode: drag a page. Tiles will not overlap.'); }}>Move tiles</button><button className={mode === 'photo' ? 'mode-button active' : 'mode-button'} type="button" onClick={() => { setMode('photo'); setNotice('Photo mode: use the scale control. Tile positions stay fixed.'); }}>Position photo</button></div><p className="rail-hint">Every tile is a separate sheet. The gaps are part of the composition.</p></aside>
      <section className="canvas-area" aria-label="Wall layout canvas"><div className="canvas-header"><div><p className="eyebrow">Wall board</p><h2>{templateLabels[template]} composition</h2></div><p>{mode === 'tiles' ? 'Drag a paper tile' : 'Adjust the photo position'}</p></div><div className={mode === 'photo' ? 'wall-board photo-mode' : 'wall-board'} ref={boardRef} style={boardStyle}><div className="board-tint" />{tiles.map((tile) => <button className={selectedId === tile.id ? 'paper-tile selected' : 'paper-tile'} key={tile.id} type="button" style={{ left: `${tile.x}%`, top: `${tile.y}%`, width: `${tile.width}%`, height: `${tile.height}%`, transform: `rotate(${tile.rotationDeg}deg)` }} onPointerDown={(event) => beginTileDrag(event, tile)} onPointerMove={moveTile} onPointerUp={finishTileDrag} onPointerCancel={finishTileDrag} onClick={() => setSelectedId(tile.id)} aria-label={`Paper tile ${tile.label}, rotated ${tile.rotationDeg} degrees`}>{imageUrl && <img className="tile-photo" src={imageUrl} style={tileImageStyle(tile)} alt="" draggable={false} />}<span>{tile.label}</span></button>)}</div><footer className="canvas-footer"><span>{gapMm} mm layout gap · visible wall space</span><span>● 2-unit snap grid on</span></footer><p className="status-message studio-status" role="status">{notice}</p>{pdfUrl && <a className="pdf-ready-link" href={pdfUrl} download={`expand-layout-${paper.id}.pdf`}>Download {tiles.length}-page PDF</a>}</section>
      <aside className="right-rail" aria-label="Project inspector"><div className="inspector-section"><p className="rail-label">Project</p><label htmlFor="paper">Paper size</label><select id="paper" value={paperId} onChange={(event) => changePaper(event.target.value as PaperPresetId)}>{Object.values(PAPER_PRESETS).map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select><p className="measurement-copy">{paper.widthMm} × {paper.heightMm} mm per page</p><label htmlFor="gap">Layout gap <output>{gapMm} mm</output></label><input id="gap" type="range" min="4" max="18" step="1" value={gapMm} onChange={(event) => changeGap(Number(event.target.value))} /></div><div className="inspector-section"><p className="rail-label">{mode === 'photo' ? 'Photo placement' : `Tile ${selectedTile?.label ?? '—'}`}</p>{mode === 'photo' ? <><label htmlFor="photo-scale">Scale <output>{photoScale}%</output></label><input id="photo-scale" type="range" min="100" max="160" value={photoScale} onChange={(event) => setPhotoScale(Number(event.target.value))} /><label htmlFor="photo-x">Left / right</label><input id="photo-x" type="range" min="-25" max="25" value={photoOffsetX} onChange={(event) => setPhotoOffsetX(Number(event.target.value))} /><label htmlFor="photo-y">Up / down</label><input id="photo-y" type="range" min="-25" max="25" value={photoOffsetY} onChange={(event) => setPhotoOffsetY(Number(event.target.value))} /></> : <><div className="nudge-grid"><button type="button" onClick={() => nudge(0, -2)}>↑</button><button type="button" onClick={() => nudge(-2, 0)}>←</button><button type="button" onClick={() => nudge(2, 0)}>→</button><button type="button" onClick={() => nudge(0, 2)}>↓</button></div><div className="rotation-controls"><button type="button" onClick={() => rotateSelected(-15)}>↺ 15°</button><output>{selectedTile?.rotationDeg ?? 0}°</output><button type="button" onClick={() => rotateSelected(15)}>15° ↻</button></div></>}</div><div className="inspector-section result-section"><p className="rail-label">Result</p><strong>{tiles.length} separate pages</strong><span>Rotation-aware collision checking · print-ready export</span></div></aside>
    </section>
  </main>;
}
