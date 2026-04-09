/**
 * filters.js — Filter panel logic and filter mask management.
 * Builds UI controls from schema, maintains a Uint8Array filter mask.
 */
const Filters = (() => {
    let filterMask = null;  // Uint8Array, 1=visible, 0=hidden
    let activeFilters = {}; // { columnName: Set of active category indices }
    let columnValues = {};
    let onChangeCallback = null;

    // Filterable columns (first 6 uint8 columns in schema)
    const FILTER_COLS = ['CellType', 'CellType_Level2', 'IDH', 'stage', 'age_Group5565', 'sex'];

    function init(schema, onChange) {
        onChangeCallback = onChange;
        const nCells = schema.n_cells;
        filterMask = new Uint8Array(nCells).fill(1);
        activeFilters = {};
        columnValues = {};

        const container = document.getElementById('filter-controls');
        container.innerHTML = '';

        schema.columns.forEach((col, colIdx) => {
            if (!FILTER_COLS.includes(col.name)) return;
            if (col.dtype === 'uint16') return;
            columnValues[col.name] = DataStore.getMetaColumn(col.name);

            // Initialize all categories as active
            activeFilters[col.name] = new Set(col.categories.map((_, i) => i));

            const group = document.createElement('div');
            group.className = 'filter-group';
            group.innerHTML = `<label>${col.name.replace('_', ' ')}</label>`;

            const chips = document.createElement('div');
            chips.className = 'filter-checkboxes';

            col.categories.forEach((cat, catIdx) => {
                const chip = document.createElement('span');
                chip.className = 'filter-chip active';
                chip.textContent = cat;
                chip.dataset.col = col.name;
                chip.dataset.colIdx = colIdx;
                chip.dataset.catIdx = catIdx;
                chip.addEventListener('click', () => toggleChip(chip, col.name, catIdx));
                chips.appendChild(chip);
            });

            group.appendChild(chips);
            container.appendChild(group);
        });
    }

    function toggleChip(chip, colName, catIdx) {
        const set = activeFilters[colName];
        if (set.has(catIdx)) {
            set.delete(catIdx);
            chip.classList.remove('active');
        } else {
            set.add(catIdx);
            chip.classList.add('active');
        }
        rebuildMask();
    }

    function rebuildMask() {
        const schema = DataStore.getSchema();
        const nCells = schema.n_cells;

        filterMask.fill(1);

        schema.columns.forEach((col, colIdx) => {
            if (!FILTER_COLS.includes(col.name)) return;
            if (col.dtype === 'uint16') return;

            const active = activeFilters[col.name];
            if (!active || active.size === col.n_categories) return; // All active = no filter

            const values = columnValues[col.name] || DataStore.getMetaColumn(col.name);
            for (let i = 0; i < nCells; i++) {
                if (filterMask[i] && !active.has(values[i])) {
                    filterMask[i] = 0;
                }
            }
        });

        if (onChangeCallback) onChangeCallback();
    }

    function getMask() { return filterMask; }

    function getFilteredCount() {
        if (!filterMask) return 0;
        let count = 0;
        for (let i = 0; i < filterMask.length; i++) {
            if (filterMask[i]) count++;
        }
        return count;
    }

    function hasActiveFilters() {
        const schema = DataStore.getSchema();
        return schema.columns.some((col) => {
            if (!FILTER_COLS.includes(col.name) || col.dtype === 'uint16') return false;
            const active = activeFilters[col.name];
            return active && active.size !== col.n_categories;
        });
    }

    // Highlight cells belonging to a specific donor
    function highlightDonor(donorIdx) {
        const donorCodes = DataStore.getMetaColumn('donor_id');
        if (!donorCodes) return;

        // Apply donor filter on top of existing filters
        for (let i = 0; i < donorCodes.length; i++) {
            if (donorCodes[i] !== donorIdx) {
                filterMask[i] = 0;
            }
        }
        if (onChangeCallback) onChangeCallback();
    }

    function clearDonorHighlight() {
        rebuildMask();
    }

    return {
        init, getMask, getFilteredCount, highlightDonor, clearDonorHighlight,
        rebuildMask, hasActiveFilters,
    };
})();
