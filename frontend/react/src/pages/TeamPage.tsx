import React from "react";
import {
  Users,
  ShieldAlert,
  Cpu,
  Terminal,
  Code,
  Globe,
  Github,
  Mail,
  Award,
  BookOpen,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { PageId } from "../components/layout/Navbar";

interface TeamPageProps {
  onNavigate: (page: PageId) => void;
}

const TEAM_ROLES = [
  {
    role: "AI / Machine Learning Engineer",
    domain: "Temporal Modeling & Neural Architectures",
    description:
      "Designed the PyTorch LSTM recurrent sequence model, autoregressive K-step recursive inference engine, and Integrated Gradients feature attribution pipelines.",
    skills: ["PyTorch", "LSTM Recurrence", "XGBoost", "Integrated Gradients", "SHAP"],
    icon: Cpu,
  },
  {
    role: "Cybersecurity & Threat Intelligence",
    domain: "Network Telemetry & MITRE ATT&CK",
    description:
      "Engineered the 55-dimensional behavioral feature extraction algorithms, passive DPKT/Zeek packet windowing parsers, and MITRE enterprise kill-chain mapping.",
    skills: ["PCAP / PCAPNG", "Zeek", "MITRE ATT&CK", "Network Protocols", "CTU-13 Dataset"],
    icon: ShieldAlert,
  },
  {
    role: "Backend & Systems Architect",
    domain: "High-Performance APIs & Causal Safety",
    description:
      "Architected the FastAPI asynchronous service layer, PostgreSQL/SQLite persistence engine, and strict causal filtering guarantees (t <= T_obs).",
    skills: ["FastAPI", "Python 3.13", "PostgreSQL", "SQLAlchemy", "Docker"],
    icon: Terminal,
  },
  {
    role: "Frontend & 3D Visualization Engineer",
    domain: "Interactive Dashboard & UX Architecture",
    description:
      "Built the React 18 TypeScript dashboard, WebGL Three.js Cyber Intelligence Core, Recharts probability timelines, and accessible dual-audience workflows.",
    skills: ["React 18", "TypeScript", "Three.js", "Tailwind CSS", "Recharts"],
    icon: Code,
  },
];

export const TeamPage: React.FC<TeamPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
          <Users className="w-3.5 h-3.5" />
          <span>TEAM &bull; PROJECT CREDENTIALS</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
          Engineering Team &amp; <br />
          <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            Project Information.
          </span>
        </h1>
        <p className="text-base text-slate-300 max-w-2xl mx-auto">
          Built for the Smart India Hackathon 2026 under Problem Statement SIH26153: AI-Based Network Attack Progression Forecasting from Network Traffic Data.
        </p>
      </div>

      {/* Team Role Cards */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100">Engineering Disciplines</h2>
          <span className="text-xs font-mono text-slate-500">Cross-Functional Team</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TEAM_ROLES.map((member) => {
            const Icon = member.icon;
            return (
              <div
                key={member.role}
                className="cyber-card p-6 rounded-2xl border-slate-800 hover:border-cyan-500/30 transition-all space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-800">
                    {member.domain}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-100">{member.role}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {member.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                  {member.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[10px] font-mono bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hackathon Project Metadata */}
      <section className="bg-cyber-900/40 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center space-x-3 text-cyan-400">
          <Award className="w-6 h-6" />
          <h2 className="text-lg font-bold text-slate-100">Hackathon &amp; Problem Statement</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-cyber-950 border border-slate-800 space-y-1">
            <div className="text-slate-500 text-[10px]">PROBLEM CODE</div>
            <div className="text-cyan-300 font-bold text-sm">SIH26153</div>
          </div>

          <div className="p-4 rounded-xl bg-cyber-950 border border-slate-800 space-y-1">
            <div className="text-slate-500 text-[10px]">EVENT</div>
            <div className="text-slate-200 font-bold text-sm">Smart India Hackathon 2026</div>
          </div>

          <div className="p-4 rounded-xl bg-cyber-950 border border-slate-800 space-y-1">
            <div className="text-slate-500 text-[10px]">DOMAIN</div>
            <div className="text-slate-200 font-bold text-sm">Cybersecurity &amp; AI</div>
          </div>

          <div className="p-4 rounded-xl bg-cyber-950 border border-slate-800 space-y-1">
            <div className="text-slate-500 text-[10px]">DEPLOYMENT</div>
            <div className="text-emerald-400 font-bold text-sm">100% Offline Capable</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-cyber-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
          <div className="font-bold text-slate-200 font-mono flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Problem Statement Objective:</span>
          </div>
          <p>
            Develop an AI-based system to analyze network traffic and forecast multi-step cyber attack progression patterns, providing actionable advance warning before the culmination of critical attack phases (such as lateral movement and data exfiltration).
          </p>
        </div>
      </section>
    </div>
  );
};
