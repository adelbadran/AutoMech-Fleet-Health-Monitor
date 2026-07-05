# Model Card — AutoMech Fleet Health Monitor

## Model Details

| Field | Value |
|-------|-------|
| **Model name** | AutoMech Fuzzy Fusion Anomaly Detector |
| **Version** | 1.0 |
| **Date** | June 2026 |
| **Type** | Ensemble (Isolation Forest + LSTM AutoEncoder + Fuzzy Logic) |
| **Task** | Binary anomaly detection on multivariate time-series telemetry |

## Intended Use

- **Primary:** Fleet vehicle health monitoring and early fault detection
- **Users:** Fleet operators, maintenance engineers, data analysts
- **Out of scope:** Real-time safety-critical braking/steering control; individual component RUL prediction

## Training Data

- **Source:** Vehicle Health Telemetry Dataset (cleaned) — [Google Drive](https://drive.google.com/drive/folders/15IDy9Y7JEyd4dFFpE2fGYwHHwEV608Va?usp=drive_link)
- **Local path:** `data/processed/Cleaned-Vehicle-Health-Telemetry-Dataset.csv` (not in git; download from Drive)
- **Rows:** ~604,802 observations
- **Features:** 14 continuous sensor channels
- **Label:** `Fault_Label` (0 = normal, ≥1 = fault) — used for evaluation, not direct supervision in IF/LSTM

## Performance (Fusion Model)

Metrics exported to `artifacts/model_summary.json` from hold-out evaluation:

- Accuracy, Precision, Recall, F1
- ROC-AUC, PR-AUC
- Confusion matrix on test split

## Limitations

- Trained on synthetic/simulated fleet telemetry patterns
- Subsystem diagnosis uses heuristic sensor bounds, not learned labels
- Requires minimum 10 rows for rolling feature computation
- Threshold sensitivity affects false positive rate — adjustable in dashboard

## Ethical Considerations

- Anomaly alerts should be reviewed by a human before maintenance actions
- Model confidence scores are calibrated for demo UX, not clinical certainty
- Fleet data must be handled per organizational privacy policies
