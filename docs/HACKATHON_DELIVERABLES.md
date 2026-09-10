# SIH26153: Hackathon Deliverables & Judge Defense Dossier

> **Smart India Hackathon 2026** | Problem Statement ID: **SIH26153**  
> **AI-Based Network Attack Forecasting from Network Traffic Data**

---

## 1. Final Architecture Diagram

```text
+--------------------------------------------------------------------------------------------------+
|                                    1. TELEMETRY INGESTION LAYER                                  |
|  - Real PCAP (Scapy streaming / Binary reader)   - Zeek Connection Logs   - NetFlow / CSV Data   |
+--------------------------------------------------------------------------------------------------+
                                                 │
                                                 ▼
+--------------------------------------------------------------------------------------------------+
|                            2. TEMPORAL STATE DISCRETIZATION ENGINE (D=55)                        |
|  - Sliding Time Windows (Δt = 20s)               - Volumetric & Flag Ratios                      |
|  - Destination Port & IP Entropy                 - Inter-Arrival Times (IAT) & TCP State (SF/S0) |
+--------------------------------------------------------------------------------------------------+
                                                 │
                                                 ▼
+--------------------------------------------------------------------------------------------------+
|                              3. TEMPORAL SEQUENCE FORECASTER (PyTorch)                           |
|  - Rolling Context: [S(t-3), S(t-2), S(t-1), S(t)]  (Strictly t <= T_obs, Zero Lookahead)        |
|  - Multi-Horizon Recursive Rollout: K=5 steps forward (Lead Times: +20s, +40s, +60s, +80s, +100s)|
+--------------------------------------------------------------------------------------------------+
                                                 │
             ┌───────────────────────────────────┼───────────────────────────────────┐
             ▼                                   ▼                                   ▼
+─────────────────────────+         +─────────────────────────+         +──────────────────────────+
|  4. MITRE ATT&CK ENGINE |         | 5. EXPLAINABILITY CORE  |         | 6. WHAT-IF DEFENSE SANDBOX|
| - Rule Evidence Matches |         | - Temporal Integrated   |         | - 4 Actions: Host Iso,   |
| - OBSERVED vs PREDICTED |         |   Gradients (LSTM)      |         |   Port Block, Rate Limit |
| - T1595, T1046, T1048   |         | - TreeSHAP (XGBoost)    |         | - Counterfactual Rollout |
| - Confidence Weighting  |         | - Directional Risk Sign |         | - Risk Reduction (ΔRisk) |
+─────────────────────────+         +─────────────────────────+         +──────────────────────────+
             │                                   │                                   │
             └───────────────────────────────────┼───────────────────────────────────┘
                                                 ▼
+--------------------------------------------------------------------------------------------------+
|                                  7. FASTAPI SERVICE & DATA LAYER                                 |
|  - 11 REST Endpoints              - Causal Timestamp Keys             - PostgreSQL 16 / SQLite   |
+--------------------------------------------------------------------------------------------------+
                                                 │
                                                 ▼
+--------------------------------------------------------------------------------------------------+
|                             8. REACT CYBER OPERATIONS DASHBOARD                                  |
|  - Operational Narrative: OBSERVE ➔ FORECAST ➔ EXPLAIN ➔ SIMULATE ➔ RE-FORECAST                  |
|  - Directed Attack Trajectory Graph               - Sequential PCAP Replay with Lead-Time Board  |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Two-Minute Pitch & Demo Script

| Time | Action on Screen | Spoken Script |
| :--- | :--- | :--- |
| **0:00 – 0:20** | Show Title Bar, Health Status, and Current State Card $S(t)$. | *"Respected judges, current SIEMs and IDSs are fundamentally reactive: they alert you only after an asset is compromised. SIH26153 changes this paradigm by predicting attack progression before it happens. Here we see the active 20-second window: the host is in Reconnaissance."* |
| **0:20 – 0:45** | Highlight Forecast Cards and Probability Area Chart. | *"Looking at Step 2: Forecast, our PyTorch Temporal Model predicts with 82% confidence that the attacker will escalate to Scanning within 20 seconds, followed by Exploitation in 40 seconds, and Exfiltration in 100 seconds. This is a forward trajectory, not a retrospective classification."* |
| **0:45 – 1:10** | Scroll to Explainability and MITRE ATT&CK panels. | *"A prediction is useless without trust. Under Step 3: Explain, our temporal Integrated Gradients reveals that port entropy from window S(t-2) and SYN bursts from S(t-1) are driving this forecast. In our MITRE panel, we clearly separate what has already been OBSERVED from what is PREDICTED."* |
| **1:10 – 1:35** | Click 'Isolate Affected Host' in What-If Sandbox. | *"Now, instead of guessing what to do, the analyst opens our What-If Defense Sandbox. We select 'Isolate Affected Host'. The system perturbs the network state features, re-runs the multi-step model, and immediately shows a 60% risk reduction and benign trajectory recovery."* |
| **1:35 – 2:00** | Switch to PCAP Replay mode and step forward to $t=2$. | *"Finally, how do we prove it? In our sequential PCAP Replay mode, we feed traffic strictly one window at a time ($t \le T_{\text{obs}}$). At $t=1$, the model forecasted Reconnaissance; now at $t=2$, Reconnaissance occurs, and our Scoreboard logs a verified advance warning with a +20.0 second lead time. Thank you!"* |

---

## 3. Five-Slide Presentation Outline

### Slide 1: The Reactive Defense Dilemma
- **Headline**: Cyber Defense is Too Slow for Modern Kill Chains.
- **Points**:
  - Signature and point-in-time ML models detect attacks post-facto.
  - Data exfiltration and lateral traversal happen in sub-minute windows.
  - Our Mission: Transform network telemetry into a predictive World Model.

### Slide 2: The Core Innovation — Temporal Attack Progression
- **Headline**: From Packet Inspection to Multi-Step Trajectory Rollout.
- **Points**:
  - $D=55$ flow-level feature extraction aggregated into $\Delta t = 20\text{s}$ windows.
  - Temporal PyTorch LSTM using $[S(t-3) \dots S(t)]$ to forecast $P(S(t+1 \dots t+5))$.
  - Graph-structured Attack Trajectory with edge transition probabilities.

### Slide 3: Evidence-Based MITRE ATT&CK & Deep Explainability
- **Headline**: Transparent, Actionable Threat Intelligence.
- **Points**:
  - Dynamic rule matching (port entropy, SYN/ACK ratios, transfer asymmetry).
  - Explicit distinction between `OBSERVED TECHNIQUE` and `PREDICTED TECHNIQUE`.
  - Temporal Integrated Gradients: attributes risk to specific past time windows.

### Slide 4: Counterfactual What-If Defense Simulation
- **Headline**: Simulate the Cure Before Injecting the Firewall Rule.
- **Points**:
  - Analysts select candidate mitigations (Host Isolation, Port Blocking, Rate Limiting).
  - State features perturbed under operational assumptions $\to$ multi-step re-forecast.
  - Quantified Future Risk Reduction Meter ($\Delta\text{Risk}$).

### Slide 5: Empirical Validation, Causal Integrity & Offline Deployment
- **Headline**: Scientifically Defensible, Air-Gapped Ready.
- **Points**:
  - Verified on CTU-13 Scenario 5 with strict chronological zero-leakage partitions.
  - Average lead time of 55.56 seconds before attack escalations.
  - Standalone Docker deployment (Postgres + FastAPI + React) requiring zero internet.

---

## 4. Technical Methodology & Causal Proof

### Preventing Lookahead & Future Feature Leakage
1. **Chronological Slicing**: Train, Validation, and Test sets are partitioned strictly on time thresholds:
   $$t_{\text{train}} < t_{\text{val}} < t_{\text{test}}$$
   Randomized $K$-fold cross-validation is strictly forbidden as it leaks future temporal patterns.
2. **Standardization Fit**: Feature mean $\mu_{\text{train}}$ and variance $\sigma_{\text{train}}^2$ are calculated *only* on the training partition.
3. **Causal History Window**: At any observation timestamp $T_{\text{obs}}$, model input tensor $\mathbf{X}$ is composed strictly of:
   $$\mathbf{X} = [S(T_{\text{obs}} - 3\Delta t), S(T_{\text{obs}} - 2\Delta t), S(T_{\text{obs}} - \Delta t), S(T_{\text{obs}})]$$
   All events where $t > T_{\text{obs}}$ are strictly withheld.

---

## 5. Comprehensive Judge Q&A Preparation

### Q1: How is this different from a normal IDS or SIEM?
> **Answer**:  
> *"Traditional IDS/SIEM platforms are retroactive: they perform point-in-time classification on traffic that has already traversed the wire ($S(t) \to \text{Alert}$). By the time an alert for 'Data Exfiltration' fires, the data has already left the perimeter.  
> SIH26153 is an anticipatory temporal world model. It processes sliding sequences $[S(t-3) \dots S(t)]$ to forecast the probability distribution of future stages $S(t+1) \dots S(t+K)$ across a multi-step forward horizon. This provides security teams with an advance warning lead time (averaging 55.5 seconds) to preemptively intervene."*

---

### Q2: How do you prove that you actually predict attacks before they happen?
> **Answer**:  
> *"We prove this through our sequential PCAP Replay engine and empirical lead-time evaluation. During offline replay, the model is strictly quarantined: at timestamp $T_{\text{obs}}$, it receives only telemetry where $t \le T_{\text{obs}}$. When the model predicts that an attack stage (e.g., Exploitation) will occur at $t+2$ with 78% probability, that future label is completely withheld.  
> Only when the replay clock advances to $t+2$ does the evaluation engine check the newly arrived ground truth. If Exploitation indeed occurred, it logs a verified advance warning with a lead time of $\Delta t \times 2 = 40.0$ seconds. In our CTU-13 evaluation, we recorded 9 verified advance warnings with an average lead time of 55.56 seconds."*

---

### Q3: How do you prevent data leakage in your ML pipeline?
> **Answer**:  
> *"We enforce four strict anti-leakage controls:  
> 1. **Chronological Splitting**: We never use random k-fold shuffling. Partitions are sliced chronologically ($70\%$ train, $15\%$ val, $15\%$ test).  
> 2. **Isolated Preprocessing**: Feature scalers are fitted solely on the training partition.  
> 3. **Sequence Buffering**: Target labels $y$ are taken strictly from $t+k$, which is temporally forward of the observation window.  
> 4. **Duplicate Cleansing**: Exact duplicate flow records are removed before window aggregation to prevent artificial data weight leakage."*

---

### Q4: Why did you use an LSTM instead of a standard classifier?
> **Answer**:  
> *"Attack progression is inherently a non-Markovian, sequential process. An isolated 20-second burst of SYN packets could be benign port discovery or the beginning of a coordinated multi-stage penetration. The meaning of current telemetry depends on what happened 20, 40, and 60 seconds prior.  
> An LSTM maintains an internal cell state $\mathbf{c}_t$ and hidden state $\mathbf{h}_t$ that captures long-term temporal dependencies and directional rates of change across sliding windows, which instantaneous models like standard Logistic Regression cannot observe."*

---

### Q5: Why not simply use XGBoost?
> **Answer**:  
> *"We actually implemented and benchmarked XGBoost as our primary baseline! While XGBoost is exceptionally strong on tabular flow features, standard tabular formulations evaluate instantaneous snapshots $S(t)$ without temporal context.  
> When flattened multi-window tensors are fed to XGBoost, it treats features as static independent variables rather than a continuous dynamical system, leading to higher false-positive rates on stage transitions. In our benchmark, the LSTM provides smoother trajectory transition probabilities and enables path-integral explainability through Integrated Gradients."*

---

### Q6: How do you map network behavior to MITRE ATT&CK?
> **Answer**:  
> *"We do not naively hardcode static string labels to techniques. Our `MitreMapper` evaluates real empirical telemetry rules against the state vector:  
> - For example, Technique `T1595.001 (Port Scanning)` requires destination port entropy $> 2.5$ and elevated failed connection ratios.  
> - Technique `T1048 (Exfiltration Over Alternative Protocol)` requires high forward-to-backward byte transfer ratios.  
> Furthermore, we formally tag every technique as either `OBSERVED TECHNIQUE` (evidence present in current telemetry) or `PREDICTED TECHNIQUE` (evidence forecasted to manifest in future windows)."*

---

### Q7: How does the What-If Defense Simulator work?
> **Answer**:  
> *"The What-If Simulator is a counterfactual sandbox. An analyst chooses a defensive intervention—such as 'Host Isolation' or 'Block Port 445'. Under documented operational assumptions (e.g. 802.1X quarantine terminates 95% of active sockets and throttles throughput by 90%), the engine perturbs the current state vector $S(t) \to S^*(t)$.  
> It then re-runs the multi-step forecasting model on the perturbed sequence. If the intervention is effective, the future trajectory drops from high-risk stages (Exfiltration) back to Benign baseline, and the system calculates the Future Risk Reduction: $\Delta\text{Risk} = \text{Risk}_{\text{orig}} - \text{Risk}_{\text{sim}}$."*

---

### Q8: How reliable are the predicted probabilities?
> **Answer**:  
> *"Our probabilities are derived from softmax outputs over the 10 canonical attack stages. In multi-step forecasting ($K=5$), uncertainty naturally compounds over time: Step 1 top-2 accuracy is $44.4\%$, while Step 4 top-2 accuracy is $50.0\%$.  
> We do not claim 100% certainty—that would be scientifically dishonest. Instead, we present the full probability distribution and confidence bounds so analysts make calibrated, risk-weighted decisions."*

---

### Q9: What happens when the system encounters an unseen attack?
> **Answer**:  
> *"Our state representation is behavioral and protocol-agnostic, built on 55 statistical invariants: byte asymmetry, connection failure ratios, port entropy, and inter-arrival variances.  
> Even if an adversary uses a novel zero-day exploit, their behavioral footprint—such as lateral remote service sweeps, elevated packet rates, or beaconing inter-arrival consistency—manifests in the feature vector. For unmapped or ambiguous traffic, our taxonomy explicitly tags the state as `UNMAPPED` rather than generating fabricated classifications."*

---

### Q10: Can this platform operate offline in an air-gapped environment?
> **Answer**:  
> *"Yes, 100%. The entire architecture was engineered for air-gapped defense:  
> 1. All ML models (PyTorch LSTM, XGBoost) execute local offline inference on CPU/GPU without external API calls.  
> 2. The database session automatically falls back to a local SQLite database (`sih26153_offline.db`) if an enterprise PostgreSQL server is not present.  
> 3. The React frontend bundles all assets locally with zero external CDN dependencies."*

---

### Q11: What are the genuine limitations of the system?
> **Answer**:  
> *"We believe in scientific honesty:  
> 1. **Temporal Discretization Granularity**: At $\Delta t = 20\text{s}$, ultra-high-speed automated script attacks that execute in under 1 second cannot be forecasted multi-step before completion.  
> 2. **Class Imbalance in Real Traffic**: Real networks are 99% benign, making macro-F1 sensitive to rare attack transitions.  
> 3. **Counterfactual Approximations**: What-If simulations are model-derived estimations based on operational assumptions; they do not replace formal network staging testing."*
