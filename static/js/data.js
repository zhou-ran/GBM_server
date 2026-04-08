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

    async function fetchBinary(url) {
        const resp = await fetch(url);
        return new Float32Array(await resp.arrayBuffer());
    }

    async function fetchBinaryRaw(url) {
        const resp = await fetch(url);
        return new Uint8Array(await resp.arrayBuffer());
    }

    async function fetchJSON(url) {
        const resp = await fetch(url);
        return resp.json();
    }

    async function loadAll(onProgress) {
        onProgress('Loading schema...');
        schema = await fetchJSON('/api/schema');
        nCells = schema.n_cells;

        onProgress(`Loading ${(nCells/1e6).toFixed(1)}M cell coordinates...`);
        coords = await fetchBinary('/api/coords');

        onProgress('Loading metadata...');
        meta = await fetchBinaryRaw('/api/meta');

        onProgress('Loading senescence scores...');
        senescence = await fetchBinary('/api/senescence');

        onProgress('Loading hexbin data...');
        hexbin = await fetchJSON('/api/hexbin');

        onProgress('Loading analysis data...');
        [centroids, patients, deResults, correlation] = await Promise.all([
            fetchJSON('/api/centroids'),
            fetchJSON('/api/patients'),
            fetchJSON('/api/de'),
            fetchJSON('/api/correlation'),
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

    // Get metadata column values for a specific column index
    function getMetaColumn(colIdx) {
        const col = schema.columns[colIdx];
        if (col.dtype === 'uint16') {
            // uint16 columns are stored after all uint8 columns
            let offset = 0;
            for (let i = 0; i < colIdx; i++) {
                offset += schema.columns[i].dtype === 'uint16' ? nCells * 2 : nCells;
            }
            return new Uint16Array(meta.buffer, meta.byteOffset + offset, nCells);
        }
        return meta.subarray(colIdx * nCells, (colIdx + 1) * nCells);
    }

    // Count visible cells in a bounding box
    function countInBounds(xmin, xmax, ymin, ymax, filterMask) {
        let count = 0;
        for (let i = 0; i < nCells; i++) {
            if (filterMask && !filterMask[i]) continue;
            const x = coords[i * 2];
            const y = coords[i * 2 + 1];
            if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) count++;
        }
        return count;
    }

    // Load gene expression data
    async function loadGene(geneName) {
        try {
            const resp = await fetch(`/api/gene/${geneName}`);
            if (!resp.ok) return null;
            return new Float32Array(await resp.arrayBuffer());
        } catch { return null; }
    }

    return {
        loadAll, getCoords, getMeta, getSenescence, getSchema,
        getHexbin, getCentroids, getPatients, getDEResults, getCorrelation,
        getNCells, getMetaColumn, countInBounds, loadGene,
    };
})();
