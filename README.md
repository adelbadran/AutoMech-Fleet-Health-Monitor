<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:434D60,50:B5E6C9&height=260&section=header&text=AutoMech%20Fleet%20Health%20Monitor&fontSize=28&fontColor=8A2BE2&fontStyle=italic&fontFamily=Georgia,serif&animation=scaleIn" width="100%" />
  
<img src="https://readme-typing-svg.demolab.com?font=Poppins&weight=700&size=28&duration=2800&pause=1000&color=00E5FF&center=true&vCenter=true&width=900&lines=Fleet+Health+Monitor;AI-Powered+Predictive+Maintenance;Isolation+Forest+%7C+LSTM+AutoEncoder+%7C+Fuzzy+Logic+Fusion;Real-Time+Fleet+Health+Monitoring;React+Dashboard+%2B+3D+Digital+Twin"/>

<br><br>

<img src="https://img.shields.io/badge/DEPI-R4-0078D4?style=for-the-badge&logo=microsoft&logoColor=white"/>
<img src="https://img.shields.io/badge/Microsoft-ML%20Program-5C2D91?style=for-the-badge&logo=microsoft"/>
<img src="https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
<img src="https://img.shields.io/badge/React-18-20232A?style=for-the-badge&logo=react"/>
<img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white"/>
<img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs"/>
<img src="https://img.shields.io/badge/License-MIT-success?style=for-the-badge"/>

<br><br>

<img src="docs/images/dashboard-live.png" width="100%" alt="AutoMech Dashboard Preview"/>

</div>

---

# 🚀 Project Overview

> **AutoMech** is an intelligent predictive maintenance platform designed for modern fleet management.

Instead of waiting for vehicles to fail,
AutoMech continuously monitors **14 live telemetry sensors**, detects abnormal behavior using multiple AI models, and presents everything through an interactive **React Dashboard** with a **3D Digital Twin**.

---

# 🎯 The Challenge

<div align="center">

| 📊 Dataset Size | 🚗 Sensor Channels | ⚠ Fault Ratio |
|:---------------:|:-----------------:|:-------------:|
| **604,802 Rows** | **14 Sensors** | **≈2%** |

</div>

Because only **2%** of samples are faulty...

```text
███████████████████████████████████████░░

Normal Vehicles   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 97.97%

Faulty Vehicles   ▓ 2.03%
```

Traditional ML models simply predict **Normal**...

✅ 97.97% Accuracy

❌ Detects ZERO failures.

This is known as the **Accuracy Paradox**.

---

# 🧠 Our AI Pipeline

```mermaid
flowchart LR

A[Vehicle Sensors] --> B[Isolation Forest]

B --> C[LSTM AutoEncoder]

C --> D[Fuzzy Logic Fusion]

D --> E[Risk Score]

E --> F[React Dashboard]

F --> G[3D Digital Twin]
```

---

# ⚙ Hybrid Intelligence

<div align="center">

| Stage | AI Model | Purpose |
|:----:|:---------|:--------|
| ① | 🌲 Isolation Forest | Fast anomaly screening |
| ② | 🧠 LSTM AutoEncoder | Learn temporal behavior |
| ③ | 🎯 Fuzzy Logic | Intelligent risk fusion |

</div>

Each stage fixes the weakness of the previous one.

Instead of relying on one AI model,

AutoMech combines **Machine Learning + Deep Learning + Expert Knowledge** into one prediction.

---
# 📈 Performance Comparison

<div align="center">

| 🌲 Isolation Forest | 🧠 LSTM AutoEncoder | 🏆 Fuzzy Fusion |
|:------------------:|:------------------:|:---------------:|
| **Accuracy**<br>🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜ **90.0%** | **Accuracy**<br>🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜ **84.7%** | **Accuracy**<br>🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩 **95.5%** |
| **Precision**<br>🟨⬜⬜⬜⬜⬜⬜⬜⬜⬜ **15.8%** | **Precision**<br>🟨🟨🟨🟨⬜⬜⬜⬜⬜⬜ **39.7%** | **Precision**<br>🟨🟨🟨🟨🟨🟨🟨⬜⬜⬜ **70.5%** |
| **Recall**<br>🟦🟦🟦🟦🟦🟦🟦🟦🟦⬜ **91.3%** | **Recall**<br>🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦 **97.8%** | **Recall**<br>🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦 **96.7%** |
| **F1 Score**<br>🟥🟥🟥⬜⬜⬜⬜⬜⬜⬜ **26.9%** | **F1 Score**<br>🟥🟥🟥🟥🟥🟥⬜⬜⬜⬜ **56.4%** | **F1 Score**<br>🟥🟥🟥🟥🟥🟥🟥🟥⬜⬜ **81.5%** |
| **ROC-AUC**<br>⭐⭐⭐⭐⭐☆☆☆☆☆ **0.929** | **ROC-AUC**<br>⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ **0.976** | **ROC-AUC**<br>⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ **0.972** |

</div>

---

<div align="center">

## 🏅 Overall Winner

| 🥇 Best Model |
|:-------------:|
| 🏆 **Fuzzy Logic Fusion** |
| ✅ Highest F1 Score |
| ✅ Highest Precision |
| ✅ 96.7% Recall |
| ✅ 73% Fewer False Positives |

</div>

---

# 🏆 Final Improvement

<div align="center">

| 📉 False Positives | ❤️ Recall | ⭐ Final F1 |
|:------------------:|:---------:|:-----------:|
| **↓ 73%** | **96.7%** | **81.5%** |

</div>

```
False Positives

LSTM Alone

█████████████████████████████

Fuzzy Fusion

███████
```

---
# ✨ What We Built

<div align="center">

<table>
<tr>

<td width="25%" align="center" valign="top">

<img src="docs/images/Data extraction-bro.svg" width="180">

<h3>📚 ML Pipeline</h3>

<b>End-to-End AI Workflow</b>

<br>

🧹 Data Cleaning<br>
📊 Feature Engineering<br>
🤖 Model Training<br>
📈 Model Evaluation<br>
🚀 Model Export

</td>

<td width="25%" align="center" valign="top">

<img src="docs/images/Data extraction-pana.svg" width="180">

<h3>⚡ Inference Engine</h3>

<b>Hybrid AI Decision Pipeline</b>

<br>

🌲 Isolation Forest<br>
⬇️<br>
🧠 LSTM AutoEncoder<br>
⬇️<br>
🎯 Fuzzy Logic Fusion

</td>

<td width="25%" align="center" valign="top">

<img src="docs/images/Visual data-bro.svg" width="180">

<h3>📡 Live Dashboard</h3>

<b>Real-Time Monitoring</b>

<br>

📊 Live Charts<br>
📡 Telemetry Streaming<br>
🚨 Instant Alerts<br>
🚗 Fleet Overview

</td>

<td width="25%" align="center" valign="top">

<img src="docs/images/self driving car-bro.svg" width="180">

<h3>🚗 3D Digital Twin</h3>

<b>Interactive Three.js Vehicle</b>

<br>

⚙️ Engine Status<br>
🛞 Wheel Animation<br>
🔋 Battery Health<br>
🌡️ Sensor Visualization

</td>

</tr>

<tr>

<td colspan="4" align="center">

<br>

<img src="docs/images/Competitive intelligence-rafiki.svg" width="320">

<h3>📊 Fleet Analytics</h3>

<b>Comprehensive Data Insights</b>

<br>

📈 Feature Distribution • 📉 Correlation Matrix • 🔥 Heatmaps • 📊 Sensor Analysis • 🧠 AI Insights

</td>

</tr>

</table>

</div>
<details>
<summary>📊 Dashboard Preview</summary>

<img src="docs/images/dashboard-ai.png" width="100%">

</details>

<details>
<summary>📈 Fleet Analytics</summary>

<img src="docs/images/dashboard-analytics.png" width="100%">

</details>

---

# 🤖 AutoMech AI Platform

<div >

| 🚗 Predict | 📡 Stream | 🌲 Detect | 🧠 Learn |
|:---------:|:---------:|:---------:|:--------:|
| Predictive Maintenance | Live Telemetry | Isolation Forest | LSTM AutoEncoder |

| 🎯 Decide | 📊 Analyze | 🚨 Alert | 🌍 Visualize |
|:---------:|:----------:|:--------:|:------------:|
| Fuzzy Logic Fusion | Fleet Analytics | Real-Time Alerts | 3D Digital Twin |

</div>

---

# 📂 Project Structure

<div align="center">

| 📁 Folder | 📄 Description |
|:---------:|----------------|
| 📂 **docs** | Project documentation, figures, and README assets |
| 📂 **data** | Raw, processed, and sample telemetry datasets |
| 📂 **notebooks** | End-to-end ML pipeline and experimentation |
| 📂 **src** | Core source code, inference engine, and utilities |
| 📂 **artifacts** | Trained models, scalers, and serialized assets |
| 📂 **dashboard** | React dashboard with live monitoring and 3D visualization |

</div>

<details>

<summary><b>📁 Directory Tree</b></summary>

```text
AutoMech-Fleet-Health-Monitor/
│
├── 📂 docs/
├── 📂 data/
│   ├── raw/
│   ├── processed/
│   └── samples/
│
├── 📂 notebooks/
├── 📂 src/
├── 📂 artifacts/
└── 📂 dashboard/
```

</details>

---

# 💾 Dataset

<div align="center">

| 📄 Dataset | 📂 Location | 📊 Purpose |
|:-----------|:-----------:|-----------:|
| 🚗 Vehicle-Health-Telemetry-Dataset.csv | `data/raw/` | Original telemetry dataset |
| 🧹 Cleaned-Vehicle-Health-Telemetry-Dataset.csv | `data/processed/` | Preprocessed dataset for training |

</div>

> ⚠️ **Note:** Processed datasets are excluded from Git using `.gitignore`.

> 📦 Sample telemetry files are included in `data/samples/` for inference demonstrations.

---

<div align="center">

### 🌍 AutoMech Architecture

```mermaid
graph TD

A[Vehicle Sensors]

B[Isolation Forest]

C[LSTM AutoEncoder]

D[Fuzzy Logic]

E[Risk Score]

F[React Dashboard]

G[3D Digital Twin]

A --> B --> C --> D --> E --> F --> G
```

</div>

---

<div align="center">

## ⭐ AI for Smarter Fleets

### Detect Early • Predict Faster • Reduce Downtime

🚗⚡🧠

</div>

# 🚀 Quick Start

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/adelbadran/AutoMech-Fleet-Health-Monitor.git
cd AutoMech-Fleet-Health-Monitor
```

---

## 2️⃣ Create Virtual Environment

```bash
py -3.10 -m venv .venv
.venv\Scripts\activate
```

---

## 3️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 4️⃣ Train Models

```bash
python src/train/train_and_save_artifacts.py
```

---

## 5️⃣ Generate Reports

```bash
python src/scripts/generate_eda_summary.py
python src/scripts/generate_model_summary.py
```

---

## 6️⃣ Run Inference

```bash
python src/inference/run_inference.py data/samples/test_healthy.csv
```

---

## 7️⃣ Start Dashboard

```bash
cd dashboard
cp .env.example .env

npm install
npm run dev
```

<div align="center">

| 🌐 Service | 🔗 URL |
|:----------:|:-------|
| 📊 Dashboard | http://localhost:3000 |
| ⚙️ API | http://localhost:5001 |

</div>

---

# 🧪 Demo Dataset

<div align="center">

| 📄 Sample | ✅ Expected Result |
|:----------|:------------------|
| 🟢 `test_healthy.csv` | 0 anomalies detected |
| 🔴 `test_fault.csv` | All records flagged as anomalies |
| 🟡 `test_mixed.csv` | Partial anomaly detection |

</div>

---

# 🛠️ Tech Stack

### 🤖 Machine Learning — Model Development
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![PyTorch](https://img.shields.io/badge/PyTorch-%23EE4C2C.svg?style=for-the-badge&logo=PyTorch&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=for-the-badge&logo=scikit-learn&logoColor=white)
![pandas](https://img.shields.io/badge/pandas-%23150458.svg?style=for-the-badge&logo=pandas&logoColor=white)
![SciPy](https://img.shields.io/badge/SciPy-%230C55A5.svg?style=for-the-badge&logo=SciPy&logoColor=white)

---

### ⚙️ Backend
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Python](https://img.shields.io/badge/Inference%20Engine-3776AB?style=for-the-badge&logo=python&logoColor=white)

---

### 💻 Frontend
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361dafb)
![TypeScript](https://img.shields.io/badge/typescript-%23007acc.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/three.js-%23000000.svg?style=for-the-badge&logo=three.js&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

---

### 📊 Dataset
![Dataset](https://img.shields.io/badge/Vehicle%20Telemetry%20Dataset-%23434D60?style=for-the-badge&logo=databricks&logoColor=white) 
> **Note:** Contains approximately **~604K Records** for comprehensive health monitoring.

---

<h2 style="font-size: 28px; font-weight: bold; background: linear-gradient(45deg, #434C50, #B2E6C0); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">👥 Team</h2>
<div align="center">
  <table style="border-collapse: collapse; border: none;">
    <tr>
      <td colspan="3" align="center" style="border: none; padding-bottom: 20px;">
        <h2 style="font-size: 28px; font-weight: bold; background: linear-gradient(45deg, #434C50, #B2E6C0); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"></h2>
      </td>
    </tr>
    <tr style="border: none;">
      <td width="30%" valign="top" style="border: none; padding: 10px;">
        <div style="background: #1a1c1e; border: 2px solid #434C50; border-radius: 12px; padding: 20px; box-shadow: 0 0 15px rgba(178, 230, 192, 0.2); animation: pulse 2s infinite alternate;">
          <h3 style="color: #B2E6C0; margin-top: 0;">🤖 ML Engineering</h3>
          <p style="color: #8a9095; font-size: 12px; font-style: italic;">Model Development</p>
          <hr style="border-color: #333; margin: 10px 0;">
          <p style="font-weight: 600; color: #fff; line-height: 1.6;">👨‍💻 Adel Tamer<br>👨‍💻 Marwan Mahmoud</p>
        </div>
      </td>
      <td width="30%" valign="top" style="border: none; padding: 10px;">
        <div style="background: #1a1c1e; border: 2px solid #434C50; border-radius: 12px; padding: 20px; box-shadow: 0 0 15px rgba(255, 114, 94, 0.2); animation: pulse 2s infinite alternate; animation-delay: 0.6s;">
          <h3 style="color: #FF725E; margin-top: 0;">📊 ML Engineering</h3>
          <p style="color: #8a9095; font-size: 12px; font-style: italic;">Data & Preprocessing</p>
          <hr style="border-color: #333; margin: 10px 0;">
          <p style="font-weight: 600; color: #fff; line-height: 1.6;">👨‍💻 Shenouda Safwat<br>👨‍💻 Salah Khafaga</p>
        </div>
      </td>
      <td width="30%" valign="top" style="border: none; padding: 10px;">
        <div style="background: #1a1c1e; border: 2px solid #434C50; border-radius: 12px; padding: 20px; box-shadow: 0 0 15px rgba(178, 230, 192, 0.2); animation: pulse 2s infinite alternate; animation-delay: 1.2s;">
          <h3 style="color: #B2E6C0; margin-top: 0;">🌐 Full-Stack</h3>
          <p style="color: #8a9095; font-size: 11px; font-style: italic;">Dashboard Development</p>
          <hr style="border-color: #333; margin: 10px 0;">
          <p style="font-weight: 600; color: #fff; line-height: 1.6;">👨‍💻 Jawad Tamer<br>👨‍💻 Ekram Hatem</p>
        </div>
      </td>
    </tr>
  </table>
</div>

---

# 📚 Documentation

| 📂 Section | 🛠️ Visual Badge |
|:---|:---|
| 📐 **Architecture & Pipeline Design** | ![Architecture](https://img.shields.io/badge/Architecture_&_Pipeline-%23434D60?style=for-the-badge&logo=diagrams.net&logoColor=white) |
| 🧠 **Model Fine-Tuning & Evaluation** | ![Evaluation](https://img.shields.io/badge/Model_Fine--Tuning-%238A2BE2?style=for-the-badge&logo=weightsandbiases&logoColor=white) |
| 🇪🇬 **Project Overview (Arabic)** | ![Arabic Overview](https://img.shields.io/badge/Project_Overview_--_Arabic-%23B5E6C9?style=for-the-badge&logo=readme&logoColor=black) |
| 📄 **Model Card** | ![Model Card](https://img.shields.io/badge/Model_Card-%23222527?style=for-the-badge&logo=huggingface&logoColor=yellow) |
| 📂 **Dataset** | ![Dataset](https://img.shields.io/badge/Dataset_Folder-%23FF725E?style=for-the-badge&logo=kaggle&logoColor=white) |
| 🤖 **Trained Artifacts** | ![Artifacts](https://img.shields.io/badge/Trained_Artifacts-%2300E5FF?style=for-the-badge&logo=githubactions&logoColor=black) |


---

# 📜 License

This project is licensed under the **MIT License**.

See the **LICENSE** file for details.

---

# 🙏 Acknowledgments

<div align="center">

### 🎓 DEPI R4 — Microsoft Machine Learning Graduation Project

**2026**

</div>



















