/** API endpoint paths */

export const ENDPOINTS = {
  cells: '/api/cells',
  schema: '/api/schema',
  hexbin: '/api/hexbin',
  centroids: '/api/centroids',
  patients: '/api/patients',
  de: '/api/de',
  correlation: '/api/correlation',
  stats: '/api/stats',
  geneSearch: (query: string) => `/api/genes/search?q=${encodeURIComponent(query)}`,
  signature: '/api/signature',
  gene: (name: string) => `/api/gene/${encodeURIComponent(name)}`,
} as const;
