/**
 * TypeScript API definitions for SIH26153 Network Attack Forecasting Platform.
 * Maps 1:1 with backend Pydantic models.
 */

export interface HealthResponse {
  status: string;
  database: string;
  database_engine: string;
  version: string;
  offline_mode: boolean;
}

export interface CurrentStateResponse {
  window_index: number;
  timestamp: string;
  duration_sec: number;
  ground_truth_stage: string;
  stage_id: number;
  top_features: Record<string, number>;
  total_bytes: number;
  total_packets: number;
  active_connections: number;
}

export interface ForecastStep {
  step: number;
  stage: string;
  probability: number;
  confidence: number;
  timestamp: string;
  mitre_tactic?: string;
}

export interface ForecastResponse {
  model: string;
  current_stage: string;
  forecast_horizon: number;
  prediction_time: string;
  forecast: ForecastStep[];
  next_stage_probabilities: Record<string, number>;
}

export interface TrajectoryNode {
  node_id: string;
  step: number;
  timestamp: string;
  stage: string;
  stage_id: number;
  state_type: "OBSERVED" | "PREDICTED";
  probability: number;
  confidence: number;
  supporting_features: Record<string, number>;
  mitre_mapping: Record<string, any>;
}

export interface TrajectoryEdge {
  source_node_id: string;
  target_node_id: string;
  transition_probability: number;
  progression_type: string;
  lead_time_sec: number;
}

export interface TrajectoryResponse {
  prediction_time: string;
  current_stage: string;
  forecast_horizon: number;
  forecast: ForecastStep[];
  cumulative_risk_trajectory: number[];
  nodes: TrajectoryNode[];
  edges: TrajectoryEdge[];
}

export interface SignalItem {
  feature_name: string;
  time_window: string;
  observed_value: number;
  attribution_score: number;
  direction: "INCREASES_RISK" | "DECREASES_RISK";
  explanation_text: string;
}

export interface ExplanationResponse {
  explainer_type: string;
  predicted_stage: string;
  confidence: number;
  top_signals: SignalItem[];
  natural_language_summary: string[];
}

export interface MitreTechnique {
  technique_id: string;
  technique_name: string;
  tactic_id: string;
  tactic_name: string;
  status: "OBSERVED TECHNIQUE" | "PREDICTED TECHNIQUE";
  confidence: number;
  evidence: string[];
  stage_id: number;
  stage_name: string;
}

export interface MitreMappingResponse {
  total_techniques: number;
  techniques: MitreTechnique[];
}

export interface FeatureModification {
  feature_name: string;
  original_value: number;
  perturbed_value: number;
  delta?: number;
  rationale: string;
}

export interface SimulateRequest {
  action_type: "HOST_ISOLATION" | "BLOCK_DESTINATION_PORT" | "BLOCK_SUSPICIOUS_SOURCE" | "RESTRICT_OUTBOUND_TRAFFIC";
  target_entity?: string;
  horizon?: number;
}

export interface SimulateResponse {
  disclaimer: string;
  defense_action: {
    action_type: string;
    target_entity: string;
    description: string;
  };
  original_stage: string;
  original_risk: number;
  simulated_risk: number;
  risk_difference: number;
  risk_reduction_pct: number;
  original_forecast: Array<{
    step: number;
    stage: string;
    probability: number;
    lead_time_sec: number;
  }>;
  simulated_forecast: Array<{
    step: number;
    stage: string;
    probability: number;
    lead_time_sec: number;
  }>;
  feature_modifications: FeatureModification[];
  assumptions: string[];
}

export interface RiskTrajectoryResponse {
  timestamp: string;
  current_stage: string;
  current_risk: number;
  forward_risk_trajectory: number[];
}

export interface MetricsResponse {
  dataset: string;
  forecast_horizon: number;
  k_step_accuracy: Record<string, number>;
  k_step_top2_accuracy: Record<string, number>;
  mean_lead_time_sec: number;
  max_lead_time_sec: number;
  total_advance_warnings: number;
  models_compared: Record<string, any>;
}

export interface ReplayTimelineStep {
  step_index: number;
  timestamp: string;
  stage_id: number;
  stage_name: string;
  is_attack: boolean;
  lead_time_offset_sec: number;
  packet_count?: number;
  byte_count?: number;
}

export interface ReplayTimelineResponse {
  scenario_id: string;
  scenario_name: string;
  scenario_type: string;
  total_steps: number;
  window_duration_sec: number;
  description: string;
  available_scenarios: Array<{
    id: string;
    name: string;
    type: string;
    total_steps: number;
  }>;
  timeline: ReplayTimelineStep[];
  has_ground_truth?: boolean;
  pcap_filename?: string;
  packet_count?: number;
  file_size_bytes?: number;
  duration_sec?: number;
  status?: string;
}

export interface LeadTimeEvaluation {
  predicted_at_step: number;
  current_step: number;
  predicted_stage: string;
  actual_stage: string;
  confidence: number;
  lead_time_sec: number;
  is_correct: boolean;
  message: string;
  is_ground_truth_available?: boolean;
}

export interface ReplayStepRequest {
  scenario_id?: string;
  step_index: number;
  horizon?: number;
}

export interface ReplayStepResponse {
  scenario_id: string;
  scenario_type: string;
  step_index: number;
  total_steps: number;
  timestamp: string;
  temporal_causality_verified: boolean;
  future_ground_truth_withheld: boolean;
  has_ground_truth?: boolean;
  pcap_filename?: string;
  packet_count?: number;
  current_state: CurrentStateResponse;
  forecast: ForecastResponse;
  trajectory: TrajectoryResponse;
  lead_time_evaluations: LeadTimeEvaluation[];
  has_advance_warning: boolean;
}

export interface PcapUploadResponse {
  success: boolean;
  message: string;
  scenario_id: string;
  scenario_name: string;
  scenario_type: string;
  filename: string;
  file_size_bytes: number;
  packet_count: number;
  duration_sec: number;
  total_windows: number;
  window_duration_sec: number;
  status: string;
  has_ground_truth: boolean;
  timeline: ReplayTimelineStep[];
}

