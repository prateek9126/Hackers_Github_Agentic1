import React, { useState } from "react";
import {
  Eye,
  Binary,
  Brain,
  TrendingUp,
  Search,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Zap,
} from "lucide-react";
import { PageId } from "../components/layout/Navbar";

interface HowItWorksPageProps {
  onNavigate: (page: PageId) => void;
}

const STEPS = [
  {
    num: "01",
    title: "OBSERVE",
    subtitle: "Network traffic enters the platform passively.",
    simpleExplanation:
      "The system monitors incoming and outgoing network traffic without slowing down connections. It continuously streams raw packets (.pcap / .pcapng / Zeek) into structured chronological time windows.",
    technicalDetails:
      "Packets are ingested via DPKT/Scapy streaming pipelines into non-overlapping or sliding time windows (default 20s, 30s, or 60s). Packets are indexed strictly by capture timestamp, enforcing the causal condition t <= T_obs.",
    icon: Eye,
    color: "cyan",
  },
  {
    num: "02",
    title: "UNDERSTAND",
    subtitle: "Traffic is converted into meaningful behavioral features.",
    simpleExplanation:
      "Instead of looking at isolated individual packets, the platform summarizes the behavior: How many ports were targeted? How many connections failed? Was there a burst of traffic?",
    technicalDetails:
      "55 statistical features are extracted per window: destination port Shannon entropy, SYN/ACK flag counts, flow duration distributions, packet size variances, byte rates, and TCP connection state ratios.",
    icon: Binary,
    color: "blue",
  },
  {
    num: "03",
    title: "LEARN",
    subtitle: "The AI learns how network behavior changes over time.",
    simpleExplanation:
      "Cyber attacks unfold in stages. Our recurrent neural network remembers what happened 20, 40, or 60 seconds ago and understands how one stage naturally leads into the next.",
    technicalDetails:
      "A PyTorch Long Short-Term Memory (LSTM) network receives sequential state vectors [S(t-n), ..., S(t)]. Hidden states capture temporal dependencies across multiple minutes without future-feature leakage.",
    icon: Brain,
    color: "violet",
  },
  {
    num: "04",
    title: "FORECAST",
    subtitle: "The model predicts likely future attack stages.",
    simpleExplanation:
      "Before an attacker moves from scanning to exploitation, the AI projects the probabilities of future stages at +20s, +40s, +60s, +80s, and +100s, giving operators advance warning.",
    technicalDetails:
      "Recursive autoregressive inference projects forward probabilities P(S(t+k)) up to K=5 steps. Outputs include full categorical probability distributions, confidence intervals, and cumulative risk scores.",
    icon: TrendingUp,
    color: "emerald",
  },
  {
    num: "05",
    title: "EXPLAIN",
    subtitle: "The system shows why the prediction was made.",
    simpleExplanation:
      "No mystery black-box answers. The platform highlights the exact signals—such as a 300% surge in failed connections—that caused the AI to forecast an upcoming attack stage.",
    technicalDetails:
      "Integrated Gradients (for PyTorch LSTM) and TreeSHAP (for XGBoost) assign quantitative attribution scores to each input feature across historical time windows. Mapped 1:1 to MITRE ATT&CK techniques.",
    icon: Search,
    color: "purple",
  },
  {
    num: "06",
    title: "SIMULATE",
    subtitle: "Defensive actions can be tested before being deployed.",
    simpleExplanation:
      "Operators can test hypothetical interventions in a safe sandbox: 'What if we isolate this computer?' or 'What if we block port 445?'",
    technicalDetails:
      "Counterfactual perturbation engine modifies state features according to domain defense models (e.g., host isolation drops active sockets by 95% and cuts egress bandwidth).",
    icon: Shield,
    color: "amber",
  },
  {
    num: "07",
    title: "RE-FORECAST",
    subtitle: "The system estimates how the future risk changes.",
    simpleExplanation:
      "Instantly see the simulated outcome: Does the risk drop from 78% down to 24%? Does the predicted attack collapse back to benign activity? Operators can act with confidence.",
    technicalDetails:
      "Perturbed features are passed back through the LSTM forecasting engine, generating a simulated forward trajectory S_sim(t+1..K) and calculating exact risk delta and lead-time impacts.",
    icon: RefreshCw,
    color: "cyan",
  },
];

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigate }) => {
  const [expandedTechnical, setExpandedTechnical] = useState<Record<string, boolean>>({});

  const toggleTechnical = (num: string) => {
    setExpandedTechnical((prev) => ({ ...prev, [num]: !prev[num] }));
  };

  return (
    <div className="space-y-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
          <Zap className="w-3.5 h-3.5" />
          <span>7-STAGE OPERATIONAL PIPELINE</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
          How the Forecasting <br />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Platform Operates.
          </span>
        </h1>
        <p className="text-base text-slate-300 max-w-2xl mx-auto">
          From passive packet inspection to temporal LSTM forecasting and counterfactual defense simulation.
        </p>
      </div>

      {/* The 7 Steps */}
      <div className="space-y-6">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isTechExpanded = !!expandedTechnical[step.num];

          return (
            <div
              key={step.num}
              className="cyber-card p-6 sm:p-8 rounded-3xl border-slate-800 hover:border-cyan-500/40 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl sm:text-4xl font-black font-mono text-cyan-400/80 bg-cyan-950/60 w-14 h-14 rounded-2xl flex items-center justify-center border border-cyan-500/30">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-100 flex items-center space-x-3">
                      <span>{step.title}</span>
                    </h3>
                    <p className="text-xs text-cyan-300 font-mono mt-0.5">
                      {step.subtitle}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 self-start sm:self-center">
                  <Icon className="w-6 h-6" />
                </div>
              </div>

              {/* Simple Explanation (Audience 1) */}
              <div className="text-sm text-slate-300 leading-relaxed pt-2">
                {step.simpleExplanation}
              </div>

              {/* Technical Details Accordion (Audience 2) */}
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => toggleTechnical(step.num)}
                  className="flex items-center space-x-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors focus:outline-none"
                >
                  <span>{isTechExpanded ? "Hide Technical Details" : "View Technical Implementation"}</span>
                  {isTechExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {isTechExpanded && (
                  <div className="mt-3 p-4 rounded-xl bg-cyber-950/80 border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed animate-fadeIn">
                    <span className="text-cyan-400 font-bold">&gt; ML &amp; ENGINEERING SPEC: </span>
                    {step.technicalDetails}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Launch Button */}
      <div className="text-center p-8 bg-cyber-900/40 rounded-3xl border border-cyan-500/20 space-y-4">
        <h3 className="text-xl font-bold text-slate-100">
          Experience the 7-Step Pipeline in Live Action
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Explore the real-time dashboard or upload your own PCAP file to watch each step compute live telemetry.
        </p>
        <button
          onClick={() => onNavigate("forecast")}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-sm font-sans"
        >
          <span>Open Live Forecast Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
