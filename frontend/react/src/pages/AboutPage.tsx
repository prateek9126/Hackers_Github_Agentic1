import React, { useState } from "react";
import {
  ShieldAlert,
  ArrowRight,
  Clock,
  Cpu,
  Lock,
  Layers,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Database,
  Sparkles,
} from "lucide-react";
import { PageId } from "../components/layout/Navbar";

interface AboutPageProps {
  onNavigate: (page: PageId) => void;
}

const ATTACK_STAGES = [
  {
    step: "01",
    name: "Reconnaissance",
    description: "Adversary probes public boundaries and identifies active host subnets.",
    signals: "High DNS query volume, ICMP echo sweeps, target mapping.",
    color: "border-blue-500/40 text-blue-400 bg-blue-500/10",
  },
  {
    step: "02",
    name: "Scanning",
    description: "Systematic port probes and service banner enumeration across open sockets.",
    signals: "SYN packet surges, high destination port entropy, half-open TCP handshakes.",
    color: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
  },
  {
    step: "03",
    name: "Exploitation",
    description: "Payload delivery targeting exposed vulnerabilities in web applications or services.",
    signals: "Sudden payload entropy shifts, abnormal HTTP URI patterns, buffer overflows.",
    color: "border-amber-500/40 text-amber-400 bg-amber-500/10",
  },
  {
    step: "04",
    name: "Credential Access",
    description: "Brute-force authentication or credential dumping from local memory caches.",
    signals: "Repeated failed login ratios, Kerberos ticket requests, NTLM bursts.",
    color: "border-rose-500/40 text-rose-400 bg-rose-500/10",
  },
  {
    step: "05",
    name: "Lateral Movement",
    description: "Pivoting between compromised internal subnets to reach crown-jewel assets.",
    signals: "East-west SMB/RDP connections, new internal socket pairs, pass-the-hash.",
    color: "border-purple-500/40 text-purple-400 bg-purple-500/10",
  },
  {
    step: "06",
    name: "Command & Control",
    description: "Establishing beaconing channels back to remote adversary infrastructure.",
    signals: "Periodic beacon heartbeats, low-and-slow HTTPS channels, DNS tunneling.",
    color: "border-indigo-500/40 text-indigo-400 bg-indigo-500/10",
  },
  {
    step: "07",
    name: "Exfiltration",
    description: "Staging, compressing, and transmitting sensitive data out of the boundary.",
    signals: "Outbound byte burst ratio spike, bulk encrypted flows, anomalous egress ports.",
    color: "border-red-500/50 text-red-400 bg-red-500/20",
  },
];

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  const [selectedStage, setSelectedStage] = useState<number>(1);

  return (
    <div className="space-y-20 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>SIH26153 RESEARCH &amp; MISSION</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
          Building Cyber Defense <br />
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            That Thinks Ahead.
          </span>
        </h1>
        <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Most security systems are designed to identify suspicious activity as it happens. But cyber attacks are rarely a single event. They evolve through a systematic sequence of actions over time.
        </p>
      </div>

      {/* 1. THE ATTACK PROGRESSION TIMELINE */}
      <section className="space-y-6 bg-cyber-900/40 p-6 sm:p-8 rounded-3xl border border-slate-800 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <span>The Attack Evolution Sequence</span>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                Kill Chain Progression
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Click any stage to view its typical behavioral telemetry signature.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Temporal Transitions: S(t) &rarr; S(t+1)
          </span>
        </div>

        {/* Horizontal Progression Scrubber */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {ATTACK_STAGES.map((stage, idx) => {
            const isSelected = selectedStage === idx;
            return (
              <button
                key={stage.step}
                onClick={() => setSelectedStage(idx)}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? `${stage.color} ring-1 ring-cyan-400 shadow-lg`
                    : "border-slate-800 bg-cyber-950/60 hover:bg-slate-900 text-slate-400"
                }`}
              >
                <div className="text-[10px] font-mono opacity-70">{stage.step}</div>
                <div className="text-xs font-bold truncate mt-1 text-slate-200">
                  {stage.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Stage Detail Panel */}
        <div className="cyber-card p-6 rounded-2xl border-cyan-500/30 space-y-3">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              STAGE {ATTACK_STAGES[selectedStage].step}
            </span>
            <h3 className="text-base font-bold text-slate-100">
              {ATTACK_STAGES[selectedStage].name}
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {ATTACK_STAGES[selectedStage].description}
          </p>
          <div className="text-xs font-mono bg-cyber-950 p-3 rounded-xl border border-slate-800 text-cyan-300">
            <span className="text-slate-500">&gt; KEY NETWORK SIGNALS: </span>
            {ATTACK_STAGES[selectedStage].signals}
          </div>
        </div>
      </section>

      {/* 2. FIVE CORE SECTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Section A: The Problem */}
        <div className="cyber-card p-6 rounded-2xl space-y-3 border-rose-900/30">
          <div className="flex items-center space-x-2 text-rose-400">
            <AlertCircle className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-100">The Problem</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Traditional security tools (SIEMs, firewalls, and IDS) trigger point-in-time alerts only after a malicious signature matches. This creates two fatal weaknesses:
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4 font-mono">
            <li>Zero warning time before initial breach or payload drop.</li>
            <li>Alert fatigue: Analysts receive thousands of isolated alerts without sequential context.</li>
          </ul>
        </div>

        {/* Section B: Our Approach */}
        <div className="cyber-card p-6 rounded-2xl space-y-3 border-cyan-500/30">
          <div className="flex items-center space-x-2 text-cyan-400">
            <Cpu className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-100">Our Approach</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            We model network security as a continuous temporal state engine. High-speed network traffic is ingested into chronological observation windows, transformed into 55 behavioral features, and evaluated with a PyTorch LSTM to forecast the next 1 to 5 attack stages.
          </p>
          <div className="text-[11px] font-mono text-cyan-400">
            Formula: P(S(t+k) | S(t-n), ..., S(t)) for k &isin; [1, 5]
          </div>
        </div>

        {/* Section C: Why Prediction Matters */}
        <div className="cyber-card p-6 rounded-2xl space-y-3 border-emerald-500/30">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Clock className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-100">Why Prediction Matters</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The difference between defense and compromise is <strong>Lead Time</strong>. By projecting that a Reconnaissance phase will transition into Exploitation in +20 seconds and Credential Access in +60 seconds, automated defenders gain critical minutes to isolate compromised subnets before data leaves the network.
          </p>
          <div className="text-[11px] font-mono text-emerald-400">
            Measured: 55.6s mean advance warning time on benchmark captures.
          </div>
        </div>

        {/* Section D: What Makes Us Different */}
        <div className="cyber-card p-6 rounded-2xl space-y-3 border-purple-500/30">
          <div className="flex items-center space-x-2 text-purple-400">
            <Layers className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-100">What Makes Our Approach Different</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Unlike static classification models that predict benign/malicious on isolated packets:
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4 font-mono">
            <li>Strict causal filtering: never leaks future traffic into past predictions.</li>
            <li>Direct mapping to MITRE ATT&amp;CK tactics and techniques.</li>
            <li>Counterfactual sandbox: test defenses before taking down production.</li>
          </ul>
        </div>
      </div>

      {/* Section E: Research Foundation */}
      <section className="bg-cyber-900/50 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2 text-blue-400">
          <Database className="w-5 h-5" />
          <h3 className="text-base font-bold text-slate-100">Research Foundation &amp; Datasets</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          The models and heuristics in SIH26153 have been validated against the authoritative <strong>CTU-13 Botnet Capture Dataset</strong> (Scenario 5 Virut botnet) and multi-stage synthetic kill-chain progressions. Features are extracted via streaming Zeek-compatible behavioral aggregators, preserving full offline reproducibility with zero cloud dependencies.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => onNavigate("how-it-works")}
            className="flex items-center space-x-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 px-3 py-1.5 rounded-lg border border-cyan-800"
          >
            <span>Inspect Architecture &amp; Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigate("results")}
            className="flex items-center space-x-1.5 text-xs font-mono text-slate-300 hover:text-slate-100 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700"
          >
            <span>Review Benchmark Results</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
};
