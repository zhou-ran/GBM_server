import { useEffect, useRef } from 'react';

interface DotPlotProps {
  rows: string[];
  columns: string[];
  sizeMatrix: number[][];
  colorMatrix: number[][];
}

export function DotPlot({ rows, columns, sizeMatrix, colorMatrix }: DotPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    const padLeft = 90;
    const padTop = 20;
    const gridWidth = width - padLeft - 12;
    const gridHeight = height - padTop - 20;
    const colStep = gridWidth / Math.max(columns.length, 1);
    const rowStep = gridHeight / Math.max(rows.length, 1);

    rows.forEach((row, rowIndex) => {
      ctx.fillStyle = '#8b949e';
      ctx.font = '11px sans-serif';
      ctx.fillText(row, 8, padTop + rowStep * rowIndex + rowStep * 0.58);
    });

    columns.forEach((column, columnIndex) => {
      ctx.fillStyle = '#8b949e';
      ctx.font = '11px sans-serif';
      ctx.fillText(column, padLeft + colStep * columnIndex + 4, 12);
    });

    rows.forEach((_, rowIndex) => {
      columns.forEach((_, columnIndex) => {
        const size = sizeMatrix[rowIndex]?.[columnIndex] ?? 0;
        const color = colorMatrix[rowIndex]?.[columnIndex] ?? 0;
        const x = padLeft + colStep * columnIndex + colStep / 2;
        const y = padTop + rowStep * rowIndex + rowStep / 2;
        const radius = Math.max(4, size * Math.min(colStep, rowStep) * 0.32);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(88, 166, 255, ${0.25 + color * 0.75})`;
        ctx.fill();
      });
    });
  }, [colorMatrix, columns, rows, sizeMatrix]);

  return (
    <div className="h-full rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
      <canvas ref={canvasRef} className="h-[240px] w-full" />
    </div>
  );
}
