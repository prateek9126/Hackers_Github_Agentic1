"""
What-If Defense Simulation CLI for SIH26153.
Simulates defensive interventions (Host Isolation, Block Port, Block Source, Restrict Outbound),
re-evaluates multi-step attack trajectory, and reports quantified risk reduction.
"""

import os
import sys
import argparse
import numpy as np

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))

from models.forecasting.forecasting_service import AttackForecastingService
from network.feature_extraction.feature_extractor import NetworkFeatureExtractor
from simulation.what_if import (
    WhatIfSimulator,
    create_standard_defense,
    DefenseActionType,
)


def run_what_if_simulation(
    action_type: str = "host_isolation",
    target: str = None,
    model_type: str = "lstm",
    horizon: int = 5,
    dt_sec: float = 20.0,
):
    print("=" * 80)
    print("SIH26153: WHAT-IF DEFENSE SIMULATION ENGINE")
    print("=" * 80)

    # 1. Initialize forecasting service & feature extractor schema
    feature_extractor = NetworkFeatureExtractor()
    feature_names = feature_extractor.feature_names

    service = AttackForecastingService(
        model_type=model_type,
        feature_names=feature_names,
    )

    # 2. Load test sample
    test_data_path = "data/processed/X_test.npy"
    if os.path.exists(test_data_path):
        X_test = np.load(test_data_path)
        sample = X_test[0:1] # shape (1, 4, 55)
    else:
        sample = np.random.randn(1, 4, 55).astype(np.float32)

    # 3. Instantiate WhatIfSimulator
    simulator = WhatIfSimulator(
        forecaster=service.forecaster,
        feature_names=feature_names,
    )

    # 4. Create defense specification
    action_spec = create_standard_defense(action_type=action_type, target=target)

    print(f"\n[1] Selected Defense Intervention:")
    print(f"    * Action Type : {action_spec.action_type.value}")
    print(f"    * Target      : {action_spec.target_entity}")
    print(f"    * Description : {action_spec.description}")

    # 5. Execute simulation
    result = simulator.simulate(
        observation_sequence=sample,
        action=action_spec,
        horizon=horizon,
        dt_sec=dt_sec,
    )

    print(f"\n[2] Feature Modifications Applied Under Operational Assumptions:")
    for mod in result.feature_modifications[:5]:
        print(f"    - {mod['feature']:<22}: {mod['old_value']:+6.2f} -> {mod['new_value']:+6.2f} ({mod['rationale']})")

    print(f"\n[3] Operational Assumptions:")
    for a in result.assumptions:
        print(f"    * {a}")

    print("\n" + "=" * 80)
    print(f"{result.disclaimer}")
    print("=" * 80)

    print(f"\n  RISK COMPARISON METRICS:")
    print(f"    * Original Risk Score  : {result.original_risk:.2f}")
    print(f"    * Simulated Risk Score : {result.simulated_risk:.2f}")
    print(f"    * Net Risk Reduction   : {result.risk_difference:+.2f} ({result.risk_reduction_pct:+.1f}%)")

    print(f"\n  TRAJECTORY FORECAST: BEFORE vs AFTER INTERVENTION:")
    print(f"  {'-'*76}")
    print(f"  {'Step':<8} {'Lead Time':<12} {'BEFORE (Original)':<28} {'AFTER (Simulated)':<28}")
    print(f"  {'-'*76}")

    for orig, sim in zip(result.original_forecast, result.simulated_forecast):
        step_str = f"Step {orig['step']}"
        lead_str = f"+{orig['step']*dt_sec:.0f}s"
        before_str = f"{orig['stage']} ({orig['probability']*100:.1f}%)"
        after_str = f"{sim['stage']} ({sim['probability']*100:.1f}%)"
        print(f"  {step_str:<8} {lead_str:<12} {before_str:<28} {after_str:<28}")

    print(f"  {'-'*76}\n")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="What-If Defense Simulation CLI")
    parser.add_argument(
        "--action",
        type=str,
        default="host_isolation",
        choices=["host_isolation", "block_destination_port", "block_suspicious_source", "restrict_outbound_traffic"],
        help="Defense action to simulate",
    )
    parser.add_argument("--target", type=str, default=None, help="Target entity (IP or port)")
    parser.add_argument("--model", type=str, default="lstm", choices=["lstm", "xgboost", "lr"])
    parser.add_argument("--horizon", type=int, default=5)
    args = parser.parse_args()

    run_what_if_simulation(
        action_type=args.action,
        target=args.target,
        model_type=args.model,
        horizon=args.horizon,
    )
