import { AGE_GROUP_COLORS, CELLTYPE_COLORS, IDH_COLORS, senescenceColor } from './colors';

export const CELLTYPE_HEX = CELLTYPE_COLORS.map(
  ([r, g, b, a]) => `rgba(${r}, ${g}, ${b}, ${a / 255})`,
);

export function categoricalColor(index: number): [number, number, number, number] {
  return CELLTYPE_COLORS[index] ?? [148, 163, 184, 220];
}

export function categoricalCss(index: number): string {
  return CELLTYPE_HEX[index] ?? 'rgba(148, 163, 184, 0.86)';
}

export function paletteCss(color: [number, number, number, number]): string {
  const [r, g, b, a] = color;
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}

export function ageGroupColor(index: number): [number, number, number, number] {
  return AGE_GROUP_COLORS[index] ?? [148, 163, 184, 220];
}

export function idhColor(index: number): [number, number, number, number] {
  return IDH_COLORS[index] ?? [148, 163, 184, 220];
}

export function sequentialCss(value: number): string {
  const [r, g, b, a] = senescenceColor(value);
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}

export function pseudotimeCss(value: number): string {
  const clamped = Math.max(0, Math.min(1, value));
  const r = Math.round(124 + clamped * 131);
  const g = Math.round(58 + clamped * 182);
  const b = Math.round(237 - clamped * 165);
  return `rgba(${r}, ${g}, ${b}, 0.92)`;
}
