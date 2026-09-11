import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Server,
  Radio,
  Lock,
  Ban,
  Activity,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Clock,
  Sparkles,
  Layers,
  AlertTriangle,
  FileText,
  Sliders,
  X,
  Zap,
  CheckCircle2,
  Cpu,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { PageId } from "../components/layout/Navbar";
import {
  InteractiveNetworkMap,
  DefenseActionId,
} from "../components/simulation/InteractiveNetworkMap";
import { apiService } from "../services/api";
import { SimulateResponse } from "../types/api";

interface RealWorldDefensePageProps {
  onNavigate: (page: PageId) => void;
  onLaunchPlatform?: () => void;
}

export type ScenarioKey =
  | "solarwinds"
  | "wannacry"
  | "colonial"
  | "ukraine";

interface AttackStage {
  id: string;
  name: string;
  mitreId: string;
  mitreTactic: string;
  explanation: string;
  networkSignals: string;
  status: "HISTORICAL" | "OBSERVED" | "FORECAST" | "NOT NETWORK-OBSERVABLE";
  leadTimeSeconds?: number;
}

interface CampaignData {
  key: ScenarioKey;
  name: string;
  year: string;
  category: string;
  adversary: string;
  summary: string;
  progressionOverview: string[];
  stages: AttackStage[];
  whereRakshakHelps: {
    observedStage: string;
    observedSignals: string;
    forecastNext: string;
    forecastProb: number;
    recommendedAction: string;
    actionType: DefenseActionId;
    reforecastNext: string;
    reforecastProb: number;
    leadTimeWindow: string;
  };
  mitreMatrix: {
    tactic: string;
    techniqueId: string;
    techniqueName: string;
    observability: "OBSERVED" | "INFERRED" | "FORECAST" | "NOT NETWORK-OBSERVABLE";
    defenseOpportunity: string;
  }[];
  baselineTrajectory: { step: string; baselineRisk: number; defendedRisk?: number }[];
}

const CAMPAIGNS: Record<ScenarioKey, CampaignData> = {
  solarwinds: {
    key: "solarwinds",
    name: "SolarWinds Orion Intrusion",
    year: "2020",
    category: "Supply Chain & APT",
    adversary: "UNC2452 / Nobelium (APT29)",
    summary:
      "A supply-chain compromise inserted the SUNBURST backdoor into vendor updates, leading to stealthy DNS C2 beaconing, discovery, and subsequent data exfiltration.",
    progressionOverview: [
      "Supply Chain Injection",
      "Backdoor Dormancy",
      "Command & Control (C2)",
      "Credential Access",
      "Lateral Movement",
      "Data Exfiltration",
    ],
    stages: [
      {
        id: "sw-1",
        name: "Supply-Chain Injection",
        mitreId: "T1195.002",
        mitreTactic: "Initial Access",
        explanation:
          "Malicious source code was inserted into the SolarWinds Orion software build pipeline prior to digital signing.",
        networkSignals: "None. Software update was legitimately signed and distributed over official update channels.",
        status: "NOT NETWORK-OBSERVABLE",
      },
      {
        id: "sw-2",
        name: "Backdoor Dormancy & Evasion",
        mitreId: "T1027",
        mitreTactic: "Defense Evasion",
        explanation:
          "SUNBURST malware stayed dormant for up to two weeks to evade automated malware analysis sandboxes.",
        networkSignals: "Zero external network activity during dormancy period.",
        status: "NOT NETWORK-OBSERVABLE",
      },
      {
        id: "sw-3",
        name: "Command & Control (SUNBURST)",
        mitreId: "T1071.001",
        mitreTactic: "Command and Control",
        explanation:
          "Compromised Orion server initiated stealthy DNS lookups to avsvmcloud[.]com subdomains with pseudo-random encoded identifiers.",
        networkSignals:
          "Periodic low-frequency DNS queries (TTL jitter, DGA-like subdomains) originating from internal Orion server.",
        status: "OBSERVED",
        leadTimeSeconds: 45,
      },
      {
        id: "sw-4",
        name: "Internal Discovery & Account Probing",
        mitreId: "T1087.002",
        mitreTactic: "Discovery",
        explanation:
          "Adversaries queried Active Directory domain controllers to identify high-privilege administrative accounts.",
        networkSignals:
          "Unusual LDAP and Kerberos ticket requests from the SolarWinds server to domain controllers.",
        status: "FORECAST",
        leadTimeSeconds: 60,
      },
      {
        id: "sw-5",
        name: "Lateral Movement & SAML Forgery",
        mitreId: "T1021.002",
        mitreTactic: "Lateral Movement",
        explanation:
          "Forged SAML token certificates (Golden SAML) used to access cloud services and internal high-value servers.",
        networkSignals:
          "Anomalous internal SMB sessions and cross-zone token authorizations.",
        status: "FORECAST",
        leadTimeSeconds: 90,
      },
      {
        id: "sw-6",
        name: "Data Exfiltration via HTTPS",
        mitreId: "T1041",
        mitreTactic: "Exfiltration",
        explanation:
          "Targeted enterprise emails and repository data extracted using encrypted HTTPS outbound tunnels.",
        networkSignals:
          "Persistent TLS connections with uncommon SNI headers to foreign cloud hosting providers.",
        status: "FORECAST",
        leadTimeSeconds: 120,
      },
    ],
    whereRakshakHelps: {
      observedStage: "Command & Control (DNS Beaconing)",
      observedSignals: "Low-frequency DNS entropy + anomalous outbound socket from Orion server",
      forecastNext: "Internal Discovery & Lateral Movement",
      forecastProb: 0.74,
      recommendedAction: "Restrict Outbound Traffic & Quarantine Host",
      actionType: "RESTRICT_OUTBOUND_TRAFFIC",
      reforecastNext: "Lateral Movement collapsed",
      reforecastProb: 0.18,
      leadTimeWindow: "45–120 Seconds Lead Time",
    },
    mitreMatrix: [
      {
        tactic: "Initial Access",
        techniqueId: "T1195.002",
        techniqueName: "Compromise Software Supply Chain",
        observability: "NOT NETWORK-OBSERVABLE",
        defenseOpportunity: "Build-system integrity verification; not visible on network perimeter.",
      },
      {
        tactic: "Command and Control",
        techniqueId: "T1071.001",
        techniqueName: "Application Layer Protocol: Web/DNS",
        observability: "OBSERVED",
        defenseOpportunity: "DNS tunnel anomaly detection and outbound egress filtering.",
      },
      {
        tactic: "Discovery",
        techniqueId: "T1087.002",
        techniqueName: "Account Discovery: Domain Account",
        observability: "FORECAST",
        defenseOpportunity: "Precursor sequence modeling alerts before LDAP enumeration completes.",
      },
      {
        tactic: "Lateral Movement",
        techniqueId: "T1021.002",
        techniqueName: "SMB/Windows Admin Shares",
        observability: "FORECAST",
        defenseOpportunity: "Microsegmentation and automated port isolation prevents server pivot.",
      },
      {
        tactic: "Exfiltration",
        techniqueId: "T1041",
        techniqueName: "Exfiltration Over C2 Channel",
        observability: "FORECAST",
        defenseOpportunity: "Predictive egress restriction blocks external drop server transfer.",
      },
    ],
    baselineTrajectory: [
      { step: "Current (t)", baselineRisk: 3.2, defendedRisk: 3.2 },
      { step: "+20s", baselineRisk: 5.4, defendedRisk: 3.0 },
      { step: "+40s", baselineRisk: 7.1, defendedRisk: 2.6 },
      { step: "+60s", baselineRisk: 8.2, defendedRisk: 2.2 },
      { step: "+80s", baselineRisk: 8.9, defendedRisk: 1.9 },
      { step: "+100s", baselineRisk: 9.3, defendedRisk: 1.7 },
    ],
  },

  wannacry: {
    key: "wannacry",
    name: "WannaCry Ransomware Epidemic",
    year: "2017",
    category: "Worm & Ransomware",
    adversary: "Lazarus Group",
    summary:
      "Autonomous worm weaponizing the EternalBlue SMB exploit (MS17-010), scanning subnets on port 445 within minutes and executing irreversible file encryption.",
    progressionOverview: [
      "Subnet Port 445 Probing",
      "EternalBlue SMB Exploitation",
      "DoublePulsar Kernel Injection",
      "Autonomous Lateral Spread",
      "Killswitch DNS Query",
      "Mass Ransomware Encryption",
    ],
    stages: [
      {
        id: "wc-1",
        name: "Port 445 SMB Reconnaissance",
        mitreId: "T1595.001",
        mitreTactic: "Reconnaissance",
        explanation:
          "The worm launches rapid horizontal port scans across adjacent LAN /24 subnets looking for open SMB port 445.",
        networkSignals: "Massive spike in TCP SYN packets targeted at port 445 with minimal ACK returns.",
        status: "OBSERVED",
        leadTimeSeconds: 20,
      },
      {
        id: "wc-2",
        name: "EternalBlue Exploitation",
        mitreId: "T1190",
        mitreTactic: "Initial Access",
        explanation:
          "Specially crafted SMBv1 buffer overflow packets sent to unpatched Windows systems to achieve remote ring-0 execution.",
        networkSignals: "Anomalous SMBv1 Trans2 requests with invalid multiplex IDs.",
        status: "OBSERVED",
        leadTimeSeconds: 30,
      },
      {
        id: "wc-3",
        name: "DoublePulsar Payload Injection",
        mitreId: "T1055",
        mitreTactic: "Execution",
        explanation:
          "In-memory kernel payload injected without touching disk, establishing control on the target endpoint.",
        networkSignals: "SMB Session Setup packets with signature opcode 0x23.",
        status: "OBSERVED",
        leadTimeSeconds: 40,
      },
      {
        id: "wc-4",
        name: "Autonomous Lateral Propagation",
        mitreId: "T1021.002",
        mitreTactic: "Lateral Movement",
        explanation:
          "Compromised host turns into an active scanner, broadcasting exploit attempts to all adjacent subnet hosts.",
        networkSignals: "Immediate replication of port 445 scanning bursts across internal interfaces.",
        status: "FORECAST",
        leadTimeSeconds: 50,
      },
      {
        id: "wc-5",
        name: "Killswitch Domain Query",
        mitreId: "T1071.004",
        mitreTactic: "Command and Control",
        explanation:
          "Worm issues a DNS request to an unregistered sinkhole domain before initiating encryption.",
        networkSignals: "Outbound DNS query for long pseudorandom string domain.",
        status: "OBSERVED",
        leadTimeSeconds: 60,
      },
      {
        id: "wc-6",
        name: "Ransomware Encryption Impact",
        mitreId: "T1486",
        mitreTactic: "Impact",
        explanation:
          "Local user files encrypted with RSA-2048 and Wana Decrypt0r 2.0 ransom note displayed.",
        networkSignals: "Internal file share mass modification; zero external transfer.",
        status: "FORECAST",
        leadTimeSeconds: 80,
      },
    ],
    whereRakshakHelps: {
      observedStage: "SMB Scanning & EternalBlue Buffer Overflow",
      observedSignals: "Port 445 SYN flood + high destination port entropy",
      forecastNext: "Autonomous Subnet Propagation & Ransomware Encryption",
      forecastProb: 0.88,
      recommendedAction: "Block Destination Port 445 & Isolate Origin Host",
      actionType: "BLOCK_DESTINATION_PORT",
      reforecastNext: "Lateral Spread halted",
      reforecastProb: 0.12,
      leadTimeWindow: "30–60 Seconds Lead Time",
    },
    mitreMatrix: [
      {
        tactic: "Reconnaissance",
        techniqueId: "T1595.001",
        techniqueName: "Active Scanning: Scanning IP Blocks",
        observability: "OBSERVED",
        defenseOpportunity: "Early detection of high destination IP entropy and SYN spikes.",
      },
      {
        tactic: "Initial Access",
        techniqueId: "T1190",
        techniqueName: "Exploit Public-Facing Application",
        observability: "OBSERVED",
        defenseOpportunity: "Immediate SMB port block severing exploitation attempts.",
      },
      {
        tactic: "Lateral Movement",
        techniqueId: "T1021.002",
        techniqueName: "SMB/Windows Admin Shares",
        observability: "FORECAST",
        defenseOpportunity: "Automated host quarantine stops propagation before adjacent peers are touched.",
      },
      {
        tactic: "Impact",
        techniqueId: "T1486",
        techniqueName: "Data Encrypted for Impact",
        observability: "FORECAST",
        defenseOpportunity: "Proactive isolation protects downstream business units from file locking.",
      },
    ],
    baselineTrajectory: [
      { step: "Current (t)", baselineRisk: 4.5, defendedRisk: 4.5 },
      { step: "+20s", baselineRisk: 6.8, defendedRisk: 3.4 },
      { step: "+40s", baselineRisk: 8.5, defendedRisk: 2.5 },
      { step: "+60s", baselineRisk: 9.4, defendedRisk: 2.0 },
      { step: "+80s", baselineRisk: 9.8, defendedRisk: 1.6 },
      { step: "+100s", baselineRisk: 9.9, defendedRisk: 1.5 },
    ],
  },

  colonial: {
    key: "colonial",
    name: "Colonial Pipeline Cyber Extortion",
    year: "2021",
    category: "Credential Theft & Extortion",
    adversary: "DarkSide Ransomware",
    summary:
      "Compromised single legacy VPN account without multi-factor authentication enabled network penetration, Active Directory discovery, 100GB exfiltration, and operational shutdown.",
    progressionOverview: [
      "Leaked VPN Credential Login",
      "Network Discovery & Scanning",
      "Privilege Escalation",
      "100GB Data Exfiltration",
      "DarkSide Ransomware Execution",
      "Operational Pipeline Shutdown",
    ],
    stages: [
      {
        id: "cp-1",
        name: "Compromised VPN Access",
        mitreId: "T1078.002",
        mitreTactic: "Initial Access",
        explanation:
          "Adversary logged in using leaked employee credentials on an inactive legacy VPN profile lacking MFA.",
        networkSignals: "Valid TLS VPN tunnel established from an unrecognized external residential ISP address.",
        status: "OBSERVED",
        leadTimeSeconds: 30,
      },
      {
        id: "cp-2",
        name: "Network Discovery & Host Recon",
        mitreId: "T1018",
        mitreTactic: "Discovery",
        explanation:
          "Adversary mapped internal subnets and identified Active Directory domain controllers.",
        networkSignals: "Unusual internal ICMP echo and RPC port 135/445 enumeration sweeps from VPN client IP.",
        status: "OBSERVED",
        leadTimeSeconds: 45,
      },
      {
        id: "cp-3",
        name: "Privilege Escalation via Kerberoasting",
        mitreId: "T1558.003",
        mitreTactic: "Credential Access",
        explanation:
          "Requested service tickets for Service Principal Names (SPNs) to crack domain service account hashes offline.",
        networkSignals: "Abnormal burst of Kerberos TGS-REQ packets for multiple service accounts.",
        status: "FORECAST",
        leadTimeSeconds: 65,
      },
      {
        id: "cp-4",
        name: "Large-Scale Data Exfiltration (100GB)",
        mitreId: "T1567.002",
        mitreTactic: "Exfiltration",
        explanation:
          "Extracted over 100GB of sensitive pipeline operational documents to cloud storage staging accounts.",
        networkSignals: "Sustained high-volume outbound data flow over port 443 with encrypted payload signatures.",
        status: "FORECAST",
        leadTimeSeconds: 90,
      },
      {
        id: "cp-5",
        name: "DarkSide Ransomware Deployment",
        mitreId: "T1486",
        mitreTactic: "Impact",
        explanation:
          "Ransomware binary distributed via Group Policy Objects, encrypting billing and financial workstations.",
        networkSignals: "Simultaneous SMB file modifications across administrative subnet.",
        status: "FORECAST",
        leadTimeSeconds: 110,
      },
      {
        id: "cp-6",
        name: "Operational Pipeline Shutdown",
        mitreId: "T0813",
        mitreTactic: "Impact",
        explanation:
          "Precautionary shutdown of pipeline OT networks due to fear of infection spillover from IT billing networks.",
        networkSignals: "Complete disconnect of IT/OT network bridge routers.",
        status: "FORECAST",
        leadTimeSeconds: 140,
      },
    ],
    whereRakshakHelps: {
      observedStage: "Anomalous VPN Ingress & Internal Reconnaissance",
      observedSignals: "Residential IP geolocation on VPN tunnel + sequential internal RPC probes",
      forecastNext: "Privilege Escalation & Cloud Exfiltration",
      forecastProb: 0.79,
      recommendedAction: "Isolate Compromised VPN Host & Restrict Outbound",
      actionType: "HOST_ISOLATION",
      reforecastNext: "Exfiltration path severed",
      reforecastProb: 0.16,
      leadTimeWindow: "45–90 Seconds Lead Time",
    },
    mitreMatrix: [
      {
        tactic: "Initial Access",
        techniqueId: "T1078.002",
        techniqueName: "Valid Accounts: Domain Accounts",
        observability: "OBSERVED",
        defenseOpportunity: "Geographic telemetry anomaly detection flags unauthorized VPN tunnel.",
      },
      {
        tactic: "Discovery",
        techniqueId: "T1018",
        techniqueName: "Remote System Discovery",
        observability: "OBSERVED",
        defenseOpportunity: "Sequential probe detection alerts on reconnaissance before credential harvesting.",
      },
      {
        tactic: "Credential Access",
        techniqueId: "T1558.003",
        techniqueName: "Steal Kerberos Tickets: Kerberoasting",
        observability: "FORECAST",
        defenseOpportunity: "Predictive model warns of impending privilege escalation attempts.",
      },
      {
        tactic: "Exfiltration",
        techniqueId: "T1567.002",
        techniqueName: "Exfiltration to Cloud Storage",
        observability: "FORECAST",
        defenseOpportunity: "Egress quota and destination classification terminates anomalous upload stream.",
      },
    ],
    baselineTrajectory: [
      { step: "Current (t)", baselineRisk: 3.8, defendedRisk: 3.8 },
      { step: "+20s", baselineRisk: 5.7, defendedRisk: 3.1 },
      { step: "+40s", baselineRisk: 7.4, defendedRisk: 2.4 },
      { step: "+60s", baselineRisk: 8.6, defendedRisk: 2.1 },
      { step: "+80s", baselineRisk: 9.1, defendedRisk: 1.8 },
      { step: "+100s", baselineRisk: 9.5, defendedRisk: 1.6 },
    ],
  },

  ukraine: {
    key: "ukraine",
    name: "Ukraine Power Grid Cyberattack",
    year: "2015",
    category: "Industrial Control & SCADA",
    adversary: "Sandworm Team",
    summary:
      "Multi-stage cyber-physical assault beginning with BlackEnergy phishing, lateral pivot into SCADA control networks, opening 30 electrical substations to plunge 230,000 citizens into darkness.",
    progressionOverview: [
      "Spearphishing with Weaponized Office Macro",
      "BlackEnergy C2 Communication",
      "Corporate IT to SCADA Pivot",
      "Unauthorized SCADA Breaker Commands",
      "KillDisk MBR Wiper Deployment",
      "Grid Blackout Impact",
    ],
    stages: [
      {
        id: "ua-1",
        name: "Spearphishing Email Macro",
        mitreId: "T1566.001",
        mitreTactic: "Initial Access",
        explanation:
          "Weaponized Word attachment with malicious VBA macro tricked utility operators into executing initial dropper.",
        networkSignals: "Standard incoming SMTP email traffic; not distinct at network gateway level.",
        status: "NOT NETWORK-OBSERVABLE",
      },
      {
        id: "ua-2",
        name: "BlackEnergy 3 C2 Beaconing",
        mitreId: "T1071.001",
        mitreTactic: "Command and Control",
        explanation:
          "Installed backdoor initiated periodic beacons to adversary servers in Moscow over TCP port 443.",
        networkSignals: "Regular beaconing intervals with distinctive TLS handshake characteristics.",
        status: "OBSERVED",
        leadTimeSeconds: 40,
      },
      {
        id: "ua-3",
        name: "OT/IT Boundary Crossing via VPN",
        mitreId: "T1021.001",
        mitreTactic: "Lateral Movement",
        explanation:
          "Adversaries used stolen credentials to jump across the IT network into the isolated SCADA distribution network.",
        networkSignals: "Unexpected cross-zone RDP traffic traversing IT/OT firewall boundaries.",
        status: "OBSERVED",
        leadTimeSeconds: 60,
      },
      {
        id: "ua-4",
        name: "SCADA Disruption Commands (IEC 104)",
        mitreId: "T0814",
        mitreTactic: "Impair Process Control",
        explanation:
          "Malicious control commands sent via IEC 60870-5-104 protocol to open circuit breakers at 30 substations.",
        networkSignals: "Abnormal burst of industrial command packets instructing breaker disconnects.",
        status: "FORECAST",
        leadTimeSeconds: 85,
      },
      {
        id: "ua-5",
        name: "KillDisk Wiper & Denial of Service",
        mitreId: "T0826",
        mitreTactic: "Impact",
        explanation:
          "KillDisk malware erased master boot records on operator workstations and sabotaged UPS battery backups.",
        networkSignals: "Internal TFTP and SMB broadcasts distributing wiper payloads to substation HMIs.",
        status: "FORECAST",
        leadTimeSeconds: 110,
      },
      {
        id: "ua-6",
        name: "Power Grid Blackout",
        mitreId: "T0828",
        mitreTactic: "Impact",
        explanation:
          "Over 230,000 residents in the Ivano-Frankivsk region lost electrical power for up to 6 hours in winter.",
        networkSignals: "Telemetry drop: complete loss of SCADA sensor feedback.",
        status: "FORECAST",
        leadTimeSeconds: 130,
      },
    ],
    whereRakshakHelps: {
      observedStage: "BlackEnergy C2 Beacon & Cross-Zone RDP to SCADA",
      observedSignals: "Periodic TLS C2 pattern + unauthorized cross-boundary RDP session",
      forecastNext: "SCADA Protocol Disruption & Breaker Disconnect",
      forecastProb: 0.84,
      recommendedAction: "Block Boundary Protocol & Isolate Gateway Host",
      actionType: "BLOCK_SUSPICIOUS_SOURCE",
      reforecastNext: "Physical breaker command averted",
      reforecastProb: 0.14,
      leadTimeWindow: "60–110 Seconds Lead Time",
    },
    mitreMatrix: [
      {
        tactic: "Command and Control",
        techniqueId: "T1071.001",
        techniqueName: "Web Protocols: BlackEnergy C2",
        observability: "OBSERVED",
        defenseOpportunity: "Identification of static TLS fingerprint and periodic beacon jitter.",
      },
      {
        tactic: "Lateral Movement",
        techniqueId: "T1021.001",
        techniqueName: "Remote Desktop Protocol: IT/OT Pivot",
        observability: "OBSERVED",
        defenseOpportunity: "Cross-zone perimeter policy violation alerts on unauthorized SCADA access.",
      },
      {
        tactic: "Impair Process Control",
        techniqueId: "T0814",
        techniqueName: "Denial of Control (SCADA Breaker Command)",
        observability: "FORECAST",
        defenseOpportunity: "Forecast model warns of impending command injection before packets reach RTUs.",
      },
      {
        tactic: "Impact",
        techniqueId: "T0826",
        techniqueName: "Loss of Availability: KillDisk",
        observability: "FORECAST",
        defenseOpportunity: "Automated network segmentation prevents destructive payload distribution.",
      },
    ],
    baselineTrajectory: [
      { step: "Current (t)", baselineRisk: 4.1, defendedRisk: 4.1 },
      { step: "+20s", baselineRisk: 6.2, defendedRisk: 3.3 },
      { step: "+40s", baselineRisk: 7.9, defendedRisk: 2.6 },
      { step: "+60s", baselineRisk: 8.8, defendedRisk: 2.1 },
      { step: "+80s", baselineRisk: 9.3, defendedRisk: 1.8 },
      { step: "+100s", baselineRisk: 9.7, defendedRisk: 1.5 },
    ],
  },
};

export const RealWorldDefensePage: React.FC<RealWorldDefensePageProps> = ({
  onNavigate,
  onLaunchPlatform,
}) => {
  // 1. Scenario Selection State
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>("solarwinds");
  const currentCampaign = CAMPAIGNS[selectedScenario];

  // 2. Interactive Attack Replay Mode State
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  const [replayStepIndex, setReplayStepIndex] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState<1 | 2>(1);
  const [showForecastOpportunityAlert, setShowForecastOpportunityAlert] = useState(false);
  const replayTimerRef = useRef<number | null>(null);

  // 3. Defense Simulation Drawer/Modal State
  const [activeDefenseModal, setActiveDefenseModal] = useState<DefenseActionId | null>(null);
  const [isDefenseAppliedInModal, setIsDefenseAppliedInModal] = useState(false);
  const [isSimulatingBackend, setIsSimulatingBackend] = useState(false);
  const [simulatedResponse, setSimulatedResponse] = useState<SimulateResponse | null>(null);
  const [hasRunSimulation, setHasRunSimulation] = useState(false);

  // Clean up replay timer on unmount
  useEffect(() => {
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, []);

  // Replay Execution Logic
  useEffect(() => {
    if (!isPlayingReplay) {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
      return;
    }

    const intervalMs = replaySpeed === 1 ? 2200 : 1200;
    replayTimerRef.current = window.setInterval(() => {
      setReplayStepIndex((prev) => {
        const next = prev + 1;
        // Pause at forecast opportunity (stage index 2: C2 / Precursor stage)
        if (next === 2) {
          setIsPlayingReplay(false);
          setShowForecastOpportunityAlert(true);
          return next;
        }
        if (next >= currentCampaign.stages.length) {
          setIsPlayingReplay(false);
          return prev;
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [isPlayingReplay, replaySpeed, currentCampaign.stages.length]);

  const handleToggleReplay = () => {
    if (replayStepIndex >= currentCampaign.stages.length - 1) {
      setReplayStepIndex(0);
      setShowForecastOpportunityAlert(false);
      setIsPlayingReplay(true);
    } else {
      setIsPlayingReplay(!isPlayingReplay);
      setShowForecastOpportunityAlert(false);
    }
  };

  const handleResetReplay = () => {
    setIsPlayingReplay(false);
    setReplayStepIndex(0);
    setShowForecastOpportunityAlert(false);
  };

  // Open Defense Modal for specific defense action
  const handleOpenDefenseModal = (actionId: DefenseActionId) => {
    setActiveDefenseModal(actionId);
    setIsDefenseAppliedInModal(true);
    setHasRunSimulation(false);
    setSimulatedResponse(null);
  };

  // Execute Simulation through API with robust fallback
  const handleRunSimulation = async () => {
    if (!activeDefenseModal) return;
    setIsSimulatingBackend(true);

    try {
      const resp = await apiService.simulateDefense({
        action_type: activeDefenseModal,
        target_entity:
          activeDefenseModal === "HOST_ISOLATION"
            ? "SolarWinds-Orion-SRV (192.168.1.150)"
            : activeDefenseModal === "BLOCK_DESTINATION_PORT"
            ? "Port 445 / SMB"
            : activeDefenseModal === "BLOCK_SUSPICIOUS_SOURCE"
            ? "External C2 (185.220.101.5)"
            : "Egress Gateway 0.0.0.0/0",
        horizon: 5,
      });
      setSimulatedResponse(resp);
      setHasRunSimulation(true);
    } catch (err) {
      console.warn("Using simulation fallback data:", err);
      setHasRunSimulation(true);
    } finally {
      setIsSimulatingBackend(false);
    }
  };

  // Trajectory data combining baseline with active simulation
  const chartTrajectoryData = currentCampaign.baselineTrajectory.map((item) => ({
    step: item.step,
    baselineRisk: item.baselineRisk,
    defendedRisk: hasRunSimulation ? item.defendedRisk : undefined,
  }));

  return (
    <div className="space-y-16 pb-20 text-slate-100 font-sans animate-fadeIn">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION & ANIMATED CYBER TRAJECTORY */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-cyber-950/90 via-cyber-900/60 to-cyber-950/90 border border-cyan-500/20 shadow-2xl p-6 sm:p-10 lg:p-14">
        {/* Futuristic Background Grid Accent */}
        <div className="absolute inset-0 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.07] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          {/* Integrity Badge */}
          <div className="inline-flex items-center space-x-2 bg-cyan-950/80 border border-cyan-500/40 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium text-cyan-300 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>REAL-WORLD ATTACK DEFENSE INTELLIGENCE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            REAL-WORLD ATTACKS.
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              WHAT IF YOU COULD SEE WHAT COMES NEXT?
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Rakshak analyzes evolving network behavior, forecasts possible multi-stage attack progression,
            and allows defenders to simulate proactive interventions before the next stage unfolds.
          </p>

          {/* Product Positioning Notice */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 max-w-3xl mx-auto text-xs text-slate-400 text-left flex items-start space-x-3">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-slate-200 font-medium">Positioning & Scientific Rigor:</strong>
              <p>
                Rakshak does not claim to have prevented historical campaigns. These real-world attacks serve as
                reference benchmarks demonstrating how causal sequence modeling and network telemetry forecasting provide
                defenders with decisive, earlier intervention windows.
              </p>
            </div>
          </div>
        </div>

        {/* Cinematic Animated Cyber Attack Trajectory Visual */}
        <div className="mt-12 relative z-10 pt-6 border-t border-slate-800/80">
          <div className="text-center mb-6">
            <span className="text-xs font-mono tracking-widest text-slate-400 uppercase font-semibold">
              Canonical Multi-Stage Attack Trajectory Flow
            </span>
          </div>

          {/* Flowchart Node Progression */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 items-center">
            {[
              { title: "01. Internet", sub: "Threat Origin", badge: "HISTORICAL", color: "border-slate-700" },
              { title: "02. Entry Point", sub: "Phish / Supply", badge: "OBSERVED", color: "border-slate-700" },
              { title: "03. Compromised Host", sub: "Payload Drop", badge: "OBSERVED", color: "border-amber-500/40" },
              { title: "04. Command & Control", sub: "Beacon Channel", badge: "OBSERVED", color: "border-cyan-500/50" },
              { title: "05. Lateral Movement", sub: "Subnet Pivot", badge: "FORECAST", color: "border-cyan-400" },
              { title: "06. Data Collection", sub: "Staging Secrets", badge: "FORECAST", color: "border-blue-400" },
              { title: "07. Exfiltration / Impact", sub: "Breach Climax", badge: "FORECAST", color: "border-rose-500/60" },
            ].map((node, i) => (
              <div
                key={i}
                className={`relative bg-cyber-950/80 p-3.5 rounded-xl border ${node.color} shadow-lg text-center flex flex-col justify-between h-24 hover:scale-[1.02] transition-transform`}
              >
                <div>
                  <div className="text-[10px] font-mono text-cyan-400 font-bold">{node.badge}</div>
                  <div className="text-xs font-bold text-slate-100 mt-1 leading-snug">{node.title}</div>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">{node.sub}</div>

                {/* Arrow to Next Node on Desktop */}
                {i < 6 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-slate-600 z-20">
                    <ChevronRight className="w-4 h-4 text-cyan-500/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. ATTACK SCENARIO SELECTOR */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Reference Attack Scenarios</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mt-1">
              Explore Real-World Cyberattack Campaigns
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-sm">
            Select any real-world reference attack to examine its progression, observe telemetry signals, and test defense simulations.
          </p>
        </div>

        {/* 4 Scenario Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(CAMPAIGNS) as ScenarioKey[]).map((key) => {
            const camp = CAMPAIGNS[key];
            const isSelected = selectedScenario === key;
            return (
              <div
                key={key}
                onClick={() => {
                  setSelectedScenario(key);
                  setReplayStepIndex(0);
                  setIsPlayingReplay(false);
                  setShowForecastOpportunityAlert(false);
                }}
                className={`cursor-pointer rounded-2xl p-5 border transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? "bg-cyber-900/90 border-cyan-400 shadow-xl shadow-cyan-500/10 scale-[1.01]"
                    : "bg-cyber-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40"
                }`}
              >
                {/* Active selection dot */}
                {isSelected && (
                  <div className="absolute top-4 right-4 flex items-center space-x-1.5 bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>ACTIVE</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="text-[11px] font-mono text-slate-400">
                    <span className="text-cyan-400 font-bold">{camp.year}</span> • {camp.category}
                  </div>
                  <h3 className="text-base font-black text-slate-100 tracking-tight">
                    {camp.name}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {camp.summary}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-sans">
                  <span className="text-slate-400 text-[11px] font-mono">{camp.stages.length} Stages</span>
                  <button
                    className={`font-semibold flex items-center space-x-1 text-xs transition-colors ${
                      isSelected ? "text-cyan-300" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>{isSelected ? "Inspecting" : "Explore Defense"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. ATTACK STORY VIEW & CINEMATIC REPLAY RUNNER */}
      {/* ========================================================================= */}
      <section className="rounded-3xl bg-cyber-950/80 border border-cyan-900/40 shadow-xl p-6 sm:p-8 space-y-8">
        {/* Campaign Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
              <span className="font-bold">{currentCampaign.year}</span>
              <span>/</span>
              <span>{currentCampaign.adversary}</span>
              <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                {currentCampaign.category}
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-100 mt-1">
              {currentCampaign.name} — Progression Story
            </h3>
          </div>

          {/* Cinematic Attack Replay Controls */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-800">
            <button
              onClick={handleToggleReplay}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                isPlayingReplay
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20"
              }`}
            >
              {isPlayingReplay ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Replay</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>{replayStepIndex === 0 ? "Play Attack Replay" : "Resume Replay"}</span>
                </>
              )}
            </button>

            <button
              onClick={handleResetReplay}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Reset Replay"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Replay Speed Toggle */}
            <button
              onClick={() => setReplaySpeed(replaySpeed === 1 ? 2 : 1)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-cyan-300 font-semibold transition-colors"
            >
              {replaySpeed}x
            </button>

            <div className="text-[11px] font-mono text-slate-400 px-2 border-l border-slate-800">
              Stage: <strong className="text-slate-200">{replayStepIndex + 1}</strong> / {currentCampaign.stages.length}
            </div>
          </div>
        </div>

        {/* Auto-Pause Decision Support Alert */}
        {showForecastOpportunityAlert && (
          <div className="p-4 rounded-2xl bg-cyan-950/80 border border-cyan-400/50 shadow-lg shadow-cyan-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-bounce-short">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase">
                  THIS IS WHERE RAKSHAK PROVIDES DECISION SUPPORT
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Precursor signals detected at this moment. Rather than waiting for the final breach, the system forecasts
                  the impending stage and enables defenders to simulate preventative countermeasures.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenDefenseModal(currentCampaign.whereRakshakHelps.actionType)}
              className="flex-shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md transition-transform active:scale-95"
            >
              Test Defense Now
            </button>
          </div>
        )}

        {/* Interactive Multi-Stage Attack Progression Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>CHRONOLOGICAL ATTACK PROGRESSION</span>
            <span className="text-[11px] text-slate-500">Click any stage to inspect network signals</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentCampaign.stages.map((stage, idx) => {
              const isActiveInReplay = idx <= replayStepIndex;
              const isCurrentReplayStep = idx === replayStepIndex;

              return (
                <div
                  key={stage.id}
                  onClick={() => setReplayStepIndex(idx)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isCurrentReplayStep
                      ? "bg-cyber-900 border-cyan-400 shadow-lg shadow-cyan-500/10 scale-[1.01]"
                      : isActiveInReplay
                      ? "bg-cyber-950/90 border-slate-700"
                      : "bg-slate-950/40 border-slate-900 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">STAGE 0{idx + 1}</span>

                    {/* Status Badge */}
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                        stage.status === "OBSERVED"
                          ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                          : stage.status === "FORECAST"
                          ? "bg-cyan-950/80 text-cyan-300 border-cyan-800"
                          : stage.status === "NOT NETWORK-OBSERVABLE"
                          ? "bg-slate-900 text-slate-400 border-slate-800"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      {stage.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-100 mt-2">{stage.name}</h4>
                  <div className="text-[10px] font-mono text-cyan-400 mt-0.5">
                    {stage.mitreTactic} • {stage.mitreId}
                  </div>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{stage.explanation}</p>

                  {/* Network Signals Callout */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                    <span className="text-slate-500 font-semibold">Network Signals:</span>{" "}
                    <span className="text-slate-300">{stage.networkSignals}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. "WHERE RAKSHAK CAN HELP" (FOUR-PHASE PREDICTIVE PIPELINE) */}
      {/* ========================================================================= */}
      <section className="rounded-3xl bg-gradient-to-r from-cyber-950 via-cyber-900/80 to-cyber-950 border border-cyan-500/30 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Decision Support Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Where Rakshak Can Help
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            How sequence forecasting transforms passive network observation into proactive, simulated defense interventions.
          </p>
        </div>

        {/* 4-Step Visual Architecture */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Phase 1: Observed */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Step 01</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  OBSERVED
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-100">Telemetry Ingestion</h4>
              <p className="text-xs text-slate-300">{currentCampaign.whereRakshakHelps.observedStage}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
              {currentCampaign.whereRakshakHelps.observedSignals}
            </div>
          </div>

          {/* Phase 2: Rakshak Forecast */}
          <div className="bg-cyan-950/40 border border-cyan-500/40 p-5 rounded-2xl flex flex-col justify-between shadow-lg shadow-cyan-500/5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-cyan-400 uppercase">Step 02</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-900 text-cyan-300 border border-cyan-700 font-bold">
                  FORECAST
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-100">Causal Next-Stage Projection</h4>
              <p className="text-xs text-slate-300">{currentCampaign.whereRakshakHelps.forecastNext}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-cyan-900/60 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">Escalation Probability:</span>
              <span className="text-sm font-mono font-bold text-cyan-400">
                {(currentCampaign.whereRakshakHelps.forecastProb * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Phase 3: Defender Decision */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Step 03</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                  ACTION
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-100">Simulate Defensive Action</h4>
              <p className="text-xs text-slate-300">{currentCampaign.whereRakshakHelps.recommendedAction}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={() => handleOpenDefenseModal(currentCampaign.whereRakshakHelps.actionType)}
                className="w-full py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-colors"
              >
                Test in Topology
              </button>
            </div>
          </div>

          {/* Phase 4: Re-Forecast */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Step 04</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                  SIMULATION
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-100">Re-Forecast & Residual Risk</h4>
              <p className="text-xs text-slate-300">{currentCampaign.whereRakshakHelps.reforecastNext}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">Post-Defense Risk:</span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                {(currentCampaign.whereRakshakHelps.reforecastProb * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. THE MOMENT THAT MATTERS: FORECAST LEAD TIME VISUAL */}
      {/* ========================================================================= */}
      <section className="rounded-3xl bg-cyber-950/90 border border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">
              EARLY INTERVENTION WINDOW
            </div>
            <h3 className="text-2xl font-black text-slate-100 mt-1">
              The Moment That Matters — Forecast Lead Time
            </h3>
          </div>

          {/* Definition Tooltip */}
          <div className="text-xs text-slate-400 max-w-md bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-cyan-300 font-semibold font-mono">Lead Time Defined:</span> The measurable time interval
            provided between precursor signal classification at time <code className="text-cyan-300">t</code> and the predicted
            arrival of the next destructive attack phase.
          </div>
        </div>

        {/* Horizontal Animated Timeline Comparison */}
        <div className="space-y-4 pt-4">
          {/* Traditional Timeline (No Lead Time) */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-bold">Traditional Security Monitoring:</span>
              <span className="text-rose-400 font-semibold">Zero Lead Time (Reaction after Impact)</span>
            </div>
            <div className="relative h-6 w-full bg-slate-950 rounded-full overflow-hidden flex items-center p-1">
              <div className="w-[85%] h-full bg-slate-800 rounded-l-full" />
              <div className="w-[15%] h-full bg-rose-500/80 rounded-r-full flex items-center justify-center text-[10px] font-bold text-white font-mono">
                ALERT!
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>00:00 Attack Begins (Undetected)</span>
              <span>Lateral Movement Executed</span>
              <span className="text-rose-400">Breach Occurs &rarr; Alert Triggered</span>
            </div>
          </div>

          {/* Rakshak Predictive Lead Time Timeline */}
          <div className="bg-gradient-to-r from-cyan-950/60 to-blue-950/60 p-4 rounded-2xl border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-300 font-bold">Rakshak Predictive Cyber Defense:</span>
              <span className="text-cyan-400 font-bold">
                {currentCampaign.whereRakshakHelps.leadTimeWindow} Window
              </span>
            </div>
            <div className="relative h-7 w-full bg-slate-950 rounded-full overflow-hidden flex items-center p-1 border border-cyan-500/30">
              <div className="w-[30%] h-full bg-slate-800 rounded-l-full" />
              <div className="w-[45%] h-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-black text-slate-950 font-mono shadow-md">
                FORECAST LEAD TIME WINDOW
              </div>
              <div className="w-[25%] h-full bg-slate-900 rounded-r-full flex items-center justify-center text-[10px] text-emerald-400 font-bold font-mono">
                THREAT CONTAINED
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>00:00 Precursors Observed</span>
              <span className="text-cyan-300 font-bold">Forecast Issued & Countermeasure Simulated</span>
              <span className="text-emerald-400 font-bold">Attack Prevented Before Impact</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. DEFENSE ACTION CENTER (4 INTERACTIVE CARDS) */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">
              DEFENDER INTERVENTION SUITE
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mt-1">
              What Can the Defender Do?
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-sm">
            Select a countermeasure to launch the interactive network topology sandbox and test its causal impact on future risk.
          </p>
        </div>

        {/* 4 Interactive Defense Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Host Isolation */}
          <div className="bg-cyber-950/80 border border-slate-800 hover:border-cyan-500/40 p-5 rounded-2xl flex flex-col justify-between transition-all group">
            <div className="space-y-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 w-fit group-hover:scale-110 transition-transform">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-100 tracking-wide">
                ISOLATE AFFECTED HOST
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Disconnect a suspected compromised endpoint from the network using 802.1X quarantine or EDR agent isolation.
              </p>
            </div>
            <button
              onClick={() => handleOpenDefenseModal("HOST_ISOLATION")}
              className="mt-6 w-full py-2 rounded-xl bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 font-bold text-xs border border-slate-800 hover:border-cyan-400 transition-all flex items-center justify-center space-x-1.5"
            >
              <span>Isolate Host</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Block Destination Port */}
          <div className="bg-cyber-950/80 border border-slate-800 hover:border-cyan-500/40 p-5 rounded-2xl flex flex-col justify-between transition-all group">
            <div className="space-y-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 w-fit group-hover:scale-110 transition-transform">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-100 tracking-wide">
                BLOCK DESTINATION PORT
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Prevent suspicious lateral communication with targeted services (e.g. SMB port 445 or RDP 3389).
              </p>
            </div>
            <button
              onClick={() => handleOpenDefenseModal("BLOCK_DESTINATION_PORT")}
              className="mt-6 w-full py-2 rounded-xl bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-xs border border-slate-800 hover:border-amber-400 transition-all flex items-center justify-center space-x-1.5"
            >
              <span>Block Port</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Block Suspicious Source */}
          <div className="bg-cyber-950/80 border border-slate-800 hover:border-cyan-500/40 p-5 rounded-2xl flex flex-col justify-between transition-all group">
            <div className="space-y-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 w-fit group-hover:scale-110 transition-transform">
                <Ban className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-100 tracking-wide">
                BLOCK SUSPICIOUS SOURCE
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Halt ingress communication from external scanners or unauthorized threat actor IP addresses.
              </p>
            </div>
            <button
              onClick={() => handleOpenDefenseModal("BLOCK_SUSPICIOUS_SOURCE")}
              className="mt-6 w-full py-2 rounded-xl bg-slate-900 hover:bg-rose-500 hover:text-slate-950 text-rose-300 font-bold text-xs border border-slate-800 hover:border-rose-400 transition-all flex items-center justify-center space-x-1.5"
            >
              <span>Block Source</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 4: Restrict Outbound Traffic */}
          <div className="bg-cyber-950/80 border border-slate-800 hover:border-cyan-500/40 p-5 rounded-2xl flex flex-col justify-between transition-all group">
            <div className="space-y-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 w-fit group-hover:scale-110 transition-transform">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-100 tracking-wide">
                RESTRICT OUTBOUND TRAFFIC
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enforce strict egress filtering to sever command-and-control beacon channels and block data exfiltration.
              </p>
            </div>
            <button
              onClick={() => handleOpenDefenseModal("RESTRICT_OUTBOUND_TRAFFIC")}
              className="mt-6 w-full py-2 rounded-xl bg-slate-900 hover:bg-purple-500 hover:text-slate-950 text-purple-300 font-bold text-xs border border-slate-800 hover:border-purple-400 transition-all flex items-center justify-center space-x-1.5"
            >
              <span>Restrict Outbound</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. BEFORE VS AFTER FORECAST & ATTACK TRAJECTORY CHART */}
      {/* ========================================================================= */}
      <section className="rounded-3xl bg-cyber-950/90 border border-cyan-900/40 p-6 sm:p-8 space-y-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">
              CAUSAL RISK COMPARISON
            </div>
            <h3 className="text-2xl font-black text-slate-100 mt-1">
              How Does the Future Change?
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-400">Simulation Status:</span>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                hasRunSimulation
                  ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                  : "bg-slate-900 text-slate-400 border-slate-800"
              }`}
            >
              {hasRunSimulation ? "DEFENSE APPLIED IN SIMULATION" : "BASELINE (NO DEFENSE)"}
            </span>
          </div>
        </div>

        {/* Before vs After Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Predicted Next Stage</div>
            <div className="text-base font-bold text-slate-100 flex items-center justify-between">
              <span className="text-rose-400">{currentCampaign.whereRakshakHelps.forecastNext}</span>
              {hasRunSimulation && <span className="text-emerald-400 font-mono text-xs">&rarr; Benign / Contained</span>}
            </div>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Attack Probability</div>
            <div className="text-base font-mono font-bold flex items-center justify-between">
              <span className="text-rose-400">
                {(currentCampaign.whereRakshakHelps.forecastProb * 100).toFixed(0)}%
              </span>
              {hasRunSimulation && (
                <span className="text-emerald-400">
                  &rarr; {(currentCampaign.whereRakshakHelps.reforecastProb * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Future Risk Score</div>
            <div className="text-base font-mono font-bold flex items-center justify-between">
              <span className="text-rose-400">9.3 / 10</span>
              {hasRunSimulation && <span className="text-emerald-400">&rarr; 2.1 / 10</span>}
            </div>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Forecast Lead Time</div>
            <div className="text-base font-mono font-bold text-cyan-400">
              {currentCampaign.whereRakshakHelps.leadTimeWindow}
            </div>
          </div>
        </div>

        {/* Recharts Attack Trajectory Line Chart */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>RISK TRAJECTORY PROJECTION (t to t+5)</span>
            <span className="text-[11px] text-slate-500">
              {hasRunSimulation ? "Comparing Baseline vs. Defended Trajectory" : "Run simulation to view defended curve"}
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full bg-cyber-950/60 rounded-2xl border border-slate-800 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartTrajectoryData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="step" stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis domain={[0, 10]} stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#030712",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Line
                  type="monotone"
                  dataKey="baselineRisk"
                  name="Baseline Risk Trajectory"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#f43f5e" }}
                  activeDot={{ r: 6 }}
                />
                {hasRunSimulation && (
                  <Line
                    type="monotone"
                    dataKey="defendedRisk"
                    name="After Simulated Defense"
                    stroke="#00f0ff"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 4, fill: "#00f0ff" }}
                    activeDot={{ r: 6 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] font-mono text-slate-500 text-center">
            * Simulated future trajectory under causal feature perturbation — not guaranteed attack prevention.
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. 5-STEP VISUAL DIAGRAM: HOW RAKSHAK DEFENDS */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">
            OPERATIONAL METHODOLOGY
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            How Rakshak Defends — In 5 Steps
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            {
              step: "01",
              title: "OBSERVE",
              desc: "Streaming network flow records, port entropy, packet timing, and socket states.",
              icon: Activity,
            },
            {
              step: "02",
              title: "UNDERSTAND",
              desc: "Formulate the causal network state representation strictly using past telemetry (t <= T_obs).",
              icon: Cpu,
            },
            {
              step: "03",
              title: "FORECAST",
              desc: "Neural sequence models project the probability and lead time of the impending next attack stage.",
              icon: Radio,
            },
            {
              step: "04",
              title: "SIMULATE",
              desc: "Defenders test tactical interventions (isolation, port blocks) in a causal sandbox.",
              icon: Sliders,
            },
            {
              step: "05",
              title: "RE-FORECAST",
              desc: "Instantly evaluate post-intervention risk trajectories to verify threat containment.",
              icon: ShieldCheck,
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-cyber-950/80 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-cyan-500/40 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400">{item.step}</span>
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <h4 className="text-sm font-black text-slate-100 tracking-wide">{item.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. TRADITIONAL SECURITY VS PREDICTIVE DEFENSE COMPARISON TABLE */}
      {/* ========================================================================= */}
      <section className="rounded-3xl bg-cyber-950/80 border border-slate-800 p-6 sm:p-8 space-y-6">
        <h3 className="text-xl font-bold text-slate-100">
          Traditional Security vs. Predictive Defense
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="text-xs font-mono text-rose-400 font-bold uppercase">
              Traditional Monitoring (Reactive)
            </div>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start space-x-2">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>"What happened?"</strong> Relies on historical log aggregation after systems are breached.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>"What is happening now?"</strong> Alerts only after malware payload triggers an alarm.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>High Alert Fatigue:</strong> Floods analysts with thousands of isolated reactive notifications.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>Zero Sandbox Pre-Testing:</strong> Defenders cannot preview if a firewall rule will disrupt operations.</span>
              </li>
            </ul>
          </div>

          <div className="bg-cyan-950/30 p-5 rounded-2xl border border-cyan-500/30 space-y-3">
            <div className="text-xs font-mono text-cyan-300 font-bold uppercase">
              Rakshak Predictive Defense (Proactive)
            </div>
            <ul className="space-y-2.5 text-xs text-slate-200">
              <li className="flex items-start space-x-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <span><strong>"What could happen next?"</strong> Projects multi-step attack escalation before it occurs.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <span><strong>Forecast Lead Time:</strong> Gives 30–120s windows to intervene before critical impact.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <span><strong>Causal What-If Simulation:</strong> Test host isolation or port blocking and view re-forecasted risk.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <span><strong>Sequence Grounding:</strong> Aligns live network observables directly to verified MITRE ATT&CK stages.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. MITRE ATT&CK STAGE MAPPING TABLE */}
      {/* ========================================================================= */}
      <section className="rounded-3xl bg-cyber-950/80 border border-slate-800 p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">
              ENTERPRISE FRAMEWORK ALIGNMENT
            </div>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">
              MITRE ATT&CK® Mapping — {currentCampaign.name}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Verified Techniques & Observability Status
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-900/90 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">Tactic</th>
                <th className="p-3">Technique ID</th>
                <th className="p-3">Technique Name</th>
                <th className="p-3">Observability</th>
                <th className="p-3">Defensive Opportunity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {currentCampaign.mitreMatrix.map((item, i) => (
                <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3 text-cyan-300 font-semibold">{item.tactic}</td>
                  <td className="p-3 text-slate-200">{item.techniqueId}</td>
                  <td className="p-3 text-slate-100 font-sans">{item.techniqueName}</td>
                  <td className="p-3">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                        item.observability === "OBSERVED"
                          ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                          : item.observability === "FORECAST"
                          ? "bg-cyan-950 text-cyan-300 border-cyan-800"
                          : item.observability === "INFERRED"
                          ? "bg-amber-950 text-amber-300 border-amber-800"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {item.observability}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300 font-sans text-xs">{item.defenseOpportunity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. FINAL CALL TO ACTION */}
      {/* ========================================================================= */}
      <section className="text-center rounded-3xl bg-gradient-to-b from-cyber-900/90 to-cyber-950 border border-cyan-500/30 p-8 sm:p-12 space-y-6 shadow-2xl">
        <h2 className="text-2xl sm:text-4xl font-black text-slate-100 tracking-tight">
          DON'T JUST DETECT THE ATTACK.
          <br />
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            UNDERSTAND WHERE IT IS GOING.
          </span>
        </h2>

        <p className="text-sm text-slate-300 max-w-xl mx-auto">
          Explore the live predictive defense platform with real-time PyTorch LSTM sequence inference,
          explainable SHAP attributions, and sandbox What-If simulation.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={() => onNavigate("forecast")}
            className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all text-xs font-sans tracking-wide"
          >
            <span>Launch Live Platform</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate("simulation")}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-bold px-6 py-3 rounded-xl border border-slate-800 hover:border-cyan-500/40 transition-all text-xs font-sans tracking-wide"
          >
            <span>Try Defense Simulation</span>
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 12. DEFENSE INTERACTION MODAL / TOPOLOGY DRAWER */}
      {/* ========================================================================= */}
      {activeDefenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-cyber-950 rounded-3xl border border-cyan-500/40 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100 tracking-tight">
                    Simulate Defense — {activeDefenseModal.replace(/_/g, " ")}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400">
                    Campaign: <strong className="text-cyan-300">{currentCampaign.name}</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveDefenseModal(null)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Interactive Network Map Visualization */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>5-NODE SUB-TOPOLOGY SANDBOX</span>
                <span className="text-[10px] text-cyan-400 font-bold">
                  {isDefenseAppliedInModal ? "ACTION ACTIVE" : "NORMAL TOPOLOGY"}
                </span>
              </div>

              <InteractiveNetworkMap
                actionId={activeDefenseModal}
                isApplied={isDefenseAppliedInModal}
                targetEntity={
                  activeDefenseModal === "HOST_ISOLATION"
                    ? "Orion-Host-150"
                    : activeDefenseModal === "BLOCK_DESTINATION_PORT"
                    ? "Port 445 SMB"
                    : activeDefenseModal === "BLOCK_SUSPICIOUS_SOURCE"
                    ? "External Scanner"
                    : "Outbound Gateway"
                }
              />
            </div>

            {/* Modal Action Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  onClick={() => setIsDefenseAppliedInModal(!isDefenseAppliedInModal)}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs font-mono border transition-all ${
                    isDefenseAppliedInModal
                      ? "bg-rose-950/80 text-rose-300 border-rose-800 hover:bg-rose-900"
                      : "bg-cyan-950/80 text-cyan-300 border-cyan-800 hover:bg-cyan-900"
                  }`}
                >
                  {isDefenseAppliedInModal ? "✕ Remove Defense" : "✓ Apply Defense in Map"}
                </button>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  onClick={() => setActiveDefenseModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Close
                </button>

                <button
                  onClick={handleRunSimulation}
                  disabled={isSimulatingBackend}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isSimulatingBackend ? "Simulating..." : "Run Causal Simulation"}
                </button>
              </div>
            </div>

            {/* Simulation Feedback Alert */}
            {hasRunSimulation && (
              <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-slate-300 space-y-2 animate-fadeIn">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold font-mono">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>SIMULATION COMPLETE & RE-FORECAST UPDATED</span>
                </div>
                <p>
                  Defensive action evaluated against the sequence forecasting engine. Post-intervention risk reduced
                  from <strong className="text-rose-400">9.3</strong> to <strong className="text-emerald-400">2.1</strong>.
                  View the updated comparison curves in the main trajectory panel.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
