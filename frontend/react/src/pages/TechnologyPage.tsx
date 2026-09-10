import React, { useState } from "react";
import {
  Cpu,
  Database,
  Layers,
  Server,
  Code,
  Box,
  Terminal,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  Network,
  Activity,
  ArrowRight,
} from "lucide-react";
import { PageId } from "../components/layout/Navbar";

interface TechnologyPageProps {
  onNavigate: (page: PageId) => void;
}

const TECH_STACK = [
  {
    category: "AI & Machine Learning",
    name: "PyTorch & LSTM",
    description: "Multi-layer Recurrent Neural Network modeling temporal dependencies across sequential time windows.",
    highlight: "Hidden state memory &bull; Zero temporal leakage",
    icon: Cpu,
    color: "cyan",
  },
  {
    category: "Baseline Classifier",
    name: "XGBoost & Scikit-Learn",
    description: "Gradient boosted decision trees and Logistic Regression providing rigorous non-temporal baseline comparisons.",
    highlight: "TreeSHAP attribution integration",
    icon: Layers,
    color: "blue",
  },
  {
    category: "Network Telemetry",
    name: "Zeek, DPKT & Scapy",
    description: "Passive, non-blocking packet streaming engines that parse .pcap and .pcapng files into 55 behavioral features.",
    highlight: "No active packet modification &bull; Causal t <= T_obs",
    icon: Network,
    color: "emerald",
  },
  {
    category: "High-Performance Backend",
    name: "FastAPI & Pydantic v2",
    description: "Async Python REST API layer maintaining strict separation between HTTP controllers, services, and ML inference.",
    highlight: "Swagger UI &bull; Sub-10ms response latency",
    icon: Terminal,
    color: "purple",
  },
  {
    category: "State Persistence",
    name: "PostgreSQL & SQLite",
    description: "Production PostgreSQL database with automatic graceful fallback to local SQLite for offline demonstrations.",
    highlight: "100% offline capable",
    icon: Database,
    color: "amber",
  },
  {
    category: "Frontend & Visualization",
    name: "React, Three.js & Tailwind",
    description: "Modern TypeScript dashboard with 3D Cyber Intelligence Core, Recharts probability timelines, and responsive layouts.",
    highlight: "60 FPS rendering &bull; Hardware accelerated",
    icon: Code,
    color: "cyan",
  },
  {
    category: "DevOps & Containerization",
    name: "Docker & Compose",
    description: "Reproducible container architecture bundling the complete Python backend, database, and Vite frontend.",
    highlight: "One-command deployment",
    icon: Box,
    color: "indigo",
  },
];

const PIPELINE_STAGES = [
  { step: "1", title: "Network Traffic", desc: "Raw packets / PCAP" },
  { step: "2", title: "Streaming Parser", desc: "Zeek / DPKT Engine" },
  { step: "3", title: "Feature Vector", desc: "55 Statistical Metrics" },
  { step: "4", title: "Temporal Windows", desc: "Discrete t0, t1, t2..." },
  { step: "5", title: "PyTorch LSTM", desc: "Sequence State Engine" },
  { step: "6", title: "K-Step Forecast", desc: "Multi-Horizon P(S_t+k)" },
  { step: "7", title: "MITRE & XAI", desc: "SHAP & ATT&CK Mapping" },
  { step: "8", title: "What-If Sandbox", desc: "Counterfactual Defense" },
  { step: "9", title: "Live Dashboard", desc: "React + Three.js" },
];

export const TechnologyPage: React.FC<TechnologyPageProps> = ({ onNavigate }) => {
  const [showMathDetails, setShowMathDetails] = useState(false);

  return (
    <div className="space-y-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
          <Layers className="w-3.5 h-3.5" />
          <span>SYSTEM ARCHITECTURE &bull; TECH STACK</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
          Engineering Architecture <br />
          <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            &amp; Technology Stack.
          </span>
        </h1>
        <p className="text-base text-slate-300 max-w-2xl mx-auto">
          A clean service-oriented architecture designed for deterministic reproducibility, strict causal isolation, and high-assurance offline execution.
        </p>
      </div>

      {/* End-to-End Pipeline Diagram */}
      <section className="bg-cyber-900/40 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span>End-to-End Processing Pipeline</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Chronological flow from raw telemetry to interactive counterfactual defense
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded border border-cyan-800 hidden sm:block">
            Causal Guarantee: t &le; T_obs
          </span>
        </div>

        {/* Pipeline Steps Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
          {PIPELINE_STAGES.map((s) => (
            <div
              key={s.step}
              className="cyber-card p-3 rounded-xl text-center space-y-1.5 border-slate-800 flex flex-col justify-between"
            >
              <div className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/80 w-5 h-5 rounded-full mx-auto flex items-center justify-center border border-cyan-800">
                {s.step}
              </div>
              <div className="text-xs font-bold text-slate-200">{s.title}</div>
              <div className="text-[10px] text-slate-500 font-mono">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Modern Technology Cards */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100">Core Technologies</h2>
          <span className="text-xs font-mono text-slate-400">7 Production Components</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TECH_STACK.map((tech) => {
            const Icon = tech.icon;
            return (
              <div
                key={tech.name}
                className="cyber-card p-6 rounded-2xl border-slate-800 hover:border-cyan-500/40 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                      {tech.category}
                    </span>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-100">{tech.name}</h3>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {tech.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono text-cyan-300/90">
                  &bull; {tech.highlight}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expandable Mathematical Formulation & Technical Specs */}
      <div className="cyber-card p-6 sm:p-8 rounded-3xl border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Mathematical &amp; Causal Specifications</span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Formal problem formulation for academic reviewers and cybersecurity researchers
            </p>
          </div>

          <button
            onClick={() => setShowMathDetails(!showMathDetails)}
            className="flex items-center space-x-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700"
          >
            <span>{showMathDetails ? "Collapse" : "Expand Formulation"}</span>
            {showMathDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showMathDetails && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 text-xs font-mono text-slate-300 leading-relaxed animate-fadeIn">
            <div className="p-4 rounded-xl bg-cyber-950 border border-slate-800 space-y-2">
              <div className="text-cyan-400 font-bold">1. Discrete State Formulation:</div>
              <p>
                Let T = &#123;W_0, W_1, ..., W_t&#125; denote consecutive time windows of duration &Delta;t (e.g. 20s). Each window yields feature vector x_t &isin; R^55. The latent attack stage S_t &isin; &#123;Benign, Recon, Scan, Exploit, Credential, Lateral, C2, Exfiltration&#125;.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-cyber-950 border border-slate-800 space-y-2">
              <div className="text-cyan-400 font-bold">2. Multi-Horizon Recursive Prediction:</div>
              <p>
                The PyTorch LSTM model maps the sequence [x_&#123;t-n&#125;, ..., x_t] to forward transition probabilities P(S_&#123;t+k&#125; | x_&#123;&le; t&#125;) for k &isin; [1, K]. The prediction is strictly causal: no future packets or labels are accessible at inference timestamp T_obs.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-cyber-950 border border-slate-800 space-y-2">
              <div className="text-cyan-400 font-bold">3. Explainability Attribution (Integrated Gradients):</div>
              <p>
                Attribution score IG_i(x) = (x_i - x_i') &times; &int;_0^1 (&part; F(x' + &alpha;(x - x')) / &part; x_i) d&alpha;, where x' is the benign operational baseline vector. This isolates exact feature sensitivities driving attack escalation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
