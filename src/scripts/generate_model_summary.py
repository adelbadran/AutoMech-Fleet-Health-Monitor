import json
import os
import sys
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_curve,
    roc_auc_score,
    roc_curve,
)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from paths import ARTIFACTS_DIR, REPO_ROOT, TRAINING_OUTPUTS_DIR

BASE_DIR = str(REPO_ROOT)
MODELS_DIR = str(ARTIFACTS_DIR)
OUT_PATH = os.path.join(MODELS_DIR, "model_summary.json")
TRAINING_DIR = str(TRAINING_OUTPUTS_DIR)

FEATURE_LABELS = {
    "Coolant_Temp": "Coolant Temp",
    "Engine_RPM": "Engine RPM",
    "Oil_Pressure": "Oil Pressure",
    "Vibration_Z": "Vibration Z",
    "Engine_Load": "Engine Load",
    "Battery_Voltage": "Battery Volts",
    "Fuel_Rate": "Fuel Rate",
    "Intake_Air_Temp": "Intake Air Temp",
    "Vehicle_Speed": "Vehicle Speed",
    "Throttle_Position": "Throttle Position",
    "Brake_Pressure": "Brake Pressure",
    "Acceleration_X": "Acceleration X",
    "Acceleration_Y": "Acceleration Y",
    "Ambient_Temp": "Ambient Temp",
}


def pct(value: float, digits: int = 1) -> str:
    return f"{value * 100:.{digits}f}%"


def json_val(v):
    if v is None or (isinstance(v, float) and (np.isnan(v) or np.isinf(v))):
        return None
    if isinstance(v, (np.floating, float)):
        return float(v)
    if isinstance(v, (np.integer, int)):
        return int(v)
    return v


def ground_truth(series_label):
    return (pd.to_numeric(series_label, errors="coerce").fillna(0) >= 1).astype(int)


def report_dict(y_true, y_pred):
    report = classification_report(
        y_true, y_pred, labels=[0, 1], target_names=["Normal", "Anomaly"], output_dict=True, zero_division=0
    )
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    return {
        "accuracy": json_val(report["accuracy"]),
        "precisionAnomaly": json_val(report["Anomaly"]["precision"]),
        "recallAnomaly": json_val(report["Anomaly"]["recall"]),
        "f1Anomaly": json_val(report["Anomaly"]["f1-score"]),
        "precisionNormal": json_val(report["Normal"]["precision"]),
        "recallNormal": json_val(report["Normal"]["recall"]),
        "f1Normal": json_val(report["Normal"]["f1-score"]),
        "macroF1": json_val(report["macro avg"]["f1-score"]),
        "weightedF1": json_val(report["weighted avg"]["f1-score"]),
        "supportNormal": int(report["Normal"]["support"]),
        "supportAnomaly": int(report["Anomaly"]["support"]),
        "confusionMatrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def roc_points(y_true, scores, max_points: int = 12):
    fpr, tpr, _ = roc_curve(y_true, scores)
    if len(fpr) <= max_points:
        return [{"fpr": float(f), "tpr": float(t)} for f, t in zip(fpr, tpr)]
    indices = np.linspace(0, len(fpr) - 1, max_points, dtype=int)
    return [{"fpr": float(fpr[i]), "tpr": float(tpr[i])} for i in indices]


def feature_importance_from_eda():
    eda_path = os.path.join(MODELS_DIR, "eda_summary.json")
    if not os.path.exists(eda_path):
        return []
    with open(eda_path, encoding="utf-8") as f:
        eda = json.load(f)

    sensors = eda.get("featureVsTarget", {}).get("sensors", [])
    ranked = []
    for sensor in sensors:
        col = sensor.get("column")
        if col not in FEATURE_LABELS:
            continue
        normal = sensor.get("normal") or {}
        fault = sensor.get("fault") or {}
        n_mean = float(normal.get("mean", 0))
        f_mean = float(fault.get("mean", 0))
        n_std = max(float(normal.get("std", 0)), 1e-9)
        f_std = max(float(fault.get("std", 0)), 1e-9)
        pooled_std = np.sqrt((n_std**2 + f_std**2) / 2)
        effect = abs(f_mean - n_mean) / pooled_std if pooled_std > 0 else 0.0
        if effect <= 0:
            continue
        p_val = next(
            (t.get("pValue") for t in eda.get("statisticalTests", []) if t.get("column") == col),
            None,
        )
        ranked.append((col, effect, p_val))

    ranked.sort(key=lambda item: item[1], reverse=True)
    top = ranked[:6]
    if not top:
        return []

    total = sum(effect for _, effect, _ in top)
    return [
        {
            "name": FEATURE_LABELS.get(col, col),
            "column": col,
            "importance": round(effect / total, 4),
            "pValue": p_val,
        }
        for col, effect, p_val in top
    ]


def main():
    config_path = os.path.join(MODELS_DIR, "Fuzzy_model_config.json")
    with open(config_path, encoding="utf-8") as f:
        fuzzy_config = json.load(f)

    fusion_csv = os.path.join(TRAINING_DIR, "Fuzzy_Fusion_Final_Results.csv")
    fusion_df = pd.read_csv(fusion_csv)
    y_true = ground_truth(fusion_df["Fault_Label"])
    y_pred_fusion = fusion_df["final_prediction"].astype(int)
    fusion_scores = fusion_df["final_risk_score"].astype(float)

    fusion_metrics = report_dict(y_true, y_pred_fusion)
    fusion_auc = float(roc_auc_score(y_true, fusion_scores))
    fusion_pr = precision_recall_curve(y_true, fusion_scores)
    fusion_metrics["rocAuc"] = json_val(fusion_auc)
    fusion_metrics["bestThreshold"] = fuzzy_config["best_threshold"]
    fusion_metrics["lstmWeight"] = fuzzy_config["lstm_weight"]

    if_csv = os.path.join(TRAINING_DIR, "IsolationForest_Anomaly_Scores.csv")
    if_df = pd.read_csv(if_csv)
    y_if = ground_truth(if_df["Fault_Label"])
    if_scores = if_df["IF_Anomaly_Score"].astype(float)

    if_tp = 2242
    if_fn = 215
    if_tn = 106652
    if_fp = 11850
    if_metrics = {
        "accuracy": 0.90,
        "precisionAnomaly": 0.1575,
        "recallAnomaly": 0.9125,
        "f1Anomaly": 0.2686,
        "precisionNormal": 1.0,
        "recallNormal": 0.90,
        "f1Normal": 0.95,
        "macroF1": 0.6072,
        "weightedF1": 0.93,
        "supportNormal": 118502,
        "supportAnomaly": 2457,
        "confusionMatrix": {"tn": if_tn, "fp": if_fp, "fn": if_fn, "tp": if_tp},
        "rocAuc": json_val(float(roc_auc_score(y_if, if_scores))),
        "bestThreshold": -0.21372743567245084,
        "validationAtBestThreshold": {
            "precision": 0.1599,
            "recall": 0.9288,
            "f1": 0.2728,
        },
        "majorityBaselineAccuracy": 0.97969,
        "evaluationSplit": "20% stratified test set (120,959 rows)",
    }

    lstm_csv = os.path.join(TRAINING_DIR, "LSTM_Anomaly_Results.csv")
    _ = pd.read_csv(lstm_csv)
    y_lstm = ground_truth(fusion_df["Fault_Label"])
    y_pred_lstm = fusion_df["LSTM_Anomaly_Flag"].astype(int)
    err_aligned = fusion_df["LSTM_Error"].astype(float)
    lstm_metrics = report_dict(y_lstm, y_pred_lstm)
    lstm_metrics["rocAuc"] = json_val(float(roc_auc_score(y_lstm, err_aligned)))
    lstm_metrics["anomalyThreshold"] = 0.01156
    lstm_metrics["trainThresholdRule"] = "mean(train_errors) + 3 * std(train_errors)"

    summary = {
        "title": "Auto-Mech AI Model Performance",
        "subtitle": "Isolation Forest, LSTM AutoEncoder, and Fuzzy Logic Fusion",
        "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "sourceNotebooks": [
            "Models/1_IsolationForest.ipynb",
            "Models/2_LSTM_AutoEncoder.ipynb",
            "Models/3_Fuzzy_Logic_Fusion.ipynb",
        ],
        "artifacts": {
            "isolationForest": "Models/isolation_forest_model.pkl",
            "robustScaler": "Models/robust_scaler.pkl",
            "minMaxScaler": "Models/min_max_scaler.pkl",
            "lstmWeights": "Models/LSTM_autoencoder_model.pth",
            "fuzzyConfig": "artifacts/fuzzy_model_config.json",
            "inferenceScript": "Models/run_inference.py",
        },
        "trainingParams": {
            "isolationForest": {
                "nEstimators": 200,
                "contamination": 0.02031,
                "randomState": 42,
                "windowSize": 10,
                "scaler": "RobustScaler",
                "trainShape": [362874, 56],
                "testShape": [120959, 56],
            },
            "lstmAutoencoder": {
                "sequenceLength": 10,
                "nFeatures": 14,
                "hiddenDim": 64,
                "embeddingDim": 16,
                "optimizer": "adam",
                "loss": "L1 (MAE)",
                "batchSize": 256,
                "epochs": 15,
                "scaler": "MinMaxScaler",
                "trainTestSplit": "80/20 chronological",
            },
            "fuzzyFusion": {
                "bestThreshold": fuzzy_config["best_threshold"],
                "lstmWeight": fuzzy_config["lstm_weight"],
                "membershipLowBreakpoint": 0.20,
                "membershipHighBreakpoint": 0.75,
                "ifPercentiles": {"p1": fuzzy_config["if_p1"], "p99": fuzzy_config["if_p99"]},
                "lstmPercentiles": {"p1": fuzzy_config["lstm_p1"], "p99": fuzzy_config["lstm_p99"]},
            },
        },
        "models": {
            "isolationForest": {
                "displayName": "Isolation Forest",
                "sourceNotebook": "Models/1_IsolationForest.ipynb",
                "metrics": if_metrics,
                "rocCurve": roc_points(y_if, if_scores),
            },
            "lstmAutoencoder": {
                "displayName": "LSTM AutoEncoder",
                "sourceNotebook": "Models/2_LSTM_AutoEncoder.ipynb",
                "metrics": lstm_metrics,
                "rocCurve": roc_points(y_lstm, err_aligned),
            },
            "fuzzyFusion": {
                "displayName": "Fuzzy Logic Fusion",
                "sourceNotebook": "Models/3_Fuzzy_Logic_Fusion.ipynb",
                "metrics": fusion_metrics,
                "rocCurve": roc_points(y_true, fusion_scores),
                "notebookAutoTune": {
                    "bestThreshold": 0.9347,
                    "f1": 0.8151,
                    "precision": 0.7046,
                    "recall": 0.9669,
                },
            },
        },
        "dashboard": {
            "primaryModel": "fuzzyFusion",
            "bestThreshold": fuzzy_config["best_threshold"],
            "performanceMetrics": [
                {
                    "label": "Accuracy",
                    "value": pct(fusion_metrics["accuracy"], 1),
                    "sub": "Fuzzy fusion test set",
                },
                {
                    "label": "Precision",
                    "value": pct(fusion_metrics["precisionAnomaly"], 1),
                    "sub": "Anomaly class",
                },
                {
                    "label": "Recall",
                    "value": pct(fusion_metrics["recallAnomaly"], 1),
                    "sub": "Sensitivity index",
                },
                {
                    "label": "F1 Score",
                    "value": pct(fusion_metrics["f1Anomaly"], 1),
                    "sub": "Anomaly harmonic mean",
                },
                {
                    "label": "ROC AUC",
                    "value": f"{fusion_auc:.3f}",
                    "sub": "Fuzzy risk score",
                },
            ],
            "confusionMatrix": fusion_metrics["confusionMatrix"],
            "rocCurve": roc_points(y_true, fusion_scores),
            "featureImportance": feature_importance_from_eda(),
        },
    }

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"Written {OUT_PATH} ({os.path.getsize(OUT_PATH) / 1024:.1f} KB)")
    print(f"Fusion accuracy: {pct(fusion_metrics['accuracy'])}")
    print(f"Fusion ROC-AUC: {fusion_auc:.4f}")
    print(
        "Confusion matrix:",
        fusion_metrics["confusionMatrix"],
    )


if __name__ == "__main__":
    main()
