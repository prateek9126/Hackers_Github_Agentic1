# SIH26153 Architectural Specification & Technical Blueprint

## 1. Problem Statement & Motivation
Network intrusions unfold systematically across sequential tactics (Cyber Kill Chain):
$$\text{Reconnaissance} \longrightarrow \text{Scanning} \longrightarrow \text{Exploitation} \longrightarrow \text{Lateral Movement} \longrightarrow \text{C2} \longrightarrow \text{Exfiltration}$$

Existing intrusion detection systems (IDS) and Security Information and Event Management (SIEM) tools are strictly reactive. They alert the security operations center (SOC) only after a stage has occurred:
$$S(t) \longrightarrow \text{Alert}(t)$$

In contrast, **SIH26153** constructs a temporal world model over the network state history:
$$\mathcal{X}_t = [S(t-W+1), \dots, S(t)] \in \mathbb{R}^{W \times D}$$
and forecasts multi-step future state distributions:
$$\hat{\mathcal{Y}}_t = [P(S(t+1)), \dots, P(S(t+K))] \in \mathbb{R}^{K \times C}$$

This gives defenders an **early warning lead time** ($\Delta T_{\text{lead}} = K \cdot \Delta t$) to intervene proactively.

---

## 2. Temporal State Representation $S(t)$

A single observation window $[t, t+\Delta t)$ summarizes all flows and packets active during that interval into $S(t) \in \mathbb{R}^{36}$.

### Feature Vector Composition
1. **Volumetric Dynamics**:
   - `total_bytes`: Aggregate bytes transferred.
   - `total_packets`: Aggregate packet count.
   - `byte_rate`: Bytes per second.
   - `packet_rate`: Packets per second.
   - `fwd_bwd_byte_ratio`: Asymmetry of inbound vs outbound payload volume.
   - `fwd_bwd_packet_ratio`: Ratio of forward to reverse packets.
   - `avg_packet_size`: Mean packet payload length.
   - `packet_size_std`: Standard deviation of packet sizes.
2. **TCP Flag & Handshake Signals**:
   - `syn_count`, `ack_count`, `fin_count`, `rst_count`, `psh_count`, `urg_count`.
   - `syn_ack_ratio`: Divergence from 1.0 flags half-open SYN floods or scanning.
   - `rst_ratio`: High reset ratio flags closed port rejection or teardowns.
3. **Connection Dynamics**:
   - `total_flows`: Unique active 5-tuple conversations.
   - `active_flows`: Persistent open connections.
   - `failed_conn_ratio`: Unsuccessful handshakes / rejected sockets.
   - `half_open_ratio`: Incomplete 3-way handshakes.
   - `short_flow_ratio`: Connections terminating within <1 second.
   - `avg_flow_duration`: Mean session lifetime.
4. **Graph & Topological Distribution**:
   - `unique_src_ips`: Number of distinct communicating source hosts.
   - `unique_dst_ips`: Number of distinct communicating destination targets.
   - `fanout_ratio`: Ratio of destination endpoints to source hosts.
   - `unique_dst_ports`: Number of distinct destination ports touched.
   - `src_port_entropy`: Shannon entropy of source ports.
   - `dst_port_entropy`: Shannon entropy of destination ports.
   - `ip_entropy`: Shannon entropy of IP addressing space.
5. **Protocol Distribution**:
   - Ratios for HTTP, HTTPS, DNS, SSH, SMB, ICMP, and non-standard protocols.

---

## 3. Attack-State Taxonomy & Mapping Strategy

### 10-Stage Canonical Taxonomy
1. `NORMAL` (0)
2. `RECONNAISSANCE` (1)
3. `SCANNING` (2)
4. `INITIAL_ACCESS` (3)
5. `EXPLOITATION` (4)
6. `CREDENTIAL_ACCESS` (5)
7. `LATERAL_MOVEMENT` (6)
8. `COMMAND_AND_CONTROL` (7)
9. `EXFILTRATION` (8)
10. `IMPACT_DOS` (9)

### Resolving Multi-Flow Windows
A single window $[t, t+\Delta t)$ typically contains dozens or hundreds of concurrent flows. The window's ground truth label is resolved hierarchically:
1. If any flow is malicious, the window is classified as an attack window.
2. If multiple attack types appear simultaneously, the stage with the highest severity weight takes precedence as primary ground truth, while a distribution dictionary stores the multi-label proportions for transparency.

---

## 4. Machine Learning & Forecasting Architecture

### 4.1 Baselines First Principle
Before training deep sequential models, the framework computes:
1. **Empirical Markov Chain Baseline**:
   $$T_{i,j} = \frac{N(S(t)=i, S(t+1)=j) + \alpha}{\sum_{k} (N(S(t)=i, S(t)=k) + \alpha)}$$
   Evaluates stationary state transition frequencies.
2. **Flattened Window XGBoost Classifier**:
   Concatenates $[S(t-W+1), \dots, S(t)]$ into a flat 1D vector and evaluates tabular gradient boosting.

### 4.2 Core Model: Stacked Multi-Horizon LSTM
- **Encoder**: 2-layer stacked LSTM with hidden dimension 128 and dropout 0.2.
- **Decoder**: Multi-head projection layers producing independent softmax distributions for horizons $k \in \{1, \dots, K\}$.
- **Loss Function**:
  $$\mathcal{L} = \sum_{k=1}^K \gamma^{k-1} \cdot \mathcal{L}_{\text{CE}}(y_{t+k}, \hat{y}_{t+k})$$
  where $\gamma \in (0, 1]$ prioritizes near-term accuracy while learning longer-term trajectories.

---

## 5. Explainability & Attribution (Why was the prediction made?)
Using **Integrated Gradients** (Sundararajan et al.):
$$\text{Attr}_i(x) = (x_i - x'_i) \times \int_0^1 \frac{\partial F(x' + \alpha(x - x'))}{\partial x_i} d\alpha$$
- **Temporal Attribution**: Evaluates which observation window $t - \tau$ triggered the forecast.
- **Feature Attribution**: Identifies the specific telemetry metrics responsible for the probability shift.

---

## 6. What-If Counterfactual Defense Simulation

Security operators evaluate potential mitigations before taking disruptive remediation actions.

### Perturbation Function:
$$\mathcal{T}_{\text{action}}: S(t) \longrightarrow S^*(t)$$
- Example: Blocking IP drops fanout features:
  $$S^*(t)[\text{fanout\_ratio}] = S(t)[\text{fanout\_ratio}] \times 0.05$$
  $$S^*(t)[\text{failed\_conn\_ratio}] = S(t)[\text{failed\_conn\_ratio}] \times 0.10$$

### Re-Forecasting & Risk Reduction:
$$\mathcal{X}^*_t = [S(t-W+1), \dots, S^*(t)] \xrightarrow{\text{LSTM}} \hat{\mathcal{Y}}^*_t$$
$$\Delta \text{Risk} = \text{Risk}(\hat{\mathcal{Y}}_t) - \text{Risk}(\hat{\mathcal{Y}}^*_t)$$
The SOC dashboard immediately visualizes the anticipated trajectory collapse back to `NORMAL`.

---

## 7. Data Leakage Prevention Guarantees
1. **Strict Temporal Partitioning**: Datasets are partitioned along a monotonic time axis ($t_{\text{train}} < t_{\text{val}} < t_{\text{test}}$). Random shuffling of time-series samples is disallowed.
2. **Frozen Feature Scalers**: Scalers (`StandardScaler`, `MinMaxScaler`) are fit strictly on the training partition and serialized. No validation/test distribution statistics ever contaminate normalization.
3. **Causal Window Slicing**: Sequence windows use strictly retrospective data: $S(t)$ depends only on packets with timestamp $\tau \le t+\Delta t$.
4. **No Future Metadata**: No post-hoc forensic labels or downstream session metrics are incorporated into state features.
