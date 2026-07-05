from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
SAMPLES_DIR = DATA_DIR / "samples"
ARTIFACTS_DIR = REPO_ROOT / "artifacts"
TRAINING_OUTPUTS_DIR = ARTIFACTS_DIR / "training_outputs"
NOTEBOOKS_DIR = REPO_ROOT / "notebooks"
DASHBOARD_DIR = REPO_ROOT / "dashboard"

CLEANED_DATASET_PATH = PROCESSED_DATA_DIR / "Cleaned-Vehicle-Health-Telemetry-Dataset.csv"

INFERENCE_SCRIPT = REPO_ROOT / "src" / "inference" / "run_inference.py"
TRAIN_SCRIPT = REPO_ROOT / "src" / "train" / "train_and_save_artifacts.py"
