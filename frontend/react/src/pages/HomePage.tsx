import React from "react";
import {
  ArrowRight,
  Shield,
  Eye,
  Brain,
  TrendingUp,
  Search,
  Zap,
  CheckCircle2,
  Clock,
  Activity,
  Layers,
  Sparkles,
  Server,
  Network,
  AlertTriangle,
} from "lucide-react";
import { CyberIntelligenceCore } from "../components/3d/CyberIntelligenceCore";
import { PageId } from "../components/layout/Navbar";

interface HomePageProps {
  onNavigate: (page: PageId) => void;
}

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Observe",
    desc: "Network traffic streams into the platform passively. Packets are organized into discrete chronological observation windows without slowing network speeds.",
    icon: Eye,
  },
  {
    step: "02",
    title: "Learn",
    desc: "The AI studies statistical transitions across time: destination port entropy, SYN bursts, connection ratios, and temporal sequence dependencies.",
    icon: Brain,
  },
  {
    step: "03",
    title: "Forecast",
    desc: "Before an attacker escalates from scanning to exploitation, the model projects the probabilities of future stages at +20s, +40s, +60s, +80s, and +100s.",
    icon: TrendingUp,
  },
  {
    step: "04",
    title: "Explain",
    desc: "Mathematical feature attributions (SHAP and Integrated Gradients) highlight the exact packet metrics that triggered the warning. Zero black-box guesswork.",
    icon: Search,
  },
  {
    step: "05",
    title: "Simulate",
    desc: "Defenders test defensive interventions—like quarantining a compromised host—in a safe counterfactual sandbox and watch the projected attack risk collapse.",
    icon: Zap,
  },
];

const KILL_CHAIN_STEPS = [
  { name: "Reconnaissance", time: "t = 0s", role: "Attacker probes public borders" },
  { name: "Scanning", time: "+20s", role: "Systematic port & banner sweeps" },
  { name: "Exploitation", time: "+40s", role: "Targeted vulnerability exploit" },
  { name: "Credential Access", time: "+60s", role: "Local memory & token extraction" },
  { name: "Lateral Movement", time: "+80s", role: "Pivoting across internal subnets" },
  { name: "Exfiltration", time: "+100s", role: "Unauthorized egress data transfer" },
];

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-28 max-w-6xl mx-auto font-sans">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 pb-4">
        {/* Subtle Background Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-cyan-500/10 via-blue-600/10 to-indigo-600/5 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headline, Description & CTAs */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-100 leading-[1.1]">
              Predict the Attack. <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                Before It Happens.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed">
              An AI-powered network forecasting platform that learns how attacks evolve and predicts their next stage before the threat progresses.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => onNavigate("forecast")}
                className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-7 py-3.5 rounded-xl shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm font-sans"
              >
                <Activity className="w-4 h-4" />
                <span>Launch Platform</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById("how-it-works");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center space-x-2 bg-cyber-900/80 hover:bg-slate-900 text-slate-200 border border-slate-700/80 hover:border-cyan-500/40 px-6 py-3.5 rounded-xl transition-all text-sm font-medium"
              >
                <span>See How It Works</span>
              </button>
            </div>
          </div>

          {/* Right Column: 3D Cyber Intelligence Visual */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <CyberIntelligenceCore className="w-full max-w-xl" />
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION (id="how-it-works") */}
      <section id="how-it-works" className="space-y-10 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            5-Stage Intelligence Cycle
          </span>
          <h2 className="text-3xl font-extrabold text-slate-100">
            How It Works
          </h2>
          <div className="flex items-center justify-center space-x-2 text-xs font-mono text-slate-400 pt-1">
            <span className="text-cyan-400 font-bold">Observe</span>
            <span>&rarr;</span>
            <span className="text-blue-400 font-bold">Learn</span>
            <span>&rarr;</span>
            <span className="text-indigo-400 font-bold">Forecast</span>
            <span>&rarr;</span>
            <span className="text-purple-400 font-bold">Explain</span>
            <span>&rarr;</span>
            <span className="text-emerald-400 font-bold">Simulate</span>
          </div>
        </div>

        {/* 5 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {HOW_IT_WORKS_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="cyber-card p-5 rounded-2xl border-slate-800 space-y-3 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-cyan-400/80 font-bold">
                      {step.step}
                    </span>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-100">{step.title}</h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. WHY IT MATTERS (id="about") */}
      <section id="about" className="space-y-10 scroll-mt-24 bg-cyber-900/40 p-8 sm:p-10 rounded-3xl border border-slate-800">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            The Value of Advance Warning
          </span>
          <h2 className="text-3xl font-extrabold text-slate-100">
            Why It Matters
          </h2>
          <p className="text-sm text-slate-400">
            Cyber attacks are rarely instantaneous single events. They evolve through a coordinated sequence of steps.
          </p>
        </div>

        {/* Attack Evolution Kill Chain Line */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {KILL_CHAIN_STEPS.map((step, idx) => (
            <div
              key={step.name}
              className="p-3.5 rounded-xl bg-cyber-950/80 border border-slate-800 text-left space-y-1"
            >
              <div className="text-[10px] font-mono text-cyan-400 font-bold">{step.time}</div>
              <div className="text-xs font-bold text-slate-200 truncate">{step.name}</div>
              <p className="text-[10px] text-slate-400 leading-snug">{step.role}</p>
            </div>
          ))}
        </div>

        {/* Traditional vs Rakshak Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="p-6 rounded-2xl bg-cyber-950/60 border border-rose-900/30 space-y-3">
            <div className="text-xs font-mono text-rose-400 font-bold uppercase tracking-wider">
              Traditional Security (Reactive)
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Triggers static alarms only after an adversary reaches a sensitive endpoint. By the time an analyst reviews the log, credentials have already been compromised.
            </p>
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span>Activity</span>
              <span>&rarr;</span>
              <span className="text-rose-400 font-bold">Detection</span>
              <span>&rarr;</span>
              <span className="text-amber-400 font-bold">Alert</span>
              <span>&rarr;</span>
              <span>Response</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-cyber-900 to-cyber-950 border border-cyan-500/40 space-y-3 shadow-lg shadow-cyan-950/20">
            <div className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Rakshak Platform (Predictive)</span>
              <span className="text-[10px] bg-cyan-500/20 px-2 py-0.5 rounded text-cyan-300">55.6s Lead Time</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Models continuous behavioral telemetry as temporal sequence transitions. Predicts future attack stages in advance, giving automated firewalls time to isolate hosts.
            </p>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-300 bg-cyan-950/70 p-2.5 rounded-lg border border-cyan-500/30">
              <span>Activity</span>
              <span>&rarr;</span>
              <span className="text-blue-300 font-bold">Behavior</span>
              <span>&rarr;</span>
              <span className="text-cyan-400 font-bold">Forecast</span>
              <span>&rarr;</span>
              <span className="text-emerald-400 font-bold">Simulate</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PREVIEW OF THE PLATFORM */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            Inside the System
          </span>
          <h2 className="text-3xl font-extrabold text-slate-100">
            Preview the Platform
          </h2>
          <p className="text-sm text-slate-400">
            A comprehensive operational console providing temporal multi-step forecasts, PCAP progression replay, and counterfactual defense simulations.
          </p>
        </div>

        <div className="cyber-card p-6 sm:p-8 rounded-3xl border-cyan-500/30 bg-cyber-900/50 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <div className="text-sm font-bold text-slate-100 font-mono">
                Real-Time Attack Progression Telemetry
              </div>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Causal Guarantee: <strong className="text-cyan-300">t &le; T_obs</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-cyber-950 border border-slate-800 space-y-1">
              <div className="text-slate-500 text-[10px]">CURRENT OBSERVED STATE</div>
              <div className="text-cyan-300 font-bold text-sm">RECONNAISSANCE</div>
              <p className="text-[10px] text-slate-400 font-sans mt-1">
                Port sweep detected on internal subnet 192.168.1.0/24
              </p>
            </div>

            <div className="p-4 rounded-xl bg-cyber-950 border border-slate-800 space-y-1">
              <div className="text-slate-500 text-[10px]">NEXT FORECASTED STEP (+20s)</div>
              <div className="text-amber-400 font-bold text-sm">SCANNING (82%)</div>
              <p className="text-[10px] text-slate-400 font-sans mt-1">
                Service enumeration projected based on SYN bursts
              </p>
            </div>

            <div className="p-4 rounded-xl bg-cyber-950 border border-slate-800 space-y-1">
              <div className="text-slate-500 text-[10px]">COUNTERFACTUAL DEFENSE</div>
              <div className="text-emerald-400 font-bold text-sm">RISK DROPS -60.2%</div>
              <p className="text-[10px] text-slate-400 font-sans mt-1">
                Host isolation severing active sockets
              </p>
            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={() => onNavigate("forecast")}
              className="inline-flex items-center space-x-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/80 px-4 py-2 rounded-xl border border-cyan-500/40 hover:border-cyan-400 transition-all"
            >
              <span>Explore Live Telemetry &amp; PCAP Replay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA */}
      <section className="p-10 sm:p-14 rounded-3xl bg-gradient-to-r from-cyan-950/70 via-cyber-900 to-indigo-950/60 border border-cyan-500/30 text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
          See the Future of Cyber Defense
        </h2>
        <p className="text-sm text-slate-300 max-w-xl mx-auto font-sans leading-relaxed">
          Experience real-time temporal forecasting, upload your own PCAP traffic captures, and simulate active defenses.
        </p>
        <div className="pt-2">
          <button
            onClick={() => onNavigate("forecast")}
            className="inline-flex items-center space-x-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-8 py-3.5 rounded-xl shadow-xl shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm font-sans"
          >
            <Activity className="w-4 h-4" />
            <span>Launch Platform</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
