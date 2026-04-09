
#!/usr/bin/env bash
# Start the GBM Senescence Atlas — new React + Arrow architecture.
# Launches backend (FastAPI, port 8050) and frontend (Vite dev, port 5174).
set -euo pipefail

CONDA_ENV="${CONDA_ENV:-web}"
ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT"

echo "=== GBM Senescence Atlas (dev mode) ==="
echo "Root      : $ROOT"
echo "Backend   : http://0.0.0.0:8050"
echo "Frontend  : http://0.0.0.0:5174"

# --- Conda ---
echo "=== Activating conda environment ==="
eval "$(conda shell.bash hook)"
conda activate "$CONDA_ENV"

# --- Preprocessing check ---
echo "=== Checking preprocessing outputs ==="
if [ ! -f data/processed/coords.bin ]; then
    echo "Preprocessed data not found. Running preprocessing pipeline..."
    python preprocess/run_all.py
elif [ -f preprocess/validate_outputs.py ] && ! python preprocess/validate_outputs.py; then
    echo "Preprocessed outputs inconsistent. Re-running..."
    python preprocess/run_all.py
fi

# --- Backend ---
echo "=== Starting backend (port 8050) ==="
pip install -e ./backend -q 2>/dev/null || true
uvicorn backend.server.app:app --host 0.0.0.0 --port 8050 --reload &
BACKEND_PID=$!

# --- Frontend ---
echo "=== Starting frontend (port 5174) ==="
cd "$ROOT/frontend"
npm install --silent 2>/dev/null || true
npx vite --host 0.0.0.0 --port 5174 &
FRONTEND_PID=$!

cd "$ROOT"

# --- Cleanup on exit ---
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM EXIT

echo "=== Ready! Open http://0.0.0.0:5174 ==="
wait
