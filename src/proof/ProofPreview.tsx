import { useEffect, useRef } from 'react';
import type { PaperPreset } from '../geometry/paper';
import type { SheetPlacement } from '../geometry/sheet';
import { drawAssembledPreview } from './render';

interface ProofPreviewProps {
  paper: PaperPreset;
  sheets: SheetPlacement[];
}

export function ProofPreview({ paper, sheets }: ProofPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return;
    }

    const render = () => {
      const bounds = container.getBoundingClientRect();
      const width = Math.max(320, Math.round(bounds.width));
      const height = Math.max(420, Math.round(bounds.height));
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);

      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      drawAssembledPreview(context, width, height, sheets, paper, pixelRatio);
    };

    const observer = new ResizeObserver(render);
    observer.observe(container);
    render();

    return () => observer.disconnect();
  }, [paper, sheets]);

  return (
    <div className="proof-preview" ref={containerRef}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Two separate ${paper.label} tiles rotated ${sheets[0]?.rotationDeg ?? 0} and ${sheets[1]?.rotationDeg ?? 0} degrees over one upright test image`}
      />
    </div>
  );
}
