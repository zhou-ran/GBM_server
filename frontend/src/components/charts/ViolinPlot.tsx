import { useEffect, useRef } from 'react';

interface ViolinPlotProps {
  groups: Record<string, number[]>;
}

export function ViolinPlot({ groups }: ViolinPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const entries = Object.entries(groups).slice(0, 8);

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

    const padX = 28;
    const padY = 16;
    const plotWidth = width - padX * 2;
    const plotHeight = height - padY * 2;
    const groupWidth = plotWidth / Math.max(entries.length, 1);

    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(padX, height - padY);
    ctx.lineTo(width - padX, height - padY);
    ctx.stroke();

    entries.forEach(([label, values], index) => {
      if (values.length === 0) return;
      const bins = new Array(12).fill(0);
      values.forEach((value) => {
        const bin = Math.min(bins.length - 1, Math.floor(Math.max(0, Math.min(0.999, value)) * bins.length));
        bins[bin] += 1;
      });
      const peak = Math.max(...bins, 1);
      const centerX = padX + groupWidth * index + groupWidth / 2;

      ctx.beginPath();
      bins.forEach((count, bin) => {
        const y = height - padY - (bin / (bins.length - 1)) * plotHeight;
        const halfWidth = (count / peak) * (groupWidth * 0.35);
        if (bin === 0) ctx.moveTo(centerX - halfWidth, y);
        else ctx.lineTo(centerX - halfWidth, y);
      });
      for (let bin = bins.length - 1; bin >= 0; bin--) {
        const count = bins[bin];
        const y = height - padY - (bin / (bins.length - 1)) * plotHeight;
        const halfWidth = (count / peak) * (groupWidth * 0.35);
        ctx.lineTo(centerX + halfWidth, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(88, 166, 255, 0.45)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.85)';
      ctx.stroke();

      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
      const medianY = height - padY - median * plotHeight;
      ctx.strokeStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(centerX - groupWidth * 0.2, medianY);
      ctx.lineTo(centerX + groupWidth * 0.2, medianY);
      ctx.stroke();

      ctx.fillStyle = '#8b949e';
      ctx.font = '11px sans-serif';
      ctx.fillText(label, centerX - groupWidth * 0.22, height - 2);
    });
  }, [entries]);

  return (
    <div className="h-full rounded-2xl border border-[var(--border)] bg-black/10 p-3">
      <canvas ref={canvasRef} className="h-[220px] w-full" />
    </div>
  );
}
