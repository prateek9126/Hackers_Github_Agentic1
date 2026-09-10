-- ==============================================================================
-- SIH26153 PostgreSQL Schema Definition
-- AI-Based Network Attack Forecasting Platform
-- ==============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Ingestion Jobs Table
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(32) NOT NULL, -- 'pcap', 'zeek', 'csv'
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    total_packets BIGINT DEFAULT 0,
    total_flows BIGINT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Bidirectional Network Flows Table
CREATE TABLE IF NOT EXISTS network_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_ms DOUBLE PRECISION NOT NULL,
    src_ip VARCHAR(45) NOT NULL,
    dst_ip VARCHAR(45) NOT NULL,
    src_port INTEGER NOT NULL,
    dst_port INTEGER NOT NULL,
    protocol VARCHAR(16) NOT NULL,
    fwd_packets INTEGER NOT NULL DEFAULT 0,
    bwd_packets INTEGER NOT NULL DEFAULT 0,
    fwd_bytes BIGINT NOT NULL DEFAULT 0,
    bwd_bytes BIGINT NOT NULL DEFAULT 0,
    tcp_flags JSONB DEFAULT '{}'::jsonb,
    raw_label VARCHAR(64) DEFAULT 'BENIGN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flows_timerange ON network_flows(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_flows_5tuple ON network_flows(src_ip, dst_ip, src_port, dst_port, protocol);

-- 3. Temporal Network States S(t) Table
CREATE TABLE IF NOT EXISTS network_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
    window_index INTEGER NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_sec DOUBLE PRECISION NOT NULL,
    features JSONB NOT NULL, -- Feature array [f1, f2, ..., fD]
    feature_names JSONB NOT NULL,
    active_connections INTEGER NOT NULL DEFAULT 0,
    failed_connections INTEGER NOT NULL DEFAULT 0,
    total_bytes BIGINT NOT NULL DEFAULT 0,
    total_packets BIGINT NOT NULL DEFAULT 0,
    ground_truth_stage VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
    stage_distribution JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_states_job_window ON network_states(job_id, window_index);
CREATE INDEX IF NOT EXISTS idx_states_time ON network_states(window_start);

-- 4. Forecast Runs Table
CREATE TABLE IF NOT EXISTS forecast_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_window_id UUID REFERENCES network_states(id) ON DELETE CASCADE,
    model_name VARCHAR(64) NOT NULL,
    model_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    history_window_w INTEGER NOT NULL,
    forecast_horizon_k INTEGER NOT NULL,
    current_stage VARCHAR(32) NOT NULL,
    current_confidence DOUBLE PRECISION NOT NULL,
    lead_time_seconds DOUBLE PRECISION,
    attributions JSONB DEFAULT '{}'::jsonb, -- Temporal and feature salience
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Forecast Trajectory Steps (P(S(t+1)), ..., P(S(t+K)))
CREATE TABLE IF NOT EXISTS forecast_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_run_id UUID REFERENCES forecast_runs(id) ON DELETE CASCADE,
    step_k INTEGER NOT NULL, -- 1, 2, ..., K
    target_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    stage_probabilities JSONB NOT NULL, -- Key-value map of stage -> probability
    top_predicted_stage VARCHAR(32) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecast_steps_run ON forecast_steps(forecast_run_id, step_k);

-- 6. What-If Defense Simulations Table
CREATE TABLE IF NOT EXISTS defense_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_run_id UUID REFERENCES forecast_runs(id) ON DELETE CASCADE,
    action_type VARCHAR(64) NOT NULL,
    target_entity VARCHAR(128) NOT NULL,
    parameters JSONB NOT NULL,
    original_risk_score DOUBLE PRECISION NOT NULL,
    simulated_risk_score DOUBLE PRECISION NOT NULL,
    risk_reduction_delta DOUBLE PRECISION NOT NULL,
    risk_reduction_pct DOUBLE PRECISION NOT NULL,
    counterfactual_trajectory JSONB NOT NULL,
    simulated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
