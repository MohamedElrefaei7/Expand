import { type ChangeEvent, type DragEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { PAPER_PRESETS, type PaperPreset, type PaperPresetId } from './geometry/paper';

type TemplateId = 'grid-2' | 'grid-3' | 'strip' | 'cross';
type EditorMode = 'tiles' | 'photo';
interface Tile { id: string; label: number; x: number; y: number; width: number; height: number; }
interface DragState { id: string; offsetX: number; offsetY: number; }

const templateLabels: Record<TemplateId, string> = { 'grid-2': '2 × 2', 'grid-3': '3 × 3', strip: 'Strip', cross: 'Cross' };

function pageDimensions(height: number, paper: PaperPreset) {
  return { height, width: height * (paper.widthMm / paper.heightMm) };
}

function gridTiles(columns: number, rows: number, paper: PaperPreset): Tile[] {
  const gap = 3;
  const height = (82 - gap * (rows - 1)) / rows;
  const { width } = pageDimensions(height, paper);
  const totalWidth = width * columns + gap * (columns - 1);
  const startX = (100 - totalWidth) / 2;
  return Array.from({ length: columns * rows }, (_, index) => ({
    id: `tile-${index + 1}`, label: index + 1,
    x: startX + (index % columns) * (width + gap), y: 9 + Math.floor(index / columns) * (height + gap), width, height,
  }));
}

function tilesForTemplate(template: TemplateId, paper: PaperPreset): Tile[] {
  if (template === 'grid-2') return gridTiles(2, 2, paper);
  if (template === 'grid-3') return gridTiles(3, 3, paper);
  if (template === 'strip') {
    const { width, height } = pageDimensions(25, paper);
    const gap = 2;
    const totalWidth = width * 4 + gap * 3;
    return Array.from({ length: 4 }, (_, index) => ({ id: `tile-${index + 1}`, label: index + 1, x: (100 - totalWidth) / 2 + index * (width + gap), y: (100 - height) / 2, width, height }));
  }
  const { width, height } = pageDimensions(25, paper);
  const gap = 3;
  const centerX = (100 - width) / 2;
  const centerY = (100 - height) / 2;
  return [
    { id: 'tile-1', label: 1, x: centerX, y: centerY - height - gap, width, height }, { id: 'tile-2', label: 2, x: centerX - width - gap, y: centerY, width, height },
    { id: 'tile-3', label: 3, x: centerX, y: centerY, width, height }, { id: 'tile-4', label: 4, x: centerX + width + gap, y: centerY, width, height },
    { id: 'tile-5', label: 5, x: centerX, y: centerY + height + gap, width, height },
  ];
}

function tilesIntersect(first: Tile, second: Tile) {
  return first.x < second.x + second.width && first.x + first.width > second.x && first.y < second.y + second.height && first.y + first.height > second.y;
}

function safeTilePosition(tile: Tile, tiles: Tile[], x: number, y: number) {
  const proposed = { ...tile, x: Math.round(Math.max(0, Math.min(100 - tile.width, x))), y: Math.round(Math.max(0, Math.min(100 - tile.height, y))) };
  return tiles.some((other) => other.id !== tile.id && tilesIntersect(proposed, other)) ? tile : proposed;
}

export function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [paperId, setPaperId] = useState<PaperPresetId>('letter');
  const [template, setTemplate] = useState<TemplateId>('grid-2');
  const [tiles, setTiles] = useState<Tile[]>(() => tilesForTemplate('grid-2', PAPER_PRESETS.letter));
  const [selectedId, setSelectedId] = useState('tile-1');
  const [mode, setMode] = useState<EditorMode>('tiles');
  const [photoScale, setPhotoScale] = useState(100);
  const [notice, setNotice] = useState('Choose a JPEG, PNG, or WebP image to begin.');
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const paper = PAPER_PRESETS[paperId];
  const selectedTile = tiles.find((tile) => tile.id === selectedId) ?? null;

  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
  const boardStyle = useMemo(() => ({ backgroundImage: imageUrl ? `url(${imageUrl})` : undefined, backgroundSize: `${photoScale}%` }), [imageUrl, photoScale]);

  const loadImage = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setNotice('Choose a JPEG, PNG, or WebP image. Nothing was uploaded.'); return; }
    const nextUrl = URL.createObjectURL(file);
    setImageUrl((currentUrl) => { if (currentUrl) URL.revokeObjectURL(currentUrl); return nextUrl; });
    setImageName(file.name); setTemplate('grid-2'); setTiles(tilesForTemplate('grid-2', paper)); setSelectedId('tile-1');
    setNotice('Your photo is only open in this browser. Start by moving a tile.');
  };
  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => { loadImage(event.target.files?.[0]); event.target.value = ''; };
  const handleDrop = (event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); loadImage(event.dataTransfer.files[0]); };
  const applyTemplate = (nextTemplate: TemplateId) => { const nextTiles = tilesForTemplate(nextTemplate, paper); setTemplate(nextTemplate); setTiles(nextTiles); setSelectedId(nextTiles[0]?.id ?? ''); setNotice(`${templateLabels[nextTemplate]} layout applied. Every page keeps the selected paper shape.`); };
  const changePaper = (nextPaperId: PaperPresetId) => { const nextPaper = PAPER_PRESETS[nextPaperId]; const nextTiles = tilesForTemplate(template, nextPaper); setPaperId(nextPaperId); setTiles(nextTiles); setSelectedId(nextTiles[0]?.id ?? ''); setNotice(`${nextPaper.label} applied. The layout was reflowed with the correct physical page shape.`); };
  const eventPosition = (event: PointerEvent<HTMLButtonElement>) => { const board = boardRef.current; if (!board) return null; const bounds = board.getBoundingClientRect(); return { x: ((event.clientX - bounds.left) / bounds.width) * 100, y: ((event.clientY - bounds.top) / bounds.height) * 100 }; };
  const beginTileDrag = (event: PointerEvent<HTMLButtonElement>, tile: Tile) => { if (mode !== 'tiles') return; const position = eventPosition(event); if (!position) return; event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { id: tile.id, offsetX: position.x - tile.x, offsetY: position.y - tile.y }; setSelectedId(tile.id); };
  const moveTile = (event: PointerEvent<HTMLButtonElement>) => { const drag = dragRef.current; const position = eventPosition(event); if (!drag || !position) return; setTiles((currentTiles) => currentTiles.map((tile) => tile.id === drag.id ? safeTilePosition(tile, currentTiles, position.x - drag.offsetX, position.y - drag.offsetY) : tile)); };
  const finishTileDrag = () => { if (dragRef.current) setNotice('Tile placed. It will not overlap another tile.'); dragRef.current = null; };
  const nudge = (x: number, y: number) => { if (!selectedTile) return; setTiles((currentTiles) => currentTiles.map((tile) => tile.id === selectedTile.id ? safeTilePosition(tile, currentTiles, tile.x + x, tile.y + y) : tile)); };

  if (!imageUrl) return <main className="start-shell">
    <header className="studio-topbar"><a className="wordmark" href="#top">Expand</a><span className="privacy-note">Private by default</span></header>
    <section className="start-stage" id="top">
      <div className="start-copy"><p className="eyebrow">A wall, one photo at a time</p><h1>Make a big picture out of ordinary paper.</h1><p>Arrange separate printer-paper tiles over one image. Everything stays in this browser.</p></div>
      <label className="upload-zone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileInput} /><span className="upload-mark" aria-hidden="true">+</span><strong>Drop a photo here</strong><span>or choose a JPEG, PNG, or WebP</span><span className="upload-privacy">Never uploaded · never saved</span></label>
      <div className="start-notes" aria-label="What happens next"><span>01 Add your photo</span><span>02 Arrange paper tiles</span><span>03 Print at home</span></div><p className="status-message" role="status">{notice}</p>
    </section>
  </main>;

  return <main className="studio-shell">
    <header className="studio-topbar"><button className="brand-button" type="button" onClick={() => setImageUrl(null)}>Expand</button><p className="file-name">{imageName}</p><div className="top-actions"><span className="privacy-note">Local only</span><button className="print-button" type="button" onClick={() => setNotice('Print check is the next milestone. Your layout is ready for review.')}>Print check →</button></div></header>
    <section className="studio-layout">
      <aside className="left-rail" aria-label="Arrangement tools"><div><p className="rail-label">Quick layouts</p><div className="template-grid">{(Object.keys(templateLabels) as TemplateId[]).map((id) => <button key={id} className={template === id ? 'template-button active' : 'template-button'} type="button" onClick={() => applyTemplate(id)}>{templateLabels[id]}</button>)}</div></div><div className="rail-divider" /><div><p className="rail-label">Edit</p><button className={mode === 'tiles' ? 'mode-button active' : 'mode-button'} type="button" onClick={() => { setMode('tiles'); setNotice('Tile mode: drag a page. Tiles will not overlap.'); }}>Move tiles</button><button className={mode === 'photo' ? 'mode-button active' : 'mode-button'} type="button" onClick={() => { setMode('photo'); setNotice('Photo mode: use the scale control. Tile positions stay fixed.'); }}>Position photo</button></div><p className="rail-hint">Every tile is a separate sheet. The gaps are part of the composition.</p></aside>
      <section className="canvas-area" aria-label="Wall layout canvas"><div className="canvas-header"><div><p className="eyebrow">Wall board</p><h2>{templateLabels[template]} composition</h2></div><p>{mode === 'tiles' ? 'Drag a paper tile' : 'Adjust the photo scale'}</p></div><div className={mode === 'photo' ? 'wall-board photo-mode' : 'wall-board'} ref={boardRef} style={boardStyle}><div className="board-tint" />{tiles.map((tile) => <button className={selectedId === tile.id ? 'paper-tile selected' : 'paper-tile'} key={tile.id} type="button" style={{ left: `${tile.x}%`, top: `${tile.y}%`, width: `${tile.width}%`, height: `${tile.height}%` }} onPointerDown={(event) => beginTileDrag(event, tile)} onPointerMove={moveTile} onPointerUp={finishTileDrag} onPointerCancel={finishTileDrag} onClick={() => setSelectedId(tile.id)} aria-label={`Paper tile ${tile.label}`}><span>{tile.label}</span></button>)}</div><footer className="canvas-footer"><span>Paper gaps are visible wall space</span><span>● Snap grid on</span></footer><p className="status-message studio-status" role="status">{notice}</p></section>
      <aside className="right-rail" aria-label="Project inspector"><div className="inspector-section"><p className="rail-label">Project</p><label htmlFor="paper">Paper size</label><select id="paper" value={paperId} onChange={(event) => changePaper(event.target.value as PaperPresetId)}>{Object.values(PAPER_PRESETS).map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select><p className="measurement-copy">{paper.widthMm} × {paper.heightMm} mm per page</p></div><div className="inspector-section"><p className="rail-label">{mode === 'photo' ? 'Photo scale' : `Tile ${selectedTile?.label ?? '—'}`}</p>{mode === 'photo' ? <><input aria-label="Photo scale" type="range" min="100" max="160" value={photoScale} onChange={(event) => setPhotoScale(Number(event.target.value))} /><output>{photoScale}%</output></> : <div className="nudge-grid"><button type="button" onClick={() => nudge(0, -2)}>↑</button><button type="button" onClick={() => nudge(-2, 0)}>←</button><button type="button" onClick={() => nudge(2, 0)}>→</button><button type="button" onClick={() => nudge(0, 2)}>↓</button></div>}</div><div className="inspector-section result-section"><p className="rail-label">Result</p><strong>{tiles.length} separate pages</strong><span>Non-overlapping · paper shape preserved</span></div></aside>
    </section>
  </main>;
}
