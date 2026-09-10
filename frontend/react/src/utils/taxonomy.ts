/**
 * Taxonomy and plain-English translations for SIH26153 Attack Progression Forecasting.
 * Converts complex cybersecurity and ML terminology into human-friendly explanations.
 */

export interface StageInfo {
  technicalName: string;
  plainEnglishTitle: string;
  plainEnglishDescription: string;
  shortDescription: string;
  badgeColor: string;
  accentColor: string;
  severity: "BENIGN" | "MODERATE" | "HIGH" | "CRITICAL";
}

export const STAGE_TRANSLATIONS: Record<string, StageInfo> = {
  NORMAL: {
    technicalName: "NORMAL",
    plainEnglishTitle: "Routine Network Activity",
    plainEnglishDescription: "All communication patterns match expected benign baseline operations.",
    shortDescription: "Normal operations with no indicators of compromise.",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/40",
    accentColor: "#10b981",
    severity: "BENIGN",
  },
  BENIGN: {
    technicalName: "BENIGN",
    plainEnglishTitle: "Standard Operations",
    plainEnglishDescription: "Standard operational traffic with no indicators of compromise.",
    shortDescription: "Normal operations with no indicators of compromise.",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/40",
    accentColor: "#10b981",
    severity: "BENIGN",
  },
  RECONNAISSANCE: {
    technicalName: "RECONNAISSANCE",
    plainEnglishTitle: "Information Gathering",
    plainEnglishDescription: "The attacker may be gathering information about systems and active services.",
    shortDescription: "The attacker may be gathering information.",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/40",
    accentColor: "#06b6d4",
    severity: "MODERATE",
  },
  SCANNING: {
    technicalName: "SCANNING",
    plainEnglishTitle: "System & Port Probing",
    plainEnglishDescription: "An attacker may begin checking which services and open ports are available.",
    shortDescription: "An attacker may begin checking which services are available.",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/40",
    accentColor: "#06b6d4",
    severity: "MODERATE",
  },
  INITIAL_ACCESS: {
    technicalName: "INITIAL_ACCESS",
    plainEnglishTitle: "Attempting Initial Access",
    plainEnglishDescription: "An attacker may be attempting to gain an initial unauthorized foothold.",
    shortDescription: "An attacker may be attempting to gain initial unauthorized access.",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/40",
    accentColor: "#f59e0b",
    severity: "HIGH",
  },
  EXPLOITATION: {
    technicalName: "EXPLOITATION",
    plainEnglishTitle: "Vulnerability Exploitation",
    plainEnglishDescription: "An attacker may try to use a weakness or software flaw to gain access.",
    shortDescription: "An attacker may try to use a weakness to gain access.",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/40",
    accentColor: "#f59e0b",
    severity: "HIGH",
  },
  CREDENTIAL_ACCESS: {
    technicalName: "CREDENTIAL_ACCESS",
    plainEnglishTitle: "Credential & Password Theft",
    plainEnglishDescription: "An attacker may attempt to obtain login credentials, tokens, or passwords.",
    shortDescription: "An attacker may attempt to obtain login credentials.",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/40",
    accentColor: "#a855f7",
    severity: "HIGH",
  },
  LATERAL_MOVEMENT: {
    technicalName: "LATERAL_MOVEMENT",
    plainEnglishTitle: "Internal Spreading",
    plainEnglishDescription: "An attacker may try to move to another device inside the internal network.",
    shortDescription: "An attacker may try to move to another device.",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/40",
    accentColor: "#a855f7",
    severity: "HIGH",
  },
  COMMAND_AND_CONTROL: {
    technicalName: "COMMAND_AND_CONTROL",
    plainEnglishTitle: "Remote Attacker Channel",
    plainEnglishDescription: "A possible communication channel between attacker and compromised device.",
    shortDescription: "A possible communication channel between attacker and compromised device.",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/40",
    accentColor: "#f43f5e",
    severity: "CRITICAL",
  },
  EXFILTRATION: {
    technicalName: "EXFILTRATION",
    plainEnglishTitle: "Possible Unauthorized Data Transfer",
    plainEnglishDescription: "Data appears to be leaving the network without authorization.",
    shortDescription: "Data appears to be leaving the network.",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/40",
    accentColor: "#f43f5e",
    severity: "CRITICAL",
  },
  IMPACT_DOS: {
    technicalName: "IMPACT_DOS",
    plainEnglishTitle: "Service Disruption / Flooding",
    plainEnglishDescription: "An attacker may attempt to exhaust resources or knock network services offline.",
    shortDescription: "Attacker attempting to disrupt availability or degrade services.",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/40",
    accentColor: "#f43f5e",
    severity: "CRITICAL",
  },
};

/**
 * Returns plain English info for any attack stage name (case-insensitive fallback).
 */
export const getStageInfo = (stageName?: string): StageInfo => {
  if (!stageName) {
    return {
      technicalName: "INITIALIZING",
      plainEnglishTitle: "Analyzing Telemetry",
      plainEnglishDescription: "AI is observing current packet traffic.",
      shortDescription: "Analyzing network activity...",
      badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/40",
      accentColor: "#64748b",
      severity: "BENIGN",
    };
  }

  const clean = stageName.toUpperCase().replace(/\s+/g, "_");
  if (STAGE_TRANSLATIONS[clean]) {
    return STAGE_TRANSLATIONS[clean];
  }

  return {
    technicalName: stageName,
    plainEnglishTitle: stageName.replace(/_/g, " "),
    plainEnglishDescription: `Active network stage identified as ${stageName.replace(/_/g, " ").toLowerCase()}.`,
    shortDescription: `Detected pattern matching ${stageName.replace(/_/g, " ").toLowerCase()}.`,
    badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/40",
    accentColor: "#38bdf8",
    severity: "MODERATE",
  };
};

/**
 * Translates technical feature names to human-readable explanations.
 */
export const translateFeatureToPlainEnglish = (
  featureName: string,
  val?: number
): { title: string; description: string } => {
  const f = featureName.toLowerCase();
  const isHigh = val !== undefined ? val > 0 : true;

  if (f.includes("peak_to_av") || f.includes("ratio")) {
    return {
      title: "Sudden traffic volume surge",
      description: isHigh
        ? "Network traffic briefly spiked significantly above normal baseline levels."
        : "Traffic throughput dropped below typical activity levels.",
    };
  }
  if (f.includes("tcp_win") || f.includes("window")) {
    return {
      title: "Unusual connection handshake behavior",
      description: isHigh
        ? "TCP buffer parameters deviated from standard operating system defaults."
        : "Restricted TCP flow control observed on established connections.",
    };
  }
  if (f.includes("ttl")) {
    return {
      title: "Unexpected packet routing path",
      description: "Packets traversed unusual network hop counts, suggesting abnormal routing or spoofing.",
    };
  }
  if (f.includes("psh")) {
    return {
      title: "Urgent data push requests",
      description: isHigh
        ? "Surge in immediate data-delivery packets carrying high-priority application payloads."
        : "Lower than average application data transmission rate.",
    };
  }
  if (f.includes("size") || f.includes("byte") || f.includes("packet_siz")) {
    return {
      title: "Irregular packet payload size",
      description: isHigh
        ? "Packets carry unusually large data chunks compared to standard sessions."
        : "Abnormally small probe packets detected.",
    };
  }
  if (f.includes("conn") || f.includes("socket") || f.includes("active")) {
    return {
      title: "Unusual connection activity",
      description: "A sudden increase in simultaneous open communication channels was observed.",
    };
  }
  if (f.includes("syn") || f.includes("port") || f.includes("dst")) {
    return {
      title: "Repeated attempts to reach services",
      description: "Multiple connection attempts were made to specific network service endpoints.",
    };
  }
  if (f.includes("rst") || f.includes("fail") || f.includes("drop")) {
    return {
      title: "Increase in failed connections",
      description: "Multiple connection requests were terminated or rejected unexpectedly.",
    };
  }
  if (f.includes("dur") || f.includes("time")) {
    return {
      title: "Abnormal connection duration",
      description: "Sessions opened and closed at unusual rates compared to benign baselines.",
    };
  }

  return {
    title: `Anomalous pattern in ${featureName.replace(/_/g, " ")}`,
    description: `Statistical deviation (${val !== undefined ? `${val > 0 ? "+" : ""}${val.toFixed(2)}σ` : "detected"}) in network telemetry.`,
  };
};

/**
 * Standard tooltips for non-technical users.
 */
export const CYBER_TOOLTIPS = {
  connections: "Connections = active communication sessions between devices",
  packets: "Packets = small individual pieces of network data analyzed by AI",
  bytes: "Bytes = total amount of data observed moving across the network",
  networkState: "Network state is a summary of what the network is doing during a specific time window.",
  forecast: "What the AI thinks may happen next based on historical patterns.",
  probability: "How strongly the model expects this outcome (from 0% to 100%).",
  leadTime: "How much warning time the system provided before the predicted event actually occurred.",
  lstm: "LSTM is a type of AI model designed to learn patterns that change over time. In this project, it helps the system understand how network behavior evolves from one moment to the next.",
};
