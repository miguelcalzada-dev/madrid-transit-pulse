/**
 * lineColors.ts — Definición única de colores de líneas Cercanías Madrid.
 * Todas las referencias en la app deben importar desde aquí.
 */

export interface LineColorSet {
  bg: string;
  text: string;
  border: string;
}

export const LINE_COLORS: Record<string, LineColorSet> = {
  C1:  { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
  C2:  { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
  C3:  { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
  C4:  { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  C5:  { bg: '#faf5ff', text: '#7e22ce', border: '#d8b4fe' },
  C7:  { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  C8:  { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },
  C9:  { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' },
  C10: { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
  CERCANIAS: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
};

export const LINE_ORDER = ['C1', 'C2', 'C3', 'C4', 'C5', 'C7', 'C8', 'C9', 'C10'] as const;

/** Colores planos para gráficos (Recharts) */
export const LINE_CHART_COLORS: Record<string, string> = {
  C1: '#e8614c', C2: '#4d9bd9', C3: '#f39c27', C4: '#6db33f',
  C5: '#9b59b6', C7: '#e74c3c', C8: '#1abc9c', C9: '#7f8c8d', C10: '#2980b9',
};

export function getLineColor(lineId: string): LineColorSet {
  return LINE_COLORS[lineId] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
}
