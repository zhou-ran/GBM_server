/** Color palettes and mapping functions */

// 9 CellType colors (matching original app)
export const CELLTYPE_COLORS: [number, number, number, number][] = [
  [102, 194, 165, 200], // AC
  [252, 141, 98, 200],  // Endothelial
  [141, 160, 203, 200], // Lymphocyte
  [231, 138, 195, 200], // Malignant
  [166, 216, 84, 200],  // Neuron
  [255, 217, 47, 200],  // OPC
  [229, 196, 148, 200], // Oligodendrocyte
  [179, 179, 179, 200], // Perivascular
  [253, 180, 98, 200],  // TAM
];

export const AGE_GROUP_COLORS: [number, number, number, number][] = [
  [59, 130, 246, 210],
  [245, 158, 11, 210],
  [239, 68, 68, 210],
];

export const IDH_COLORS: [number, number, number, number][] = [
  [99, 102, 241, 210],
  [16, 185, 129, 210],
  [107, 114, 128, 210],
];

// Senescence continuous color: blue → yellow → red
export function senescenceColor(value: number): [number, number, number, number] {
  const v = Math.max(0, Math.min(1, value));
  let r: number, g: number, b: number;
  if (v < 0.5) {
    const t = v * 2;
    r = Math.round(t * 255);
    g = Math.round(t * 255);
    b = Math.round(255 * (1 - t));
  } else {
    const t = (v - 0.5) * 2;
    r = 255;
    g = Math.round(255 * (1 - t));
    b = 0;
  }
  return [r, g, b, 200];
}

export type TextLabelTheme = {
  text: [number, number, number, number];
  outline: [number, number, number, number];
};

export function textLabelTheme(theme: 'light' | 'dark'): TextLabelTheme {
  return theme === 'dark'
    ? { text: [255, 255, 255, 235], outline: [8, 12, 18, 240] }
    : { text: [31, 35, 40, 240], outline: [255, 255, 255, 245] };
}

export function mapBackground(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? '#0d1117' : '#f6f8fa';
}
