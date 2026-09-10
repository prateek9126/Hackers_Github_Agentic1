"""
Multi-Step & Lead Time Evaluation Engine for SIH26153.
Computes K-step accuracy, top-k accuracy, trajectory path accuracy,
and advance forecast lead-time metrics on held-out chronological sequences.
"""

from typing import Dict, List, Optional, Tuple, Any
import numpy as np

from states.taxonomy import AttackStage, STAGE_NAMES, NUM_ATTACK_STAGES
from models.forecasting.recursive_forecaster import RecursiveMultiStepForecaster
from models.forecasting.trajectory import AttackTrajectory


class MultiStepEvaluator:
    """
    Evaluates multi-horizon forecasts against ground-truth chronological state sequences.
    Strictly enforces temporal causality: the model is evaluated at time t,
    making forecasts for t+1 .. t+K, compared retrospectively to actual future states.
    """

    def __init__(
        self,
        forecaster: RecursiveMultiStepForecaster,
        horizon: int = 5,
        dt_sec: float = 20.0,
        num_classes: int = NUM_ATTACK_STAGES,
    ):
        self.forecaster = forecaster
        self.horizon = horizon
        self.dt_sec = dt_sec
        self.num_classes = num_classes

    def evaluate_sequence(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray,
    ) -> Dict[str, Any]:
        """
        Runs multi-step forecasting across continuous test sequences.
        Args:
            X_test: (N, W, D) test feature sequences
            y_test: (N,) ground-truth targets for step t+1
        """
        N = len(X_test)
        if N < 1:
            raise ValueError("Test set must contain at least 1 sequence.")

        y_flat = np.array(y_test).flatten().astype(np.int64)

        # Storage for evaluation
        # Step k accuracy: ground truth is available if t + k < N
        k_correct = {k: 0 for k in range(1, self.horizon + 1)}
        k_total = {k: 0 for k in range(1, self.horizon + 1)}
        top2_correct = {k: 0 for k in range(1, self.horizon + 1)}

        trajectory_matches = 0
        trajectory_total = 0
        trajectory_similarities = []

        # Lead time tracking:
        # lead_time_events: list of dicts with stage, lead_time_sec, t_pred, t_actual
        lead_time_events: List[Dict[str, Any]] = []
        false_warnings = 0
        unwarned_attacks = 0

        # Trajectory rollout for each index t in test set
        for t in range(N):
            sample_x = X_test[t : t + 1] # shape (1, W, D)
            curr_stage = int(y_flat[t - 1]) if t > 0 else 0

            # Run recursive forecast
            traj: AttackTrajectory = self.forecaster.forecast(
                initial_sequence=sample_x,
                horizon=self.horizon,
                dt_sec=self.dt_sec,
                current_time_str=f"window_{t}",
                current_stage_id=curr_stage,
            )

            predicted_stages = [node.stage_id for node in traj.nodes if node.step > 0]
            predicted_probs = [
                np.array([node.probability_distribution.get(STAGE_NAMES.get(c, str(c)), 0.0) for c in range(self.num_classes)])
                for node in traj.nodes if node.step > 0
            ]

            # Ground truth available for steps t .. t + horizon - 1
            # Note: in standard sequence arrays, y_test[t] is the ground truth for window t+1
            actual_stages = []
            for k in range(1, self.horizon + 1):
                actual_idx = t + k - 1
                if actual_idx < N:
                    actual_stage = y_flat[actual_idx]
                    actual_stages.append(actual_stage)

                    pred_stage = predicted_stages[k - 1]
                    pred_dist = predicted_probs[k - 1]

                    # Top-1 accuracy
                    if pred_stage == actual_stage:
                        k_correct[k] += 1
                    k_total[k] += 1

                    # Top-2 accuracy
                    top2 = np.argsort(pred_dist)[-2:]
                    if actual_stage in top2:
                        top2_correct[k] += 1

                    # Lead time calculation:
                    # If actual_stage is an attack stage (> 0)
                    if actual_stage > 0:
                        if pred_stage == actual_stage:
                            # Advance warning achieved!
                            lead_time = k * self.dt_sec
                            lead_time_events.append({
                                "stage_id": int(actual_stage),
                                "stage_name": STAGE_NAMES.get(actual_stage, str(actual_stage)),
                                "lead_time_sec": lead_time,
                                "step": k,
                                "t_pred": t,
                                "t_actual": actual_idx + 1,
                                "confidence": float(pred_dist[actual_stage]),
                            })
                        else:
                            # Model failed to forecast this attack at step k
                            pass

                    # False warning check:
                    # If model predicted an attack stage at step k, but actual is NORMAL (0)
                    if pred_stage > 0 and actual_stage == 0:
                        false_warnings += 1

            # Trajectory path match (only when full horizon is within bounds)
            if len(actual_stages) == self.horizon:
                trajectory_total += 1
                matches = sum(1 for p, a in zip(predicted_stages, actual_stages) if p == a)
                sim = matches / self.horizon
                trajectory_similarities.append(sim)
                if predicted_stages == actual_stages:
                    trajectory_matches += 1

        # Summary statistics
        k_step_acc = {
            f"step_{k} (+{k*self.dt_sec:.0f}s)": round(k_correct[k] / k_total[k], 4) if k_total[k] > 0 else 0.0
            for k in range(1, self.horizon + 1)
        }
        top2_acc = {
            f"step_{k} (+{k*self.dt_sec:.0f}s)": round(top2_correct[k] / k_total[k], 4) if k_total[k] > 0 else 0.0
            for k in range(1, self.horizon + 1)
        }

        traj_exact_acc = round(trajectory_matches / trajectory_total, 4) if trajectory_total > 0 else 0.0
        avg_traj_similarity = round(float(np.mean(trajectory_similarities)), 4) if trajectory_similarities else 0.0

        # Lead time statistics
        if lead_time_events:
            lead_times = [e["lead_time_sec"] for e in lead_time_events]
            mean_lead_time = round(float(np.mean(lead_times)), 2)
            max_lead_time = round(float(np.max(lead_times)), 2)
            min_lead_time = round(float(np.min(lead_times)), 2)
        else:
            mean_lead_time = 0.0
            max_lead_time = 0.0
            min_lead_time = 0.0

        # Breakdown by attack stage
        lead_time_by_stage: Dict[str, Dict[str, Any]] = {}
        for event in lead_time_events:
            name = event["stage_name"]
            if name not in lead_time_by_stage:
                lead_time_by_stage[name] = {"count": 0, "lead_times": []}
            lead_time_by_stage[name]["count"] += 1
            lead_time_by_stage[name]["lead_times"].append(event["lead_time_sec"])

        stage_summary = {}
        for name, data in lead_time_by_stage.items():
            stage_summary[name] = {
                "successful_forecasts": data["count"],
                "mean_lead_time_sec": round(float(np.mean(data["lead_times"])), 2),
                "max_lead_time_sec": round(float(np.max(data["lead_times"])), 2),
            }

        return {
            "horizon": self.horizon,
            "window_duration_sec": self.dt_sec,
            "total_eval_samples": N,
            "k_step_accuracy": k_step_acc,
            "k_step_top2_accuracy": top2_acc,
            "trajectory_exact_match_accuracy": traj_exact_acc,
            "trajectory_average_similarity": avg_traj_similarity,
            "forecast_lead_time": {
                "mean_lead_time_sec": mean_lead_time,
                "max_lead_time_sec": max_lead_time,
                "min_lead_time_sec": min_lead_time,
                "total_successful_advance_forecasts": len(lead_time_events),
                "false_warnings": false_warnings,
                "by_stage": stage_summary,
                "sample_events": lead_time_events[:5], # First 5 sample events
            },
        }
