import { useEffect, useMemo, useRef } from 'react';
import type { DEGene } from '../../types/data';

interface WaterfallChartProps {
  genes: DEGene[];
  onSelectGene: (gene: string) => void;
}

export function WaterfallChart({ genes, onSelectGene }: WaterfallChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const topGenes = useMemo(() => genes.slice(0, 24), [genes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, width, height);

    const values = topGenes.map((gene) => Math.max(0, gene.log2fc ?? gene.logfc ?? 0));
    const max = Math.max(...values, 1);
    const chartHeight = height - 30;
    const barWidth = width / Math.max(topGenes.length, 1);

    ctx.fillStyle = '#93c5fd';
    topGenes.forEach((gene, index) => {
      const value = Math.max(0, gene.log2fc ?? gene.logfc ?? 0);
      const barHeight = (value / max) * (chartHeight - 12);
      const x = index * barWidth + 4;
      const y = chartHeight - barHeight;
      ctx.fillRect(x, y, Math.max(4, barWidth - 8), barHeight);
    });

    ctx.fillStyle = '#8b949e';
    ctx.font = '11px sans-serif';
    ctx.fillText('logFC', 8, 12);
  }, [topGenes]);

  return (
    <div className="h-full rounded-2xl border border-[var(--border)] bg-black/10 p-3">
      <canvas
        ref={canvasRef}
        className="h-[180px] w-full"
        onClick={(event) => {
          const canvas = canvasRef.current;
          if (!canvas || topGenes.length === 0) return;
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const index = Math.floor((x / rect.width) * topGenes.length);
          const gene = topGenes[index];
          if (gene) onSelectGene(gene.gene);
        }}
      />
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[var(--text-muted)]">
        {topGenes.slice(0, 6).map((gene) => (
          <button key={gene.gene} type="button" className="truncate text-left hover:text-[var(--text)]" onClick={() => onSelectGene(gene.gene)}>
            {gene.gene}
          </button>
        ))}
      </div>
    </div>
  );
}
