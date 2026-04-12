import { useEffect, useMemo, useRef, useState } from 'react';
import { useDataStore } from '../../stores/dataStore';
import type { Patient } from '../../types/data';

export type GroupBy = 'IDH' | 'age_group' | 'stage' | 'sex';

export const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'IDH', label: 'IDH Status' },
  { value: 'age_group', label: 'Age Group' },
  { value: 'stage', label: 'Stage' },
  { value: 'sex', label: 'Sex' },
];

const PALETTE = [
  'rgba(102,194,165,0.75)', 'rgba(252,141,98,0.75)',
  'rgba(141,160,203,0.75)', 'rgba(231,138,195,0.75)',
  'rgba(166,216,84,0.75)',  'rgba(255,217,47,0.75)',
  'rgba(229,196,148,0.75)', 'rgba(179,179,179,0.75)',
  'rgba(188,128,189,0.75)', 'rgba(204,235,197,0.75)',
  'rgba(255,255,179,0.75)', 'rgba(251,128,114,0.75)',
];
const STROKE_PALETTE = [
  'rgba(102,194,165,1)', 'rgba(252,141,98,1)',
  'rgba(141,160,203,1)', 'rgba(231,138,195,1)',
  'rgba(166,216,84,1)',  'rgba(255,217,47,1)',
  'rgba(229,196,148,1)', 'rgba(179,179,179,1)',
  'rgba(188,128,189,1)', 'rgba(204,235,197,1)',
  'rgba(255,255,179,1)', 'rgba(251,128,114,1)',
];

interface BoxStats {
  label: string;
  q1: number; median: number; q3: number;
  whiskerLo: number; whiskerHi: number;
  outliers: number[]; n: number; groupIdx: number;
}

function computeBox(values: number[]): Omit<BoxStats, 'label' | 'n' | 'groupIdx'> | null {
  if (values.length < 2) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const median = sorted[Math.floor(n * 0.5)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  const whiskerLo = sorted.find((v) => v >= lo) ?? sorted[0];
  const whiskerHi = [...sorted].reverse().find((v) => v <= hi) ?? sorted[n - 1];
  const outliers = sorted.filter((v) => v < whiskerLo || v > whiskerHi);
  return { q1, median, q3, whiskerLo, whiskerHi, outliers };
}

function groupPatients(patients: Patient[], primary: GroupBy, secondary: GroupBy | null): BoxStats[] {
  const primaryKeys = new Map<string, number>();
  for (const p of patients) {
    const pk = p[primary] ?? 'Unknown';
    if (!primaryKeys.has(pk)) primaryKeys.set(pk, primaryKeys.size);
  }
  const groups: Record<string, { values: number[]; primaryKey: string }> = {};
  for (const p of patients) {
    const pk = p[primary] ?? 'Unknown';
    const label = secondary ? `${pk} / ${p[secondary] ?? '?'}` : pk;
    if (!groups[label]) groups[label] = { values: [], primaryKey: pk };
    groups[label].values.push(p.senescence_mean);
  }
  return Object.entries(groups)
    .sort((a, b) => {
      const pa = primaryKeys.get(a[1].primaryKey) ?? 0;
      const pb = primaryKeys.get(b[1].primaryKey) ?? 0;
      return pa !== pb ? pa - pb : b[1].values.length - a[1].values.length;
    })
    .map(([label, { values, primaryKey }]) => {
      const box = computeBox(values);
      if (!box) return null;
      return { label, n: values.length, groupIdx: primaryKeys.get(primaryKey) ?? 0, ...box };
    })
    .filter((b): b is BoxStats => b !== null);
}

// --- Autocomplete selector (like GeneAutocomplete / ColorBy) ---

function GroupSelect({
  label,
  value,
  options,
  allowNone,
  onChange,
}: {
  label: string;
  value: GroupBy | null;
  options: { value: GroupBy; label: string }[];
  allowNone?: boolean;
  onChange: (v: GroupBy | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const base = allowNone
      ? [{ value: '' as GroupBy | '', label: 'None' }, ...options]
      : options;
    if (!q) return base;
    return base.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options, allowNone]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayLabel = value ? options.find((o) => o.value === value)?.label ?? value : 'None';

  return (
    <div ref={ref} className="relative">
      <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
      <input
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--control-bg)] px-2.5 py-1.5 text-xs text-[var(--text)] placeholder:text-[var(--text-muted)]"
        placeholder={displayLabel}
        value={open ? query : ''}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] p-1 shadow-xl">
          {filtered.map((o) => (
            <button
              key={o.value || '__none__'}
              type="button"
              className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                (o.value || null) === value
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text)] hover:bg-[var(--control-bg)]'
              }`}
              onClick={() => {
                onChange(o.value ? (o.value as GroupBy) : null);
                setOpen(false);
                setQuery('');
              }}
            >
              {o.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-2.5 py-1.5 text-xs text-[var(--text-muted)]">No match</div>
          )}
        </div>
      )}
      {!open && (
        <div className="pointer-events-none absolute inset-y-0 right-0 top-[18px] flex items-center pr-2">
          <svg className="h-3 w-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 12 12">
            <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

// --- PLACEHOLDER_DRAW ---

function drawBoxPlot(canvas: HTMLCanvasElement, boxes: BoxStats[]) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
  if (boxes.length === 0) return;

  const padL = 42, padR = 12, padT = 12, padB = 44;
  const plotW = w - padL - padR, plotH = h - padT - padB;

  let yMin = Infinity, yMax = -Infinity;
  for (const b of boxes) {
    const lo = b.outliers.length > 0 ? Math.min(b.whiskerLo, ...b.outliers) : b.whiskerLo;
    const hi = b.outliers.length > 0 ? Math.max(b.whiskerHi, ...b.outliers) : b.whiskerHi;
    if (lo < yMin) yMin = lo; if (hi > yMax) yMax = hi;
  }
  const yPad = (yMax - yMin) * 0.08 || 0.01;
  yMin -= yPad; yMax += yPad;
  const toY = (v: number) => padT + plotH * (1 - (v - yMin) / (yMax - yMin));
  const groupW = plotW / boxes.length;
  const boxW = Math.min(groupW * 0.55, 42);

  ctx.fillStyle = '#8b949e'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const v = yMin + (yMax - yMin) * (i / 5); const y = toY(v);
    ctx.fillText(v.toFixed(3), padL - 4, y + 3);
    ctx.strokeStyle = 'rgba(139,148,158,0.15)';
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
  }

  boxes.forEach((b) => {
    const i = boxes.indexOf(b);
    const cx = padL + groupW * i + groupW / 2;
    const fill = PALETTE[b.groupIdx % PALETTE.length];
    const stroke = STROKE_PALETTE[b.groupIdx % STROKE_PALETTE.length];
    ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, toY(b.whiskerLo)); ctx.lineTo(cx, toY(b.whiskerHi)); ctx.stroke();
    const capW = boxW * 0.4;
    ctx.beginPath();
    ctx.moveTo(cx - capW, toY(b.whiskerLo)); ctx.lineTo(cx + capW, toY(b.whiskerLo));
    ctx.moveTo(cx - capW, toY(b.whiskerHi)); ctx.lineTo(cx + capW, toY(b.whiskerHi)); ctx.stroke();
    const y1 = toY(b.q3), y2 = toY(b.q1);
    ctx.fillStyle = fill; ctx.fillRect(cx - boxW / 2, y1, boxW, y2 - y1);
    ctx.strokeStyle = stroke; ctx.strokeRect(cx - boxW / 2, y1, boxW, y2 - y1);
    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - boxW / 2, toY(b.median)); ctx.lineTo(cx + boxW / 2, toY(b.median)); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.fillStyle = stroke;
    for (const o of b.outliers) { ctx.beginPath(); ctx.arc(cx, toY(o), 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#8b949e'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    const maxLen = boxes.length > 6 ? 6 : 10;
    const lbl = b.label.length > maxLen ? b.label.slice(0, maxLen - 1) + '…' : b.label;
    ctx.fillText(lbl, cx, h - padB + 14); ctx.fillText(`n=${b.n}`, cx, h - padB + 28);
  });

  ctx.save(); ctx.fillStyle = '#8b949e'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
  ctx.translate(10, padT + plotH / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText('Senescence', 0, 0); ctx.restore();
}

// --- Main component ---

export function CompositionBoxPlot() {
  const patients = useDataStore((s) => s.patients);
  const [groupBy, setGroupBy] = useState<GroupBy>('IDH');
  const [splitBy, setSplitBy] = useState<GroupBy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const effectiveSplit = splitBy === groupBy ? null : splitBy;
  const boxes = useMemo(() => groupPatients(patients, groupBy, effectiveSplit), [patients, groupBy, effectiveSplit]);

  useEffect(() => { if (canvasRef.current) drawBoxPlot(canvasRef.current, boxes); }, [boxes]);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const obs = new ResizeObserver(() => drawBoxPlot(canvas, boxes));
    obs.observe(canvas); return () => obs.disconnect();
  }, [boxes]);

  const secondaryOptions = GROUP_OPTIONS.filter((o) => o.value !== groupBy);

  return (
    <div className="flex h-full gap-3">
      {/* Left: selectors */}
      <div className="flex w-28 shrink-0 flex-col gap-3">
        <GroupSelect
          label="Group by"
          value={groupBy}
          options={GROUP_OPTIONS}
          onChange={(v) => { if (v) setGroupBy(v); }}
        />
        <GroupSelect
          label="Split by"
          value={effectiveSplit}
          options={secondaryOptions}
          allowNone
          onChange={setSplitBy}
        />
      </div>
      {/* Right: canvas */}
      <div className="min-h-0 min-w-0 flex-1 rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface-overlay)]">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
    </div>
  );
}
