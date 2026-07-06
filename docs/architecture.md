# Pipeline Architecture Design

## 1. System Overview

AutoMech is a three-tier system: **data & ML pipeline** (Python), **inference API** (Python subprocess), and **live dashboard** (React + Express).

```mermaid
flowchart TB
    subgraph DataLayer["Data Layer"]
        RAW["Raw CSV<br/>604k rows · 14 sensors"]
        CLEAN["Cleaned Dataset<br/>data/processed/"]
        RAW --> PRE["01 Preprocessing"]
        PRE --> CLEAN
    end

    subgraph MLPipeline["ML Pipeline (Offline Training)"]
        EDA["02 EDA"]
        IF["03 Isolation Forest"]
        LSTM["04 LSTM AutoEncoder"]
        FUZZY["05 Fuzzy Fusion"]
        CLEAN --> EDA
        CLEAN --> IF
        CLEAN --> LSTM
        IF --> FUZZY
        LSTM --> FUZZY
        FUZZY --> ART["artifacts/"]
    end

    subgraph Runtime["Runtime (Online Inference)"]
        DASH["React Dashboard"]
        API["Express API<br/>:5001"]
        INF["run_inference.py"]
        DASH <-->|REST + SSE| API
        API -->|subprocess| INF
        INF --> ART
    end
```

---

## 2. End-to-End Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    AutoMech Dashboard (React + Vite)                      │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────────────────┐ │
│  │ Live Monitor│  │ AI Diagnostics   │  │ Fleet Analytics (EDA)        │ │
│  │ 3D Twin     │  │ Model Metrics    │  │ Interactive Charts         │ │
│  └─────────────┘  └──────────────────┘  └────────────────────────────┘ │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │  REST  /api/*  ·  SSE  /api/stream
┌───────────────────────────────▼──────────────────────────────────────────┐
│                     Express.js Backend (dashboard/server.ts)              │
│  /api/health  ·  /api/eda  ·  /api/models  ·  /api/upload  ·  /api/stream│
└───────────────────────────────┬──────────────────────────────────────────┘
                                │  python src/inference/run_inference.py
┌───────────────────────────────▼──────────────────────────────────────────┐
│                         Python Inference Engine                           │
│  Rolling Features → IF Score → LSTM Error → Fuzzy Risk → Subsystem Tag   │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────────┐
│                            artifacts/                                     │
│  isolation_forest_model.pkl  ·  LSTM_autoencoder_model.pth               │
│  robust_scaler.pkl  ·  min_max_scaler.pkl  ·  fuzzy_model_config.json    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. ML Pipeline — Stage by Stage

```mermaid
flowchart LR
    subgraph Stage0["Stage 0 · Preprocessing"]
        S0A["Load raw CSV"]
        S0B["Handle missing values"]
        S0C["Smooth outliers"]
        S0D["Export cleaned CSV"]
        S0A --> S0B --> S0C --> S0D
    end

    subgraph Stage1["Stage 1 · EDA"]
        S1A["Distribution analysis"]
        S1B["Fault rate & correlation"]
        S1C["Sensor importance"]
        S1A --> S1B --> S1C
    end

    subgraph Stage2["Stage 2 · Isolation Forest"]
        S2A["Rolling features<br/>window=10"]
        S2B["RobustScaler"]
        S2C["IF 200 trees"]
        S2D["PR threshold tune"]
        S2A --> S2B --> S2C --> S2D
    end

    subgraph Stage3["Stage 3 · LSTM AutoEncoder"]
        S3A["MinMaxScaler"]
        S3B["Sliding windows<br/>10 × 14"]
        S3C["Train 15 epochs"]
        S3D["3σ threshold"]
        S3A --> S3B --> S3C --> S3D
    end

    subgraph Stage4["Stage 4 · Fuzzy Fusion"]
        S4A["Percentile normalize"]
        S4B["Membership functions"]
        S4C["Weighted rules"]
        S4D["Auto-tune threshold"]
        S4A --> S4B --> S4C --> S4D
    end

    Stage0 --> Stage1
    Stage0 --> Stage2
    Stage0 --> Stage3
    Stage2 --> Stage4
    Stage3 --> Stage4
```

---

## 4. Feature Engineering

### Isolation Forest Path (Tabular)

| Transform | Per Sensor | Total Features |
|-----------|-----------|----------------|
| Raw value | 14 | 14 |
| Rolling mean (w=10) | 14 | 14 |
| Rolling std (w=10) | 14 | 14 |
| First difference | 14 | 14 |
| **Total** | | **56** |

- Scaler: `RobustScaler` (median/IQR based)
- Split: 60% train · 20% validation · 20% test (stratified)

### LSTM AutoEncoder Path (Sequential)

| Property | Value |
|----------|-------|
| Input shape | `(batch, 10, 14)` |
| Scaler | `MinMaxScaler` fit on first 80% chronologically |
| No manual feature engineering | Raw scaled sensors only |

---

## 5. Model Architecture Detail

### Isolation Forest

```
56 features → RobustScaler → IsolationForest(n=200, contamination=2.03%)
                                    ↓
                          anomaly score (higher = more anomalous)
                                    ↓
                    threshold = −0.2137 (PR-curve optimized)
```

### LSTM AutoEncoder

```
(10, 14) ──► LSTM(64) ──► LSTM(16) ──► latent
                ▲                           │
                └──── LSTM(16) ◄── LSTM(64) ◄┘
                              │
                         Linear(14)
                              ↓
                    reconstruction error (MAE)
                              ↓
              threshold = mean(train_errors) + 3σ = 0.01156
```

### Fuzzy Logic Fusion

```
IF score ──► percentile scale [0,1] ──► membership (low/med/high) ──┐
                                                                       ├──► weighted Sugeno rules ──► risk score [0,1]
LSTM error ► percentile scale [0,1] ──► membership (low/med/high) ──┘
                                              ↓
                              final_prediction = risk ≥ 0.9347
```

**Key fusion parameters**

| Parameter | Value |
|-----------|-------|
| LSTM weight in rules | 3.5× |
| Membership low breakpoint | 0.20 |
| Membership high breakpoint | 0.75 |
| IF calibration percentiles | P1–P99 |
| LSTM calibration percentiles | P1–P99 |
| Decision threshold | 0.9347 |

---

## 6. Inference Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Dashboard as React Dashboard
    participant API as Express API
    participant Py as run_inference.py
    participant Art as artifacts/

    User->>Dashboard: Upload CSV / Start stream
    Dashboard->>API: POST /api/upload
    API->>Py: subprocess (CSV path)
    Py->>Art: Load models & config
    Py->>Py: Rolling features + scale
    Py->>Py: IF score → LSTM error → Fuzzy risk
    Py-->>API: JSON predictions
    API-->>Dashboard: SSE stream (row-by-row)
    Dashboard->>Dashboard: Update charts, 3D twin, alerts
```

### Per-Row Inference Steps

1. **Buffer** last 10 rows for rolling features and LSTM sequence
2. **Scale** with persisted `RobustScaler` / `MinMaxScaler`
3. **Score** with Isolation Forest → raw IF anomaly score
4. **Reconstruct** with LSTM → MAE reconstruction error
5. **Normalize** both scores using fuzzy config percentiles
6. **Fuse** via fuzzy rules → `final_risk_score`
7. **Classify** anomaly if score ≥ 0.9347
8. **Diagnose** subsystem via heuristic sensor bounds (Engine, Battery, Brakes, Suspension, Oil)

---

## 7. Repository Layout

| Folder | Purpose |
|--------|---------|
| `data/raw/` | Original telemetry CSV (from Google Drive) |
| `data/processed/` | Cleaned dataset (gitignored) |
| `data/samples/` | Demo CSVs for inference testing |
| `notebooks/` | Reproducible research — one notebook per pipeline stage |
| `src/train/` | Export production-ready artifacts |
| `src/inference/` | Single entry point for scoring |
| `src/scripts/` | Offline JSON generators (EDA, model summary) |
| `artifacts/` | Trained models, scalers, fuzzy config, metrics JSON |
| `dashboard/` | Self-contained React + Express web app |
| `docs/` | Architecture, model card, tuning results |

---

## 8. Design Decisions

| Decision | Why |
|----------|-----|
| **Hybrid ensemble** (IF + LSTM + Fuzzy) | IF catches statistical outliers; LSTM catches temporal drift; fuzzy reduces disagreement false positives |
| **Unsupervised base models** | Fault labels are sparse; models learn "normal" behavior rather than memorizing fault types |
| **PR-curve thresholds** | Accuracy is misleading on 98% normal data; F1 on anomaly class drives tuning |
| **Chronological LSTM split** | Prevents temporal leakage in sequence model |
| **Stratified IF split** | Ensures enough anomaly samples in test set for reliable evaluation |
| **Python subprocess inference** | Keeps ML stack in Python while dashboard stays Node/React |
| **SSE streaming** | Simulates live telemetry playback for demo UX |

---

## Related Docs

- [Model Fine-Tuning & Results](model-tuning-results.md)
- [Model Card](model-card.md)
