# SIH26153 Dataset Quality & Preprocessing Report

**Generated at**: 2026-09-07T18:56:27.846829+00:00

## 1. Pipeline Configuration
- **Window Duration (Delta_t)**: 20.0 seconds
- **History Window (W)**: 4 windows (80.0s)
- **Forecast Horizon (K)**: 1 window (20.0s)
- **Feature Dimension (D)**: 55 normalized features

## 2. Ingestion & Cleaning Audit
- **Raw File**: `data/raw/ctu13_scenario5.binetflow`
- **Total Raw Rows**: 129,832
- **Duplicates Dropped**: 0
- **Clean Records Retained**: 129,832
- **Total Duration**: 1,805.8 seconds

## 3. Explicit Attack-Stage Mapping Audit
| Dataset Label | Count | Share | Mapped Stage | Conf | Reasoning & Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `flow=To-Background-UDP-CVUT-DNS-Server` | 50,817 | 39.14% | **NORMAL** | 0.95 | Outbound background university traffic to benign public infrastructure. (Limitation: None.) |
| `flow=Background-UDP-Established` | 37,203 | 28.65% | **NORMAL** | 0.95 | Campus network background traffic captured alongside botnet experiment. (Limitation: May occasionally contain untagged ambient university port probes.) |
| `flow=Background-TCP-Established` | 15,156 | 11.67% | **NORMAL** | 0.95 | Campus network background traffic captured alongside botnet experiment. (Limitation: May occasionally contain untagged ambient university port probes.) |
| `flow=Background-Established-cmpgw-CVUT` | 9,331 | 7.19% | **NORMAL** | 0.95 | Campus network background traffic captured alongside botnet experiment. (Limitation: May occasionally contain untagged ambient university port probes.) |
| `flow=Background` | 3,426 | 2.64% | **NORMAL** | 0.95 | Campus network background traffic captured alongside botnet experiment. (Limitation: May occasionally contain untagged ambient university port probes.) |
| `flow=Background-UDP-Attempt` | 2,893 | 2.23% | **NORMAL** | 0.95 | Campus network background traffic captured alongside botnet experiment. (Limitation: May occasionally contain untagged ambient university port probes.) |
| `flow=Background-TCP-Attempt` | 1,847 | 1.42% | **NORMAL** | 0.95 | Campus network background traffic captured alongside botnet experiment. (Limitation: May occasionally contain untagged ambient university port probes.) |
| `flow=From-Normal-V46-Stribrek` | 1,810 | 1.39% | **NORMAL** | 1.0 | Explicitly verified benign control workstation traffic. (Limitation: None.) |
| `flow=From-Normal-V46-Grill` | 1,722 | 1.33% | **NORMAL** | 1.0 | Explicitly verified benign control workstation traffic. (Limitation: None.) |
| `flow=To-Background-CVUT-Proxy` | 1,340 | 1.03% | **NORMAL** | 0.95 | Outbound background university traffic to benign public infrastructure. (Limitation: None.) |
| `flow=From-Normal-V46-Jist` | 1,107 | 0.85% | **NORMAL** | 1.0 | Explicitly verified benign control workstation traffic. (Limitation: None.) |
| `flow=Background-Attempt-cmpgw-CVUT` | 470 | 0.36% | **NORMAL** | 0.95 | Campus network background traffic captured alongside botnet experiment. (Limitation: May occasionally contain untagged ambient university port probes.) |
| `flow=From-Botnet-V46-TCP-Attempt` | 422 | 0.33% | **SCANNING** | 0.9 | Infected host sending rapid TCP SYN probes across wide IP ranges without ACK. (Limitation: Could occasionally represent unreachable C2 dead ends.) |
| `flow=Background-UDP-NTP-Established-1` | 317 | 0.24% | **NORMAL** | 0.95 | Campus network background traffic captured alongside botnet experiment. (Limitation: May occasionally contain untagged ambient university port probes.) |
| `flow=To-Background-CVUT-WebServer` | 254 | 0.2% | **NORMAL** | 0.95 | Outbound background university traffic to benign public infrastructure. (Limitation: None.) |

## 4. Chronological Partitions
### Train Partition
- Windows: 65 (2011-08-15T16:43:20.931208+00:00 to 2011-08-15T17:05:00.931208+00:00)
- Sequence Tensor X Shape: `[61, 4, 55]`
- Target Tensor Y Shape: `[61, 1]`

### Validation Partition
- Windows: 13 (2011-08-15T17:05:00.931208+00:00 to 2011-08-15T17:09:20.931208+00:00)
- Sequence Tensor X Shape: `[9, 4, 55]`
- Target Tensor Y Shape: `[9, 1]`

### Test Partition
- Windows: 13 (2011-08-15T17:09:20.931208+00:00 to 2011-08-15T17:13:40.931208+00:00)
- Sequence Tensor X Shape: `[9, 4, 55]`
- Target Tensor Y Shape: `[9, 1]`

## 5. Temporal Leakage Safeguards Verified
- [x] Strict chronological record monotonicity validated
- [x] Causal window boundary integrity validated (flows < window_end)
- [x] Temporal partition separation validated (max(train) <= min(val) <= min(test))
- [x] Feature normalizer fitted strictly on training partition
- [x] Sequence target causality validated (y(t+1) occurs strictly after S(t))

## 6. Analytical Limitations & Caveats
- Background university traffic is treated as NORMAL, but may contain ambient Internet port probes.
- SPAM activity is mapped to EXFILTRATION based on bulk outbound transmission characteristics.
- Multi-stage progression in single-scenario botnet captures is limited to infection lifespan (~30 minutes in Scenario 5).
- Windows with zero traffic are zero-padded with baseline normal indicators.
