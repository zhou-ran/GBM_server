#!/bin/bash
# Launch GBM Senescence Atlas — production mode (backend only, serves built frontend)
set -e

cd "$(dirname "$0")"

# Activate conda environment
eval "$(conda shell.bash hook)"
conda activate web

# Run preprocessing if needed
if [ ! -f data/processed/coords.bin ]; then
    echo "Preprocessed data not found. Running preprocessing pipeline..."
    python preprocess/run_all.py
elif [ -f preprocess/validate_outputs.py ] && ! python preprocess/validate_outputs.py; then
    echo "Preprocessed outputs inconsistent. Re-running..."
    python preprocess/run_all.py
fi

# Build frontend if dist doesn't exist
if [ ! -d frontend/dist ]; then
    echo "Building frontend..."
    cd frontend && npm install --silent && npm run build && cd ..
fi

# Install backend
pip install -e ./backend -q 2>/dev/null || true

# Start server
echo "Starting GBM Senescence Atlas on http://0.0.0.0:8050"
uvicorn backend.server.app:app --host 0.0.0.0 --port 8050 --workers 1
