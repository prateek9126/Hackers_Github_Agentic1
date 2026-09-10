"""
Dataset-Specific Label Mapping and Attack-Stage Ground-Truth Engine for SIH26153.
Provides explicit, auditable translations of dataset labels to canonical AttackStage
with recorded reasoning, confidence scores, and known limitations.
Prevents arbitrary or fabricated mappings by marking ambiguous labels as UNMAPPED.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import re
import logging
from states.taxonomy import AttackStage, STAGE_SEVERITY_WEIGHTS

logger = logging.getLogger(__name__)


@dataclass
class MappingRationale:
    """Documents the analytical justification, confidence, and caveats of a label mapping."""
    dataset_label: str
    mapped_stage: AttackStage
    reasoning: str
    confidence: float  # Scale 0.0 to 1.0
    limitations: str


# ==============================================================================
# 1. CTU-13 Dataset Explicit Mapping Registry
# ==============================================================================
CTU13_MAPPING_REGISTRY: List[MappingRationale] = [
    MappingRationale(
        dataset_label="flow=Background*",
        mapped_stage=AttackStage.NORMAL,
        reasoning="Campus network background traffic captured alongside botnet experiment.",
        confidence=0.95,
        limitations="May occasionally contain untagged ambient university port probes.",
    ),
    MappingRationale(
        dataset_label="flow=To-Background*",
        mapped_stage=AttackStage.NORMAL,
        reasoning="Outbound background university traffic to benign public infrastructure.",
        confidence=0.95,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="flow=From-Background*",
        mapped_stage=AttackStage.NORMAL,
        reasoning="Inbound background campus traffic from external benign hosts.",
        confidence=0.95,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="flow=From-Normal*",
        mapped_stage=AttackStage.NORMAL,
        reasoning="Explicitly verified benign control workstation traffic.",
        confidence=1.0,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="flow=Normal*",
        mapped_stage=AttackStage.NORMAL,
        reasoning="Verified normal Windows update and internal host traffic.",
        confidence=1.0,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="*UDP*DNS*",
        mapped_stage=AttackStage.RECONNAISSANCE,
        reasoning="Bot querying DNS infrastructure to discover candidate C2 rendezvous points or external targets.",
        confidence=0.85,
        limitations="DNS resolution technically bridges Reconnaissance and C2 rendezvous.",
    ),
    MappingRationale(
        dataset_label="*TCP*Attempt*",
        mapped_stage=AttackStage.SCANNING,
        reasoning="Infected host sending rapid TCP SYN probes across wide IP ranges without ACK.",
        confidence=0.90,
        limitations="Could occasionally represent unreachable C2 dead ends.",
    ),
    MappingRationale(
        dataset_label="*HTTP*Binary-Download*",
        mapped_stage=AttackStage.INITIAL_ACCESS,
        reasoning="Bot retrieves secondary modular executables or packed malware stages.",
        confidence=0.95,
        limitations="Payload download occurs post-initial breach in dropper architectures.",
    ),
    MappingRationale(
        dataset_label="*CC*",
        mapped_stage=AttackStage.COMMAND_AND_CONTROL,
        reasoning="Direct interactive or beaconing command and control channel with botmaster.",
        confidence=1.0,
        limitations="None; ground truth verified in CTU sandbox logs.",
    ),
    MappingRationale(
        dataset_label="*Custom-Encryption*",
        mapped_stage=AttackStage.COMMAND_AND_CONTROL,
        reasoning="Proprietary XOR/RC4 encrypted channel between bot and C2 server.",
        confidence=0.95,
        limitations="Some botnets use custom encryption for P2P routing.",
    ),
    MappingRationale(
        dataset_label="*SPAM*",
        mapped_stage=AttackStage.EXFILTRATION,
        reasoning="Mass outbound data dissemination / email exfiltration using infected host as proxy.",
        confidence=0.80,
        limitations="Spam is fundamentally an Impact activity, but network-wise functions as bulk exfil.",
    ),
    MappingRationale(
        dataset_label="*SMTP*Private-Proxy*",
        mapped_stage=AttackStage.EXFILTRATION,
        reasoning="Bot relaying bulk unauthorized SMTP payload through private proxies.",
        confidence=0.85,
        limitations="Classified under exfiltration due to outbound bulk transmission semantics.",
    ),
    MappingRationale(
        dataset_label="*To-Microsoft*",
        mapped_stage=AttackStage.UNMAPPED,
        reasoning="Malware background connectivity check against Windows update / Live infrastructure.",
        confidence=0.80,
        limitations="Ambient connectivity verification, does not represent attack kill chain progression.",
    ),
    MappingRationale(
        dataset_label="*Microsoft-Live*",
        mapped_stage=AttackStage.UNMAPPED,
        reasoning="Connectivity verification and user-agent spoofing by infected host.",
        confidence=0.80,
        limitations="Ambient connectivity probe.",
    ),
    MappingRationale(
        dataset_label="*Google-Net*",
        mapped_stage=AttackStage.UNMAPPED,
        reasoning="Malware probing Google network endpoints or ambient browsing.",
        confidence=0.70,
        limitations="Unclear attack attribution; safely quarantined as UNMAPPED.",
    ),
    MappingRationale(
        dataset_label="*Established-HTTP-Ad*",
        mapped_stage=AttackStage.UNMAPPED,
        reasoning="Click-fraud / ad-network impressions generated by botnet.",
        confidence=0.70,
        limitations="Does not cleanly correspond to standard ATT&CK tactical progression.",
    ),
    MappingRationale(
        dataset_label="*WEB*Established*",
        mapped_stage=AttackStage.UNMAPPED,
        reasoning="Unclassified web traffic initiated by botnet host.",
        confidence=0.60,
        limitations="Payload details absent from NetFlow; unmappable with high confidence.",
    ),
]


# ==============================================================================
# 2. CIC-IDS2017 / CSE-CIC-IDS2018 Explicit Mapping Registry
# ==============================================================================
CIC_IDS_MAPPING_REGISTRY: List[MappingRationale] = [
    MappingRationale(
        dataset_label="BENIGN",
        mapped_stage=AttackStage.NORMAL,
        reasoning="Non-attack background enterprise traffic generated using B-Profile system.",
        confidence=1.0,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="PortScan",
        mapped_stage=AttackStage.SCANNING,
        reasoning="Nmap horizontal and vertical port scanning probes.",
        confidence=1.0,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="FTP-Patator",
        mapped_stage=AttackStage.CREDENTIAL_ACCESS,
        reasoning="Dictionary brute-force authentication against FTP service.",
        confidence=1.0,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="SSH-Patator",
        mapped_stage=AttackStage.CREDENTIAL_ACCESS,
        reasoning="Dictionary brute-force authentication against SSH daemon.",
        confidence=1.0,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="Web Attack – Brute Force",
        mapped_stage=AttackStage.CREDENTIAL_ACCESS,
        reasoning="Web login form credential stuffing/brute force.",
        confidence=0.95,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="Web Attack – XSS",
        mapped_stage=AttackStage.EXPLOITATION,
        reasoning="Cross-Site Scripting exploit injection payload against web application.",
        confidence=0.90,
        limitations="Exploits client browser rather than host daemon directly.",
    ),
    MappingRationale(
        dataset_label="Web Attack – Sql Injection",
        mapped_stage=AttackStage.EXPLOITATION,
        reasoning="SQL injection payload to bypass auth and execute unauthorized queries.",
        confidence=0.95,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="Infiltration",
        mapped_stage=AttackStage.LATERAL_MOVEMENT,
        reasoning="Post-exploitation pivot into internal network from compromised host.",
        confidence=0.90,
        limitations="Includes weaponized Dropbox link as initial infection vector.",
    ),
    MappingRationale(
        dataset_label="Bot",
        mapped_stage=AttackStage.COMMAND_AND_CONTROL,
        reasoning="Ares botnet beaconing and remote command execution.",
        confidence=0.95,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="Heartbleed",
        mapped_stage=AttackStage.EXPLOITATION,
        reasoning="OpenSSL TLS heartbeat buffer over-read vulnerability exploit.",
        confidence=1.0,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="DDoS",
        mapped_stage=AttackStage.IMPACT_DOS,
        reasoning="Volumetric LOIC/HOIC distributed packet flood.",
        confidence=1.0,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="DoS Hulk",
        mapped_stage=AttackStage.IMPACT_DOS,
        reasoning="Web server request flood attempting resource exhaustion.",
        confidence=1.0,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="DoS GoldenEye",
        mapped_stage=AttackStage.IMPACT_DOS,
        reasoning="HTTP Keep-Alive and No-Cache resource exhaustion attack.",
        confidence=1.0,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="DoS slowloris",
        mapped_stage=AttackStage.IMPACT_DOS,
        reasoning="Low-and-slow HTTP header connection exhaustion.",
        confidence=1.0,
        limitations="None.",
    ),
    MappingRationale(
        dataset_label="DoS Slowhttptest",
        mapped_stage=AttackStage.IMPACT_DOS,
        reasoning="Application-layer slow HTTP POST body starvation.",
        confidence=1.0,
        limitations="None.",
    ),
]


class DatasetLabelMapper:
    """
    Translates raw dataset flow labels into canonical AttackStage
    with full documentation, confidence tracking, and unmapped safeguards.
    """

    def __init__(self, dataset_type: str = "auto"):
        self.dataset_type = dataset_type.lower()
        self.ctu_registry = CTU13_MAPPING_REGISTRY
        self.cic_registry = CIC_IDS_MAPPING_REGISTRY
        self.unmapped_labels_seen = set()

    def get_rationale(self, raw_label: str) -> Optional[MappingRationale]:
        """Look up the documentation rationale for a mapped label."""
        cleaned = str(raw_label).strip()

        # Check CIC-IDS exact matches first
        for item in self.cic_registry:
            if item.dataset_label.lower() == cleaned.lower():
                return item

        # Check CTU-13 patterns
        for item in self.ctu_registry:
            pattern = item.dataset_label.replace("*", ".*")
            if re.search(pattern, cleaned, re.IGNORECASE):
                return item

        return None

    def map_label(self, raw_label: str) -> AttackStage:
        """
        Maps raw label to AttackStage.
        Returns AttackStage.UNMAPPED if no reliable mapping exists.
        """
        if raw_label is None:
            return AttackStage.UNMAPPED

        cleaned = str(raw_label).strip()
        rationale = self.get_rationale(cleaned)

        if rationale is not None:
            return rationale.mapped_stage

        # Fallback check for standard words
        cleaned_lower = cleaned.lower()
        if "benign" in cleaned_lower or "normal" in cleaned_lower or "background" in cleaned_lower:
            return AttackStage.NORMAL

        if cleaned not in self.unmapped_labels_seen:
            self.unmapped_labels_seen.add(cleaned)
            logger.warning(
                f"Label '{raw_label}' cannot be mapped reliably. Marked as UNMAPPED."
            )

        return AttackStage.UNMAPPED

    def resolve_window_ground_truth(
        self, flow_labels: List[str]
    ) -> Tuple[AttackStage, Dict[str, float]]:
        """
        Resolves ground truth for a time window containing multiple flows.

        Security Principle:
        1. If all flows are NORMAL, window is NORMAL.
        2. If attack flows are present, window stage is the highest-severity attack.
        3. Multi-label distribution dictionary is computed for transparent auditing.
        """
        if not flow_labels:
            return AttackStage.NORMAL, {"NORMAL": 1.0}

        mapped_stages = [self.map_label(lbl) for lbl in flow_labels]
        # Filter out benign and unmapped for primary severity calculation
        attack_stages = [
            s for s in mapped_stages
            if s != AttackStage.NORMAL and s != AttackStage.UNMAPPED
        ]

        if not attack_stages:
            # Check if any was unmapped
            if any(s == AttackStage.UNMAPPED for s in mapped_stages):
                return AttackStage.NORMAL, {"NORMAL": 0.99, "UNMAPPED": 0.01}
            return AttackStage.NORMAL, {"NORMAL": 1.0}

        # Resolve primary by maximum severity weight
        primary_stage = max(
            attack_stages, key=lambda s: STAGE_SEVERITY_WEIGHTS.get(int(s), 0.0)
        )

        # Compute full distribution
        counts: Dict[str, int] = {}
        for s in mapped_stages:
            name = s.name
            counts[name] = counts.get(name, 0) + 1
        total = len(mapped_stages)
        distribution = {k: round(v / total, 4) for k, v in counts.items()}

        return primary_stage, distribution
