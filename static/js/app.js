/**
 * app.js — Main orchestrator: deck.gl init, state management, wiring.
 */
(async function() {
    const loadingText = document.getElementById('loading-text');
    const loadingOverlay = document.getElementById('loading-overlay');
    const downsampleToggle = document.getElementById('downsample-toggle');
    const splitControls = document.getElementById('split-controls');

    // Hide unfinished experimental UI until the backing data flow is completed.
    if (downsampleToggle) {
        downsampleToggle.closest('.toggle-item').hidden = true;
    }
    if (splitControls) {
        splitControls.hidden = true;
    }

    try {
        await DataStore.loadAll(msg => { loadingText.textContent = msg; });
    } catch (error) {
        loadingText.textContent = `Failed to load atlas data: ${error.message}`;
        throw error;
    }

    const schema = DataStore.getSchema();
    const coords = DataStore.getCoords();
    const senescence = DataStore.getSenescence();
    const nCells = DataStore.getNCells();
    const cellTypeCodes = DataStore.getMetaColumn('CellType');
    const cellType2Codes = DataStore.getMetaColumn('CellType_Level2');

    // State
    let colorMode = 'celltype';
    let currentGeneExpr = null;
    let currentGeneName = null;
    let viewState = {
        target: [
            (schema.umap_bounds.xmin + schema.umap_bounds.xmax) / 2,
            (schema.umap_bounds.ymin + schema.umap_bounds.ymax) / 2,
            0
        ],
        zoom: 3,
        minZoom: 0,
        maxZoom: 20,
    };

    // Initialize filters
    Filters.init(schema, onFilterChange);

    // Initialize deck.gl
    const deckgl = new deck.DeckGL({
        container: 'deck-canvas',
        views: new deck.OrthographicView(),
        initialViewState: viewState,
        controller: true,
        onViewStateChange: ({viewState: vs}) => {
            viewState = vs;
            updateLayers();
            return vs;
        },
        getTooltip: ({object}) => {
            if (!object || object.index === undefined) return null;
            const i = object.index;
            const ct = schema.columns[0].categories[cellTypeCodes ? cellTypeCodes[i] : -1] || 'Unknown';
            const ct2 = schema.columns[1].categories[cellType2Codes ? cellType2Codes[i] : -1] || 'Unknown';
            const sen = senescence[i].toFixed(3);
            return {
                html: `<b>${ct}</b> (${ct2})<br>Senescence: ${sen}`,
                style: {
                    backgroundColor: '#21262d',
                    color: '#e6edf3',
                    fontSize: '12px',
                    padding: '6px 10px',
                    borderRadius: '4px',
                }
            };
        },
    });

    // Estimate visible cells from viewport
    function estimateVisibleCells() {
        const canvas = document.getElementById('deck-canvas');
        if (!canvas) return nCells;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const zoom = viewState.zoom || 3;
        const scale = Math.pow(2, zoom);
        const halfW = (w / 2) / scale;
        const halfH = (h / 2) / scale;
        const cx = viewState.target[0];
        const cy = viewState.target[1];
        const xmin = cx - halfW;
        const xmax = cx + halfW;
        const ymin = cy - halfH;
        const ymax = cy + halfH;

        return DataStore.countInBounds(xmin, xmax, ymin, ymax, Filters.getMask(), 50001);
    }

    // Update layers based on zoom level and filters
    function updateLayers() {
        const mask = Filters.getMask();
        const visibleCount = estimateVisibleCells();
        const filteredCount = Filters.getFilteredCount();

        // Update stats
        document.getElementById('stat-total').textContent = nCells.toLocaleString();
        document.getElementById('stat-filtered').textContent = filteredCount.toLocaleString();
        document.getElementById('stat-visible').textContent =
            visibleCount > 50000 ? '50,000+' : visibleCount.toLocaleString();

        let layers = [];

        if (visibleCount < 5000) {
            // Detail mode: scatter plot
            document.getElementById('stat-mode').textContent = 'Detail';
            layers.push(Layers.createScatterLayer(
                coords, cellTypeCodes, cellType2Codes, senescence, mask, colorMode, currentGeneExpr
            ));
        } else if (!Filters.hasActiveFilters() && colorMode !== 'gene' && DataStore.getHexbin()) {
            document.getElementById('stat-mode').textContent = 'Overview';
            layers.push(Layers.createHexbinLayer(DataStore.getHexbin(), colorMode));
        } else {
            // Density mode: heatmap
            document.getElementById('stat-mode').textContent = 'Density';
            layers.push(Layers.createHeatmapLayer(coords, senescence, mask, colorMode, currentGeneExpr));
        }

        // Always show centroid labels
        layers.push(Layers.createCentroidLayer(DataStore.getCentroids()));

        deckgl.setProps({ layers });
    }

    function onFilterChange() {
        updateLayers();
        updateLegend();
    }

    // Color mode selector
    document.getElementById('color-mode').addEventListener('change', (e) => {
        colorMode = e.target.value;
        document.getElementById('gene-search-box').style.display =
            colorMode === 'gene' ? 'flex' : 'none';
        updateLayers();
        updateLegend();
    });

    // Gene expression loading
    document.getElementById('gene-load-btn').addEventListener('click', loadGene);
    document.getElementById('gene-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') loadGene();
    });

    async function loadGene(geneName) {
        const name = geneName || document.getElementById('gene-input').value.trim().toUpperCase();
        if (!name) return;
        loadingOverlay.classList.remove('hidden');
        loadingText.textContent = `Loading ${name} expression...`;
        const expr = await DataStore.loadGene(name);
        loadingOverlay.classList.add('hidden');
        if (expr) {
            currentGeneExpr = expr;
            currentGeneName = name;
            colorMode = 'gene';
            document.getElementById('color-mode').value = 'gene';
            document.getElementById('gene-search-box').style.display = 'flex';
            document.getElementById('gene-input').value = name;
            updateLayers();
            updateLegend();
        } else {
            alert(`Gene "${name}" not found.`);
        }
    }

    // Legend
    function updateLegend() {
        const el = document.getElementById('legend-content');
        el.innerHTML = '';

        if (colorMode === 'celltype') {
            const colors = Layers.getCelltypeColors();
            schema.columns[0].categories.forEach((cat, i) => {
                const c = colors[i] || [128, 128, 128];
                el.innerHTML += `<div class="legend-item">
                    <span class="legend-swatch" style="background:rgb(${c.join(',')})"></span>
                    <span>${cat}</span></div>`;
            });
        } else if (colorMode === 'celltype2') {
            const colors = Layers.getCelltype2Colors();
            schema.columns[1].categories.forEach((cat, i) => {
                const c = colors[i] || [128, 128, 128];
                el.innerHTML += `<div class="legend-item">
                    <span class="legend-swatch" style="background:rgb(${c.join(',')})"></span>
                    <span>${cat}</span></div>`;
            });
        } else if (colorMode === 'senescence' || colorMode === 'gene') {
            const label = colorMode === 'gene' && currentGeneName ? currentGeneName : 'Senescence';
            el.innerHTML = `
                <div class="legend-item">
                    <div style="width:120px;height:12px;border-radius:2px;
                        background:linear-gradient(to right, rgb(30,60,180), rgb(255,240,50), rgb(255,40,0))">
                    </div>
                </div>
                <div class="legend-item" style="justify-content:space-between;width:120px;">
                    <span style="font-size:10px">Low</span>
                    <span style="font-size:10px">${label}</span>
                    <span style="font-size:10px">High</span>
                </div>`;
        }
    }

    // Initialize Phase 2: Patient panel
    Panels.initPatientPanel(DataStore.getPatients(), schema, (patient) => {
        updateLayers();
    });
    Panels.initSplitView();

    // Initialize Phase 3: Charts
    Charts.initTabs();
    Charts.initWaterfall(DataStore.getDEResults(), (geneName) => {
        loadGene(geneName);
    });
    Charts.drawCorrelation(DataStore.getCorrelation());

    // Initial render
    updateLayers();
    updateLegend();

    // Hide loading
    loadingOverlay.classList.add('hidden');
})();
