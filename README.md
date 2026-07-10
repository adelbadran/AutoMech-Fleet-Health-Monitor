# AutoMech Fleet Health Monitor

> **AI-Powered Predictive Maintenance for Fleet Vehicles**  
> A 3-stage hybrid ML pipeline — Isolation Forest, LSTM AutoEncoder, and Fuzzy Logic Fusion — with a live React dashboard and 3D digital twin.  
> **DEPI R4 · Microsoft ML Program · 2026**

![Live Dashboard](docs/images/dashboard-live.png)

---

## About the Project

**AutoMech Fleet Health Monitor** is an end-to-end AI system for fleet predictive maintenance. It ingests multivariate vehicle telemetry from **14 sensor channels**, runs real-time anomaly detection through a hybrid ML pipeline, and delivers operator-ready diagnostics through an interactive dashboard with a 3D digital twin.

### The Problem

Fleet operators lose time and money when vehicle faults go undetected until breakdown. Manual inspections and fixed maintenance schedules cannot reliably identify emerging faults. The core challenge is detecting faults early **without flooding operators with false alarms** — excessive false positives reduce operator trust and waste maintenance resources.

### Dataset & Sensors

The **Vehicle Health Telemetry Dataset** provides comprehensive vehicle telemetry; fault labels are used primarily for performance evaluation.

| Attribute | Value |
|-----------|-------|
| Observations | 604,802 records (after cleaning) |
| Sensors | 14 continuous telemetry channels |
| Key signals | RPM, Speed, Coolant Temperature, Oil Pressure, Vibration, Engine Load, Fuel Rate, Battery Voltage, Brake Pressure, Acceleration |
| Labels | `Fault_Label`, `Fault_Type` (evaluation only) |

Faults account for **~5.5%** of observations (33,017 fault vs. 571,783 normal). This class imbalance creates an accuracy paradox: a model that always predicts "Normal" achieves high accuracy while catching **zero faults**, while standard unsupervised detectors still flood operators with false alarms.

### Our Approach

We designed a **3-stage hybrid pipeline** where each stage compensates for the weaknesses of the previous one:

| Stage | Model | Strength | Weakness |
|-------|-------|----------|----------|
| 1 | **Isolation Forest** | Fast tabular outlier detection, 91% recall | Low precision (15.8%) |
| 2 | **LSTM AutoEncoder** | Temporal pattern learning, ROC-AUC 0.976 | Still high false positives |
| 3 | **Fuzzy Logic Fusion** | Interpretable risk score, **F1 = 81.5%** | Requires calibrated thresholds |

The fusion layer reduces false positives by **73%** compared to LSTM alone while maintaining **96.7% recall** — delivering the most balanced and reliable detection of the three stages, without sacrificing anomaly detection capability.

### Key Results

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|-------|----------|-----------|--------|-----|---------|
| Isolation Forest | 90.0% | 15.8% | 91.3% | 26.9% | 0.929 |
| LSTM AutoEncoder | 84.7% | 39.7% | 97.8% | 56.4% | 0.976 |
| **Fuzzy Fusion** | **95.5%** | **70.5%** | **96.7%** | **81.5%** | **0.972** |

### What We Built

- **ML Pipeline** — preprocessing, EDA, and 3 model stages across 5 Jupyter notebooks
- **Inference Engine** — offline-trained models deployed for real-time IF → LSTM → Fuzzy scoring
- **Live Dashboard** — Operations Console, Diagnostics Engine, and Analytics Workbench
- **3D Digital Twin** — Three.js vehicle model that reacts to anomaly alerts in real time

**Future work:** extend from anomaly detection to fault diagnosis, with fleet-wide monitoring, edge deployment, and automated retraining.

> Arabic overview: [docs/project-overview-ar.md](docs/project-overview-ar.md)

<p align="center">
  <img src="docs/images/dashboard-ai.png" alt="Predictive Diagnostics" width="48%" />
  <img src="docs/images/dashboard-analytics.png" alt="Fleet Analytics" width="48%" />
</p>

## Features

- **3-stage hybrid pipeline** — Isolation Forest + LSTM AutoEncoder + Fuzzy Logic Fusion
- **14 sensor channels** — engine, electrical, braking, motion, environment
- **Live dashboard** — Operations Console, Diagnostics Engine, Analytics Workbench, and 3D vehicle visualization
- **Predictive diagnostics** — threshold calibration, model performance metrics, real-time inference monitoring
- **Fleet analytics** — full EDA report with interactive charts and data quality assessment

## Project Structure

```
AutoMech-Fleet-Health-Monitor/
├── docs/
├── data/
├── notebooks/
├── src/
├── artifacts/
└── dashboard/
```

## Dataset

The Vehicle Health Telemetry Dataset (~604k rows) is hosted on [Google Drive](https://drive.google.com/drive/folders/15IDy9Y7JEyd4dFFpE2fGYwHHwEV608Va?usp=drive_link). Download the files and place them locally:

| File | Path |
|------|------|
| `Vehicle-Health-Telemetry-Dataset.csv` | `data/raw/` |
| `Cleaned-Vehicle-Health-Telemetry-Dataset.csv` | `data/processed/` |

Processed CSVs are not tracked in git (`data/processed/*.csv` is gitignored). Sample telemetry under `data/samples/` remains in the repository for inference demos.

Training scripts and notebooks expect these local paths — download from Drive before running the ML pipeline or notebooks.

## ML Pipeline

```
Raw CSV → Preprocess → EDA
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
Isolation Forest      LSTM AutoEncoder
(56 tabular features) (10×14 sequences)
    └───────────┬───────────┘
                ↓
        Fuzzy Logic Fusion → Risk Score ≥ 0.9347
                ↓
         Dashboard + Inference API
```

| Stage | Notebook | Model | Role |
|-------|----------|-------|------|
| 0 | `01_data_preprocessing` | — | Clean & smooth raw telemetry |
| 1 | `02_vehicle_health_eda` | — | Exploratory analysis |
| 2 | `03_isolation_forest` | Isolation Forest | Unsupervised anomaly scoring |
| 3 | `04_lstm_autoencoder` | LSTM AutoEncoder | Sequence reconstruction errors |
| 4 | `05_fuzzy_logic_fusion` | Fuzzy Logic | Fuse IF + LSTM → final risk score |

**Production scripts:** `src/train/train_and_save_artifacts.py` · `src/inference/run_inference.py`

Full architecture diagrams: [docs/architecture.md](docs/architecture.md) · Tuning details: [docs/model-tuning-results.md](docs/model-tuning-results.md)

## Quick Start

```bash
git clone https://github.com/adelbadran/AutoMech-Fleet-Health-Monitor.git
cd AutoMech-Fleet-Health-Monitor

py -3.10 -m venv .venv
.venv\Scripts\activate

pip install -r requirements.txt
python src/train/train_and_save_artifacts.py
python src/scripts/generate_eda_summary.py
python src/scripts/generate_model_summary.py
python src/inference/run_inference.py data/samples/test_healthy.csv

cd dashboard
cp .env.example .env
npm install
npm run dev
```

- Dashboard: http://localhost:3000  
- API: http://localhost:5001

## Demo Data

| File | Expected result (default threshold) |
|------|-------------------------------------|
| `test_healthy.csv` | 0 anomalies |
| `test_fault.csv` | All rows flagged |
| `test_mixed.csv` | Partial anomalies |

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| ML | Python, scikit-learn, PyTorch, pandas, scipy |
| Backend | Express.js, Python subprocess inference |
| Frontend | React, TypeScript, Vite, Three.js, Tailwind CSS |
| Data | Vehicle Health Telemetry Dataset (~604k rows) |

## Team

| Role | Members |
|------|---------|
| ML Engineering — Model Development | Adel Tamer · Marwan Mahmoud |
| ML Engineering — Preprocessing & Data Collection | Salah Khafaga · Shenouda Safwat |
| Dashboard / Full-stack | Jawad Tamer · Ekram Hatem |

## Documentation

- [Architecture & Pipeline Design](docs/architecture.md)
- [Model Fine-Tuning & Results](docs/model-tuning-results.md)
- [Project Overview (Arabic)](docs/project-overview-ar.md)
- [Model Card](docs/model-card.md)
- [Data](data/README.md)
- [Artifacts](artifacts/README.md)

## License

MIT License — see [LICENSE](LICENSE).

## Acknowledgments

DEPI R4 — Microsoft Machine Learning Graduation Project · 2026
