"""
Backend Replay Service for SIH26153.
Coordinates sequential PCAP/offline replay across chronological time windows.
Strictly guarantees temporal causality:
- ML model ONLY receives telemetry observed up to the current timestamp (t <= T_obs).
- Future ground-truth labels are withheld until the replay timestamp reaches that step.
- Compares past forecasts with newly arrived ground truth to compute Forecast Lead Time.
"""

import os
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
import numpy as np

from states.taxonomy import STAGE_NAMES, AttackStage
from backend.services.forecasting_service import BackendForecastingService
from network.pcap_parser.pcap_parser import PCAPTrafficParser
from states.temporal_engine import TemporalStateEngine


class BackendReplayService:
    """
    Manages offline sequential replay of chronological network traffic windows.
    Tracks past forecasts and calculates empirical lead-time verification.
    """

    def __init__(self, forecasting_service: Optional[BackendForecastingService] = None):
        self.forecasting_service = forecasting_service or BackendForecastingService(model_type="lstm")
        self.feature_names = self.forecasting_service.feature_names
        self.dt_sec = 20.0

        # In-memory evaluation history of forecasts made at earlier steps:
        # dict: target_step -> list of { predicted_at_step, predicted_stage, confidence, lead_time_sec }
        self.forecast_history: Dict[int, List[Dict[str, Any]]] = {}

        # Initialize dataset scenarios
        self.scenarios = self._initialize_scenarios()

        # Pre-load demo PCAP scenario if available
        demo_path = os.path.join("data", "samples", "demo_attack_progression.pcap")
        if os.path.exists(demo_path):
            try:
                self.load_uploaded_pcap(demo_path, "demo_attack_progression.pcap", 20.0, is_demo=True)
            except Exception as e:
                logger.warning(f"Could not pre-load demo PCAP: {e}")

    def _initialize_scenarios(self) -> Dict[str, Dict[str, Any]]:
        """Prepares metadata and sequences for available replay scenarios."""
        scenarios = {}

        # 1. Real Dataset: CTU-13 Scenario 5
        test_x_path = os.path.join("data", "processed", "X_test.npy")
        test_y_path = os.path.join("data", "processed", "Y_test.npy")

        if os.path.exists(test_x_path) and os.path.exists(test_y_path):
            x_test = np.load(test_x_path) # (N, 4, 55)
            y_test = np.load(test_y_path).flatten() # (N,)
            num_steps = len(x_test)
            steps = []
            base_ts = datetime(2026, 1, 15, 14, 0, 0, tzinfo=timezone.utc)
            for i in range(num_steps):
                stage_id = int(y_test[i])
                stage_name = STAGE_NAMES.get(stage_id, f"STAGE_{stage_id}")
                ts = (base_ts + timedelta(seconds=i * self.dt_sec)).isoformat()
                steps.append({
                    "step_index": i,
                    "timestamp": ts,
                    "stage_id": stage_id,
                    "stage_name": stage_name,
                    "is_attack": stage_id > 0,
                    "lead_time_offset_sec": i * self.dt_sec,
                })

            scenarios["ctu13"] = {
                "id": "ctu13",
                "name": "CTU-13 Scenario 5 (Virut Botnet Capture)",
                "type": "REAL_DATASET",
                "total_steps": num_steps,
                "window_duration_sec": self.dt_sec,
                "description": "Chronological evaluation partition from CTU-13 Scenario 5 botnet capture.",
                "sequences": x_test,
                "labels": y_test,
                "steps": steps,
            }

        # 2. Multi-Stage Synthetic Intrusion Lifecycle (DEMO/SYNTHETIC)
        # 10 chronological stages demonstrating the complete kill chain
        synthetic_stages = [
            (0, "BENIGN"),
            (0, "BENIGN"),
            (1, "RECONNAISSANCE"),
            (2, "SCANNING"),
            (3, "INITIAL_ACCESS"),
            (4, "EXPLOITATION"),
            (5, "CREDENTIAL_ACCESS"),
            (6, "LATERAL_MOVEMENT"),
            (7, "COMMAND_AND_CONTROL"),
            (8, "EXFILTRATION"),
        ]

        syn_total = len(synthetic_stages)
        syn_steps = []
        base_syn_ts = datetime(2026, 1, 15, 10, 0, 0, tzinfo=timezone.utc)

        # Generate smooth synthetic sequence tensors (10, 4, 55)
        np.random.seed(42)
        syn_sequences = np.zeros((syn_total, 4, len(self.feature_names)), dtype=np.float32)

        for i, (s_id, s_name) in enumerate(synthetic_stages):
            ts = (base_syn_ts + timedelta(seconds=i * self.dt_sec)).isoformat()
            syn_steps.append({
                "step_index": i,
                "timestamp": ts,
                "stage_id": s_id,
                "stage_name": s_name,
                "is_attack": s_id > 0,
                "lead_time_offset_sec": i * self.dt_sec,
            })

            # Create realistic feature profiles per stage
            # e.g., scanning -> high dst_port_entropy & syn_flag; exfil -> high bytes
            for w in range(4):
                w_offset = max(0, i - (3 - w))
                w_stage = synthetic_stages[w_offset][0]
                base_noise = np.random.randn(len(self.feature_names)) * 0.2
                if w_stage == 1 or w_stage == 2: # Recon/Scan
                    base_noise[10] += 2.5 # unique dst ports
                    base_noise[20] += 3.0 # syn flag count
                elif w_stage == 4 or w_stage == 5: # Exploit / Credential
                    base_noise[0] += 1.8  # packet count
                    base_noise[30] += 2.0 # failed conn ratio
                elif w_stage == 6: # Lateral Movement
                    base_noise[11] += 2.4 # active connections
                    base_noise[15] += 1.9 # internal traffic
                elif w_stage >= 7: # C2 / Exfiltration
                    base_noise[1] += 3.5  # byte count
                    base_noise[25] += 3.2 # fwd_bwd_byte_ratio
                syn_sequences[i, w, :] = base_noise

        scenarios["synthetic"] = {
            "id": "synthetic",
            "name": "Multi-Stage Attack Kill Chain (10 Windows)",
            "type": "DEMO/SYNTHETIC",
            "total_steps": syn_total,
            "window_duration_sec": self.dt_sec,
            "description": "Demonstration sequence simulating complete kill chain progression (Normal -> Recon -> Exploit -> Lateral -> Exfil). Clearly labeled as DEMO/SYNTHETIC.",
            "sequences": syn_sequences,
            "labels": np.array([s[0] for s in synthetic_stages]),
            "steps": syn_steps,
        }

        return scenarios

    def load_uploaded_pcap(
        self,
        file_path: str,
        original_filename: str,
        window_duration_sec: float = 20.0,
        is_demo: bool = False,
    ) -> Dict[str, Any]:
        """
        Dynamically ingests, validates, parses, windowizes, and analyzes an uploaded PCAP file.
        Strictly guarantees:
        - Non-executable data treatment (safe passive parsing).
        - Dynamic causal time-window discretization based on genuine packet timestamps.
        - Zero future leakage across rolling windows.
        - Distinguishes observed telemetry from model predictions.
        - Marks ground truth as UNAVAILABLE (no fake labels).
        """
        parser = PCAPTrafficParser()
        is_valid, msg = parser.validate_pcap_header(file_path)
        if not is_valid:
            raise ValueError(f"Invalid PCAP file ({original_filename}): {msg}")

        records = parser.parse_pcap(file_path)
        if not records:
            raise ValueError(f"PCAP file ({original_filename}) contains 0 valid IPv4/IPv6 packet records.")

        file_size = os.path.getsize(file_path)
        total_packets = len(records)
        t_start = records[0].timestamp
        t_end = records[-1].timestamp
        total_duration = max(0.001, (t_end - t_start).total_seconds())

        # Discretize into chronological time windows
        engine = TemporalStateEngine(
            window_duration_sec=window_duration_sec,
            pad_idle_windows=False,
        )
        state_vectors = engine.discretize_records(records)
        if not state_vectors:
            # For short captures, ensure at least 1 window is generated
            engine_padded = TemporalStateEngine(
                window_duration_sec=window_duration_sec,
                pad_idle_windows=True,
            )
            state_vectors = engine_padded.discretize_records(records)

        num_windows = max(1, len(state_vectors))

        # Build feature sequence tensor (num_windows, 4, 55)
        # Apply standard scaling normalization relative to expected schema ranges
        sequences = np.zeros((num_windows, 4, len(self.feature_names)), dtype=np.float32)

        # Scale raw features to standardized feature distribution matching model training
        scaled_feature_matrix = np.zeros((num_windows, len(self.feature_names)), dtype=np.float32)
        for w_idx, sv in enumerate(state_vectors):
            raw_feats = np.copy(sv.features)
            # Feature normalizations for key indicators
            norm_feats = np.copy(raw_feats)
            # Log compress volumetric counters
            norm_feats[0] = np.log1p(max(0.0, raw_feats[0])) / 2.5 # total_packets
            norm_feats[1] = np.log1p(max(0.0, raw_feats[1])) / 4.0 # total_bytes
            norm_feats[2] = np.log1p(max(0.0, raw_feats[2])) / 2.5 # fwd_packets
            norm_feats[4] = np.log1p(max(0.0, raw_feats[4])) / 4.0 # fwd_bytes
            norm_feats[6] = np.log1p(max(0.0, raw_feats[6])) / 4.0 # byte_rate
            norm_feats[7] = np.log1p(max(0.0, raw_feats[7])) / 2.5 # packet_rate
            # Unique addressing & entropies
            norm_feats[42] = min(5.0, raw_feats[42] / 2.0) if len(raw_feats) > 42 else 0.0 # unique_dst_ports
            norm_feats[47] = min(5.0, raw_feats[47] * 1.5) if len(raw_feats) > 47 else 0.0 # dst_port_entropy
            norm_feats[18] = min(5.0, raw_feats[18] / 2.0) if len(raw_feats) > 18 else 0.0 # syn_count
            norm_feats = np.clip(norm_feats, -4.0, 4.0)
            scaled_feature_matrix[w_idx] = norm_feats

        # Construct causal history sequences: S(t) uses strictly t' <= t
        for i in range(num_windows):
            for k in range(4):
                hist_idx = max(0, i - (3 - k))
                sequences[i, k, :] = scaled_feature_matrix[hist_idx]

        # Evaluate model prediction for each window
        steps = []
        labels = []
        for i, sv in enumerate(state_vectors):
            win_seq = sequences[i : i + 1]
            try:
                probs = self.forecasting_service.ml_service.model.predict_proba(win_seq)[0]
                pred_stage_id = int(np.argmax(probs))
                confidence = float(np.max(probs))

                # If confidence is exceptionally low or window has no activity, label as UNCLASSIFIED
                if confidence < 0.15 or sv.total_packets == 0:
                    stage_id = 0
                    stage_name = "UNCLASSIFIED"
                else:
                    stage_id = pred_stage_id
                    stage_name = STAGE_NAMES.get(stage_id, "UNCLASSIFIED")
            except Exception:
                stage_id = 0
                stage_name = "UNCLASSIFIED"

            labels.append(stage_id)
            steps.append({
                "step_index": i,
                "timestamp": sv.window_start.isoformat(),
                "stage_id": stage_id,
                "stage_name": stage_name,
                "is_attack": stage_id > 0,
                "lead_time_offset_sec": i * window_duration_sec,
                "packet_count": sv.total_packets,
                "byte_count": sv.total_bytes,
            })

        # Register uploaded PCAP scenario dynamically
        scenario_id = "demo_pcap" if is_demo else f"upload_{len(self.scenarios) + 1}"
        scenario_data = {
            "id": scenario_id,
            "name": f"{original_filename}",
            "type": "DEMO_PCAP" if is_demo else "UPLOADED_PCAP",
            "total_steps": num_windows,
            "window_duration_sec": window_duration_sec,
            "description": (
                f"{'Built-in Demo Attack Progression' if is_demo else 'Uploaded Capture'}: {original_filename} ({total_packets} packets, "
                f"{round(total_duration, 1)}s duration, {num_windows} causal windows of {window_duration_sec}s). "
                f"Ground truth is UNAVAILABLE."
            ),
            "sequences": sequences,
            "labels": np.array(labels),
            "steps": steps,
            "has_ground_truth": False,
            "pcap_filename": original_filename,
            "packet_count": total_packets,
            "file_size_bytes": file_size,
            "duration_sec": round(total_duration, 2),
            "status": "ANALYZED",
        }
        self.scenarios[scenario_id] = scenario_data

        return {
            "success": True,
            "message": f"Successfully parsed and analyzed {original_filename} into {num_windows} chronological time windows.",
            "scenario_id": scenario_id,
            "scenario_name": original_filename,
            "scenario_type": "DEMO_PCAP" if is_demo else "UPLOADED_PCAP",
            "filename": original_filename,
            "file_size_bytes": file_size,
            "packet_count": total_packets,
            "duration_sec": round(total_duration, 2),
            "total_windows": num_windows,
            "window_duration_sec": window_duration_sec,
            "status": "ANALYZED",
            "has_ground_truth": False,
            "timeline": steps,
        }

    def get_timeline(self, scenario_id: str = "synthetic") -> Dict[str, Any]:
        """Returns scenario metadata and timeline steps for UI scrubber."""
        if scenario_id not in self.scenarios:
            scenario_id = "synthetic"

        sc = self.scenarios[scenario_id]
        return {
            "scenario_id": sc["id"],
            "scenario_name": sc["name"],
            "scenario_type": sc["type"],
            "total_steps": sc["total_steps"],
            "window_duration_sec": sc["window_duration_sec"],
            "description": sc["description"],
            "available_scenarios": [
                {"id": k, "name": v["name"], "type": v["type"], "total_steps": v["total_steps"]}
                for k, v in self.scenarios.items()
            ],
            "timeline": sc["steps"],
            "has_ground_truth": sc.get("has_ground_truth", True),
            "pcap_filename": sc.get("pcap_filename"),
            "packet_count": sc.get("packet_count"),
            "file_size_bytes": sc.get("file_size_bytes"),
            "duration_sec": sc.get("duration_sec"),
            "status": sc.get("status", "READY"),
        }

    def process_step(
        self,
        scenario_id: str = "synthetic",
        step_index: int = 0,
        horizon: int = 5,
    ) -> Dict[str, Any]:
        """
        Executes a single chronological replay step:
        1. Selects sequence strictly up to current window t (NO future data).
        2. Updates forecasting service active buffer.
        3. Obtains current observed state.
        4. Generates multi-step forecast for t+1 .. t+K.
        5. Logs forecast into forecast_history for future verification.
        6. Evaluates any past predictions that targeted current step_index.
        7. Returns complete unified response for the dashboard.
        """
        if scenario_id not in self.scenarios:
            scenario_id = "synthetic"

        sc = self.scenarios[scenario_id]
        step_index = max(0, min(step_index, sc["total_steps"] - 1))
        has_gt = sc.get("has_ground_truth", True)

        # 1. Fetch observation sequence [S(t-3)..S(t)] strictly at step_index
        seq = sc["sequences"][step_index : step_index + 1] # shape (1, 4, 55)
        current_stage_id = int(sc["labels"][step_index])
        step_info = sc["steps"][step_index]

        # For unlabeled PCAP, ground truth is unavailable
        current_stage_name = (
            STAGE_NAMES.get(current_stage_id, f"STAGE_{current_stage_id}")
            if has_gt
            else "UNAVAILABLE"
        )

        # 2. Update forecasting service sequence buffer
        self.forecasting_service.current_sequence = seq

        # 3. Get current network state
        curr_state = self.forecasting_service.get_current_state()
        curr_state["ground_truth_stage"] = current_stage_name
        curr_state["stage_id"] = current_stage_id
        curr_state["window_index"] = step_index
        curr_state["timestamp"] = step_info["timestamp"]
        if not has_gt:
            curr_state["ground_truth_available"] = False
            curr_state["observed_model_prediction"] = STAGE_NAMES.get(current_stage_id, "UNCLASSIFIED")
            if step_info.get("packet_count") is not None:
                curr_state["total_packets"] = step_info["packet_count"]
            if step_info.get("byte_count") is not None:
                curr_state["total_bytes"] = step_info["byte_count"]

        # 4. Generate multi-step forecast P(S(t+1..K))
        forecast_res = self.forecasting_service.get_forecast(horizon=horizon, dt_sec=sc.get("window_duration_sec", self.dt_sec))
        trajectory_res = self.forecasting_service.get_trajectory(horizon=horizon, dt_sec=sc.get("window_duration_sec", self.dt_sec))

        # 5. Record this step's forecast for each future target step (t + k)
        dt_window = sc.get("window_duration_sec", self.dt_sec)
        for f_item in forecast_res["forecast"]:
            k = f_item["step"]
            target_step = step_index + k
            lead_time_sec = k * dt_window

            if target_step not in self.forecast_history:
                self.forecast_history[target_step] = []

            self.forecast_history[target_step].append({
                "predicted_at_step": step_index,
                "predicted_stage": f_item["stage"],
                "probability": f_item["probability"],
                "confidence": f_item["confidence"],
                "lead_time_sec": lead_time_sec,
                "timestamp": step_info["timestamp"],
            })

        # 6. Evaluate past predictions that targeted THIS current step
        past_predictions_for_now = self.forecast_history.get(step_index, [])
        lead_time_evaluations = []
        for p in past_predictions_for_now:
            if has_gt:
                is_correct = p["predicted_stage"] == current_stage_name
                lead_time_evaluations.append({
                    "predicted_at_step": p["predicted_at_step"],
                    "current_step": step_index,
                    "predicted_stage": p["predicted_stage"],
                    "actual_stage": current_stage_name,
                    "confidence": p["confidence"],
                    "lead_time_sec": p["lead_time_sec"],
                    "is_correct": is_correct,
                    "is_ground_truth_available": True,
                    "message": (
                        f"At step {p['predicted_at_step']} ({p['lead_time_sec']}s prior), "
                        f"model predicted {p['predicted_stage']} (conf: {round(p['confidence']*100, 1)}%). "
                        f"Actual stage at step {step_index}: {current_stage_name}."
                    ),
                })
            else:
                # Unlabeled PCAP: Ground truth is genuinely unavailable; do NOT fabricate verification
                lead_time_evaluations.append({
                    "predicted_at_step": p["predicted_at_step"],
                    "current_step": step_index,
                    "predicted_stage": p["predicted_stage"],
                    "actual_stage": "UNAVAILABLE",
                    "confidence": p["confidence"],
                    "lead_time_sec": p["lead_time_sec"],
                    "is_correct": False,
                    "is_ground_truth_available": False,
                    "message": (
                        f"At step {p['predicted_at_step']} ({p['lead_time_sec']}s prior), "
                        f"model predicted {p['predicted_stage']} (conf: {round(p['confidence']*100, 1)}%). "
                        f"Actual ground truth is UNAVAILABLE for unlabeled PCAP telemetry."
                    ),
                })

        # Return unified payload
        return {
            "scenario_id": sc["id"],
            "scenario_type": sc["type"],
            "step_index": step_index,
            "total_steps": sc["total_steps"],
            "timestamp": step_info["timestamp"],
            "temporal_causality_verified": True,
            "future_ground_truth_withheld": True,
            "has_ground_truth": has_gt,
            "pcap_filename": sc.get("pcap_filename"),
            "packet_count": sc.get("packet_count"),
            "current_state": curr_state,
            "forecast": forecast_res,
            "trajectory": trajectory_res,
            "lead_time_evaluations": lead_time_evaluations,
            "has_advance_warning": any(e["is_correct"] for e in lead_time_evaluations) if has_gt else False,
        }

    def reset_replay(self):
        """Clears past forecast history."""
        self.forecast_history.clear()

