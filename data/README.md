# Data

## Dataset download

Full dataset files: [Google Drive](https://drive.google.com/drive/folders/15IDy9Y7JEyd4dFFpE2fGYwHHwEV608Va?usp=drive_link)

| File | Local path |
|------|------------|
| `Vehicle-Health-Telemetry-Dataset.csv` | `data/raw/` |
| `Cleaned-Vehicle-Health-Telemetry-Dataset.csv` | `data/processed/` |

`data/processed/*.csv` is gitignored — download and place files locally after cloning the repository. The cleaned file is produced by `notebooks/01_data_preprocessing.ipynb` when starting from raw data.

## Processed dataset

`data/processed/Cleaned-Vehicle-Health-Telemetry-Dataset.csv`

Used by training scripts (`src/train/`, `src/scripts/`) and notebooks 02–04.

## Sample telemetry

| File | Description |
|------|-------------|
| `samples/test_healthy.csv` | Normal operation window |
| `samples/test_fault.csv` | Fault-condition window |
| `samples/test_mixed.csv` | Healthy + fault combined |
| `samples/test_telemetry.csv` | General demo file |

```bash
python src/scripts/generate_test_csvs.py
```

## Columns

`Timestamp`, `Engine_RPM`, `Vehicle_Speed`, `Coolant_Temp`, `Oil_Pressure`, `Vibration_Z`, `Engine_Load`, `Fuel_Rate`, `Intake_Air_Temp`, `Battery_Voltage`, `Throttle_Position`, `Ambient_Temp`, `Brake_Pressure`, `Acceleration_X`, `Acceleration_Y`

Optional labels: `Fault_Label`, `Fault_Type`
