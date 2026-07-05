
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from paths import ARTIFACTS_DIR, CLEANED_DATASET_PATH, INFERENCE_SCRIPT, REPO_ROOT, SAMPLES_DIR

ROOT = REPO_ROOT
DATASET = CLEANED_DATASET_PATH
PYTHON = Path(sys.executable)
INFERENCE = INFERENCE_SCRIPT
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

HEALTHY_START = 75_000
FAULT_START = 30_000
WINDOW_SIZE = 90
MIXED_HEALTHY_ROWS = 45
MIXED_FAULT_ROWS = 45

TELEMETRY_COLUMNS = [
    "Timestamp",
    "Engine_RPM",
    "Vehicle_Speed",
    "Coolant_Temp",
    "Oil_Pressure",
    "Vibration_Z",
    "Engine_Load",
    "Fuel_Rate",
    "Intake_Air_Temp",
    "Battery_Voltage",
    "Throttle_Position",
    "Ambient_Temp",
    "Brake_Pressure",
    "Acceleration_X",
    "Acceleration_Y",
]


def run_inference(csv_path: Path) -> dict:
    proc = subprocess.run(
        [str(PYTHON), str(INFERENCE), str(csv_path)],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or proc.stdout)
    return json.loads(proc.stdout)


def export_window(start: int, path: Path, ts_prefix: str, size: int = WINDOW_SIZE) -> dict:
    data = pd.read_csv(DATASET)
    chunk = data.iloc[start : start + size].copy()
    chunk["Timestamp"] = pd.date_range(f"2026-06-01 {ts_prefix}", periods=len(chunk), freq="s")
    chunk[TELEMETRY_COLUMNS].to_csv(path, index=False)
    return run_inference(path)


def export_mixed(path: Path) -> dict:
    data = pd.read_csv(DATASET)
    healthy = data.iloc[HEALTHY_START : HEALTHY_START + MIXED_HEALTHY_ROWS].copy()
    fault = data.iloc[FAULT_START : FAULT_START + MIXED_FAULT_ROWS].copy()
    chunk = pd.concat([healthy, fault], ignore_index=True)
    chunk["Timestamp"] = pd.date_range("2026-06-01 10:00:00", periods=len(chunk), freq="s")
    chunk[TELEMETRY_COLUMNS].to_csv(path, index=False)
    return run_inference(path)


def main() -> None:
    healthy_path = SAMPLES_DIR / "test_healthy.csv"
    fault_path = SAMPLES_DIR / "test_fault.csv"
    mixed_path = SAMPLES_DIR / "test_mixed.csv"

    healthy = export_window(HEALTHY_START, healthy_path, "08:00:00")
    fault = export_window(FAULT_START, fault_path, "09:00:00")
    mixed = export_mixed(mixed_path)

    print(
        f"{healthy_path.name}: {healthy['anomalyRows']}/{healthy['totalProcessedRows']} anomalies"
    )
    print(f"{fault_path.name}: {fault['anomalyRows']}/{fault['totalProcessedRows']} anomalies")
    print(f"{mixed_path.name}: {mixed['anomalyRows']}/{mixed['totalProcessedRows']} anomalies")


if __name__ == "__main__":
    main()
