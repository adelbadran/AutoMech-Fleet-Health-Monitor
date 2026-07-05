# AutoMech Fleet Health Monitor

> AI-powered predictive maintenance for fleet vehicles — Isolation Forest, LSTM AutoEncoder, and Fuzzy Logic Fusion with a live React dashboard and 3D digital twin.  
> **DEPI R4 · Microsoft ML Program · 2026**

![Live Dashboard](docs/images/dashboard-live.png)

<p align="center">
  <img src="docs/images/dashboard-ai.png" alt="Predictive Diagnostics" width="48%" />
  <img src="docs/images/dashboard-analytics.png" alt="Fleet Analytics" width="48%" />
</p>

## Features

- **3-stage ML pipeline** — unsupervised + deep learning + fuzzy fusion
- **14 sensor channels** — engine, electrical, braking, motion, environment
- **Live dashboard** — telemetry streaming, anomaly alerts, 3D vehicle visualization
- **Predictive diagnostics** — threshold calibration, model performance metrics
- **Fleet analytics** — full EDA report with interactive charts

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

| Stage | Notebook | Model | Role |
|-------|----------|-------|------|
| 0 | `01_data_preprocessing` | — | Clean & smooth raw telemetry |
| 1 | `02_vehicle_health_eda` | — | Exploratory analysis |
| 2 | `03_isolation_forest` | Isolation Forest | Unsupervised anomaly scoring |
| 3 | `04_lstm_autoencoder` | LSTM AutoEncoder | Sequence reconstruction errors |
| 4 | `05_fuzzy_logic_fusion` | Fuzzy Logic | Fuse IF + LSTM → final risk score |

**Production scripts:** `src/train/train_and_save_artifacts.py` · `src/inference/run_inference.py`

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

| Role | Name |
|------|------|
| ML Engineering | Adel Tamer |
| Dashboard / Full-stack | Jawad Tamer |

## Documentation

- [Architecture](docs/architecture.md)
- [Model Card](docs/model-card.md)
- [Data](data/README.md)
- [Artifacts](artifacts/README.md)

## License

MIT License — see [LICENSE](LICENSE).

## Acknowledgments

DEPI R4 — Microsoft Machine Learning Graduation Project · 2026
