# نظرة عامة على المشروع — AutoMech Fleet Health Monitor

> **DEPI R4 · Microsoft ML Graduation Project · 2026**

---

## المقدمة

**AutoMech Fleet Health Monitor** هو نظام ذكاء اصطناعي للصيانة التنبؤية (Predictive Maintenance) لأساطيل المركبات. يحلل النظام بيانات تيليمتري لـ **14 حساس** (محرك، بطارية، فرامل، تعليق، زيت، حركة) في الوقت الفعلي لاكتشاف الأعطال قبل حدوثها.

### المشكلة

- أساطيل المركبات تولّد **604,000+ قراءة** حساس مع **نسبة أعطال ~2%** فقط
- نموذج يتنبأ دائماً بـ "سليم" يحقق **98% دقة** لكنه **لا يكتشف أي عطل**
- نماذج التعلم غير المُراقَب وحدها تُنتج **إنذارات كاذبة** كثيرة

### الحل

بنينا **Pipeline هجين من 3 مراحل**:

1. **Isolation Forest** — يكتشف الشذوذ الإحصائي في 56 feature مُهندَسة
2. **LSTM AutoEncoder** — يتعلّم أنماط القيادة الطبيعية ويكشف الانحراف الزمني
3. **Fuzzy Logic Fusion** — يدمج إشارات النموذجين في **Risk Score** واحد قابل للتفسير

### النتيجة النهائية

| المؤشر | Isolation Forest | LSTM | **Fuzzy Fusion** |
|--------|-----------------|------|------------------|
| F1 (Anomaly) | 26.9% | 56.4% | **81.5%** |
| Precision | 15.8% | 39.7% | **70.5%** |
| Recall | 91.3% | 97.8% | **96.7%** |
| ROC-AUC | 0.929 | 0.976 | **0.972** |

---

## تصميم الـ Pipeline

```
البيانات الخام (604k صف)
        │
        ▼
┌───────────────────┐
│ 01 Preprocessing  │  تنظيف + معالجة القيم المفقودة
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌────────┐  ┌──────────────┐
│02 EDA  │  │Feature Eng.  │  Rolling mean/std/diff (window=10)
└────────┘  └──────┬───────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
   ┌─────────────┐   ┌─────────────────┐
   │ Isolation   │   │ LSTM            │
   │ Forest      │   │ AutoEncoder     │
   │ (tabular)   │   │ (sequential)    │
   └──────┬──────┘   └────────┬────────┘
          │                   │
          └─────────┬─────────┘
                    ▼
          ┌─────────────────┐
          │ Fuzzy Logic     │  دمج + threshold = 0.9347
          │ Fusion          │
          └────────┬────────┘
                   ▼
          ┌─────────────────┐
          │ Dashboard       │  React + 3D Digital Twin
          │ + Inference API │
          └─────────────────┘
```

---

## Fine-Tuning — ملخص لكل موديل

### 1. Isolation Forest

| المعامل | القيمة النهائية | السبب |
|---------|----------------|-------|
| n_estimators | 200 | استقرار أفضل للـ scores |
| contamination | 0.02031 | مطابق لنسبة الأعطال الفعلية |
| Scaler | RobustScaler | مقاوم للقيم الشاذة |
| Threshold | −0.2137 | تحسين عبر Precision-Recall curve |

**النتيجة:** Recall 91.3% — حساس جداً لكن Precision منخفض (15.8%)

### 2. LSTM AutoEncoder

| المعامل | القيمة النهائية | السبب |
|---------|----------------|-------|
| Architecture | 64 → 16 → 64 | bottleneck يضغط التمثيل |
| Epochs | 15 | Val loss استقر عند 0.00076 |
| Threshold | mean + 3σ = 0.01156 | محافظ على أخطاء التدريب |
| Split | 80/20 chronological | منع data leakage |

**النتيجة:** F1 = 56.4% · ROC-AUC = 0.976 — أقوى نموذج فردي

### 3. Fuzzy Logic Fusion

| المعامل | القيمة النهائية | السبب |
|---------|----------------|-------|
| lstm_weight | 3.5 | LSTM أدق → وزن أعلى في القواعد |
| Percentile scaling | P1–P99 | مقاوم للـ outliers |
| Threshold | 0.9347 | auto-tune لأقصى F1 |

**النتيجة:** F1 = 81.5% · Precision = 70.5% · FP انخفض 73% عن LSTM وحده

---

## الفريق

| الدور | الأعضاء |
|-------|---------|
| ML Engineering | Adel Tamer · Marwan Mahmoud · Salah Khafaga · Shenouda Safwat |
| Dashboard / Full-stack | Jawad Tamer · Ekram Hatem |

---

## الوثائق التفصيلية

- [Architecture (English)](architecture.md)
- [Model Fine-Tuning & Results (English)](model-tuning-results.md)
- [Model Card](model-card.md)
