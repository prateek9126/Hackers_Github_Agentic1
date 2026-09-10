import React, { useState } from "react";
import {
  Shield,
  Lock,
  Ban,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Zap,
  Sliders,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { SimulateResponse } from "../../types/api";
import { InteractiveNetworkMap, DefenseActionId } from "./InteractiveNetworkMap";

interface WhatIfSimulatorCardProps {
  simulation: SimulateResponse | null;
  onSimulate: (actionType: any, targetEntity: string) => Promise<void>;
  isLoading: boolean;
}

interface DefenseActionConfig {
  id: DefenseActionId;
  title: string;
  subtitle: string;
  userFriendlyDesc: string;
  defaultTarget: string;
  targetLabel: string;
  applyButtonText: string;
  restoreButtonText: string;
  appliedStatusText: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DEFENSE_ACTIONS: DefenseActionConfig[] = [
  {
    id: "HOST_ISOLATION",
    title: "Isolate Host",
    subtitle: "Protect endpoint",
    userFriendlyDesc: "Temporarily disconnect the affected device from the network to prevent further lateral communication.",
    defaultTarget: "192.168.1.150 (Compromised Host)",
    targetLabel: "Target Host / Subnet",
    applyButtonText: "ISOLATE / FREEZE",
    restoreButtonText: "RESTORE / UNFREEZE",
    appliedStatusText: "Host isolated from simulated network.",
    icon: Shield,
  },
  {
    id: "BLOCK_DESTINATION_PORT",
    title: "Block Port",
    subtitle: "Stop targeted access",
    userFriendlyDesc: "Stop traffic reaching a specific network service (e.g. SMB Port 445 or RDP Port 3389).",
    defaultTarget: "Port 445 (SMB)",
    targetLabel: "Target Destination Port",
    applyButtonText: "BLOCK PORT",
    restoreButtonText: "RESTORE PORT",
    appliedStatusText: "Destination port blocked at firewall.",
    icon: Lock,
  },
  {
    id: "BLOCK_SUSPICIOUS_SOURCE",
    title: "Block Source",
    subtitle: "Stop suspicious IP",
    userFriendlyDesc: "Stop all incoming communication from a suspicious scanning or probing device at the perimeter.",
    defaultTarget: "192.168.1.105 (Suspicious Scanner)",
    targetLabel: "Suspicious Source IP",
    applyButtonText: "BLOCK SOURCE",
    restoreButtonText: "UNBLOCK SOURCE",
    appliedStatusText: "Suspicious source IP quarantined at border.",
    icon: Ban,
  },
  {
    id: "RESTRICT_OUTBOUND_TRAFFIC",
    title: "Restrict Outbound",
    subtitle: "Limit data egress",
    userFriendlyDesc: "Choke unauthorized data leaving the network to prevent exfiltration of sensitive information.",
    defaultTarget: "Egress Subnet 0.0.0.0/0",
    targetLabel: "Outbound Egress Boundary",
    applyButtonText: "RESTRICT OUTBOUND",
    restoreButtonText: "RESTORE OUTBOUND",
    appliedStatusText: "Outbound egress traffic restricted in simulation.",
    icon: ArrowUpRight,
  },
];

export const WhatIfSimulatorCard: React.FC<WhatIfSimulatorCardProps> = ({
  simulation,
  onSimulate,
  isLoading,
}) => {
  // Currently selected defense action
  const [selectedActionId, setSelectedActionId] = useState<DefenseActionId>("HOST_ISOLATION");

  // Track applied state per action: { [actionId]: boolean }
  const [appliedActions, setAppliedActions] = useState<Record<DefenseActionId, boolean>>({
    HOST_ISOLATION: false,
    BLOCK_DESTINATION_PORT: false,
    BLOCK_SUSPICIOUS_SOURCE: false,
    RESTRICT_OUTBOUND_TRAFFIC: false,
  });

  // Current active configuration
  const currentConfig =
    DEFENSE_ACTIONS.find((a) => a.id === selectedActionId) || DEFENSE_ACTIONS[0];

  const [targetEntity, setTargetEntity] = useState<string>(currentConfig.defaultTarget);

  // Handle switching defense action
  const handleSelectAction = (action: DefenseActionConfig) => {
    setSelectedActionId(action.id);
    setTargetEntity(action.defaultTarget);
  };

  // Toggle apply defense in the network visualization
  const handleToggleApply = () => {
    setAppliedActions((prev) => ({
      ...prev,
      [selectedActionId]: !prev[selectedActionId],
    }));
  };

  // Restore network state
  const handleRestore = () => {
    setAppliedActions((prev) => ({
      ...prev,
      [selectedActionId]: false,
    }));
  };

  // Trigger backend simulation execution
  const handleRunSimulation = async () => {
    // If not yet applied visually, apply it as well
    if (!appliedActions[selectedActionId]) {
      setAppliedActions((prev) => ({
        ...prev,
        [selectedActionId]: true,
      }));
    }
    await onSimulate(selectedActionId, targetEntity);
  };

  const isCurrentActionApplied = !!appliedActions[selectedActionId];

  return (
    <div className="cyber-card rounded-2xl p-6 border border-cyan-900/40 space-y-6 shadow-xl">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
            <h2 className="text-base font-bold font-mono tracking-wider text-slate-100 uppercase">
              What-If Defense Sandbox
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-sans">
            Choose a defensive countermeasure, inspect the affected network topology, and simulate risk reduction.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-800">
            Counterfactual Simulator
          </span>
        </div>
      </div>

      {/* 2. Interactive Defense Action Buttons (4 In a Row) */}
      <div className="space-y-2">
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider font-bold">
          Step 1 &bull; Choose Defense Action:
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {DEFENSE_ACTIONS.map((action) => {
            const Icon = action.icon;
            const isSelected = selectedActionId === action.id;
            const isActionApplied = appliedActions[action.id];

            return (
              <button
                key={action.id}
                onClick={() => handleSelectAction(action)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between space-y-2 group focus:outline-none ${
                  isSelected
                    ? "bg-cyan-950/70 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-950"
                    : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-300"
                        : "bg-slate-800 text-slate-400 group-hover:text-cyan-400"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {isActionApplied && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>

                <div>
                  <div
                    className={`text-sm font-bold font-sans ${
                      isSelected ? "text-cyan-300" : "text-slate-200"
                    }`}
                  >
                    {action.title}
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans mt-0.5 leading-snug">
                    {action.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Defense Control Panel with Interactive Network Map */}
      <div className="bg-cyber-900/60 p-5 rounded-2xl border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                Defense Control
              </span>
              <h3 className="text-sm font-bold text-slate-100 font-sans">
                {currentConfig.title}
              </h3>
            </div>
            <p className="text-xs text-slate-300 font-sans mt-1">
              {currentConfig.userFriendlyDesc}
            </p>
          </div>

          {/* Action State Status Badge */}
          {isCurrentActionApplied && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentConfig.appliedStatusText}</span>
            </div>
          )}
        </div>

        {/* 4. Interactive Network Map Visualization */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Simulated Network Topology &bull; 6 Connected Nodes</span>
            <span className="text-[10px] text-slate-500">
              Interactive State: {isCurrentActionApplied ? "Modified" : "Normal Baseline"}
            </span>
          </div>

          <InteractiveNetworkMap
            actionId={selectedActionId}
            isApplied={isCurrentActionApplied}
            targetEntity={targetEntity}
          />
        </div>

        {/* 5. Defense Action Controls & Execution Trigger */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end pt-2 border-t border-slate-800/80">
          {/* Target Entity Input */}
          <div className="sm:col-span-6 space-y-1">
            <label className="text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>{currentConfig.targetLabel}:</span>
              <span className="text-[10px] text-slate-500 font-sans">(From telemetry)</span>
            </label>
            <input
              type="text"
              value={targetEntity}
              onChange={(e) => setTargetEntity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Action Trigger Buttons */}
          <div className="sm:col-span-6 flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Toggle Apply / Restore button */}
            {!isCurrentActionApplied ? (
              <button
                onClick={handleToggleApply}
                className="flex-1 py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-sans transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/20"
              >
                <span>{currentConfig.applyButtonText}</span>
              </button>
            ) : (
              <button
                onClick={handleRestore}
                className="flex-1 py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs font-sans transition-all flex items-center justify-center space-x-1.5 border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{currentConfig.restoreButtonText}</span>
              </button>
            )}

            {/* Run Forecast Simulation button */}
            <button
              onClick={handleRunSimulation}
              disabled={isLoading}
              className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs font-sans transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>{isLoading ? "Simulating..." : "RUN SIMULATION"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. Simulation Results Display (Before vs After) */}
      {simulation && (
        <div className="mt-6 pt-6 border-t border-slate-800 space-y-6 font-mono animate-fadeIn">
          {/* Official Disclaimer */}
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start space-x-3 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">{simulation.disclaimer}</span>
              <p className="text-[11px] text-amber-400/80 mt-0.5 font-sans">
                Evaluates counterfactual trajectory perturbation under principled network assumptions.
              </p>
            </div>
          </div>

          {/* Risk Scoreboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase">Original Risk Score</div>
              <div className="text-2xl font-bold text-rose-400 font-mono">
                {simulation.original_risk.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 font-sans">Baseline trajectory</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase">Simulated Risk Score</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {simulation.simulated_risk.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 font-sans">Post-intervention estimate</div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-1">
              <div className="text-[10px] text-emerald-300 uppercase font-bold">
                Future Risk Reduction (&Delta;Risk)
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                +{simulation.risk_difference.toFixed(2)} (+{simulation.risk_reduction_pct.toFixed(1)}%)
              </div>
              <div className="text-[10px] text-emerald-400/80 font-sans">Attenuated attack probability</div>
            </div>
          </div>

          {/* Side-by-Side: BEFORE vs AFTER Forecaster Trajectory */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-300 font-sans">
              Trajectory Re-Forecast: BEFORE vs AFTER Simulated Defense
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BEFORE */}
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-2">
                <div className="text-xs font-bold text-rose-300 pb-1.5 border-b border-rose-900/60 flex items-center justify-between">
                  <span>BEFORE (Original Forecast)</span>
                  <span className="text-[10px] text-rose-400 font-mono font-normal">Unmitigated</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {simulation.original_forecast.map((step) => (
                    <div key={step.step} className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-500 font-mono">
                        t + {step.step} (+{step.lead_time_sec}s):
                      </span>
                      <span className="font-bold text-rose-400">{step.stage}</span>
                      <span className="text-slate-400 font-mono">{Math.round(step.probability * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AFTER */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-2">
                <div className="text-xs font-bold text-emerald-300 pb-1.5 border-b border-emerald-900/60 flex items-center justify-between">
                  <span>AFTER (Simulated Defense Re-Forecast)</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-normal">Mitigated</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {simulation.simulated_forecast.map((step) => (
                    <div key={step.step} className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-500 font-mono">
                        t + {step.step} (+{step.lead_time_sec}s):
                      </span>
                      <span className="font-bold text-emerald-400">{step.stage}</span>
                      <span className="text-slate-400 font-mono">{Math.round(step.probability * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Applied Telemetry Perturbations */}
          {simulation.feature_modifications && simulation.feature_modifications.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 font-sans">
                Applied Operational Perturbations to Network Features:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {simulation.feature_modifications.map((mod, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-300 font-bold font-mono">
                      <span>{mod.feature_name}</span>
                      <span className="text-amber-400">
                        {mod.original_value} &rarr; {mod.perturbed_value}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[10px] font-sans leading-relaxed">{mod.rationale}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reset / Restore Action */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleRestore}
              className="text-xs font-mono text-slate-400 hover:text-cyan-300 flex items-center space-x-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Network Topology to Baseline</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
