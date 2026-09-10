"""
MITRE ATT&CK Mapping Knowledge Base.
Connects forecasted AttackStages to concrete MITRE Tactics, Techniques,
and actionable defensive countermeasures.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
from states.taxonomy import AttackStage


@dataclass
class MitreTechnique:
    technique_id: str
    name: str
    tactic: str
    description: str
    detection_rule: str
    recommended_mitigation: str
    action_id: str


@dataclass
class MitreTactic:
    tactic_id: str
    name: str
    techniques: List[MitreTechnique]


# Static offline mapping dictionary
STAGE_MITRE_CATALOG: Dict[AttackStage, List[MitreTechnique]] = {
    AttackStage.NORMAL: [],
    AttackStage.RECONNAISSANCE: [
        MitreTechnique(
            technique_id="T1595",
            name="Active Scanning",
            tactic="TA0043 Reconnaissance",
            description="Active probing of IP blocks and network boundaries to gather target information.",
            detection_rule="Detect anomalous external ICMP echo/DNS requests across broad IP ranges.",
            recommended_mitigation="Enforce threat intelligence feed blocking at border perimeter firewall.",
            action_id="ACTION_BLOCK_IP",
        ),
    ],
    AttackStage.SCANNING: [
        MitreTechnique(
            technique_id="T1046",
            name="Network Service Discovery",
            tactic="TA0007 Discovery",
            description="Scanning remote systems to determine running services, open ports, and operating systems.",
            detection_rule="Detect high fanout ratio (>50 unique ports/min from single source IP).",
            recommended_mitigation="Apply TCP SYN rate limiting and dynamic drop rules on target ingress switch.",
            action_id="ACTION_RATE_LIMIT_SYN",
        ),
    ],
    AttackStage.INITIAL_ACCESS: [
        MitreTechnique(
            technique_id="T1190",
            name="Exploit Public-Facing Application",
            tactic="TA0001 Initial Access",
            description="Exploiting vulnerability in an internet-accessible service or software application.",
            detection_rule="Detect abnormal payload entropy and HTTP error bursts (4xx/5xx) on public endpoints.",
            recommended_mitigation="Isolate DMZ container/host and apply virtual patching via WAF rule.",
            action_id="ACTION_ISOLATE_HOST",
        ),
    ],
    AttackStage.EXPLOITATION: [
        MitreTechnique(
            technique_id="T1203",
            name="Exploitation for Client Execution",
            tactic="TA0002 Execution",
            description="Exploiting software vulnerabilities in client applications or daemon services.",
            detection_rule="Detect binary shellcode signatures or protocol abnormalities in payload streams.",
            recommended_mitigation="Terminate anomalous TCP sessions and block target port.",
            action_id="ACTION_BLOCK_PORT",
        ),
    ],
    AttackStage.CREDENTIAL_ACCESS: [
        MitreTechnique(
            technique_id="T1110",
            name="Brute Force",
            tactic="TA0006 Credential Access",
            description="Repeated authentication attempts against SSH, FTP, or web management interfaces.",
            detection_rule="Detect authentication failure rate exceeding 10 attempts/sec from single source.",
            recommended_mitigation="Enforce temporary IP ban (Fail2ban) and mandate multi-factor challenge.",
            action_id="ACTION_BLOCK_IP",
        ),
    ],
    AttackStage.LATERAL_MOVEMENT: [
        MitreTechnique(
            technique_id="T1021",
            name="Remote Services",
            tactic="TA0008 Lateral Movement",
            description="Adversaries using valid credentials or exploits to move across internal subnets via SMB/RDP/SSH.",
            detection_rule="Detect unprecedented cross-VLAN SMB/RPC connection bursts between internal workstations.",
            recommended_mitigation="Isolate the source workstation subnet and revoke active Kerberos/NTLM tickets.",
            action_id="ACTION_ISOLATE_HOST",
        ),
    ],
    AttackStage.COMMAND_AND_CONTROL: [
        MitreTechnique(
            technique_id="T1071",
            name="Application Layer Protocol",
            tactic="TA0011 Command and Control",
            description="Adversaries communicating using application-layer protocols (HTTP/HTTPS/DNS) with regular beaconing.",
            detection_rule="Detect periodic heartbeat intervals (low jitter) and high DNS NXDOMAIN frequency.",
            recommended_mitigation="Sinkhole C2 domain at internal recursive DNS resolver and reset C2 TCP flows.",
            action_id="ACTION_BLOCK_C2_DOMAIN",
        ),
    ],
    AttackStage.EXFILTRATION: [
        MitreTechnique(
            technique_id="T1041",
            name="Exfiltration Over C2 Channel",
            tactic="TA0010 Exfiltration",
            description="Stolen data is transferred through the existing command and control communications channel.",
            detection_rule="Detect extreme forward byte asymmetry (fwd/bwd byte ratio > 100) on long-lived connections.",
            recommended_mitigation="Instantly terminate outbound connection and isolate host egress interface.",
            action_id="ACTION_ISOLATE_HOST",
        ),
    ],
    AttackStage.IMPACT_DOS: [
        MitreTechnique(
            technique_id="T1498",
            name="Network Denial of Service",
            tactic="TA0040 Impact",
            description="Flooding network bandwidth or service connection queues to disrupt availability.",
            detection_rule="Detect volumetric packet surge (>50,000 pkts/s) with extreme SYN/ACK disproportion.",
            recommended_mitigation="Deploy upstream BGP Flowspec route filter and TCP SYN proxying.",
            action_id="ACTION_RATE_LIMIT_SYN",
        ),
    ],
}


class MitreMapper:
    """Provides MITRE ATT&CK mappings and mitigation options for stages."""

    def __init__(self, catalog: Optional[Dict[AttackStage, List[MitreTechnique]]] = None):
        self.catalog = catalog or STAGE_MITRE_CATALOG

    def get_techniques_for_stage(self, stage: AttackStage) -> List[MitreTechnique]:
        return self.catalog.get(stage, [])

    def get_mitigations_for_trajectory(
        self, forecasted_stages: List[AttackStage]
    ) -> List[MitreTechnique]:
        """Aggregate unique mitigation techniques across future predicted trajectory."""
        seen = set()
        actions = []
        for stage in forecasted_stages:
            for tech in self.get_techniques_for_stage(stage):
                if tech.technique_id not in seen:
                    seen.add(tech.technique_id)
                    actions.append(tech)
        return actions
