# =============================================================================
# Soundtrack My Night — AI Service Dockerfile
# Python 3.12 + FastAPI + Uvicorn + OpenAI + Spotify (requests)
# =============================================================================
# Single-stage image (Python services don't benefit as much from multi-stage).
# Non-root user. Health check via Python urllib.
# =============================================================================

FROM python:3.12-slim

# ── System dependencies ────────────────────────────────────────────────────────
# gcc/build tools are NOT needed — all packages are pure Python or have wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    && rm -rf /var/lib/apt/lists/*

# ── Non-root user ─────────────────────────────────────────────────────────────
RUN groupadd -r appgroup && useradd -r -g appgroup -m -d /home/appuser appuser

WORKDIR /app

# ── Python dependencies ────────────────────────────────────────────────────────
# Copy requirements first to maximise Docker layer cache
COPY requirements.txt ./

# Install with --no-cache-dir to keep image size minimal
RUN pip install --no-cache-dir -r requirements.txt

# ── Application source ─────────────────────────────────────────────────────────
COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 8000

# Health check calls the existing GET / endpoint (returns {"status":"ok"})
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/')" || exit 1

# Run with uvicorn in production mode (no --reload)
# Workers=1 is correct for stateless FastAPI with async run_in_threadpool usage
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
