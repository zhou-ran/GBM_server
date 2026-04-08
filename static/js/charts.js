/**
 * charts.js — Canvas-based analysis charts: waterfall plot and correlation heatmap.
 */
const Charts = (() => {
    let onGeneClick = null;

    function initWaterfall(deResults, onGeneSelect) {
        onGeneClick = onGeneSelect;
        const select = document.getElementById('de-celltype');
        select.innerHTML = '';
        Object.keys(deResults).forEach(ct => {
            const opt = document.createElement('option');
            opt.value = ct;
            opt.textContent = ct;
            select.appendChild(opt);
        });
        select.addEventListener('change', () => drawWaterfall(deResults[select.value]));

        // Draw first cell type
        const firstCt = Object.keys(deResults)[0];
        if (firstCt) drawWaterfall(deResults[firstCt]);
    }

    function drawWaterfall(genes) {
        const canvas = document.getElementById('waterfall-canvas');
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const pad = { top: 20, bottom: 40, left: 50, right: 10 };

        ctx.fillStyle = '#161b22';
        ctx.fillRect(0, 0, W, H);

        if (!genes || genes.length === 0) return;

        // Sort by logfc
        const sorted = [...genes].sort((a, b) => b.logfc - a.logfc);
        const n = Math.min(sorted.length, 40);
        const data = sorted.slice(0, n);

        const maxAbs = Math.max(...data.map(d => Math.abs(d.logfc)), 0.1);
        const barW = (W - pad.left - pad.right) / n;
        const scaleY = (H - pad.top - pad.bottom) / (maxAbs * 2);
        const zeroY = pad.top + (H - pad.top - pad.bottom) / 2;

        // Axis
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad.left, zeroY);
        ctx.lineTo(W - pad.right, zeroY);
        ctx.stroke();

        // Y axis label
        ctx.fillStyle = '#8b949e';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(`+${maxAbs.toFixed(1)}`, pad.left - 4, pad.top + 10);
        ctx.fillText(`-${maxAbs.toFixed(1)}`, pad.left - 4, H - pad.bottom);
        ctx.fillText('log2FC', pad.left - 4, zeroY - 4);

        // Store bar positions for click detection
        canvas._barData = [];

        data.forEach((d, i) => {
            const x = pad.left + i * barW + 1;
            const barH = d.logfc * scaleY;
            const y = d.logfc >= 0 ? zeroY - barH : zeroY;
            const h = Math.abs(barH);

            // Color: up=red, down=blue
            ctx.fillStyle = d.logfc >= 0
                ? `rgba(255, 100, 50, ${Math.min(0.4 + Math.abs(d.logfc) / maxAbs * 0.6, 1)})`
                : `rgba(80, 160, 255, ${Math.min(0.4 + Math.abs(d.logfc) / maxAbs * 0.6, 1)})`;
            ctx.fillRect(x, y, barW - 2, h);

            canvas._barData.push({ gene: d.gene, x, w: barW - 2, logfc: d.logfc });

            // Gene name (rotated)
            ctx.save();
            ctx.translate(x + barW / 2, H - pad.bottom + 4);
            ctx.rotate(Math.PI / 3);
            ctx.fillStyle = '#e6edf3';
            ctx.font = '9px system-ui';
            ctx.textAlign = 'left';
            ctx.fillText(d.gene, 0, 0);
            ctx.restore();
        });

        // Click handler
        canvas.onclick = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (W / rect.width);
            const bar = canvas._barData.find(b => mx >= b.x && mx <= b.x + b.w);
            if (bar && onGeneClick) onGeneClick(bar.gene);
        };
    }

    function drawCorrelation(corrData) {
        const canvas = document.getElementById('correlation-canvas');
        const ctx = canvas.getContext('2d');
        const labels = corrData.labels;
        const matrix = corrData.matrix;
        const n = labels.length;

        const pad = { top: 10, bottom: 80, left: 100, right: 10 };
        const W = canvas.width;
        const H = canvas.height;
        const cellW = (W - pad.left - pad.right) / n;
        const cellH = (H - pad.top - pad.bottom) / n;

        ctx.fillStyle = '#161b22';
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const val = matrix[i][j];
                const x = pad.left + j * cellW;
                const y = pad.top + i * cellH;

                // Blue-white-red diverging
                if (val >= 0) {
                    const t = val;
                    ctx.fillStyle = `rgb(${Math.round(220 + 35 * t)}, ${Math.round(220 - 180 * t)}, ${Math.round(220 - 200 * t)})`;
                } else {
                    const t = -val;
                    ctx.fillStyle = `rgb(${Math.round(220 - 180 * t)}, ${Math.round(220 - 160 * t)}, ${Math.round(220 + 35 * t)})`;
                }
                ctx.fillRect(x, y, cellW - 0.5, cellH - 0.5);
            }
        }

        // Labels
        ctx.fillStyle = '#8b949e';
        ctx.font = '8px system-ui';

        // Bottom labels (rotated)
        for (let j = 0; j < n; j++) {
            ctx.save();
            ctx.translate(pad.left + j * cellW + cellW / 2, H - pad.bottom + 4);
            ctx.rotate(Math.PI / 3);
            ctx.textAlign = 'left';
            ctx.fillText(labels[j], 0, 0);
            ctx.restore();
        }

        // Left labels
        ctx.textAlign = 'right';
        for (let i = 0; i < n; i++) {
            ctx.fillText(labels[i], pad.left - 4, pad.top + i * cellH + cellH / 2 + 3);
        }
    }

    function initTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            });
        });
    }

    return { initWaterfall, drawCorrelation, initTabs };
})();
