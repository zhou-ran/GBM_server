import { useEffect, useMemo, useRef } from 'react';

interface ScatterPoint {
  x: number;
  y: number;
}

interface CorrelationScatterProps {
  points: ScatterPoint[];
}

function spearman(points: ScatterPoint[]): number {
  if (points.length < 2) return 0;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const rank = (values: number[]) =>
    values
      .map((value, index) => ({ value, index }))
      .sort((a, b) => a.value - b.value)
      .reduce<number[]>((acc, item, index) => {
        acc[item.index] = index + 1;
        return acc;
      }, new Array(values.length).fill(0));
  const xr = rank(xs);
  const yr = rank(ys);
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const meanX = mean(xr);
  const meanY = mean(yr);
  let numerator = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xr.length; i++) {
    const vx = xr[i] - meanX;
    const vy = yr[i] - meanY;
    numerator += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }
  return dx > 0 && dy > 0 ? numerator / Math.sqrt(dx * dy) : 0;
}

export function CorrelationScatter({ points }: CorrelationScatterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sampled = useMemo(() => points.filter((_, index) => index % Math.max(1, Math.floor(points.length / 5000) || 1) === 0), [points]);
  const rho = useMemo(() => spearman(sampled), [sampled]);

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

    const pad = 20;
    const plotWidth = width - pad * 2;
    const plotHeight = height - pad * 2;

    sampled.forEach((point) => {
      const x = pad + point.x * plotWidth;
      const y = height - pad - point.y * plotHeight;
      ctx.fillStyle = 'rgba(147, 197, 253, 0.3)';
      ctx.fillRect(x, y, 2, 2);
    });
  }, [sampled]);

  return (
    <div className="h-full rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
      <div className="mb-2 text-xs text-[var(--text-muted)]">Spearman r = {rho.toFixed(3)}</div>
      <canvas ref={canvasRef} className="h-[220px] w-full" />
    </div>
  );
}
