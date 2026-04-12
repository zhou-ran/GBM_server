import { useEffect, useMemo, useRef, useState } from 'react';
import { useDataStore } from '../../stores/dataStore';
import type { Patient } from '../../types/data';

type GroupBy = 'IDH' | 'age_group' | 'stage' | 'sex';

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'IDH', label: 'IDH Status' },
  { value: 'age_group', label: 'Age Group' },
  { value: 'stage', label: 'Stage' },
  { value: 'sex', label: 'Sex' },
];

const PALETTE = [
  'rgba(102,194,165,0.75)',
  'rgba(252,141,98,0.75)',
  'rgba(141,160,203,0.75)',
  'rgba(231,138,195,0.75)',
  'rgba(166,216,84,0.75)',
  'rgba(255,217,47,0.75)',
  'rgba(229,196,148,0.75)',
  'rgba(179,179,179,0.75)',
];

const STROKE_PALETTE = [
  'rgba(102,194,165,1)',
  'rgba(252,141,98,1)',
  'rgba(141,160,203,1)',
  'rgba(231,138,195,1)',
  'rgba(166,216,84,1)',
  'rgba(255,217,47,1)',
  'rgba(229,196,148,1)',
  'rgba(179,179,179,1)',
];

interface BoxStats {
  label: string;
  q1: number;
  median: number;
  q3: number;
  whiskerLo: number;
  whiskerHi: number;
  outliers: number[];
  n: number;
}

function computeBox(values: number[]): Omit<BoxStats, 'label' | 'n'> | null {
  if (values.length < 2) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const median = sorted[Math.floor(n * 0.5)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const whiskerLo = sorted.find((v) => v >= lo) ?? sorted[0];
  const whiskerHi = [...sorted].reverse().find((v) => v <= hi) ?? sorted[n - 1];
  const outliers = sorted.filter((v) => v < whiskerLo || v > whiskerHi);
  return { q1, median, q3, whiskerLo, whiskerHi, outliers };
}

function groupPatients(patients: Patient[], groupBy: GroupBy): BoxStats[] {
  const groups: Record<string, number[]> = {};
  for (const p of patients) {
    const key = p[groupBy] ?? 'Unknown';
    (groups[key] ??= []).push(p.senescence_mean);
  }
  return Object.entries(groups)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([label, values]) => {
      const box = computeBox(values);
      if (!box) return null;
      return { label, n: values.length, ...box };
    })
    .filter((b): b is BoxStats => b !== null);
}

/* PLACEHOLDER_DRAW */

function drawBoxPlot(canvas: HTMLCanvasElement, boxes: BoxStats[]) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  if (boxes.length === 0) return;

  const padL = 40, padR = 12, padT = 12, padB = 40;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  // Y range from all data
  let yMin = Infinity, yMax = -Infinity;
  for (const b of boxes) {
    const lo = b.outliers.length > 0 ? Math.min(b.whiskerLo, ...b.outliers) : b.whiskerLo;
    const hi = b.outliers.length > 0 ? Math.max(b.whiskerHi, ...b.outliers) : b.whiskerHi;
    if (lo < yMin) yMin = lo;
    if (hi > yMax) yMax = hi;
  }
  const yPad = (yMax - yMin) * 0.08 || 0.01;
  yMin -= yPad;
  yMax += yPad;

  const toY = (v: number) => padT + plotH * (1 - (v - yMin) / (yMax - yMin));
  const groupW = plotW / boxes.length;
  const boxW = Math.min(groupW * 0.55, 48);

  // Y-axis ticks
  ctx.fillStyle = '#8b949e';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  const nTicks = 5;
  for (let i = 0; i <= nTicks; i++) {
    const v = yMin + (yMax - yMin) * (i / nTicks);
    const y = toY(v);
    ctx.fillText(v.toFixed(3), padL - 4, y + 3);
    ctx.strokeStyle = 'rgba(139,148,158,0.15)';
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
  }

  // Draw boxes
  boxes.forEach((b, i) => {
    const cx = padL + groupW * i + groupW / 2;
    const fill = PALETTE[i % PALETTE.length];
    const stroke = STROKE_PALETTE[i % STROKE_PALETTE.length];

    // Whisker line
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, toY(b.whiskerLo));
    ctx.lineTo(cx, toY(b.whiskerHi));
    ctx.stroke();

    // Whisker caps
    const capW = boxW * 0.4;
    ctx.beginPath();
    ctx.moveTo(cx - capW, toY(b.whiskerLo));
    ctx.lineTo(cx + capW, toY(b.whiskerLo));
    ctx.moveTo(cx - capW, toY(b.whiskerHi));
    ctx.lineTo(cx + capW, toY(b.whiskerHi));
    ctx.stroke();

    // Box
    const y1 = toY(b.q3);
    const y2 = toY(b.q1);
    ctx.fillStyle = fill;
    ctx.fillRect(cx - boxW / 2, y1, boxW, y2 - y1);
    ctx.strokeStyle = stroke;
    ctx.strokeRect(cx - boxW / 2, y1, boxW, y2 - y1);

    // Median
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - boxW / 2, toY(b.median));
    ctx.lineTo(cx + boxW / 2, toY(b.median));
    ctx.stroke();
    ctx.lineWidth = 1.5;

    // Outliers
    ctx.fillStyle = stroke;
    for (const o of b.outliers) {
      ctx.beginPath();
      ctx.arc(cx, toY(o), 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const lbl = b.label.length > 8 ? b.label.slice(0, 7) + '…' : b.label;
    ctx.fillText(lbl, cx, h - padB + 14);
    ctx.fillText(`n=${b.n}`, cx, h - padB + 26);
  });

  // Y-axis label
  ctx.save();
  ctx.fillStyle = '#8b949e';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.translate(10, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Senescence', 0, 0);
  ctx.restore();
}

export function CompositionBoxPlot() {
  const patients = useDataStore((s) => s.patients);
  const [groupBy, setGroupBy] = useState<GroupBy>('IDH');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const boxes = useMemo(() => groupPatients(patients, groupBy), [patients, groupBy]);

  useEffect(() => {
    if (canvasRef.current) drawBoxPlot(canvasRef.current, boxes);
  }, [boxes]);

  // Redraw on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => drawBoxPlot(canvas, boxes));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [boxes]);

  return (
    <div className="flex h-full flex-col gap-3">
      <select
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--control-bg)] px-3 py-2 text-sm text-[var(--text)]"
        value={groupBy}
        onChange={(e) => setGroupBy(e.target.value as GroupBy)}
      >
        {GROUP_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="min-h-0 flex-1 rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface-overlay)]">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
    </div>
  );
}
