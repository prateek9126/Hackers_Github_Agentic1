import React from "react";
import { ShieldAlert, Activity, PlayCircle, Radio, Database, Cpu } from "lucide-react";

interface HeaderProps {
  mode: "live" | "replay";
  onModeChange: (mode: "live" | "replay") => void;
  scenarioType: string;
  isBackendHealthy: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  scenarioType,
  isBackendHealthy,
}) => {
  return (
    <header className="border-b border-cyan-950/80 bg-cyber-900/90 backdrop-blur-md sticky top-0 z-50 px-6 py-3">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Project Metadata */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                SIH26153
              </span>
              <h1 className="text-lg font-bold text-slate-100 tracking-wide">
                AI Network Attack Progression Forecasting Platform
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Temporal World Model &bull; K-Step Future Trajectory &bull; Counterfactual Defense Sandbox
            </p>
          </div>
        </div>

        {/* Operational Status & Mode Toggles */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          {/* Strict Causal Badge */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-slate-900 px-3 py-1 rounded-full border border-slate-700 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Causal Filter: <strong className="text-cyan-300">t &le; T_obs</strong></span>
          </div>

          {/* Dataset Type Badge */}
          <div className="flex items-center space-x-1.5 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className={scenarioType.includes("SYNTHETIC") ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
              {scenarioType}
            </span>
          </div>

          {/* Health Status Indicator */}
          <div className="flex items-center space-x-1.5 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
            <span className={`w-2 h-2 rounded-full ${isBackendHealthy ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
            <span className={isBackendHealthy ? "text-emerald-400" : "text-amber-400"}>
              {isBackendHealthy ? "FastAPI Online" : "Local Engine"}
            </span>
          </div>

          {/* Live vs Replay Mode Switch */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-cyan-950">
            <button
              onClick={() => onModeChange("live")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded font-medium transition-all ${
                mode === "live"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Live Monitor</span>
            </button>
            <button
              onClick={() => onModeChange("replay")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded font-medium transition-all ${
                mode === "replay"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>PCAP Replay</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
