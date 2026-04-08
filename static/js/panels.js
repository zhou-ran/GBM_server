/**
 * panels.js — Patient matrix table and split view controls.
 */
const Panels = (() => {
    let selectedDonor = null;
    let onDonorSelect = null;

    function initPatientPanel(patients, schema, onSelect) {
        onDonorSelect = onSelect;
        const tbody = document.getElementById('patient-tbody');
        const countEl = document.getElementById('patient-count');
        countEl.textContent = `(${patients.length})`;

        // Sort by cell count descending
        const sorted = [...patients].sort((a, b) => b.n_cells - a.n_cells);

        tbody.innerHTML = '';
        sorted.forEach(p => {
            const tr = document.createElement('tr');
            tr.dataset.donorId = p.donor_id;
            tr.innerHTML = `
                <td>${p.donor_id}</td>
                <td>${p.n_cells.toLocaleString()}</td>
                <td>${p.IDH}</td>
                <td>${p.age > 0 ? p.age : '?'}</td>
                <td>${p.senescence_mean.toFixed(2)}</td>
            `;
            tr.addEventListener('click', () => selectDonor(tr, p, schema));
            tbody.appendChild(tr);
        });

        // Search filter
        document.getElementById('patient-search').addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            tbody.querySelectorAll('tr').forEach(tr => {
                tr.style.display = tr.dataset.donorId.toLowerCase().includes(q) ? '' : 'none';
            });
        });
    }

    function selectDonor(tr, patient, schema) {
        const tbody = document.getElementById('patient-tbody');

        if (selectedDonor === patient.donor_id) {
            // Deselect
            selectedDonor = null;
            tbody.querySelectorAll('tr.selected').forEach(r => r.classList.remove('selected'));
            Filters.clearDonorHighlight();
            return;
        }

        selectedDonor = patient.donor_id;
        tbody.querySelectorAll('tr.selected').forEach(r => r.classList.remove('selected'));
        tr.classList.add('selected');

        // Find donor index in schema
        const donorCol = schema.columns.find(c => c.name === 'donor_id');
        if (donorCol) {
            const donorIdx = donorCol.categories.indexOf(patient.donor_id);
            if (donorIdx >= 0) {
                Filters.rebuildMask(); // Reset to current filter state
                Filters.highlightDonor(donorIdx);
            }
        }

        if (onDonorSelect) onDonorSelect(patient);
    }

    // Split view: show two deck.gl viewports side by side
    let splitMode = false;

    function initSplitView() {
        const btn = document.getElementById('split-toggle');
        const controls = document.getElementById('split-controls');
        controls.style.display = 'block';

        btn.addEventListener('click', () => {
            splitMode = !splitMode;
            btn.textContent = splitMode ? 'Merge View' : 'Split View';
            document.getElementById('split-label').textContent =
                splitMode ? 'Malignant | Microglia' : '';

            if (onDonorSelect) onDonorSelect(null); // Trigger re-render
        });
    }

    function isSplitMode() { return splitMode; }
    function getSelectedDonor() { return selectedDonor; }

    return { initPatientPanel, initSplitView, isSplitMode, getSelectedDonor };
})();
