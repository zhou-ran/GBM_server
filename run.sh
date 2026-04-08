#!/bin/bash
# Launch GBM Senescence Atlas web server
set -e

cd "$(dirname "$0")"

# Activate conda environment
eval "$(conda shell.bash hook)"
conda activate web

# Run preprocessing if needed
if [ ! -f data/processed/coords.bin ]; then
    echo "Preprocessed data not found. Running preprocessing pipeline..."
    python preprocess/run_all.py
fi

# Start server
echo "Starting GBM Senescence Atlas on http://0.0.0.0:8050"
uvicorn server.app:app --host 0.0.0.0 --port 8050 --workers 1
