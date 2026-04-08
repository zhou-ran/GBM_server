/** API client — Arrow IPC deserialization + JSON fetch */

import { tableFromIPC } from 'apache-arrow';

const BASE = '';

export async function fetchArrowTable(url: string, init?: RequestInit) {
  const resp = await fetch(`${BASE}${url}`, init);
  if (!resp.ok) throw new Error(`Arrow fetch failed: ${resp.status} ${url}`);
  const buf = await resp.arrayBuffer();
  return tableFromIPC(new Uint8Array(buf));
}

export async function fetchJSON<T>(url: string): Promise<T> {
  const resp = await fetch(`${BASE}${url}`);
  if (!resp.ok) throw new Error(`JSON fetch failed: ${resp.status} ${url}`);
  return resp.json();
}
