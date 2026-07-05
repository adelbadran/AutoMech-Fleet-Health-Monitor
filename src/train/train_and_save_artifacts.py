import os
import json
import pickle
import sys

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler, RobustScaler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from paths import ARTIFACTS_DIR, CLEANED_DATASET_PATH

cleaned_csv_path = str(CLEANED_DATASET_PATH)
models_dir = str(ARTIFACTS_DIR)
os.makedirs(models_dir, exist_ok=True)

print("Loading dataset...")
if not os.path.exists(cleaned_csv_path):
    raise FileNotFoundError(f"Dataset not found: {cleaned_csv_path}")

data = pd.read_csv(cleaned_csv_path)
print(f"Dataset loaded: {data.shape}")

target_cols = ["Timestamp", "Fault_Label", "Fault_Type"]
sensor_columns = [col for col in data.columns if col not in target_cols]

print("\nFitting LSTM MinMaxScaler...")
X_raw = data[sensor_columns]
split_idx = int(len(X_raw) * 0.8)
X_train_lstm_raw = X_raw.iloc[:split_idx]

lstm_scaler = MinMaxScaler()
lstm_scaler.fit(X_train_lstm_raw)

lstm_scaler_path = os.path.join(models_dir, "min_max_scaler.pkl")
with open(lstm_scaler_path, "wb") as f:
    pickle.dump(lstm_scaler, f)
print(f"MinMaxScaler saved to: {lstm_scaler_path}")

print("\nPerforming Feature Engineering for Isolation Forest...")
WINDOW_SIZE = 10
model_data = data.copy()

for col in sensor_columns:
    model_data[col + "_rolling_mean"] = model_data[col].rolling(window=WINDOW_SIZE).mean()
    model_data[col + "_rolling_std"] = model_data[col].rolling(window=WINDOW_SIZE).std()
    model_data[col + "_diff"] = model_data[col].diff()

model_data.dropna(inplace=True)
model_data.reset_index(drop=True, inplace=True)

if_feature_columns = [col for col in model_data.columns if col not in target_cols and col != "Row_Index"]

X_if = model_data[if_feature_columns]
y_if = (model_data["Fault_Label"] >= 1).astype(int)

X_train_val_if, X_test_if, y_train_val_if, y_test_if = train_test_split(
    X_if, y_if, test_size=0.20, random_state=42, stratify=y_if
)

X_train_if, X_val_if, y_train_if, y_val_if = train_test_split(
    X_train_val_if, y_train_val_if, test_size=0.25, random_state=42, stratify=y_train_val_if
)

print(f"IF Feature count: {len(if_feature_columns)}")
print(f"IF Train shape: {X_train_if.shape}")

print("Fitting IF RobustScaler...")
if_scaler = RobustScaler()
X_train_if_scaled = if_scaler.fit_transform(X_train_if)

if_scaler_path = os.path.join(models_dir, "robust_scaler.pkl")
with open(if_scaler_path, "wb") as f:
    pickle.dump(if_scaler, f)
print(f"RobustScaler saved to: {if_scaler_path}")

print("Fitting Isolation Forest model...")
actual_anomaly_ratio = float(y_if.mean())
contamination = max(0.001, min(actual_anomaly_ratio, 0.50))

if_model = IsolationForest(
    n_estimators=200,
    contamination=contamination,
    random_state=42,
    n_jobs=-1,
)
if_model.fit(X_train_if_scaled)

if_model_path = os.path.join(models_dir, "isolation_forest_model.pkl")
with open(if_model_path, "wb") as f:
    pickle.dump(if_model, f)
print(f"Isolation Forest model saved to: {if_model_path}")

print("\nComputing calibration parameters for Fuzzy Logic Fusion...")
sub_data = data.iloc[:5000].copy()

sub_model_data = sub_data.copy()
for col in sensor_columns:
    sub_model_data[col + "_rolling_mean"] = sub_model_data[col].rolling(window=WINDOW_SIZE).mean()
    sub_model_data[col + "_rolling_std"] = sub_model_data[col].rolling(window=WINDOW_SIZE).std()
    sub_model_data[col + "_diff"] = sub_model_data[col].diff()
sub_model_data.dropna(inplace=True)
sub_model_data.reset_index(drop=True, inplace=True)

X_sub_if = sub_model_data[if_feature_columns]
X_sub_if_scaled = if_scaler.transform(X_sub_if)
if_scores_sample = -if_model.score_samples(X_sub_if_scaled)


class LSTMAutoEncoder(nn.Module):
    def __init__(self, seq_len, n_features, embedding_dim=16, hidden_dim=64):
        super(LSTMAutoEncoder, self).__init__()
        self.seq_len = seq_len
        self.n_features = n_features
        self.hidden_dim = hidden_dim
        self.embedding_dim = embedding_dim

        self.encoder_lstm1 = nn.LSTM(input_size=n_features, hidden_size=hidden_dim, num_layers=1, batch_first=True)
        self.encoder_lstm2 = nn.LSTM(input_size=hidden_dim, hidden_size=embedding_dim, num_layers=1, batch_first=True)
        self.decoder_lstm1 = nn.LSTM(input_size=embedding_dim, hidden_size=embedding_dim, num_layers=1, batch_first=True)
        self.decoder_lstm2 = nn.LSTM(input_size=embedding_dim, hidden_size=hidden_dim, num_layers=1, batch_first=True)
        self.output_layer = nn.Linear(hidden_dim, n_features)

    def forward(self, x):
        x, _ = self.encoder_lstm1(x)
        _, (hidden, _) = self.encoder_lstm2(x)
        hidden = hidden[-1].unsqueeze(1).repeat(1, self.seq_len, 1)
        x, _ = self.decoder_lstm1(hidden)
        x, _ = self.decoder_lstm2(x)
        return self.output_layer(x)


print("Loading LSTM AutoEncoder weights...")
lstm_model_path = os.path.join(models_dir, "LSTM_autoencoder_model.pth")
device = torch.device("cpu")
lstm_model = LSTMAutoEncoder(seq_len=10, n_features=len(sensor_columns), hidden_dim=64).to(device)
lstm_model.load_state_dict(torch.load(lstm_model_path, map_location=device))
lstm_model.eval()

X_sub_lstm_raw = sub_data[sensor_columns]
X_sub_lstm_scaled = lstm_scaler.transform(X_sub_lstm_raw)

time_steps = 10
lstm_errors_sample = []
with torch.no_grad():
    for i in range(len(X_sub_lstm_scaled) - time_steps):
        seq = X_sub_lstm_scaled[i : (i + time_steps)]
        seq_tensor = torch.tensor(seq, dtype=torch.float32).unsqueeze(0).to(device)
        recon = lstm_model(seq_tensor)
        loss = torch.abs(recon - seq_tensor)
        lstm_errors_sample.append(loss.mean().item())

if_1, if_99 = np.percentile(if_scores_sample, [1, 99])
lstm_1, lstm_99 = np.percentile(lstm_errors_sample, [1, 99])

print(f"IF Score 1st percentile: {if_1:.5f}, 99th percentile: {if_99:.5f}")
print(f"LSTM Error 1st percentile: {lstm_1:.5f}, 99th percentile: {lstm_99:.5f}")

config = {
    "best_threshold": 0.9347,
    "lstm_weight": 3.5,
    "if_p1": float(if_1),
    "if_p99": float(if_99),
    "lstm_p1": float(lstm_1),
    "lstm_p99": float(lstm_99),
    "sensor_columns": sensor_columns,
    "if_feature_columns": if_feature_columns,
}

config_path = os.path.join(models_dir, "fuzzy_model_config.json")
with open(config_path, "w") as f:
    json.dump(config, f, indent=2)
print(f"Configuration saved to: {config_path}")
