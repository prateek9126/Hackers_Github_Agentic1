-- ==============================================================================
-- SIH26153 PostgreSQL Schema Migration: 001_initial_schema.sql
-- Supports: network_states, predictions, trajectories, mitre_predictions,
--           explanations, simulation_results, risk_scores, experiments.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Network States Table S(t)
CREATE TABLE IF NOT EXISTS network_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    window_index INTEGER NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_sec DOUBLE PRECISION NOT NULL,
    features JSONB NOT NULL,
    feature_names JSONB NOT NULL,
    ground_truth_stage VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
    stage_id INTEGER NOT NULL DEFAULT 0,
    active_connections INTEGER NOT NULL DEFAULT 0,
    total_bytes BIGINT NOT NULL DEFAULT 0,
    total_packets BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_states_window ON network_states(window_index);
CREATE INDEX IF NOT EXISTS idx_network_states_time ON network_states(window_start);

-- 2. Predictions Table S(t+1)
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID REFERENCES network_states(id) ON DELETE SET NULL,
    prediction_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    model_type VARCHAR(32) NOT NULL,
    forecast_lead_time_sec DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    predicted_stage VARCHAR(32) NOT NULL,
    predicted_stage_id INTEGER NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    probabilities JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_time ON predictions(prediction_time);

-- 3. Attack Trajectories Table (Multi-Step K-Step Rollout)
CREATE TABLE IF NOT EXISTS trajectories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
    prediction_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    current_stage VARCHAR(32) NOT NULL,
    forecast_horizon INTEGER NOT NULL DEFAULT 5,
    nodes JSONB NOT NULL,
    edges JSONB NOT NULL,
    cumulative_risk JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trajectories_time ON trajectories(prediction_time);

-- 4. MITRE Predictions Table
CREATE TABLE IF NOT EXISTS mitre_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trajectory_id UUID REFERENCES trajectories(id) ON DELETE CASCADE,
    technique_id VARCHAR(32) NOT NULL,
    technique_name VARCHAR(128) NOT NULL,
    tactic_id VARCHAR(32) NOT NULL,
    tactic_name VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL, -- 'OBSERVED TECHNIQUE' or 'PREDICTED TECHNIQUE'
    confidence DOUBLE PRECISION NOT NULL,
    evidence JSONB NOT NULL,
    step INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mitre_technique ON mitre_predictions(technique_id);

-- 5. Explanations Table (TreeSHAP & Integrated Gradients)
CREATE TABLE IF NOT EXISTS explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
    explainer_type VARCHAR(64) NOT NULL,
    predicted_stage VARCHAR(32) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    top_signals JSONB NOT NULL,
    attributions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. What-If Defense Simulation Results Table
CREATE TABLE IF NOT EXISTS simulation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trajectory_id UUID REFERENCES trajectories(id) ON DELETE SET NULL,
    action_type VARCHAR(64) NOT NULL,
    target_entity VARCHAR(128) NOT NULL,
    original_risk DOUBLE PRECISION NOT NULL,
    simulated_risk DOUBLE PRECISION NOT NULL,
    risk_difference DOUBLE PRECISION NOT NULL,
    risk_reduction_pct DOUBLE PRECISION NOT NULL,
    original_forecast JSONB NOT NULL,
    simulated_forecast JSONB NOT NULL,
    feature_modifications JSONB NOT NULL,
    assumptions JSONB NOT NULL,
    disclaimer TEXT NOT NULL,
    simulated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Cumulative Risk Scores Table
CREATE TABLE IF NOT EXISTS risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    current_stage VARCHAR(32) NOT NULL,
    current_risk DOUBLE PRECISION NOT NULL,
    forward_risk_trajectory JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_scores_time ON risk_scores(timestamp);

-- 8. Experiments Table
CREATE TABLE IF NOT EXISTS experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    dataset VARCHAR(128) NOT NULL,
    description TEXT,
    models_evaluated JSONB NOT NULL,
    metrics JSONB NOT NULL,
    lead_time_metrics JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
