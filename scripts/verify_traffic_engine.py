"""
End-to-End Verification Script for SIH26153 Traffic Engine & Temporal States.
Executes the full pipeline on synthetic sample traffic and prints detailed diagnostic outputs:
1. Sample input records
2. Extracted feature breakdown
3. Temporal state vectors S(t)
4. Temporal leakage audit
5. Observation sequence arrays (X, Y)
"""

import os
import sys
import json
import numpy as np

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))

from network.csv_parser import CSVTrafficParser
from states.temporal_engine import TemporalStateEngine
from states.normalizer import TemporalStateScaler
from states.windowing import TemporalWindowSequenceBuilder
from states.leakage_validator import TemporalLeakageValidator
from states.taxonomy import stage_to_str


def run_verification():
    csv_path = "data/samples/synthetic_traffic.csv"
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} does not exist.")
        return

    print("=" * 80)
    print("SIH26153: PHASE 2 VERIFICATION RUN")
    print("AI-BASED NETWORK ATTACK FORECASTING - TEMPORAL STATE ENGINE")
    print("=" * 80)

    # 1. Ingest & Parse CSV
    parser = CSVTrafficParser()
    records = parser.parse_file(csv_path)
    print(f"\n[1] Ingestion & Parsing:")
    print(f"    - Parsed {len(records)} UnifiedTrafficRecord instances from {csv_path}")
    print(f"    - Time Span: {records[0].timestamp} --> {records[-1].timestamp}")

    # Show 2 sample raw input records
    print("\n    Sample Input Record 0 (Benign Baseline):")
    r0 = records[0]
    print(f"      ts: {r0.timestamp.isoformat()} | {r0.src_ip}:{r0.src_port} -> {r0.dst_ip}:{r0.dst_port} | "
          f"proto: {r0.protocol} | pkts: {r0.total_packets} | bytes: {r0.total_bytes} | label: {r0.raw_label}")

    # Find a scanning attack record
    r_scan = next(r for r in records if r.raw_label == "PortScan")
    print("\n    Sample Input Record (Attack - PortScan):")
    print(f"      ts: {r_scan.timestamp.isoformat()} | {r_scan.src_ip}:{r_scan.src_port} -> {r_scan.dst_ip}:{r_scan.dst_port} | "
          f"proto: {r_scan.protocol} | syn: {r_scan.syn_count} | ack: {r_scan.ack_count} | failed: {r_scan.is_failed} | label: {r_scan.raw_label}")

    # 2. Leakage Validation on Raw Records
    print("\n[2] Chronological Leakage Validation:")
    TemporalLeakageValidator.validate_record_ordering(records)
    print("    [PASS] Strict chronological record ordering verified (t_0 < t_1 < ...).")

    # 3. Discretize into 60-Second Temporal Windows
    window_duration = 60.0
    engine = TemporalStateEngine(window_duration_sec=window_duration, stride_sec=window_duration)
    states = engine.discretize_records(records)
    print(f"\n[3] Temporal State Discretization (Window duration Delta_t = {window_duration}s):")
    print(f"    - Total Generated States: {len(states)}")
    print(f"    - Feature Vector Dimension D: {len(states[0].features)}")

    # 4. Detailed State Inspection
    print("\n[4] Sample Extracted Temporal States S(t):")
    for s in states[:6]:
        print(f"\n    Window {s.window_index:02d} [{s.window_start.strftime('%H:%M:%S')} - {s.window_end.strftime('%H:%M:%S')}]:")
        print(f"      Stage: {s.ground_truth_stage.name:<18} | Flows: {s.active_connections:3d} | "
              f"Bytes: {s.total_bytes:9,d} | Pkts: {s.total_packets:6,d} | Failed: {s.failed_connections:3d}")
        # Show key behavioral telemetry
        f_names = s.feature_names
        feat_vals = {name: s.features[idx] for idx, name in enumerate(f_names)}
        print(f"      Telemetry Sample: byte_rate={feat_vals['byte_rate']:.1f} B/s | "
              f"syn_ack_ratio={feat_vals['syn_ack_ratio']:.2f} | "
              f"dst_port_entropy={feat_vals['dst_port_entropy']:.2f} | "
              f"fanout_ratio={feat_vals['fanout_ratio']:.2f} | "
              f"burst_cv={feat_vals['burst_coefficient_var']:.2f}")

    # 5. Zero-Leakage Normalization
    print("\n[5] Zero-Leakage Feature Scaling (TemporalStateScaler):")
    split_idx = int(len(states) * 0.7)
    train_states = states[:split_idx]
    test_states = states[split_idx:]
    print(f"    - Train Partition: {len(train_states)} windows ({train_states[0].window_start} -> {train_states[-1].window_end})")
    print(f"    - Test Partition:  {len(test_states)} windows ({test_states[0].window_start} -> {test_states[-1].window_end})")

    TemporalLeakageValidator.validate_train_test_split(train_states, test_states=test_states)
    print("    [PASS] Strict temporal train/test split verified (max(train_end) <= min(test_start)).")

    scaler = TemporalStateScaler(method="standard")
    scaler.fit(train_states)
    scaled_train = scaler.transform_all(train_states)
    scaled_test = scaler.transform_all(test_states)
    print(f"    [PASS] Scaler fitted strictly on train partition. Applied to test states without leakage.")
    print(f"    - Test State 0 Normalized Features Sample (First 5): {scaled_test[0].features[:5].round(3)}")

    # 6. Sequence Array Construction for Forecaster
    print("\n[6] Temporal Observation & Target Sequences:")
    W = 4  # 4 past windows = 240 seconds history
    K = 3  # 3 future windows = 180 seconds forward prediction
    seq_builder = TemporalWindowSequenceBuilder(history_window_size=W, forecast_horizon=K)
    X, Y, pivots = seq_builder.build_sequences(states)
    print(f"    - History Window Size (W): {W} ({W * window_duration:.0f} seconds)")
    print(f"    - Forecast Horizon    (K): {K} ({K * window_duration:.0f} seconds)")
    print(f"    - Input Tensor X Shape   : {X.shape} (Samples, Window_W, Features_D)")
    print(f"    - Target Tensor Y Shape  : {Y.shape} (Samples, Horizon_K)")
    print(f"    - Sample Target Y[0]     : {[stage_to_str(y) for y in Y[0]]}")

    TemporalLeakageValidator.validate_sequence_causality(X, Y, pivots, states, K)
    print("    [PASS] Sequence causality verified: All target stages [y(t+1)..y(t+K)] occur strictly after S(t).")

    print("\n" + "=" * 80)
    print("PHASE 2 VALIDATION SUCCESSFUL: ZERO ERRORS, ALL LEAKAGE CHECKS PASSED")
    print("=" * 80)


if __name__ == "__main__":
    run_verification()
