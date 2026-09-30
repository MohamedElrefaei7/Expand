import { useMemo, useState } from 'react';
import { PAPER_PRESETS, type PaperPresetId } from './geometry/paper';
import { createFixtureSheets, DEFAULT_FIXTURE_ANGLES } from './proof/fixture';
import { ProofPreview } from './proof/ProofPreview';

type ExportState = 'idle' | 'rendering' | 'ready' | 'error';

function downloadBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function App() {
  const [paperId, setPaperId] = useState<PaperPresetId>('letter');
  const [angleA, setAngleA] = useState<number>(DEFAULT_FIXTURE_ANGLES.a);
  const [angleB, setAngleB] = useState<number>(DEFAULT_FIXTURE_ANGLES.b);
  const [exportState, setExportState] = useState<ExportState>('idle');

  const paper = PAPER_PRESETS[paperId];
  const sheets = useMemo(
    () => createFixtureSheets(angleA, angleB),
    [angleA, angleB],
  );

  const resetAngles = () => {
    setAngleA(DEFAULT_FIXTURE_ANGLES.a);
    setAngleB(DEFAULT_FIXTURE_ANGLES.b);
  };

  const downloadFixture = async () => {
    setExportState('rendering');

    try {
      const { generateFixturePdf } = await import('./proof/pdf');
      const bytes = await generateFixturePdf({ paper, sheets, dpi: 150 });
      downloadBytes(bytes, `expand-geometry-proof-${paper.id}.pdf`);
      setExportState('ready');
    } catch (error) {
      console.error(error);
      setExportState('error');
    }
  };

  return (
    <main className="proof-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Expand home">
          Expand
        </a>
        <p>Milestone 0 · geometry proof</p>
        <span className="privacy-note">Runs locally</span>
      </header>

      <section className="intro" id="top">
        <div>
          <p className="eyebrow">Print lab 00</p>
          <h1>One image. Separate tiles. Still continuous.</h1>
        </div>
        <p className="lede">
          This fixture proves the core Expand transform before the editor is
          built. Each separate paper tile samples the same upright world-space
          artwork; the visible gap is part of the wall layout.
        </p>
      </section>

      <section className="lab" aria-labelledby="preview-heading">
        <div className="preview-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Assembled preview</p>
              <h2 id="preview-heading">The wall view</h2>
            </div>
            <div className="preview-key" aria-label="Preview legend">
              <span><i className="key-dot key-dot-a" />Sheet A</span>
              <span><i className="key-dot key-dot-b" />Sheet B</span>
            </div>
          </div>

          <ProofPreview paper={paper} sheets={sheets} />

          <div className="proof-facts" aria-label="Automated proof status">
            <p><span aria-hidden="true">✓</span> Affine round-trip</p>
            <p><span aria-hidden="true">✓</span> Exact paper dimensions</p>
            <p><span aria-hidden="true">✓</span> Upright world artwork</p>
          </div>
        </div>

        <aside className="controls" aria-label="Geometry proof controls">
          <div className="control-group">
            <label htmlFor="paper">Paper</label>
            <select
              id="paper"
              value={paperId}
              onChange={(event) => setPaperId(event.target.value as PaperPresetId)}
            >
              {Object.values(PAPER_PRESETS).map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label} · {preset.widthMm} × {preset.heightMm} mm
                </option>
              ))}
            </select>
          </div>

          <fieldset className="angle-controls">
            <legend>Sheet angles</legend>
            <label htmlFor="angle-a">
              <span>Sheet A</span>
              <output htmlFor="angle-a">{angleA}°</output>
            </label>
            <input
              id="angle-a"
              type="range"
              min="-30"
              max="30"
              step="1"
              value={angleA}
              onChange={(event) => setAngleA(Number(event.target.value))}
            />

            <label htmlFor="angle-b">
              <span>Sheet B</span>
              <output htmlFor="angle-b">{angleB}°</output>
            </label>
            <input
              id="angle-b"
              type="range"
              min="-30"
              max="30"
              step="1"
              value={angleB}
              onChange={(event) => setAngleB(Number(event.target.value))}
            />
            <button className="text-button" type="button" onClick={resetAngles}>
              Reset proof angles
            </button>
          </fieldset>

          <div className="measurement">
            <p>Physical sheet</p>
            <strong>{paper.widthMm} × {paper.heightMm} mm</strong>
            <span>PDF page size is generated from millimeters, not screen pixels.</span>
          </div>

          <button
            className="download-button"
            type="button"
            onClick={downloadFixture}
            disabled={exportState === 'rendering'}
          >
            {exportState === 'rendering'
              ? 'Rendering two pages…'
              : 'Download print fixture'}
          </button>

          <p className={`export-note export-note-${exportState}`} role="status">
            {exportState === 'ready' && 'PDF ready. Print at Actual size / 100%.'}
            {exportState === 'error' && 'The fixture could not be created. Try again.'}
            {exportState === 'idle' && 'Generated entirely in this browser.'}
          </p>
        </aside>
      </section>

      <section className="physical-check" aria-labelledby="check-heading">
        <div>
          <p className="eyebrow">Only the printer can answer this</p>
          <h2 id="check-heading">Physical validation</h2>
        </div>
        <ol>
          <li>
            <span>01</span>
            <p>Print both pages at <strong>Actual size / 100%</strong>.</p>
          </li>
          <li>
            <span>02</span>
            <p>Confirm the calibration square measures <strong>25.4 mm</strong>.</p>
          </li>
          <li>
            <span>03</span>
            <p>Mount the sheets separately, with no overlap, at their printed angles.</p>
          </li>
          <li>
            <span>04</span>
            <p>Verify the grid and artwork remain upright across both sheets.</p>
          </li>
        </ol>
        <p className="pending-note">
          Automated checks pass in code. Milestone 0 closes after this physical
          fixture is printed and measured.
        </p>
      </section>
    </main>
  );
}
