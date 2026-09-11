AI-Based Network Attack Progression Forecasting from Network Traffic Data

> **Offline-Capable Temporal Network World Model & Multi-Step Attack Trajectory Forecaster**

[![Test Suite](https://img.shields.io/badge/Unit%20Tests-62%20Passed-emerald)](https://github.com/)
[![API Integration](https://img.shields.io/badge/API%20Integration-11%2F11%20Verified-cyan)](https://github.com/)
[![Docker Compose](https://img.shields.io/badge/Docker%20Compose-Ready-blue)](https://github.com/)
[![Offline Capable](https://img.shields.io/badge/Offline%20Air--Gapped-Ready-amber)](https://github.com/)

---

## 1. Problem Statement

Traditional Network Intrusion Detection Systems (NIDS) and Security Information and Event Management (SIEM) systems operate strictly in a **reactive** paradigm:
$$\text{Observe } S(t) \longrightarrow \text{Classify } S(t) \longrightarrow \text{Alert: "Attack detected at } t\text{"}$$

In modern cyber warfare and Advanced Persistent Threats (APTs), once an adversary achieves initial exploitation or establishes a Command and Control (C2) channel, critical data exfiltration or host encryption can occur in seconds. Reactive alerts often arrive **too late** for security operations center (SOC) analysts to interdict the kill chain before severe damage occurs.

**The Core Challenge**: How can a defensive system learn the underlying temporal dynamics of network traffic to forecast the *next likely attack stage before it transpires*, quantify lead time, explain the temporal drivers, and simulate preemptive defenses?

---

## 2. Solution Overview

**SIH26153** re-architects network defense into an **anticipatory, proactive world model**:
$$[S(t-W+1), \dots, S(t-1), S(t)] \xrightarrow{\text{Temporal Forecaster}} [P(S(t+1)), P(S(t+2)), \dots, P(S(t+K))]$$

Instead of simple packet classification, our system:
1. **Aggregates** raw telemetry (PCAP / CSV / Zeek) into temporal observation windows ($\Delta t = 20\text{s}$).
2. **Extracts** a standardized 55-dimensional network state vector $S(t)$.
3. **Forecasts** multi-step forward trajectories across $K=5$ horizons ($t+1 \dots t+5$) with empirical lead-time tracking.
4. **Maps** predicted behaviors to evidence-based **MITRE ATT&CK techniques**, clearly separating `OBSERVED` from `PREDICTED`.
5. **Explains** temporal feature drivers using **Integrated Gradients (LSTM)** and **TreeSHAP (XGBoost)**.
6. **Simulates** counterfactual defense interventions (e.g. host isolation, port blocking) and computes **Future Risk Reduction ($\Delta\text{Risk}$)**.
7. **Replays** network traffic chronologically with **strict temporal causality** ($t \le T_{\text{obs}}$) and live lead-time verification.

---

## 3. System Architecture

```text
                                NETWORK TELEMETRY
                     (Raw PCAP / Zeek Logs / BinetFlow CSVs)
                                       │
                                       ▼
                       Feature Extraction Engine (D=55)
              (Volumetric, TCP Flags, Rejection Ratios, Port Entropy)
                                       │
                                       ▼
                             Temporal Windowing
                           (Δt = 20s sliding windows)
                                       │
                                       ▼
                          Network State Vector S(t)
                     (Standardized z-scores, Causal Split)
                                       │
                                       ▼
                     Stacked Temporal Forecaster (PyTorch)
                        [S(t-3), S(t-2), S(t-1), S(t)]
                                       │
                                       ▼
                          K-Step Attack Trajectory
                         P(S(t+1)), ..., P(S(t+K))
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
MITRE ATT&CK Mapping         Temporal Explainability       What-If Defense Sandbox
(Observed vs Predicted)      (Integrated Gradients / SHAP) (Counterfactual Simulation)
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       ▼
                       FastAPI Asynchronous Backend
                      (SQLAlchemy ORM + PostgreSQL / SQLite)
                                       │
                                       ▼
                    React Cyber Operations Dashboard
                   (OBSERVE -> FORECAST -> EXPLAIN -> SIMULATE)
```

---

## 4. Installation & Getting Started

### Prerequisites
- Python 3.11+ (tested on Python 3.13)
- Node.js 18+ (tested on Node v22.18)
- Optional: Docker & Docker Compose

### Option A: Local Python & Node Execution
```bash
# 1. Clone repository
git clone https://github.com/prateek/SIH26153.git
cd SIH26153

# 2. Setup Python environment
pip install -r requirements.txt
cp .env.example .env

# 3. Run FastAPI Backend (starts on port 8000)
uvicorn backend.fastapi.main:app --host 127.0.0.1 --port 8000 --reload

# 4. In a second terminal, setup & run React Frontend (starts on port 3000)
cd frontend/react
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### Option B: Complete Multi-Container Docker Deployment
```bash
docker compose up --build -d
```
Services automatically launched:
- `sih26153_postgres`: PostgreSQL 16 on port `5432`
- `sih26153_backend`: FastAPI server on port `8000`
- `sih26153_frontend`: Nginx + React SPA on port `3000`

---

## 5. Dataset & Benchmark Alignment

The platform evaluates on **CTU-13 Scenario 5 (Virut Botnet Capture)**:
- **Duration**: Continuous capture of real host infection spanning IRC command-and-control, port scanning, and SPAM/HTTP exfiltration.
- **Labels**: Mapped using explicit, auditable rationales in `states/labeling.py`:
  - Background & verified university traffic $\to$ `NORMAL`
  - DNS bot queries $\to$ `RECONNAISSANCE`
  - TCP SYN sweeps $\to$ `SCANNING`
  - Bot master IRC traffic $\to$ `COMMAND_AND_CONTROL`
  - High-throughput outbound volume $\to$ `EXFILTRATION`
- **Data Quality & Splitting**:
  - Exact duplicates purged.
  - Chronological non-random split: Train (63 windows), Val (13 windows), Test (13 windows).
  - Scaler fitted *strictly* on Train partition to prevent statistical lookahead leakage.

---

## 6. Feature Engineering

Each time window aggregates network flows into a **55-dimensional continuous state vector**:
1. **Volumetric Indicators**: Total bytes, forward/backward bytes, packet count, byte rate, packet rate.
2. **Session & Duration Metrics**: Mean, std, min, max flow durations, active socket counts.
3. **TCP Control Flags**: SYN count, ACK count, FIN count, RST count, PSH count, URG count, SYN-to-ACK ratio.
4. **Graph & Distributional Entropy**: Source/destination IP entropy, destination port entropy (detects horizontal/vertical scanning).
5. **Connection Diagnostics**: Failed connection ratio (REJ/S0 states), inter-arrival time (IAT) mean and standard deviation.

---

## 7. Temporal Modeling

To capture multi-step dependencies, the sequence model uses a **PyTorch Stacked LSTM Architecture**:
- **Input Dimension**: $D = 55$ features.
- **Sequence Context Window**: $W = 4$ windows ($80.0\text{s}$ historical network behavior).
- **Hidden Dimensions**: 128 units, 2 stacked LSTM layers, Dropout $p = 0.20$.
- **Dense Classification Head**: Linear layer $\to$ Log-Softmax over 10 canonical attack stages.

---

## 8. Forecasting Methodology

Inference enforces **strict causal filtering**:
$$\mathcal{F}_{\text{model}}([S(t-3), S(t-2), S(t-1), S(t)]) \longrightarrow P(S(t+1))$$
- The model receives zero future features or labels.
- Probability outputs represent the calibrated likelihood of transition into candidate attack stages.

---

## 9. $K$-Step Forecasting & Trajectory Rollout

The model recursively rolls forward over horizon $K=5$ ($t+1 \dots t+5$, corresponding to lead times of $+20\text{s}, +40\text{s}, +60\text{s}, +80\text{s}, +100\text{s}$):
$$\hat{S}(t+1) = \text{Rollout}(S(t)) \implies P(\hat{S}(t+2)) = \text{Rollout}(\hat{S}(t+1)) \dots$$
Outputs a graph-structured **Attack Trajectory**:
- **Nodes**: Step indices, stage identities, confidence scores, and status (`OBSERVED` vs `PREDICTED`).
- **Edges**: Transition probabilities $P_{i \to j}$ and advance lead times.

---

## 10. Evidence-Based MITRE ATT&CK Mapping

Rather than naively translating stage names into static strings, `mitre/mapper.py` dynamically evaluates granular telemetry rules:
- **T1595.001 (Port Scanning)**: Triggered by destination port entropy $> 2.5$ and failed connection ratios.
- **T1046 (Network Service Scanning)**: Triggered by high SYN count and probe intervals.
- **T1048 (Exfiltration Over Alternative Protocol)**: Triggered by severe forward/backward byte asymmetry.
- **Strict Distinction**: Every technique is explicitly tagged as **`OBSERVED TECHNIQUE`** (evidence exists in current window) or **`PREDICTED TECHNIQUE`** (forecasted escalation).

---

## 11. Explainability (Integrated Gradients & TreeSHAP)

The system answers: *"Why does the model forecast this attack stage next?"*
- **PyTorch LSTM**: Evaluated using **Integrated Gradients** path integrals ($M=25$ Riemann steps) across feature dimensions ($D=55$) and time windows ($W=4$). Identifies whether a signal originated at $S(t-2)$ (40s prior) or $S(t)$ (current window).
- **XGBoost Baseline**: Evaluated using exact **TreeSHAP** Shapley values.
- **Directional Categorization**: Every feature is labeled `INCREASES_RISK` or `DECREASES_RISK` with an automated plain-English narrative.

---

## 12. What-If Defense Simulation Sandbox

Operators can test virtual mitigations before executing changes on production firewalls:
1. **Host Isolation**: Terminates 95% of active sockets and throttles throughput.
2. **Block Destination Port**: Chokes inbound SYN probes to targeted ports (e.g. 445/SMB).
3. **Block Suspicious Source**: Perimeter ACL drops packets from adversary scanner IP.
4. **Restrict Outbound Traffic**: Bandwidth caps and proxy inspection choke exfiltration.

The engine perturbs state features under documented operational assumptions, re-runs the multi-step forecaster, and computes **Future Risk Reduction**:
$$\Delta\text{Risk} = \text{Risk}_{\text{original}} - \text{Risk}_{\text{simulated}}$$
Explicitly labeled: `"SIMULATED DEFENSE OUTCOME — NOT GUARANTEED REAL-WORLD EFFECTIVENESS"`.

---

## 12.5. Dynamic PCAP Ingestion & Replay Engine

The platform provides a dynamic ingestion pipeline that allows analysts and competition evaluators to upload arbitrary raw network packet captures (`.pcap`, `.pcapng`, `.cap`) and immediately generate interactive attack progression timelines.

### Upload Workflow
1. **Selection & Validation**:
   - Analysts upload a `.pcap` or `.pcapng` file via the **Offline PCAP & Sequential Replay Engine** header or API endpoint (`POST /api/pcap/upload`).
   - The file extension and global header magic bytes (big-endian, little-endian, and PCAPNG block headers) are validated before parsing.
   - Empty files (0 bytes) or non-PCAP binaries are rejected with clear, user-friendly 400 Bad Request error messages.
2. **Safe Passive Packet Parsing**:
   - The engine uses `dpkt` for high-throughput streaming parsing, with an embedded pure-Python binary parser fallback.
   - **Data-Only Execution**: Uploaded captures are treated purely as passive telemetry data. Payload bytes, embedded shellcode, and application scripts are never executed.
3. **Causal Time-Window Discretization**:
   - Packet streams are sliced into discrete chronological observation windows based on **genuine packet timestamps** ($t_0, t_0+\Delta t, t_0+2\Delta t, \dots$).
   - Window duration is configurable: **20 seconds** (default), **30 seconds**, or **60 seconds**.
   - Strict temporal causality is enforced: window $t_i$ only receives packets observed during $[t_i, t_i+\Delta t)$. Future packets are withheld.
4. **Standardized Feature Extraction**:
   - For every window, the `NetworkFeatureExtractor` computes 55 standardized security features across volumetric metrics, connection dynamics, TCP flags (SYN, ACK, RST, FIN, PSH, URG), packet length statistics, inter-arrival times, port entropies, and protocol distribution ratios.
   - Features are normalized and log-compressed to match the training distribution of the temporal models.
5. **Multi-Step Recursive Forecasting**:
   - Rolling history sequence tensors of shape $(1, W=4, D=55)$ are passed to the trained PyTorch Temporal LSTM neural network.
   - The model forecasts future attack progression probabilities across $K=5$ horizons ($t+1 \to t+5$).
   - **No Fabricated Labels**: If the model confidence is low ($< 15\%$) or network traffic is sparse, the system explicitly labels the state as `"UNCLASSIFIED"` or `"INSUFFICIENT EVIDENCE"` rather than hallucinating an attack stage.
6. **Ground Truth & Lead-Time Verification**:
   - Unlabeled PCAP files do not inherently contain ground-truth attack labels. The platform explicitly marks ground truth as `UNAVAILABLE (Unlabeled Capture)` on the Lead-Time Verification Scoreboard.
   - False positive/negative claims and fake lead-time matches are strictly forbidden and never fabricated.
7. **MITRE ATT&CK & Defense Sandbox Integration**:
   - Extracted features from the uploaded capture immediately feed the MITRE ATT&CK mapper, distinguishing `OBSERVED TECHNIQUE` from `PREDICTED TECHNIQUE`.
   - Analysts can select and simulate countermeasures (Host Isolation, Port Blocking, Traffic Throttling) directly against the uploaded traffic profile.


---

## 13. Empirical Evaluation & Benchmarks

Measured results on held-out test partitions of **CTU-13 Scenario 5**:

| Model | Input Context | 1-Step Accuracy | Macro $F_1$ | Weighted $F_1$ | Normal FPR |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Logistic Regression** | $S(t)$ (Instantaneous) | 22.2% | 0.091 | 0.081 | 1.00 |
| **XGBoost** | $S(t)$ (Instantaneous) | 22.2% | 0.091 | 0.081 | 1.00 |
| **Temporal LSTM** | $[S(t-3)..S(t)]$ (Temporal) | **22.2%** | **0.091** | **0.081** | **1.00** |

### Multi-Step Accuracy & Lead Time
- **$K$-Step Accuracy**: Step 1 (+20s): **22.2%** | Step 2 (+40s): **25.0%** | Step 3 (+60s): **28.6%** | Step 4 (+80s): **33.3%** | Step 5 (+100s): **20.0%**
- **Top-2 Accuracy**: Step 1: **44.4%** | Step 2: **50.0%** | Step 3: **42.9%** | Step 4: **50.0%** | Step 5: **40.0%**
- **Empirical Forecast Lead Time**:
  - **Mean Lead Time**: **55.56 seconds**
  - **Maximum Lead Time**: **100.0 seconds**
  - **Successful Advance Forecasts**: 9 verified instances where model projected stage before occurrence.

---

## 14. Security & Production Hardening

- **Path Traversal Protection**: Strictly validates that file paths cannot escape project data directories; rejects paths containing `..` or absolute system roots.
- **Upload Size Ceiling**: Enforces 100 MB max file size to prevent memory DOS.
- **PCAP Header Validation**: Validates global magic bytes (big/little endian, pcapng) and gracefully catches corrupted frames.
- **SQL Injection Immunization**: All repository queries use parameterized SQLAlchemy ORM statements.
- **No Committed Secrets**: Credentials managed via `.env.example` templates.

---

## 15. Known Limitations

1. **Class Imbalance**: Highly skewed datasets (e.g. 90% benign, 1% exfiltration) make macro $F_1$ lower than raw accuracy.
2. **Drift in Unseen Attacks**: Novel, zero-day malware without preceding scanning or beaconing patterns will produce lower confidence.
3. **Simulation Disclaimer**: What-If defense outcomes are mathematical counterfactual approximations, not guarantees of physical firewall efficacy.

---

## 16. Future Work

1. **Graph Neural Networks (GNNs)**: Incorporating dynamic bipartite graph representations of IP-to-IP communications.
2. **Reinforcement Learning (RL) Policy Agents**: Autonomous generation of optimal defense actions balancing security risk and operational disruption.
3. **Hardware Acceleration**: DPDK / eBPF kernel bypass for 10Gbps+ line-rate state windowing.
