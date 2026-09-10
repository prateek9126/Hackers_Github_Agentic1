import React from "react";
import { ShieldAlert, ExternalLink, Cpu, Terminal, Lock } from "lucide-react";
import { PageId } from "./Navbar";

interface FooterProps {
  onNavigate: (page: PageId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-cyan-950/70 bg-cyber-950 text-slate-400 font-sans pt-12 pb-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-slate-900">
          {/* Brand Info (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-black tracking-wider text-slate-100">
                    RAKSHAK
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    SIH26153
                  </span>
                </div>
                <p className="text-xs font-mono text-cyan-300/80">
                  Predict cyber attacks before they progress.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              An advanced AI-powered network forecasting platform that learns temporal attack patterns and projects multi-step threat progressions before breaches culminate.
            </p>

            <div className="flex flex-wrap gap-2 pt-2 text-[11px] font-mono">
              <span className="bg-slate-900 text-cyan-300 px-2.5 py-1 rounded border border-slate-800 flex items-center space-x-1.5">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span>Strict Causal Filter</span>
              </span>
              <span className="bg-slate-900 text-emerald-300 px-2.5 py-1 rounded border border-slate-800 flex items-center space-x-1.5">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Passive PCAP Ingestion</span>
              </span>
              <span className="bg-slate-900 text-purple-300 px-2.5 py-1 rounded border border-slate-800 flex items-center space-x-1.5">
                <Terminal className="w-3 h-3 text-purple-400" />
                <span>Explainable AI (SHAP/IG)</span>
              </span>
            </div>
          </div>

          {/* Overview Links */}
          <div className="space-y-3 font-mono text-xs">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Overview</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onNavigate("home")}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Home &amp; Hero Overview
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("about")}
                  className="hover:text-cyan-400 transition-colors"
                >
                  About the Project
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("how-it-works")}
                  className="hover:text-cyan-400 transition-colors"
                >
                  How It Works (7 Steps)
                </button>
              </li>
            </ul>
          </div>

          {/* Live Platform Links */}
          <div className="space-y-3 font-mono text-xs">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Intelligence Core</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onNavigate("forecast")}
                  className="text-cyan-300 font-medium hover:text-cyan-200 transition-colors flex items-center space-x-1"
                >
                  <span>Live Attack Forecast</span>
                  <span className="text-[10px] bg-cyan-500/20 px-1 rounded text-cyan-300">DEMO</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("trajectory")}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Attack Trajectory Graph
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("explainability")}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Explainable AI (XAI)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("simulation")}
                  className="hover:text-cyan-400 transition-colors"
                >
                  What-If Defense Sandbox
                </button>
              </li>
            </ul>
          </div>

          {/* Validation & Project Info */}
          <div className="space-y-3 font-mono text-xs">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Validation &amp; Docs</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onNavigate("results")}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Empirical Evaluation
                </button>
              </li>
              <li>
                <a
                  href="/api/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-cyan-400 transition-colors flex items-center space-x-1"
                >
                  <span>FastAPI Swagger UI</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="/api/health"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-cyan-400 transition-colors flex items-center space-x-1"
                >
                  <span>System Health JSON</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <div>
            &copy; 2026 SIH26153 Team &bull; Smart India Hackathon 2026 &bull; All Rights Reserved.
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-400">PyTorch LSTM + XGBoost + Zeek Ingestion</span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-emerald-400 font-bold">100% Offline Capable</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
