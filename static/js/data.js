/**
 * data.js — Binary data fetching and typed array parsing.
 * Loads preprocessed binary files from the API and caches them.
 */
const DataStore = (() => {
    let coords = null;       // Float32Array [x,y,x,y,...] 2.26M*2
    let meta = null;         // Uint8Array raw metadata
    let senescence = null;   // Float32Array [score, score, ...]
    let schema = null;       // JSON schema with category maps
    let hexbin = null;       // JSON hexbin data
    let centroids = null;    // JSON centroids
    let patients = null;     // JSON patient matrix
    let deResults = null;    // JSON DE results
    let correlation = null;  // JSON correlation matrix
    let nCells = 0;

    function hydrateSchemaLayout(rawSchema) {
        const schema = rawSchema || {};
        const columns = schema.columns || [];
        let runningOffset = 0;

        columns.forEach((col) => {
            const dtype = col.dtype || 'uint8';
            const itemsize = col.itemsize || (dtype === 'uint16' ? 2 : 1);
            const byteLength = col.byte_length || (schema.n_cells * itemsize);
            col.dtype = dtype;
            col.itemsize = itemsize;
            col.byte_offset = col.byte_offset ?? runningOffset;
            col.byte_length = byteLength;
            runningOffset = col.byte_offset + col.byte_length;
        });

        schema.meta_layout = schema.meta_layout || { format: 'column-major' };
        schema.meta_layout.total_bytes = schema.meta_layout.total_bytes || runningOffset;
        return schema;
    }

    async function fetchBinary(url) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
        return new Float32Array(await resp.arrayBuffer());
    }

    async function fetchBinaryRaw(url) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
        return new Uint8Array(await resp.arrayBuffer());
    }

    async function fetchJSON(url, fallback) {
        const resp = await fetch(url);
        if (!resp.ok) {
            if (arguments.length > 1) return fallback;
            throw new Error(`Failed to fetch ${url}: ${resp.status}`);
        }
        return resp.json();
    }

    async function loadAll(onProgress) {
        onProgress('Loading schema...');
        schema = hydrateSchemaLayout(await fetchJSON('/api/schema'));
        nCells = schema.n_cells;

        onProgress(`Loading ${(nCells/1e6).toFixed(1)}M cell coordinates...`);
        coords = await fetchBinary('/api/coords');

        onProgress('Loading metadata...');
        meta = await fetchBinaryRaw('/api/meta');

        onProgress('Loading senescence scores...');
        senescence = await fetchBinary('/api/senescence');

        onProgress('Loading hexbin data...');
        hexbin = await fetchJSON('/api/hexbin', null);

        onProgress('Loading analysis data...');
        [centroids, patients, deResults, correlation] = await Promise.all([
            fetchJSON('/api/centroids', []),
            fetchJSON('/api/patients', []),
            fetchJSON('/api/de', {}),
            fetchJSON('/api/correlation', { labels: [], matrix: [] }),
        ]);

        onProgress('Ready.');
    }

    function getCoords() { return coords; }
    function getMeta() { return meta; }
    function getSenescence() { return senescence; }
    function getSchema() { return schema; }
    function getHexbin() { return hexbin; }
    function getCentroids() { return centroids; }
    function getPatients() { return patients; }
    function getDEResults() { return deResults; }
    function getCorrelation() { return correlation; }
    function getNCells() { return nCells; }

    function getColumn(columnRef) {
        if (typeof columnRef === 'number') return schema.columns[columnRef];
        return schema.columns.find((col) => col.name === columnRef) || null;
    }

    // Get metadata column values for a specific column index or name
    function getMetaColumn(columnRef) {
        const col = getColumn(columnRef);
        if (!col) return null;

        const byteOffset = col.byte_offset || 0;
        if (col.dtype === 'uint16') {
            return new Uint16Array(meta.buffer, meta.byteOffset + byteOffset, nCells);
        }
        return meta.subarray(byteOffset, byteOffset + col.byte_length);
    }

    // Count visible cells in a bounding box
    function countInBounds(xmin, xmax, ymin, ymax, filterMask, limit = Infinity) {
        let count = 0;
        for (let i = 0; i < nCells; i++) {
            if (filterMask && !filterMask[i]) continue;
            const x = coords[i * 2];
            const y = coords[i * 2 + 1];
            if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) {
                count++;
                if (count >= limit) return count;
            }
        }
        return count;
    }

    // Load gene expression data
    async function loadGene(geneName) {
        try {
            const resp = await fetch(`/api/gene/${encodeURIComponent(geneName)}`);
            if (!resp.ok) return null;
            return new Float32Array(await resp.arrayBuffer());
        } catch { return null; }
    }

    return {
        loadAll, getCoords, getMeta, getSenescence, getSchema,
        getHexbin, getCentroids, getPatients, getDEResults, getCorrelation,
        getNCells, getMetaColumn, countInBounds, loadGene, getColumn,
    };
})();
