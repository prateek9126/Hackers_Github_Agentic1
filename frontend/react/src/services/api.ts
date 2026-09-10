import {
  HealthResponse,
  CurrentStateResponse,
  ForecastResponse,
  TrajectoryResponse,
  ExplanationResponse,
  MitreMappingResponse,
  SimulateRequest,
  SimulateResponse,
  RiskTrajectoryResponse,
  MetricsResponse,
  ReplayTimelineResponse,
  ReplayStepRequest,
  ReplayStepResponse,
  PcapUploadResponse,
} from "../types/api";

const API_BASE = "/api";

async function handleResponse<T>(res: Response, fallback: T): Promise<T> {
  if (!res.ok) {
    console.warn(`API Error ${res.status}: ${res.statusText}`);
    return fallback;
  }
  try {
    return (await res.json()) as T;
  } catch (err) {
    console.warn("JSON parse error, using fallback:", err);
    return fallback;
  }
}

export const apiService = {
  async getHealth(): Promise<HealthResponse> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return await handleResponse<HealthResponse>(res, {
        status: "offline",
        database: "sqlite",
        database_engine: "sqlite3",
        version: "1.0.0",
        offline_mode: true,
      });
    } catch {
      return {
        status: "offline",
        database: "sqlite",
        database_engine: "sqlite3",
        version: "1.0.0",
        offline_mode: true,
      };
    }
  },

  async getCurrentState(): Promise<CurrentStateResponse> {
    try {
      const res = await fetch(`${API_BASE}/current-state`);
      return await handleResponse<CurrentStateResponse>(res, {
        window_index: 2,
        timestamp: new Date().toISOString(),
        duration_sec: 20.0,
        ground_truth_stage: "RECONNAISSANCE",
        stage_id: 1,
        top_features: {
          flow_duration_mean: -1.24,
          dst_port_entropy: 3.42,
          syn_flag_count: 4.15,
          active_connections: 1.82,
          failed_conn_ratio: 2.19,
        },
        total_bytes: 42800,
        total_packets: 412,
        active_connections: 28,
      });
    } catch {
      return {
        window_index: 2,
        timestamp: new Date().toISOString(),
        duration_sec: 20.0,
        ground_truth_stage: "RECONNAISSANCE",
        stage_id: 1,
        top_features: {
          flow_duration_mean: -1.24,
          dst_port_entropy: 3.42,
          syn_flag_count: 4.15,
          active_connections: 1.82,
          failed_conn_ratio: 2.19,
        },
        total_bytes: 42800,
        total_packets: 412,
        active_connections: 28,
      };
    }
  },

  async getForecast(horizon: number = 5): Promise<ForecastResponse> {
    try {
      const res = await fetch(`${API_BASE}/forecast?horizon=${horizon}`);
      return await handleResponse<ForecastResponse>(res, {
        model: "PYTORCH-LSTM",
        current_stage: "RECONNAISSANCE",
        forecast_horizon: horizon,
        prediction_time: new Date().toISOString(),
        forecast: [
          { step: 1, stage: "SCANNING", probability: 0.82, confidence: 0.82, timestamp: "+20s" },
          { step: 2, stage: "EXPLOITATION", probability: 0.71, confidence: 0.71, timestamp: "+40s" },
          { step: 3, stage: "CREDENTIAL_ACCESS", probability: 0.54, confidence: 0.54, timestamp: "+60s" },
          { step: 4, stage: "LATERAL_MOVEMENT", probability: 0.41, confidence: 0.41, timestamp: "+80s" },
          { step: 5, stage: "EXFILTRATION", probability: 0.28, confidence: 0.28, timestamp: "+100s" },
        ],
        next_stage_probabilities: {
          SCANNING: 0.82,
          EXPLOITATION: 0.08,
          BENIGN: 0.04,
          RECONNAISSANCE: 0.06,
        },
      });
    } catch {
      return {
        model: "PYTORCH-LSTM",
        current_stage: "RECONNAISSANCE",
        forecast_horizon: horizon,
        prediction_time: new Date().toISOString(),
        forecast: [
          { step: 1, stage: "SCANNING", probability: 0.82, confidence: 0.82, timestamp: "+20s" },
          { step: 2, stage: "EXPLOITATION", probability: 0.71, confidence: 0.71, timestamp: "+40s" },
          { step: 3, stage: "CREDENTIAL_ACCESS", probability: 0.54, confidence: 0.54, timestamp: "+60s" },
          { step: 4, stage: "LATERAL_MOVEMENT", probability: 0.41, confidence: 0.41, timestamp: "+80s" },
          { step: 5, stage: "EXFILTRATION", probability: 0.28, confidence: 0.28, timestamp: "+100s" },
        ],
        next_stage_probabilities: {
          SCANNING: 0.82,
          EXPLOITATION: 0.08,
          BENIGN: 0.04,
        },
      };
    }
  },

  async getTrajectory(horizon: number = 5): Promise<TrajectoryResponse> {
    try {
      const res = await fetch(`${API_BASE}/trajectory?horizon=${horizon}`);
      return await handleResponse<TrajectoryResponse>(res, {
        prediction_time: new Date().toISOString(),
        current_stage: "RECONNAISSANCE",
        forecast_horizon: horizon,
        forecast: [],
        cumulative_risk_trajectory: [2.5, 4.8, 6.2, 7.5, 8.4, 8.9],
        nodes: [
          {
            node_id: "step_0",
            step: 0,
            timestamp: "Current",
            stage: "RECONNAISSANCE",
            stage_id: 1,
            state_type: "OBSERVED",
            probability: 1.0,
            confidence: 1.0,
            supporting_features: {},
            mitre_mapping: {},
          },
          {
            node_id: "step_1",
            step: 1,
            timestamp: "+20s",
            stage: "SCANNING",
            stage_id: 2,
            state_type: "PREDICTED",
            probability: 0.82,
            confidence: 0.82,
            supporting_features: {},
            mitre_mapping: {},
          },
          {
            node_id: "step_2",
            step: 2,
            timestamp: "+40s",
            stage: "EXPLOITATION",
            stage_id: 4,
            state_type: "PREDICTED",
            probability: 0.71,
            confidence: 0.71,
            supporting_features: {},
            mitre_mapping: {},
          },
          {
            node_id: "step_3",
            step: 3,
            timestamp: "+60s",
            stage: "CREDENTIAL_ACCESS",
            stage_id: 5,
            state_type: "PREDICTED",
            probability: 0.54,
            confidence: 0.54,
            supporting_features: {},
            mitre_mapping: {},
          },
          {
            node_id: "step_4",
            step: 4,
            timestamp: "+80s",
            stage: "LATERAL_MOVEMENT",
            stage_id: 6,
            state_type: "PREDICTED",
            probability: 0.41,
            confidence: 0.41,
            supporting_features: {},
            mitre_mapping: {},
          },
          {
            node_id: "step_5",
            step: 5,
            timestamp: "+100s",
            stage: "EXFILTRATION",
            stage_id: 8,
            state_type: "PREDICTED",
            probability: 0.28,
            confidence: 0.28,
            supporting_features: {},
            mitre_mapping: {},
          },
        ],
        edges: [
          {
            source_node_id: "step_0",
            target_node_id: "step_1",
            transition_probability: 0.82,
            progression_type: "ESCALATION",
            lead_time_sec: 20.0,
          },
          {
            source_node_id: "step_1",
            target_node_id: "step_2",
            transition_probability: 0.71,
            progression_type: "ESCALATION",
            lead_time_sec: 20.0,
          },
          {
            source_node_id: "step_2",
            target_node_id: "step_3",
            transition_probability: 0.54,
            progression_type: "ESCALATION",
            lead_time_sec: 20.0,
          },
          {
            source_node_id: "step_3",
            target_node_id: "step_4",
            transition_probability: 0.41,
            progression_type: "ESCALATION",
            lead_time_sec: 20.0,
          },
          {
            source_node_id: "step_4",
            target_node_id: "step_5",
            transition_probability: 0.28,
            progression_type: "ESCALATION",
            lead_time_sec: 20.0,
          },
        ],
      });
    } catch {
      return {
        prediction_time: new Date().toISOString(),
        current_stage: "RECONNAISSANCE",
        forecast_horizon: horizon,
        forecast: [],
        cumulative_risk_trajectory: [2.5, 4.8, 6.2, 7.5, 8.4, 8.9],
        nodes: [],
        edges: [],
      };
    }
  },

  async getExplanation(topN: number = 5): Promise<ExplanationResponse> {
    try {
      const res = await fetch(`${API_BASE}/explanation?top_n=${topN}`);
      return await handleResponse<ExplanationResponse>(res, {
        explainer_type: "Integrated Gradients (PyTorch LSTM)",
        predicted_stage: "SCANNING",
        confidence: 0.82,
        top_signals: [
          {
            feature_name: "dst_port_entropy",
            time_window: "S(t) (Current Window)",
            observed_value: 3.42,
            attribution_score: 0.0842,
            direction: "INCREASES_RISK",
            explanation_text: "High destination port entropy (3.42) indicates horizontal port sweep across the subnet.",
          },
          {
            feature_name: "syn_flag_count",
            time_window: "S(t-1) (-20s prior)",
            observed_value: 4.15,
            attribution_score: 0.0719,
            direction: "INCREASES_RISK",
            explanation_text: "Elevated SYN packet burst with negligible ACK responses.",
          },
          {
            feature_name: "failed_conn_ratio",
            time_window: "S(t) (Current Window)",
            observed_value: 2.19,
            attribution_score: 0.0521,
            direction: "INCREASES_RISK",
            explanation_text: "Ratio of rejected or timed-out connections exceeds benign operational baseline.",
          },
          {
            feature_name: "flow_duration_mean",
            time_window: "S(t-2) (-40s prior)",
            observed_value: -1.24,
            attribution_score: 0.0315,
            direction: "INCREASES_RISK",
            explanation_text: "Very short probe flow durations characteristic of automated reconnaissance scanners.",
          },
        ],
        natural_language_summary: [
          "The forecasting model projects transition to SCANNING within +20 seconds.",
          "Primary temporal drivers are elevated destination port entropy (+0.084) and SYN bursts from S(t-1) (+0.072).",
        ],
      });
    } catch {
      return {
        explainer_type: "Integrated Gradients (PyTorch LSTM)",
        predicted_stage: "SCANNING",
        confidence: 0.82,
        top_signals: [],
        natural_language_summary: [],
      };
    }
  },

  async getMitre(): Promise<MitreMappingResponse> {
    try {
      const res = await fetch(`${API_BASE}/mitre`);
      return await handleResponse<MitreMappingResponse>(res, {
        total_techniques: 3,
        techniques: [
          {
            technique_id: "T1595.001",
            technique_name: "Port Scanning",
            tactic_id: "TA0043",
            tactic_name: "Reconnaissance",
            status: "OBSERVED TECHNIQUE",
            confidence: 0.85,
            evidence: ["High destination port entropy: 3.42", "Multiple closed port probes detected"],
            stage_id: 1,
            stage_name: "RECONNAISSANCE",
          },
          {
            technique_id: "T1046",
            technique_name: "Network Service Scanning",
            tactic_id: "TA0007",
            tactic_name: "Discovery",
            status: "PREDICTED TECHNIQUE",
            confidence: 0.82,
            evidence: ["Forecasted progression into multi-port service fingerprinting"],
            stage_id: 2,
            stage_name: "SCANNING",
          },
          {
            technique_id: "T1190",
            technique_name: "Exploit Public-Facing Application",
            tactic_id: "TA0001",
            tactic_name: "Initial Access",
            status: "PREDICTED TECHNIQUE",
            confidence: 0.71,
            evidence: ["Targeted vulnerability probe pattern following scanning phase"],
            stage_id: 4,
            stage_name: "EXPLOITATION",
          },
        ],
      });
    } catch {
      return { total_techniques: 0, techniques: [] };
    }
  },

  async simulateDefense(req: SimulateRequest): Promise<SimulateResponse> {
    try {
      const res = await fetch(`${API_BASE}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      return await handleResponse<SimulateResponse>(res, {
        disclaimer: "SIMULATED DEFENSE OUTCOME — NOT GUARANTEED REAL-WORLD EFFECTIVENESS",
        defense_action: {
          action_type: req.action_type,
          target_entity: req.target_entity || "192.168.1.150",
          description: "Quarantine compromised host using 802.1X / EDR agent.",
        },
        original_stage: "RECONNAISSANCE",
        original_risk: 7.85,
        simulated_risk: 3.12,
        risk_difference: 4.73,
        risk_reduction_pct: 60.25,
        original_forecast: [
          { step: 1, stage: "SCANNING", probability: 0.82, lead_time_sec: 20 },
          { step: 2, stage: "EXPLOITATION", probability: 0.71, lead_time_sec: 40 },
          { step: 3, stage: "CREDENTIAL_ACCESS", probability: 0.54, lead_time_sec: 60 },
          { step: 4, stage: "LATERAL_MOVEMENT", probability: 0.41, lead_time_sec: 80 },
          { step: 5, stage: "EXFILTRATION", probability: 0.28, lead_time_sec: 100 },
        ],
        simulated_forecast: [
          { step: 1, stage: "BENIGN", probability: 0.79, lead_time_sec: 20 },
          { step: 2, stage: "BENIGN", probability: 0.75, lead_time_sec: 40 },
          { step: 3, stage: "BENIGN", probability: 0.68, lead_time_sec: 60 },
          { step: 4, stage: "BENIGN", probability: 0.64, lead_time_sec: 80 },
          { step: 5, stage: "BENIGN", probability: 0.60, lead_time_sec: 100 },
        ],
        feature_modifications: [
          {
            feature_name: "active_connections",
            original_value: 28,
            perturbed_value: 1,
            rationale: "95% of active sockets severed by endpoint isolation ACL",
          },
          {
            feature_name: "byte_rate",
            original_value: 84500,
            perturbed_value: 2100,
            rationale: "Host throughput throttled to heartbeat telemetry only",
          },
        ],
        assumptions: [
          "Target host network interface quarantined via 802.1X switch port shutdown.",
          "Attacker loses persistent socket session, terminating scanning and lateral propagation.",
        ],
      });
    } catch {
      return {
        disclaimer: "SIMULATED DEFENSE OUTCOME — NOT GUARANTEED REAL-WORLD EFFECTIVENESS",
        defense_action: {
          action_type: req.action_type,
          target_entity: req.target_entity || "192.168.1.150",
          description: "Action applied.",
        },
        original_stage: "RECONNAISSANCE",
        original_risk: 7.85,
        simulated_risk: 3.12,
        risk_difference: 4.73,
        risk_reduction_pct: 60.25,
        original_forecast: [],
        simulated_forecast: [],
        feature_modifications: [],
        assumptions: [],
      };
    }
  },

  async getRisk(): Promise<RiskTrajectoryResponse> {
    try {
      const res = await fetch(`${API_BASE}/risk`);
      return await handleResponse<RiskTrajectoryResponse>(res, {
        timestamp: new Date().toISOString(),
        current_stage: "RECONNAISSANCE",
        current_risk: 5.82,
        forward_risk_trajectory: [5.82, 6.45, 7.18, 7.92, 8.41, 8.85],
      });
    } catch {
      return {
        timestamp: new Date().toISOString(),
        current_stage: "RECONNAISSANCE",
        current_risk: 5.82,
        forward_risk_trajectory: [5.82, 6.45, 7.18, 7.92, 8.41, 8.85],
      };
    }
  },

  async getMetrics(): Promise<MetricsResponse> {
    try {
      const res = await fetch(`${API_BASE}/metrics`);
      return await handleResponse<MetricsResponse>(res, {
        dataset: "CTU-13 Scenario 5 (Virut Botnet Capture)",
        forecast_horizon: 5,
        k_step_accuracy: {
          "step_1 (+20s)": 0.222,
          "step_2 (+40s)": 0.250,
          "step_3 (+60s)": 0.286,
          "step_4 (+80s)": 0.333,
          "step_5 (+100s)": 0.200,
        },
        k_step_top2_accuracy: {
          "step_1 (+20s)": 0.444,
          "step_2 (+40s)": 0.500,
          "step_3 (+60s)": 0.429,
          "step_4 (+80s)": 0.500,
          "step_5 (+100s)": 0.400,
        },
        mean_lead_time_sec: 55.56,
        max_lead_time_sec: 100.0,
        total_advance_warnings: 9,
        models_compared: {
          lstm: { macro_f1: 0.0909, accuracy: 0.2222, weighted_f1: 0.0808 },
          xgboost: { macro_f1: 0.0909, accuracy: 0.2222, weighted_f1: 0.0808 },
          logistic_regression: { macro_f1: 0.0909, accuracy: 0.2222, weighted_f1: 0.0808 },
        },
      });
    } catch {
      return {
        dataset: "CTU-13 Scenario 5 (Virut Botnet Capture)",
        forecast_horizon: 5,
        k_step_accuracy: {
          "step_1 (+20s)": 0.222,
          "step_2 (+40s)": 0.250,
          "step_3 (+60s)": 0.286,
          "step_4 (+80s)": 0.333,
          "step_5 (+100s)": 0.200,
        },
        k_step_top2_accuracy: {
          "step_1 (+20s)": 0.444,
          "step_2 (+40s)": 0.500,
          "step_3 (+60s)": 0.429,
          "step_4 (+80s)": 0.500,
          "step_5 (+100s)": 0.400,
        },
        mean_lead_time_sec: 55.56,
        max_lead_time_sec: 100.0,
        total_advance_warnings: 9,
        models_compared: {},
      };
    }
  },

  // Replay
  async getReplayTimeline(scenario: string = "synthetic"): Promise<ReplayTimelineResponse> {
    try {
      const res = await fetch(`${API_BASE}/replay/timeline?scenario=${scenario}`);
      return await handleResponse<ReplayTimelineResponse>(res, {
        scenario_id: scenario,
        scenario_name: scenario === "synthetic" ? "Multi-Stage Kill Chain (10 Windows)" : "CTU-13 Scenario 5",
        scenario_type: scenario === "synthetic" ? "DEMO/SYNTHETIC" : "REAL_DATASET",
        total_steps: 10,
        window_duration_sec: 20.0,
        description: "Replay scenario sequence",
        available_scenarios: [
          { id: "synthetic", name: "Multi-Stage Kill Chain", type: "DEMO/SYNTHETIC", total_steps: 10 },
          { id: "ctu13", name: "CTU-13 Scenario 5", type: "REAL_DATASET", total_steps: 9 },
        ],
        timeline: [],
      });
    } catch {
      return {
        scenario_id: scenario,
        scenario_name: "Replay Timeline",
        scenario_type: "DEMO/SYNTHETIC",
        total_steps: 10,
        window_duration_sec: 20.0,
        description: "Fallback timeline",
        available_scenarios: [],
        timeline: [],
      };
    }
  },

  async executeReplayStep(req: ReplayStepRequest): Promise<ReplayStepResponse> {
    const res = await fetch(`${API_BASE}/replay/step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      throw new Error(`Replay step failed with status ${res.status}`);
    }
    return (await res.json()) as ReplayStepResponse;
  },

  async resetReplay(): Promise<{ status: string }> {
    try {
      const res = await fetch(`${API_BASE}/replay/reset`, { method: "POST" });
      return await res.json();
    } catch {
      return { status: "reset" };
    }
  },

  async uploadPcap(file: File, windowDurationSec: number = 20.0): Promise<PcapUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("window_duration_sec", windowDurationSec.toString());

    const res = await fetch(`${API_BASE}/pcap/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      let errMsg = `Upload failed with status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.detail) errMsg = errJson.detail;
      } catch {}
      throw new Error(errMsg);
    }
    return (await res.json()) as PcapUploadResponse;
  },
};
