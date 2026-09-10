"""
Reproducible Preprocessing & Data Quality Pipeline for SIH26153.
Handles dataset loading, cleaning, duplicate detection, missing-value imputation,
explicit attack-stage mapping, temporal windowing, zero-leakage chronological splitting,
and data quality report generation.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any
import os
import json
import logging
import pandas as pd
import numpy as np

from network.schema import UnifiedTrafficRecord
from network.csv_parser import CSVTrafficParser
from states.taxonomy import AttackStage, STAGE_NAMES, stage_to_str
from states.labeling import DatasetLabelMapper
from states.temporal_engine import TemporalStateEngine
from states.normalizer import TemporalStateScaler
from states.windowing import TemporalWindowSequenceBuilder
from states.leakage_validator import TemporalLeakageValidator, TemporalLeakageError
from states.state_builder import NetworkStateVector

logger = logging.getLogger(__name__)


class DatasetPreprocessor:
    """
    End-to-end reproducible preprocessing pipeline converting raw cybersecurity traffic
    into temporally ordered, non-leaking observation sequences for forecasting.
    """

    def __init__(
        self,
        window_duration_sec: float = 60.0,
        history_window_w: int = 4,
        forecast_horizon_k: int = 1,
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15,
    ):
        self.window_duration_sec = window_duration_sec
        self.history_window_w = history_window_w
        self.forecast_horizon_k = forecast_horizon_k
        self.train_ratio = train_ratio
        self.val_ratio = val_ratio
        self.test_ratio = test_ratio

        self.label_mapper = DatasetLabelMapper()
        self.parser = CSVTrafficParser()
        self.temporal_engine = TemporalStateEngine(
            window_duration_sec=self.window_duration_sec,
            stride_sec=self.window_duration_sec,
            label_mapper=self.label_mapper,
        )
        self.scaler = TemporalStateScaler(method="standard")
        self.seq_builder = TemporalWindowSequenceBuilder(
            history_window_size=self.history_window_w,
            forecast_horizon=self.forecast_horizon_k,
        )

    def load_and_clean(
        self, file_path: str, max_rows: Optional[int] = None
    ) -> Tuple[List[UnifiedTrafficRecord], Dict[str, Any]]:
        """
        Loads dataset, detects duplicates, handles missing values, and enforces
        strict chronological ordering.
        """
        logger.info(f"Loading raw dataset from {file_path}")
        df = pd.read_csv(file_path, nrows=max_rows, low_memory=False)
        total_raw_rows = len(df)

        # 1. Duplicate detection
        full_dups = int(df.duplicated().sum())
        # Drop exact byte-for-byte duplicate rows to prevent artificial over-weighting
        df_cleaned = df.drop_duplicates().copy()

        # 2. Missing value audit
        null_counts = {str(k): int(v) for k, v in df_cleaned.isnull().sum().items() if v > 0}

        # 3. Parse into UnifiedTrafficRecord
        records = self.parser.parse_dataframe(df_cleaned)

        # 4. Strict chronological ordering validation
        TemporalLeakageValidator.validate_record_ordering(records)

        cleaning_report = {
            "file_path": file_path,
            "total_raw_rows": total_raw_rows,
            "exact_duplicates_removed": full_dups,
            "clean_records_retained": len(records),
            "missing_values_imputed": null_counts,
            "start_time": records[0].timestamp.isoformat(),
            "end_time": records[-1].timestamp.isoformat(),
            "duration_seconds": (records[-1].timestamp - records[0].timestamp).total_seconds(),
        }

        return records, cleaning_report

    def discretize_states(
        self, records: List[UnifiedTrafficRecord]
    ) -> List[NetworkStateVector]:
        """Discretizes cleaned traffic records into chronological NetworkStateVector S(t)."""
        states = self.temporal_engine.discretize_records(records)
        logger.info(f"Generated {len(states)} temporal state windows (Δt = {self.window_duration_sec}s).")
        return states

    def chronological_split(
        self, states: List[NetworkStateVector]
    ) -> Tuple[List[NetworkStateVector], List[NetworkStateVector], List[NetworkStateVector]]:
        """
        Partitions state windows into strict, non-random chronological partitions:
        Train [0, T_train] -> Val [T_train, T_val] -> Test [T_val, T_end].
        Guarantees zero overlap or future leakage.
        """
        num_states = len(states)
        min_per_partition = self.history_window_w + self.forecast_horizon_k
        if num_states < min_per_partition * 3:
            raise ValueError(
                f"Insufficient states ({num_states}) for 3-way chronological split. "
                f"Each partition requires at least W + K = {min_per_partition} states (total {min_per_partition * 3}). "
                f"Decrease window_duration_sec or W/K for short captures."
            )

        val_size = max(min_per_partition, int(num_states * self.val_ratio))
        test_size = max(min_per_partition, int(num_states * self.test_ratio))
        train_size = num_states - val_size - test_size

        if train_size < min_per_partition:
            raise ValueError(f"Train partition size ({train_size}) < min required ({min_per_partition}).")

        train_states = states[:train_size]
        val_states = states[train_size : train_size + val_size]
        test_states = states[train_size + val_size :]

        # Validate zero-leakage chronological boundaries
        TemporalLeakageValidator.validate_train_test_split(
            train_states, val_states=val_states, test_states=test_states
        )

        return train_states, val_states, test_states

    def scale_features(
        self,
        train_states: List[NetworkStateVector],
        val_states: List[NetworkStateVector],
        test_states: List[NetworkStateVector],
    ) -> Tuple[List[NetworkStateVector], List[NetworkStateVector], List[NetworkStateVector]]:
        """Fits scaler strictly on train_states and transforms val and test states."""
        self.scaler.fit(train_states)
        train_scaled = self.scaler.transform_all(train_states)
        val_scaled = self.scaler.transform_all(val_states)
        test_scaled = self.scaler.transform_all(test_states)
        return train_scaled, val_scaled, test_scaled

    def build_sequences(
        self, states: List[NetworkStateVector]
    ) -> Tuple[np.ndarray, np.ndarray, List[int]]:
        """
        Assembles [S(t-W+1)..S(t)] observation sequences and [y(t+1)..y(t+K)] targets.
        """
        X, Y, pivots = self.seq_builder.build_sequences(states)
        TemporalLeakageValidator.validate_sequence_causality(
            X, Y, pivots, states, K=self.forecast_horizon_k
        )
        return X, Y, pivots

    def run_full_pipeline(
        self, raw_data_path: str, output_dir: str = "data/processed", max_rows: Optional[int] = None
    ) -> Dict[str, Any]:
        """Executes the full pipeline and writes artifacts and diagnostic reports."""
        os.makedirs(output_dir, exist_ok=True)

        # 1. Load & clean
        records, cleaning_report = self.load_and_clean(raw_data_path, max_rows=max_rows)

        # 2. Label inspection & mapping breakdown
        label_counts = {}
        for r in records:
            lbl = r.raw_label
            label_counts[lbl] = label_counts.get(lbl, 0) + 1

        label_mapping_audit = []
        for lbl, cnt in sorted(label_counts.items(), key=lambda x: x[1], reverse=True):
            mapped_stage = self.label_mapper.map_label(lbl)
            rationale = self.label_mapper.get_rationale(lbl)
            label_mapping_audit.append({
                "dataset_label": lbl,
                "count": cnt,
                "percentage": round(cnt / len(records) * 100, 2),
                "mapped_stage": mapped_stage.name,
                "confidence": rationale.confidence if rationale else 0.5,
                "reasoning": rationale.reasoning if rationale else "Heuristic / Default mapping",
                "limitations": rationale.limitations if rationale else "Unverified fallback",
            })

        # 3. Discretize into temporal states
        states = self.discretize_states(records)

        # 4. State-level stage distribution
        state_stage_counts = {}
        for s in states:
            name = s.ground_truth_stage.name
            state_stage_counts[name] = state_stage_counts.get(name, 0) + 1

        # 5. Chronological splitting
        train_states, val_states, test_states = self.chronological_split(states)

        # 6. Zero-leakage scaling
        train_scaled, val_scaled, test_scaled = self.scale_features(
            train_states, val_states, test_states
        )

        # 7. Sequence array generation
        X_train, Y_train, _ = self.build_sequences(train_scaled)
        X_val, Y_val, _ = self.build_sequences(val_scaled)
        X_test, Y_test, _ = self.build_sequences(test_scaled)

        # Save numpy tensors
        np.save(os.path.join(output_dir, "X_train.npy"), X_train)
        np.save(os.path.join(output_dir, "Y_train.npy"), Y_train)
        np.save(os.path.join(output_dir, "X_val.npy"), X_val)
        np.save(os.path.join(output_dir, "Y_val.npy"), Y_val)
        np.save(os.path.join(output_dir, "X_test.npy"), X_test)
        np.save(os.path.join(output_dir, "Y_test.npy"), Y_test)

        feature_names = states[0].feature_names
        with open(os.path.join(output_dir, "feature_names.json"), "w") as f:
            json.dump(feature_names, f, indent=2)

        # 8. Compile Quality Report
        report = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "pipeline_config": {
                "window_duration_sec": self.window_duration_sec,
                "history_window_w": self.history_window_w,
                "forecast_horizon_k": self.forecast_horizon_k,
                "feature_dimension": len(feature_names),
                "train_ratio": self.train_ratio,
                "val_ratio": self.val_ratio,
                "test_ratio": self.test_ratio,
            },
            "cleaning_summary": cleaning_report,
            "label_mapping_audit": label_mapping_audit,
            "temporal_state_distribution": state_stage_counts,
            "partitions": {
                "train": {
                    "num_windows": len(train_states),
                    "start": train_states[0].window_start.isoformat(),
                    "end": train_states[-1].window_end.isoformat(),
                    "sequences_X_shape": list(X_train.shape),
                    "targets_Y_shape": list(Y_train.shape),
                },
                "validation": {
                    "num_windows": len(val_states),
                    "start": val_states[0].window_start.isoformat(),
                    "end": val_states[-1].window_end.isoformat(),
                    "sequences_X_shape": list(X_val.shape),
                    "targets_Y_shape": list(Y_val.shape),
                },
                "test": {
                    "num_windows": len(test_states),
                    "start": test_states[0].window_start.isoformat(),
                    "end": test_states[-1].window_end.isoformat(),
                    "sequences_X_shape": list(X_test.shape),
                    "targets_Y_shape": list(Y_test.shape),
                },
            },
            "leakage_checks_passed": [
                "Strict chronological record monotonicity validated",
                "Causal window boundary integrity validated (flows < window_end)",
                "Temporal partition separation validated (max(train) <= min(val) <= min(test))",
                "Feature normalizer fitted strictly on training partition",
                "Sequence target causality validated (y(t+1) occurs strictly after S(t))",
            ],
            "limitations_and_assumptions": [
                "Background university traffic is treated as NORMAL, but may contain ambient Internet port probes.",
                "SPAM activity is mapped to EXFILTRATION based on bulk outbound transmission characteristics.",
                "Multi-stage progression in single-scenario botnet captures is limited to infection lifespan (~30 minutes in Scenario 5).",
                "Windows with zero traffic are zero-padded with baseline normal indicators.",
            ]
        }

        # Save JSON quality report
        report_json_path = os.path.join(output_dir, "data_quality_report.json")
        with open(report_json_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

        # Save Markdown quality report
        self._write_markdown_report(report, os.path.join(output_dir, "data_quality_report.md"))

        print(f"Reproducible preprocessing complete! Processed arrays and reports saved to {output_dir}")
        return report

    def _write_markdown_report(self, r: Dict[str, Any], out_md_path: str):
        with open(out_md_path, "w", encoding="utf-8") as f:
            f.write("# SIH26153 Dataset Quality & Preprocessing Report\n\n")
            f.write(f"**Generated at**: {r['timestamp']}\n\n")

            f.write("## 1. Pipeline Configuration\n")
            cfg = r["pipeline_config"]
            f.write(f"- **Window Duration (Delta_t)**: {cfg['window_duration_sec']} seconds\n")
            f.write(f"- **History Window (W)**: {cfg['history_window_w']} windows ({cfg['history_window_w'] * cfg['window_duration_sec']}s)\n")
            f.write(f"- **Forecast Horizon (K)**: {cfg['forecast_horizon_k']} window ({cfg['forecast_horizon_k'] * cfg['window_duration_sec']}s)\n")
            f.write(f"- **Feature Dimension (D)**: {cfg['feature_dimension']} normalized features\n\n")

            f.write("## 2. Ingestion & Cleaning Audit\n")
            cln = r["cleaning_summary"]
            f.write(f"- **Raw File**: `{cln['file_path']}`\n")
            f.write(f"- **Total Raw Rows**: {cln['total_raw_rows']:,}\n")
            f.write(f"- **Duplicates Dropped**: {cln['exact_duplicates_removed']:,}\n")
            f.write(f"- **Clean Records Retained**: {cln['clean_records_retained']:,}\n")
            f.write(f"- **Total Duration**: {cln['duration_seconds']:,.1f} seconds\n\n")

            f.write("## 3. Explicit Attack-Stage Mapping Audit\n")
            f.write("| Dataset Label | Count | Share | Mapped Stage | Conf | Reasoning & Limitations |\n")
            f.write("| :--- | :--- | :--- | :--- | :--- | :--- |\n")
            for item in r["label_mapping_audit"][:15]:
                f.write(f"| `{item['dataset_label']}` | {item['count']:,} | {item['percentage']}% | "
                        f"**{item['mapped_stage']}** | {item['confidence']} | {item['reasoning']} (Limitation: {item['limitations']}) |\n")
            f.write("\n")

            f.write("## 4. Chronological Partitions\n")
            for p_name, p in r["partitions"].items():
                f.write(f"### {p_name.capitalize()} Partition\n")
                f.write(f"- Windows: {p['num_windows']} ({p['start']} to {p['end']})\n")
                f.write(f"- Sequence Tensor X Shape: `{p['sequences_X_shape']}`\n")
                f.write(f"- Target Tensor Y Shape: `{p['targets_Y_shape']}`\n\n")

            f.write("## 5. Temporal Leakage Safeguards Verified\n")
            for chk in r["leakage_checks_passed"]:
                f.write(f"- [x] {chk}\n")
            f.write("\n")

            f.write("## 6. Analytical Limitations & Caveats\n")
            for lim in r["limitations_and_assumptions"]:
                f.write(f"- {lim}\n")
