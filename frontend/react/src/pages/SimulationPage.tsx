import React from "react";
import {
  ShieldAlert,
  Zap,
  ArrowRight,
  TrendingDown,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Lock,
  Server,
  Sliders,
} from "lucide-react";
import { WhatIfSimulatorCard } from "../components/simulation/WhatIfSimulatorCard";
import { SimulateResponse } from "../types/api";

interface SimulationPageProps {
  simulation: SimulateResponse | null;
  onSimulate: (actionType: any, targetEntity: string) => Promise<void>;
  isSimulating: boolean;
}

export const SimulationPage: React.FC<SimulationPageProps> = ({
  simulation,
  onSimulate,
  isSimulating,
}) => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-950/80 pb-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-mono mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>COUNTERFACTUAL DEFENSE SANDBOX</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight font-sans">
            What If We Act Now?
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-mono mt-1">
            Simulate defensive interventions and estimate how the future attack trajectory changes in real-time.
          </p>
        </div>

        {/* Disclaimer Pill */}
        <div className="flex items-center space-x-2 bg-amber-950/60 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-mono">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>SIMULATED OUTCOME — NOT GUARANTEED EFFECTIVENESS</span>
        </div>
      </div>

      {/* Visual Narrative Comparison: BEFORE vs AFTER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BEFORE CARD */}
        <div className="p-6 rounded-3xl bg-cyber-900/40 border border-rose-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-rose-400 font-bold uppercase tracking-wider">
              1. Current Trajectory (No Intervention)
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
              HIGH RISK: 7.85 / 10
            </span>
          </div>

          <p className="text-xs text-slate-300">
            Without defensive action, the model forecasts steady escalation through the kill chain:
          </p>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-cyber-950/80 border border-slate-800">
              <span className="text-slate-300">t+1 &bull; Scanning</span>
              <span className="text-rose-400 font-bold">82% probability</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-cyber-950/80 border border-slate-800">
              <span className="text-slate-300">t+2 &bull; Exploitation</span>
              <span className="text-rose-400 font-bold">71% probability</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-cyber-950/80 border border-slate-800">
              <span className="text-slate-300">t+3 &bull; Credential Access</span>
              <span className="text-amber-400 font-bold">54% probability</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-cyber-950/80 border border-slate-800">
              <span className="text-slate-300">t+4 &bull; Lateral Movement</span>
              <span className="text-amber-400 font-bold">41% probability</span>
            </div>
          </div>
        </div>

        {/* AFTER CARD */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/30 via-cyber-900 to-cyber-950 border border-emerald-500/40 space-y-4 shadow-xl shadow-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-300 font-bold uppercase tracking-wider">
              2. Simulated Defense (Host Quarantined)
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
              REDUCED: 3.12 / 10 (-60.2%)
            </span>
          </div>

          <p className="text-xs text-slate-300">
            Applying 802.1X host isolation terminates active sockets and halts lateral movement:
          </p>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/50 border border-emerald-500/30">
              <span className="text-slate-200">t+1 &bull; Reverts to Benign</span>
              <span className="text-emerald-400 font-bold">79% benign state</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/50 border border-emerald-500/30">
              <span className="text-slate-200">t+2 &bull; Exploitation Collapses</span>
              <span className="text-emerald-400 font-bold">Risk drops to 24%</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/50 border border-emerald-500/30">
              <span className="text-slate-200">t+3 &bull; Credential Access</span>
              <span className="text-emerald-400 font-bold">Risk drops to 13%</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/50 border border-emerald-500/30">
              <span className="text-slate-200">t+4 &bull; Lateral Movement</span>
              <span className="text-emerald-400 font-bold">Risk drops to 5%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive What-If Simulator Card Component */}
      <div className="space-y-6">
        <WhatIfSimulatorCard
          simulation={simulation}
          onSimulate={onSimulate}
          isLoading={isSimulating}
        />
      </div>

      {/* Guidance Note */}
      <div className="cyber-card p-6 rounded-2xl border-slate-800 space-y-2 text-xs text-slate-400">
        <h4 className="text-slate-200 font-bold font-mono">
          How Counterfactual Perturbation Works:
        </h4>
        <p className="leading-relaxed">
          When an operator tests a defense (e.g. &ldquo;Isolate Host&rdquo;), the platform does not simply guess the outcome. It modifies the underlying feature vector according to domain heuristics (cutting active connection sockets by 95% and suppressing SYN bursts), passes the perturbed feature vector through the PyTorch LSTM, and re-computes the multi-step forward probability distribution.
        </p>
      </div>
    </div>
  );
};
