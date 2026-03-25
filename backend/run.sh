#!/bin/bash
set -e

cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Run the server
uvicorn app.main:app --reload --port 8000
