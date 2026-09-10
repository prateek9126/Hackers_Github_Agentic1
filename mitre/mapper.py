"""
MITRE ATT&CK Mapper for SIH26153.
Maps observed and predicted network behaviors and telemetry features
to concrete MITRE ATT&CK Enterprise techniques with evidence and confidence.
Explicitly distinguishes OBSERVED TECHNIQUE from PREDICTED TECHNIQUE.
"""

import os
import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Union
import numpy as np

from states.taxonomy import AttackStage, STAGE_NAMES


@dataclass
class MitreTechniqueMapping:
    """
    Evidence-based MITRE ATT&CK technique mapping.
    """
    technique_id: str
    technique_name: str
    tactic_id: str
    tactic_name: str
    evidence: List[str]
    confidence: float
    status: str                         # "OBSERVED TECHNIQUE" or "PREDICTED TECHNIQUE"
    stage_id: int
    stage_name: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "technique_id": self.technique_id,
            "technique_name": self.technique_name,
            "tactic_id": self.tactic_id,
            "tactic_name": self.tactic_name,
            "evidence": self.evidence,
            "confidence": round(float(self.confidence), 4),
            "status": self.status,
            "stage_id": self.stage_id,
            "stage_name": self.stage_name,
        }


class MitreMapper:
    """
    Evaluates network telemetry features and attack stages against MITRE rule profiles
    to generate evidence-backed technique attributions.
    """

    def __init__(self, mapping_file: Optional[str] = None):
        if mapping_file is None:
            # Default to adjacent mapping.json
            current_dir = os.path.dirname(os.path.abspath(__file__))
            mapping_file = os.path.join(current_dir, "mapping.json")

        self.mapping_file = mapping_file
        self.rules_registry = self._load_registry()

    def _load_registry(self) -> List[Dict[str, Any]]:
        """Loads technique definition profiles from JSON."""
        if not os.path.exists(self.mapping_file):
            return []
        with open(self.mapping_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("techniques", [])

    def map_state(
        self,
        stage_id: int,
        features: np.ndarray,
        feature_names: List[str],
        is_observed: bool = False,
        stage_confidence: float = 1.0,
    ) -> List[MitreTechniqueMapping]:
        """
        Evaluates a single state's telemetry and attack stage against technique rules.

        Args:
            stage_id: Canonical attack stage index (0..9)
            features: 1D feature vector of shape (D,)
            feature_names: Names corresponding to feature vector indices
            is_observed: True if real telemetry at t <= 0, False if forecasted t > 0
            stage_confidence: Confidence of the stage prediction

        Returns:
            List of matching MitreTechniqueMapping objects with verified evidence.
        """
        # Normal baseline traffic does not produce attack techniques
        if stage_id <= 0:
            return []

        status_str = "OBSERVED TECHNIQUE" if is_observed else "PREDICTED TECHNIQUE"
        stage_name = STAGE_NAMES.get(stage_id, f"STAGE_{stage_id}")
        feat_dict = {name: float(val) for name, val in zip(feature_names, features)}

        matched_mappings: List[MitreTechniqueMapping] = []

        # Find candidate techniques for this attack stage
        candidates = [t for t in self.rules_registry if t.get("primary_stage") == stage_id]

        for candidate in candidates:
            evidence_collected: List[str] = []
            rules = candidate.get("telemetry_rules", [])
            rules_triggered = 0

            for rule in rules:
                feat = rule.get("feature")
                cond = rule.get("condition")
                thresh = rule.get("threshold", 0.0)
                evid_desc = rule.get("evidence", "")

                val = feat_dict.get(feat, None)
                if val is None:
                    continue

                triggered = False
                if cond == "gt" and val > thresh:
                    triggered = True
                elif cond == "lt" and val < thresh:
                    triggered = True
                elif cond == "nonzero" and abs(val) > 1e-4:
                    triggered = True

                if triggered:
                    rules_triggered += 1
                    evidence_collected.append(f"{evid_desc} ({feat}={val:.2f})")

            # Calculate technique confidence
            base_conf = float(candidate.get("base_confidence", 0.75))
            if rules:
                rule_match_ratio = rules_triggered / len(rules)
                # Combined confidence: stage confidence weighted by rule match
                conf = base_conf * stage_confidence * (0.6 + 0.4 * rule_match_ratio)
            else:
                conf = base_conf * stage_confidence

            # If at least one rule matched, or base candidate for stage
            if evidence_collected or (not rules and stage_confidence > 0.3):
                if not evidence_collected:
                    evidence_collected.append(f"Stage behavior aligns with {candidate['technique_name']}.")

                matched_mappings.append(
                    MitreTechniqueMapping(
                        technique_id=candidate["technique_id"],
                        technique_name=candidate["technique_name"],
                        tactic_id=candidate["tactic_id"],
                        tactic_name=candidate["tactic_name"],
                        evidence=evidence_collected,
                        confidence=min(0.99, max(0.10, conf)),
                        status=status_str,
                        stage_id=stage_id,
                        stage_name=stage_name,
                    )
                )

        # Fallback if no specific rule matched but stage is malicious
        if not matched_mappings and stage_id > 0:
            matched_mappings.append(
                MitreTechniqueMapping(
                    technique_id=f"T1000.{stage_id:03d}",
                    technique_name=f"Generic {stage_name} Activity",
                    tactic_id="TA0000",
                    tactic_name=stage_name,
                    evidence=[f"Aggregated telemetry patterns classify state as {stage_name}."],
                    confidence=float(stage_confidence * 0.7),
                    status=status_str,
                    stage_id=stage_id,
                    stage_name=stage_name,
                )
            )

        return matched_mappings
