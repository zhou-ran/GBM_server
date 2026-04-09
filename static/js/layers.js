/**
 * layers.js — deck.gl layer factories for UMAP rendering.
 * Three modes: HeatmapLayer (default), ScreenGridLayer (mid-zoom), ScatterplotLayer (detail).
 */
const Layers = (() => {
    // Cell type color palette (9 types)
    const CELLTYPE_COLORS = [
        [255, 99, 71],    // Malignant - tomato
        [100, 149, 237],  // TAM - cornflower
        [50, 205, 50],    // Lymphocyte - lime
        [255, 215, 0],    // Perivascular - gold
        [186, 85, 211],   // Neuron - orchid
        [0, 206, 209],    // OPC - dark turquoise
        [255, 140, 0],    // AC - dark orange
        [147, 112, 219],  // Oligodendrocyte - medium purple
        [220, 20, 60],    // EC - crimson
    ];

    // CellType_Level2 palette (17 types)
    const CELLTYPE2_COLORS = [
        [255, 99, 71],    // Malignant
        [100, 149, 237],  // MG
        [50, 205, 50],    // NK
        [70, 130, 180],   // BDM
        [144, 238, 144],  // CD4T
        [255, 215, 0],    // Perivascular
        [186, 85, 211],   // Neuron
        [0, 191, 255],    // DC
        [255, 182, 193],  // CD8T
        [0, 206, 209],    // OPC
        [255, 140, 0],    // AC
        [147, 112, 219],  // Oligodendrocyte
        [220, 20, 60],    // EC
        [173, 216, 230],  // Treg
        [255, 105, 180],  // Plasma
        [124, 252, 0],    // Mast
        [218, 165, 32],   // B cell
    ];

    // Senescence color scale (blue → yellow → red)
    function senescenceColor(score) {
        if (score < 0.5) {
            const t = score * 2;
            return [
                Math.round(30 + t * 225),
                Math.round(60 + t * 180),
                Math.round(180 - t * 130),
                200
            ];
        } else {
            const t = (score - 0.5) * 2;
            return [
                Math.round(255),
                Math.round(240 - t * 200),
                Math.round(50 - t * 50),
                200
            ];
        }
    }

    // Build data array for deck.gl from binary arrays
    function buildPointData(coords, filterMask) {
        const n = coords.length / 2;
        const data = [];
        for (let i = 0; i < n; i++) {
            if (filterMask && !filterMask[i]) continue;
            data.push({ index: i, position: [coords[i * 2], coords[i * 2 + 1]] });
        }
        return data;
    }

    // Create HeatmapLayer for density view (default, >50K visible)
    function createHeatmapLayer(coords, senescence, filterMask, colorMode, geneExpr) {
        const n = coords.length / 2;
        const data = [];
        for (let i = 0; i < n; i++) {
            if (filterMask && !filterMask[i]) continue;
            let weight = 1;
            if (colorMode === 'senescence') weight = senescence[i];
            if (colorMode === 'gene' && geneExpr) weight = geneExpr[i];
            data.push({
                position: [coords[i * 2], coords[i * 2 + 1]],
                weight,
            });
        }

        return new deck.HeatmapLayer({
            id: 'heatmap',
            data,
            getPosition: d => d.position,
            getWeight: d => d.weight,
            radiusPixels: 15,
            intensity: 1.5,
            threshold: 0.05,
            colorRange: (colorMode === 'senescence' || colorMode === 'gene')
                ? [[30, 60, 180], [80, 180, 200], [255, 240, 50], [255, 100, 30], [200, 0, 0]]
                : [[10, 20, 40], [30, 80, 160], [80, 180, 220], [200, 240, 100], [255, 200, 50]],
            aggregation: 'SUM',
        });
    }

    // Create ScatterplotLayer for detail view (<5K visible)
    function createScatterLayer(
        coords, cellTypeCodes, cellType2Codes, senescence, filterMask, colorMode, geneExpr
    ) {
        const n = coords.length / 2;
        const data = [];
        for (let i = 0; i < n; i++) {
            if (filterMask && !filterMask[i]) continue;
            data.push({ index: i, position: [coords[i * 2], coords[i * 2 + 1]] });
        }

        return new deck.ScatterplotLayer({
            id: 'scatter',
            data,
            getPosition: d => d.position,
            getRadius: 0.02,
            radiusMinPixels: 2,
            radiusMaxPixels: 6,
            getFillColor: d => {
                const i = d.index;
                if (colorMode === 'senescence') {
                    return senescenceColor(senescence[i]);
                } else if (colorMode === 'gene' && geneExpr) {
                    return senescenceColor(geneExpr[i]);
                } else if (colorMode === 'celltype2') {
                    const code = cellType2Codes ? cellType2Codes[i] : -1;
                    return [...(CELLTYPE2_COLORS[code] || [128, 128, 128]), 200];
                } else {
                    const code = cellTypeCodes ? cellTypeCodes[i] : -1;
                    return [...(CELLTYPE_COLORS[code] || [128, 128, 128]), 200];
                }
            },
            pickable: true,
            autoHighlight: true,
            highlightColor: [255, 255, 255, 100],
            updateTriggers: {
                getFillColor: [colorMode, geneExpr],
            },
        });
    }

    // Create hexbin layer from pre-computed data
    function createHexbinLayer(hexbinData, colorMode) {
        const maxCount = Math.max(...hexbinData.bins.map(b => b.count));
        return new deck.ScatterplotLayer({
            id: 'hexbin-scatter',
            data: hexbinData.bins,
            getPosition: d => [d.x, d.y],
            getRadius: hexbinData.radius * 0.9,
            getFillColor: d => {
                if (colorMode === 'senescence') {
                    return senescenceColor(d.senescence_mean);
                }
                const code = d.dominant_celltype;
                const alpha = Math.round(80 + (d.count / maxCount) * 175);
                return [...(CELLTYPE_COLORS[code] || [128, 128, 128]), alpha];
            },
            pickable: true,
            updateTriggers: { getFillColor: [colorMode] },
        });
    }

    // Create centroid labels layer
    function createCentroidLayer(centroids) {
        return new deck.TextLayer({
            id: 'centroids',
            data: centroids,
            getPosition: d => [d.x, d.y],
            getText: d => d.name,
            getSize: 12,
            getColor: [230, 230, 230, 220],
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'center',
            fontFamily: 'system-ui',
            fontWeight: 600,
            outlineWidth: 2,
            outlineColor: [13, 17, 23, 200],
        });
    }

    function getCelltypeColors() { return CELLTYPE_COLORS; }
    function getCelltype2Colors() { return CELLTYPE2_COLORS; }

    return {
        createHeatmapLayer, createScatterLayer, createHexbinLayer,
        createCentroidLayer, senescenceColor, buildPointData,
        getCelltypeColors, getCelltype2Colors,
    };
})();
