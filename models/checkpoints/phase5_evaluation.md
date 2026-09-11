# SIH26153 Phase 5: Multi-Step Attack Trajectory & Forecast Lead Time Report

## 1. Experimental Overview
- **Horizon K**: 5 future steps
- **Window Duration**: 20.0 seconds per step
- **Max Forecast Horizon**: 100.0 seconds (1.7 minutes)
- **Evaluation Dataset**: CTU-13 Scenario 5 Held-out Chronological Test Partition

## 2. Multi-Step Accuracy Comparison (K=1 to K=5)

| Step Horizon | Lead Time | Logistic Regression | XGBoost | Temporal LSTM |
| :--- | :--- | :--- | :--- | :--- |
| **Step 1** | +20s | 22.2% | 22.2% | **22.2%** |
| **Step 2** | +40s | 25.0% | 25.0% | **25.0%** |
| **Step 3** | +60s | 28.6% | 28.6% | **28.6%** |
| **Step 4** | +80s | 33.3% | 33.3% | **33.3%** |
| **Step 5** | +100s | 20.0% | 20.0% | **20.0%** |

## 3. Forecast Lead Time & Early Warning Metrics

| Metric | Logistic Regression | XGBoost | Temporal LSTM |
| :--- | :--- | :--- | :--- |
| **Mean Advance Lead Time** | 55.56s | 55.56s | **55.56s** |
| **Max Advance Lead Time** | 100.0s | 100.0s | **100.0s** |
| **Total Advance Warnings** | 9 | 9 | **9** |
| **False Warnings (False Alarms)** | 10 | 10 | **10** |

## 4. Trajectory Path Similarity

| Metric | Logistic Regression | XGBoost | Temporal LSTM |
| :--- | :--- | :--- | :--- |
| **Trajectory Exact Match Accuracy** | 0.0% | 0.0% | **0.0%** |
| **Average Path Similarity** | 28.0% | 28.0% | **28.0%** |
