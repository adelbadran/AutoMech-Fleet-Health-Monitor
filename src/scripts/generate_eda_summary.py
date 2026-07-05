import json
import os
import sys

import numpy as np
import pandas as pd
from scipy.stats import gaussian_kde, ttest_ind

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from paths import ARTIFACTS_DIR, CLEANED_DATASET_PATH, REPO_ROOT

DATA_PATH = str(CLEANED_DATASET_PATH)
OUT_PATH = str(ARTIFACTS_DIR / "eda_summary.json")
BASE_DIR = str(REPO_ROOT)

DISPLAY_NAMES = {
    "Timestamp": "Timestamp",
    "Engine_RPM": "Engine RPM",
    "Vehicle_Speed": "Vehicle Speed (km/h)",
    "Coolant_Temp": "Coolant Temperature (°C)",
    "Oil_Pressure": "Oil Pressure (bar)",
    "Vibration_Z": "Vertical Vibration (mm/s)",
    "Engine_Load": "Engine Load (%)",
    "Fuel_Rate": "Fuel Rate (L/h)",
    "Intake_Air_Temp": "Intake Air Temperature (°C)",
    "Battery_Voltage": "Battery Voltage (V)",
    "Throttle_Position": "Throttle Position (%)",
    "Ambient_Temp": "Ambient Temperature (°C)",
    "Brake_Pressure": "Brake Pressure (bar)",
    "Acceleration_X": "Longitudinal Acceleration (m/s²)",
    "Acceleration_Y": "Lateral Acceleration (m/s²)",
    "Fault_Label": "Fault Label",
    "Fault_Type": "Fault Type",
    "is_fault": "Is Fault",
}

PRETTY = {
    "Coolant_Temp": "Temperature",
    "Engine_RPM": "RPM",
    "Oil_Pressure": "Oil Pressure",
    "Battery_Voltage": "Battery Voltage",
    "Vibration_Z": "Vibration",
    "Fuel_Rate": "Fuel Rate",
}

DATA_DICTIONARY = [
    {"feature": "Timestamp", "description": "Measurement time", "unit": "datetime"},
    {"feature": "Engine_RPM", "description": "Engine rotational speed", "unit": "rpm"},
    {"feature": "Vehicle_Speed", "description": "Vehicle road speed", "unit": "km/h"},
    {"feature": "Coolant_Temp", "description": "Engine coolant temperature", "unit": "°C"},
    {"feature": "Oil_Pressure", "description": "Engine oil pressure", "unit": "bar"},
    {"feature": "Vibration_Z", "description": "Measured vibration level on the Z axis", "unit": "mm/s"},
    {"feature": "Engine_Load", "description": "Engine load percentage", "unit": "%"},
    {"feature": "Fuel_Rate", "description": "Fuel consumption rate", "unit": "L/h"},
    {"feature": "Intake_Air_Temp", "description": "Air intake temperature", "unit": "°C"},
    {"feature": "Battery_Voltage", "description": "Vehicle battery voltage", "unit": "V"},
    {"feature": "Throttle_Position", "description": "Throttle opening percentage", "unit": "%"},
    {"feature": "Ambient_Temp", "description": "Ambient temperature", "unit": "°C"},
    {"feature": "Brake_Pressure", "description": "Brake system pressure", "unit": "bar"},
    {"feature": "Acceleration_X", "description": "Longitudinal acceleration", "unit": "m/s²"},
    {"feature": "Acceleration_Y", "description": "Lateral acceleration", "unit": "m/s²"},
    {"feature": "Fault_Label", "description": "Original fault score / label", "unit": "score"},
    {"feature": "Fault_Type", "description": "Fault class name", "unit": "category"},
    {"feature": "is_fault", "description": "Binary target used for analysis", "unit": "0/1"},
]

HISTOGRAM_BINS = 50
DISTRIBUTION_BINS = 60
KDE_POINTS = 80
KDE_MAX_SAMPLES = 5000


def display_name(col: str) -> str:
    return DISPLAY_NAMES.get(col, col.replace("_", " "))


def pretty_name(col: str) -> str:
    return PRETTY.get(col, display_name(col))


def json_val(v):
    if v is None or (isinstance(v, float) and (np.isnan(v) or np.isinf(v))):
        return None
    if pd.isna(v):
        return None
    if isinstance(v, (np.floating, float)):
        return float(v)
    if isinstance(v, (np.integer, int)):
        return int(v)
    if isinstance(v, (np.bool_, bool)):
        return bool(v)
    return str(v)


def row_val(col: str, val):
    if pd.isna(val):
        return None
    if col in ("Fault_Type", "Timestamp") or isinstance(val, pd.Timestamp):
        return str(val)
    if isinstance(val, (np.floating, float)):
        return float(val)
    if isinstance(val, (np.integer, int)):
        return int(val)
    return str(val)


def dtypes_summary(df: pd.DataFrame) -> str:
    counts = df.dtypes.astype(str).value_counts()
    return ", ".join(f"{dtype}({count})" for dtype, count in counts.items())


def build_boxplot_stats(series: pd.Series):
    clean = series.dropna()
    if clean.empty:
        return None
    q1 = clean.quantile(0.25)
    q3 = clean.quantile(0.75)
    iqr = q3 - q1
    lower_whisker = q1 - 1.5 * iqr
    upper_whisker = q3 + 1.5 * iqr
    return {
        "min": json_val(clean.min()),
        "q1": json_val(q1),
        "median": json_val(clean.median()),
        "q3": json_val(q3),
        "max": json_val(clean.max()),
        "whiskerLow": json_val(max(clean.min(), lower_whisker)),
        "whiskerHigh": json_val(min(clean.max(), upper_whisker)),
    }


def build_kde_curve(series: pd.Series, points: int = KDE_POINTS):
    clean = series.dropna()
    if clean.empty:
        return []
    if len(clean) > KDE_MAX_SAMPLES:
        clean = clean.sample(KDE_MAX_SAMPLES, random_state=42)
    try:
        kde = gaussian_kde(clean)
        x_min = float(clean.min())
        x_max = float(clean.max())
        if x_min == x_max:
            return [{"x": x_min, "y": 0.0}]
        xs = np.linspace(x_min, x_max, points)
        ys = kde(xs)
        return [{"x": float(x), "y": float(y)} for x, y in zip(xs, ys)]
    except Exception:
        return []


def build_histogram(series: pd.Series, bins: int = HISTOGRAM_BINS):
    clean = series.dropna()
    if clean.empty:
        return []
    counts, edges = np.histogram(clean, bins=bins)
    return [
        {"binStart": float(edges[i]), "binEnd": float(edges[i + 1]), "count": int(count)}
        for i, count in enumerate(counts)
    ]


def build_density_bins(normal: pd.Series, fault: pd.Series, bins: int = DISTRIBUTION_BINS):
    combined = pd.concat([normal, fault], ignore_index=True).dropna()
    if combined.empty:
        return [], []
    edges = np.histogram_bin_edges(combined, bins=bins)

    def density(series: pd.Series):
        clean = series.dropna()
        if clean.empty:
            return [{"binStart": float(edges[i]), "binEnd": float(edges[i + 1]), "density": 0.0} for i in range(len(edges) - 1)]
        counts, _ = np.histogram(clean, bins=edges, density=True)
        return [
            {"binStart": float(edges[i]), "binEnd": float(edges[i + 1]), "density": float(counts[i])}
            for i in range(len(counts))
        ]

    return density(normal), density(fault)


def group_stats(series: pd.Series):
    return {
        "mean": json_val(series.mean()),
        "median": json_val(series.median()),
        "std": json_val(series.std()),
        "min": json_val(series.min()),
        "max": json_val(series.max()),
    }


def main():
    print(f"Loading {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    if "Timestamp" in df.columns:
        df["Timestamp"] = pd.to_datetime(df["Timestamp"], errors="coerce")

    if "Fault_Type" in df.columns:
        df["is_fault"] = np.where(
            df["Fault_Type"].fillna("Normal").astype(str).str.lower().eq("normal"), 0, 1
        )
    elif "Fault_Label" in df.columns:
        fault_label_numeric = pd.to_numeric(df["Fault_Label"], errors="coerce")
        threshold = fault_label_numeric.median(skipna=True)
        df["is_fault"] = np.where(fault_label_numeric > threshold, 1, 0)
    else:
        df["is_fault"] = 0

    target = "is_fault"
    feature_cols = [
        c for c in df.select_dtypes(include=np.number).columns if c not in {"Fault_Label", target}
    ]
    main_sensors = [
        c
        for c in [
            "Coolant_Temp",
            "Engine_RPM",
            "Oil_Pressure",
            "Battery_Voltage",
            "Vibration_Z",
            "Fuel_Rate",
        ]
        if c in df.columns
    ]
    time_col = "Timestamp" if "Timestamp" in df.columns else None

    memory_usage_mb = df.memory_usage(deep=True).sum() / (1024 ** 2)
    fault_rate = df[target].mean() * 100
    fault_counts = df[target].value_counts().sort_index()
    top_spread = df[feature_cols].std().sort_values(ascending=False).head(3)

    total_missing = int(df.isna().sum().sum())
    duplicate_rows = int(df.duplicated().sum())
    duplicate_timestamp = int(df.duplicated(subset=[time_col]).sum()) if time_col else 0
    constant_columns = [c for c in df.columns if df[c].nunique(dropna=False) == 1]
    near_constant_columns = [c for c in df.columns if (df[c].nunique(dropna=False) / len(df)) <= 0.01]
    infinite_values = int(np.isinf(df.select_dtypes(include=np.number)).sum().sum())

    schema = [
        {
            "column": col,
            "label": display_name(col),
            "dtype": str(df[col].dtype),
            "nonNull": int(df[col].notna().sum()),
            "nullCount": int(df[col].isna().sum()),
        }
        for col in df.columns
    ]

    statistical_summary = pd.DataFrame(
        {
            "Mean": df[feature_cols].mean(),
            "Median": df[feature_cols].median(),
            "Std": df[feature_cols].std(),
            "Min": df[feature_cols].min(),
            "Max": df[feature_cols].max(),
            "Skewness": df[feature_cols].skew(),
            "Kurtosis": df[feature_cols].kurtosis(),
        }
    ).round(4)

    outlier_rows = []
    for col in feature_cols:
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        outlier_count = int(((df[col] < lower_bound) | (df[col] > upper_bound)).sum())
        outlier_rows.append(
            {
                "column": col,
                "label": display_name(col),
                "outlierCount": outlier_count,
                "outlierPercent": round(outlier_count / len(df) * 100, 4),
                "lowerBound": float(lower_bound),
                "upperBound": float(upper_bound),
                "q1": json_val(q1),
                "median": json_val(df[col].median()),
                "q3": json_val(q3),
            }
        )
    outlier_rows.sort(key=lambda r: r["outlierPercent"], reverse=True)

    corr_features = feature_cols + [target]
    corr_df = df[corr_features].corr(method="pearson")
    corr_pairs = (
        corr_df.where(np.triu(np.ones(corr_df.shape), k=1).astype(bool))
        .stack()
        .reset_index()
    )
    corr_pairs.columns = ["feature1", "feature2", "correlation"]
    top_positive = [
        {
            "feature1": row["feature1"],
            "feature2": row["feature2"],
            "label1": display_name(row["feature1"]),
            "label2": display_name(row["feature2"]),
            "correlation": float(row["correlation"]),
        }
        for _, row in corr_pairs.sort_values("correlation", ascending=False).head(10).iterrows()
    ]
    top_negative = [
        {
            "feature1": row["feature1"],
            "feature2": row["feature2"],
            "label1": display_name(row["feature1"]),
            "label2": display_name(row["feature2"]),
            "correlation": float(row["correlation"]),
        }
        for _, row in corr_pairs.sort_values("correlation", ascending=True).head(10).iterrows()
    ]

    test_rows = []
    for col in feature_cols:
        normal_values = df.loc[df[target] == 0, col].dropna()
        fault_values = df.loc[df[target] == 1, col].dropna()
        p_value = ttest_ind(normal_values, fault_values, equal_var=False, nan_policy="omit").pvalue
        test_rows.append(
            {
                "column": col,
                "label": display_name(col),
                "pValue": json_val(p_value),
                "significant": bool(p_value < 0.05),
            }
        )
    test_rows.sort(key=lambda r: r["pValue"] if r["pValue"] is not None else 1.0)

    lowest_p_feature = test_rows[0]["column"] if test_rows else "N/A"
    highest_outlier_feature = outlier_rows[0]["column"] if outlier_rows else "N/A"
    if main_sensors:
        sensor_std = df[main_sensors].std().sort_values()
        lowest_variability_feature = sensor_std.index[0]
        highest_variability_feature = sensor_std.index[-1]
    else:
        lowest_variability_feature = "N/A"
        highest_variability_feature = "N/A"

    time_series = {"sampleStep": 1, "sensors": main_sensors, "points": []}
    rolling_statistics = {"windowSize": 50, "sampleStep": 1, "sensors": []}
    if time_col:
        ts_df = df.dropna(subset=[time_col]).sort_values(time_col).copy()
        sample_step = max(len(ts_df) // 5000, 1)
        ts_plot = ts_df.iloc[::sample_step]
        time_series["sampleStep"] = int(sample_step)
        time_series["points"] = [
            {
                "timestamp": row[time_col].isoformat(),
                "isFault": int(row[target]),
                **{col: json_val(row[col]) for col in main_sensors},
            }
            for _, row in ts_plot.iterrows()
        ]

        roll_df = ts_df.copy()
        window_size = min(1000, max(50, len(roll_df) // 500))
        roll_sample_step = max(len(roll_df) // 500, 1)
        rolling_statistics["windowSize"] = int(window_size)
        rolling_statistics["sampleStep"] = int(roll_sample_step)
        for col in main_sensors:
            rolling_mean = roll_df[col].rolling(window=window_size, min_periods=1).mean()
            rolling_std = roll_df[col].rolling(window=window_size, min_periods=1).std()
            sampled = roll_df.iloc[::roll_sample_step]
            points = []
            for idx in sampled.index:
                points.append(
                    {
                        "timestamp": roll_df.at[idx, time_col].isoformat(),
                        "rollingMean": json_val(rolling_mean.at[idx]),
                        "rollingStd": json_val(rolling_std.at[idx]),
                    }
                )
            rolling_statistics["sensors"].append(
                {"column": col, "label": pretty_name(col), "points": points}
            )

    distribution_sensors = []
    for col in main_sensors:
        normal_values = df.loc[df[target] == 0, col].dropna()
        fault_values = df.loc[df[target] == 1, col].dropna()
        normal_bins, fault_bins = build_density_bins(normal_values, fault_values)
        distribution_sensors.append(
            {
                "column": col,
                "label": pretty_name(col),
                "normalBins": normal_bins,
                "faultBins": fault_bins,
            }
        )

    dashboard_columns = [
        c
        for c in ["Timestamp", "is_fault", "Fault_Type", "Fault_Label"] + main_sensors
        if c in df.columns
    ]

    summary = {
        "title": "Vehicle Health Telemetry EDA",
        "subtitle": "Exploratory Data Analysis — Executive Reporting & Diagnostics",
        "sourceNotebook": "Models/Vehicle_Health_EDA.ipynb",
        "datasetPath": "data/processed/Cleaned-Vehicle-Health-Telemetry-Dataset.csv",
        "generatedAt": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M"),
        "executiveSummary": {
            "metrics": [
                {"metric": "Dataset Shape", "value": str(df.shape)},
                {"metric": "Number of Features", "value": int(df.shape[1])},
                {"metric": "Number of Numeric Features", "value": len(feature_cols)},
                {
                    "metric": "Data Types",
                    "value": df.dtypes.astype(str).value_counts().to_dict(),
                },
                {"metric": "Memory Usage", "value": f"{memory_usage_mb:.2f} MB"},
                {
                    "metric": "Target Distribution (is_fault)",
                    "value": {
                        "Normal": int(fault_counts.get(0, 0)),
                        "Fault": int(fault_counts.get(1, 0)),
                    },
                },
            ],
            "topNotes": [
                f"Faults account for {fault_rate:.2f}% of observations.",
                f"{top_spread.index[0]} shows the widest spread among numeric features.",
                f"{top_spread.index[1]} and {top_spread.index[2]} follow as the next most variable signals.",
            ],
        },
        "dataDictionary": DATA_DICTIONARY,
        "datasetOverview": {
            "head": [
                {col: row_val(col, row[col]) for col in df.columns}
                for _, row in df.head(5).iterrows()
            ],
            "sample": [
                {col: row_val(col, row[col]) for col in df.columns}
                for _, row in df.sample(5, random_state=42).iterrows()
            ],
            "shape": {"rows": int(len(df)), "columns": int(len(df.columns))},
            "schema": schema,
            "dtypesSummary": dtypes_summary(df),
            "memoryUsageMb": round(memory_usage_mb, 2),
            "columnNames": list(df.columns),
        },
        "dataQualityReport": {
            "missingValues": total_missing,
            "duplicateRows": duplicate_rows,
            "duplicateTimestamp": duplicate_timestamp,
            "constantColumns": constant_columns,
            "nearConstantColumns": near_constant_columns,
            "infiniteValues": infinite_values,
            "memoryUsageMb": round(memory_usage_mb, 2),
            "note": "No missing values were detected."
            if total_missing == 0
            else f"{total_missing} missing values were detected.",
        },
        "missingValues": [
            {"column": col, "label": display_name(col), "count": int(df[col].isna().sum())}
            for col in df.columns
        ],
        "duplicateAnalysis": {
            "duplicateRows": duplicate_rows,
            "duplicatedTimestamps": duplicate_timestamp,
        },
        "targetDistribution": {
            "normal": int(fault_counts.get(0, 0)),
            "fault": int(fault_counts.get(1, 0)),
            "faultRatePercent": round(fault_rate, 2),
            "note": f"Faults account for {fault_rate:.2f}% of observations, so the dataset is highly imbalanced toward normal behavior.",
        },
        "descriptiveStatistics": [
            {
                "column": col,
                "label": display_name(col),
                "mean": json_val(statistical_summary.loc[col, "Mean"]),
                "median": json_val(statistical_summary.loc[col, "Median"]),
                "std": json_val(statistical_summary.loc[col, "Std"]),
                "min": json_val(statistical_summary.loc[col, "Min"]),
                "max": json_val(statistical_summary.loc[col, "Max"]),
                "skewness": json_val(statistical_summary.loc[col, "Skewness"]),
                "kurtosis": json_val(statistical_summary.loc[col, "Kurtosis"]),
            }
            for col in feature_cols
        ],
        "histograms": [
            {
                "column": col,
                "label": display_name(col),
                "bins": build_histogram(df[col]),
                "kde": build_kde_curve(df[col]),
                "boxPlot": build_boxplot_stats(df[col]),
            }
            for col in feature_cols
        ],
        "outlierAnalysis": outlier_rows,
        "correlation": {
            "columns": list(corr_df.columns),
            "labels": [display_name(c) for c in corr_df.columns],
            "matrix": [
                [float(corr_df.iloc[i, j]) for j in range(len(corr_df.columns))]
                for i in range(len(corr_df.columns))
            ],
            "topPositive": top_positive,
            "topNegative": top_negative,
        },
        "featureVsTarget": {
            "sensors": [
                {
                    "column": col,
                    "label": pretty_name(col),
                    "normal": group_stats(df.loc[df[target] == 0, col]),
                    "fault": group_stats(df.loc[df[target] == 1, col]),
                    "normalBox": build_boxplot_stats(df.loc[df[target] == 0, col]),
                    "faultBox": build_boxplot_stats(df.loc[df[target] == 1, col]),
                    "normalKde": build_kde_curve(df.loc[df[target] == 0, col]),
                    "faultKde": build_kde_curve(df.loc[df[target] == 1, col]),
                }
                for col in main_sensors
            ]
        },
        "timeSeries": time_series,
        "rollingStatistics": rolling_statistics,
        "distributionComparison": {"sensors": distribution_sensors},
        "statisticalTests": test_rows,
        "keyFindings": [
            f"Faults account for {fault_rate:.2f}% of observations.",
            f"{highest_variability_feature} shows the highest variability among the key sensors.",
            f"{lowest_variability_feature} is the most stable sensor among the key sensors.",
            f"{highest_outlier_feature} has the highest outlier percentage using the IQR rule.",
            f"{lowest_p_feature} shows the strongest statistical difference between Normal and Fault groups.",
        ],
        "exportCleanDataset": {
            "cleanedDatasetFile": "Cleaned_Dataset.csv",
            "dashboardDatasetFile": "Dashboard_Dataset.csv",
            "cleanedDatasetColumns": list(df.columns),
            "dashboardDatasetColumns": dashboard_columns,
            "rowCount": int(len(df)),
            "message": "Export completed: Cleaned_Dataset.csv and Dashboard_Dataset.csv are ready for downstream tools.",
        },
    }

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    engine_rpm = next(r for r in summary["descriptiveStatistics"] if r["column"] == "Engine_RPM")
    print(f"Written {OUT_PATH} ({os.path.getsize(OUT_PATH) / 1024:.1f} KB)")
    print(f"Shape: {summary['datasetOverview']['shape']['rows']} x {summary['datasetOverview']['shape']['columns']}")
    print(f"Memory: {summary['datasetOverview']['memoryUsageMb']} MB")
    print(f"Fault rate: {summary['targetDistribution']['faultRatePercent']}%")
    print(f"Engine_RPM mean: {engine_rpm['mean']}")


if __name__ == "__main__":
    main()
