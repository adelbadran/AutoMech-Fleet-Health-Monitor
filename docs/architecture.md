# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     AutoMech Dashboard (React)                   │
│  Live Monitoring │ Predictive Diagnostics │ Fleet Analytics     │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST + SSE
┌────────────────────────────▼────────────────────────────────────┐
│                   Express API (dashboard/server.ts)              │
│  /api/health  /api/eda  /api/models  /api/upload  /api/stream   │
└────────────────────────────┬────────────────────────────────────┘
                             │ subprocess
┌────────────────────────────▼────────────────────────────────────┐
│              Python Inference (src/inference/run_inference.py)     │
│  Rolling features → IF score → LSTM error → Fuzzy fusion          │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                        artifacts/                                  │
│  isolation_forest_model.pkl │ LSTM_autoencoder_model.pth          │
│  robust_scaler.pkl │ min_max_scaler.pkl │ fuzzy_model_config.json  │
└───────────────────────────────────────────────────────────────────┘
```

## ML Pipeline Detail

### Feature Engineering
- **Window size:** 10 timesteps
- **Per sensor:** rolling mean, rolling std, first difference
- **IF input:** 56 engineered features (14 sensors × 4 transforms)
- **LSTM input:** 14 scaled sensors, sequences of length 10

### Model 1 — Isolation Forest
- `RobustScaler` + 200 trees
- Contamination tuned to dataset fault rate (~2%)
- Output: anomaly score (higher = more anomalous)

### Model 2 — LSTM AutoEncoder
- Encoder: LSTM(64) → LSTM(16)
- Decoder: LSTM(16) → LSTM(64) → Linear
- Output: mean absolute reconstruction error

### Model 3 — Fuzzy Logic Fusion
- Normalizes IF and LSTM scores to [0, 1] using calibration percentiles
- Triangular membership functions (low / medium / high)
- Weighted rule base with LSTM weight = 3.5
- **Decision threshold:** 0.9347

### Subsystem Diagnosis
Heuristic bounds check on 14 sensors maps anomalies to:
Engine · Battery · Brakes · Suspension · Oil system

## Data Flow (Upload → Live Stream)

1. User uploads CSV via dashboard
2. Express saves file, calls `run_inference.py`
3. Python returns JSON with per-row predictions
4. Server streams rows over SSE with configurable playback speed
5. React updates telemetry charts, 3D model status, activity log

## Repository Layout Rationale

| Folder | Purpose |
|--------|---------|
| `notebooks/` | Reproducible research & training steps |
| `src/train/` | Export production-ready artifacts |
| `src/inference/` | Single entry point for scoring |
| `src/scripts/` | Offline JSON generators for dashboard |
| `artifacts/` | Versioned model outputs (binaries via LFS) |
| `dashboard/` | Self-contained web app |
