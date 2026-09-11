# SIH26153 Phase 4: Model Comparison & Benchmark Report

## 1. Experimental Setup
- **Research Question**: Does temporal sequence information improve next attack-stage prediction over instantaneous observation?
- **Dataset**: CTU-13 Scenario 5 (Virut Botnet Capture)
- **Chronological Partitions**: Train (63 windows), Val (13 windows), Test (13 windows)
- **Observation Window W**: 4 windows (80.0 seconds history)
- **Target Horizon**: 1 window forward (S(t+1), 20.0s lead time)

## 2. Performance Comparison Table (Held-Out Test Partition)
| Model | Model Type | Input Context | Accuracy | Macro F1 | Weighted F1 | Macro Precision | Macro Recall | Normal FPR |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Logistic Regression** | Instantaneous (Non-Temporal) | `S(t) (Current window only)` | **22.2%** | **0.0909** | 0.0808 | 0.0556 | 0.2500 | 1.0000 |
| **XGBoost** | Instantaneous (Non-Temporal) | `S(t) (Current window only)` | **22.2%** | **0.0909** | 0.0808 | 0.0556 | 0.2500 | 1.0000 |
| **Temporal LSTM** | Sequential (Temporal) | `[S(t-3), S(t-2), S(t-1), S(t)]` | **22.2%** | **0.0909** | 0.0808 | 0.0556 | 0.2500 | 1.0000 |

## 3. Per-Class F1-Scores on Test Partition
| Attack Stage | Logistic Regression | XGBoost | Temporal LSTM |
| :--- | :--- | :--- | :--- |
| `COMMAND_AND_CONTROL` | 0.0000 | 0.0000 | **0.0000** |
| `EXFILTRATION` | 0.3636 | 0.3636 | **0.3636** |
| `NORMAL` | 0.0000 | 0.0000 | **0.0000** |
| `SCANNING` | 0.0000 | 0.0000 | **0.0000** |

